import { router, useFocusEffect } from "expo-router";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { Fragment, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  Share,
  Text,
  TextInput,
  View,
  type TextStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { tokenize, type Phrase } from "@shared/phrase-match";
import { isPhrase, isSentence } from "@shared/review";
import { isDue } from "@shared/srs";
import { Button, Card, ErrorText, Input, Segmented, styles } from "@/components/ui";
import { WordSheet } from "@/components/WordSheet";
import { api, getVocabVersion, type VocabItem } from "@/lib/api";
import { notice, showError } from "@/lib/dialogs";
import { useAuth } from "@/lib/auth";
import { C } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { CONTENT_MAX, FORM_MAX, useLayout } from "@/lib/layout";
import { masteryMeta, masteryOfItem } from "@/lib/mastery";
import { speakGerman, stopSpeaking } from "@/lib/speak";
import { groupBySaved } from "@/lib/vocabGroups";

type Sort = "new" | "az";
type Section = { title: string; data: VocabItem[] };
/** Lọc theo tình trạng ôn (đến hạn · hay quên · chưa ghi nghĩa) và theo loại mục (từ · cụm từ · câu ⭐) — mỗi nhóm chọn tối đa 1 */
type Status = "due" | "weak" | "empty";
type Kind = "word" | "phrase" | "sentence";

const STALE_MS = 10 * 60_000; // quá lâu chưa tải → mở tab thì tải lại (mục tới hạn ôn theo thời gian)
const UNDO_MS = 5000; // xoá: chờ chừng này cho "Hoàn tác" rồi mới xoá thật trên server
const AI_WORKERS = 3; // AI điền nghĩa hàng loạt: số yêu cầu chạy song song

/** Bỏ dấu + chữ thường: "Straße" ~ "strasse", "Ärger" ~ "arger" (tìm kiếm + nhóm A–Z) */
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

const ARTICLE = /^(der|die|das|sich|ein|eine) /i;
/** Khoá xếp A–Z: bỏ mạo từ / "sich" đầu ("der Hund" xếp ở H) */
const sortKey = (w: string) => norm(w).replace(ARTICLE, "");
/** Màu mạo từ theo giống (quy ước hay dùng khi học tiếng Đức): der xanh dương · die đỏ · das xanh lá */
const GENDER: Record<string, string> = { der: C.phrase, die: C.redText, das: C.accent };

const kindOf = (v: VocabItem): Kind => (isSentence(v) ? "sentence" : isPhrase(v) ? "phrase" : "word");
const byNewest = (a: VocabItem, b: VocabItem) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id;
/** Câu cần tìm cụm từ của 1 mục: câu ví dụ, hoặc chính câu ⭐ */
const phraseText = (v: VocabItem) => v.context || (isPhrase(v) ? v.word : "");

/** Nhóm theo chữ cái đầu, bỏ mạo từ (Ä → A, số / ký hiệu → #) */
function byLetter(items: VocabItem[]): Section[] {
  const sorted = [...items].sort((a, b) => sortKey(a.word).localeCompare(sortKey(b.word), "de", { sensitivity: "base" }));
  const groups = new Map<string, VocabItem[]>();
  for (const v of sorted) {
    const c = sortKey(v.word)[0]?.toUpperCase() ?? "#";
    const title = /[A-Z]/.test(c) ? c : "#";
    (groups.get(title) ?? groups.set(title, []).get(title)!).push(v);
  }
  return [...groups].map(([title, data]) => ({ title, data }));
}

/** Bỏ dấu câu 2 đầu: "Lauer," → "Lauer" */
const trim = (w: string) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
/** …và chữ thường: "Lauer," → "lauer" */
const bare = (w: string) => trim(w).toLowerCase();

/** Mở bảng giải thích: từ + câu chứa nó (+ các phần của cụm để tô sáng) */
type LookFn = (word: string, context: string, marks?: string[]) => void;

/** Câu (ví dụ / câu đánh dấu sao): tô xanh + gạch chân cụm từ cố định, tô đậm từ đang học; có onLook thì chạm từ để tra */
function Sentence({ text, phrases, word, style, onLook }: { text: string; phrases: Phrase[]; word?: string; style: TextStyle; onLook?: LookFn }) {
  const tokens = tokenize(text, phrases);
  const target = word && !word.includes(" ") ? word.toLowerCase() : "";
  return (
    <Text style={style}>
      {tokens.map(({ word: w, phrase: p }, k) => {
        const joined = p >= 0 && tokens[k + 1]?.phrase === p; // gạch chân liền giữa các từ cùng cụm
        return (
          <Fragment key={k}>
            <Text
              onPress={
                onLook && bare(w)
                  ? () => (p >= 0 ? onLook(phrases[p].base, text, phrases[p].parts) : onLook(trim(w), text))
                  : undefined
              }
              suppressHighlighting={false}
              style={
                p >= 0
                  ? { color: C.phrase, fontWeight: "600", textDecorationLine: "underline" }
                  : target && bare(w) === target
                    ? { color: C.text, fontWeight: "700" }
                    : undefined
              }
            >
              {joined ? `${w} ` : w}
            </Text>
            {!joined && k < tokens.length - 1 && " "}
          </Fragment>
        );
      })}
    </Text>
  );
}

/** Các cụm từ trong câu: dạng từ điển (xanh) — nghĩa */
function PhraseLines({ phrases }: { phrases: Phrase[] }) {
  return phrases.map((p, k) => (
    <Text key={k} style={{ color: C.muted, fontSize: 13, lineHeight: 18 }}>
      <Text style={{ color: C.phrase, fontWeight: "700" }}>{p.base}</Text> — {p.meaning}
    </Text>
  ));
}

/** Từ có mạo từ đầu ("der Hund") → mạo từ tô màu theo giống */
function HeadWord({ word, color }: { word: string; color: string }) {
  const m = word.match(/^(der|die|das) /i);
  if (!m) return word;
  return (
    <>
      <Text style={{ color: GENDER[m[1].toLowerCase()] }}>{m[0]}</Text>
      <Text style={{ color }}>{word.slice(m[0].length)}</Text>
    </>
  );
}

/** Nút ✨ AI ghi nghĩa */
function AiButton({ busy, onPress, label }: { busy: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      hitSlop={8}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: C.amber,
        backgroundColor: pressed ? "rgba(250,204,21,0.2)" : "rgba(250,204,21,0.1)",
      })}
    >
      {busy ? <ActivityIndicator size="small" color={C.amber} /> : <SymbolView name="sparkles" size={13} tintColor={C.amber} />}
      <Text style={{ color: C.amber, fontWeight: "700", fontSize: 13 }}>AI</Text>
    </Pressable>
  );
}

/** Nút lọc dạng viên thuốc (chạm lần nữa để bỏ lọc) */
function Chip({ label, icon, active, onPress }: { label: string; icon?: SFSymbol; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: active ? C.amber : C.border,
        backgroundColor: active ? "rgba(250,204,21,0.12)" : C.card2,
      }}
    >
      {icon && <SymbolView name={icon} size={13} tintColor={active ? C.amber : C.muted} />}
      <Text style={{ color: active ? C.amber : C.muted, fontWeight: "700", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function VocabRow({
  v,
  first,
  last,
  open,
  now,
  phrases,
  onToggle,
  onLook,
  onChange,
  onDelete,
}: {
  v: VocabItem;
  phrases: Phrase[]; // cụm từ cố định trong câu (câu đánh dấu sao, hoặc câu ví dụ của từ)
  first: boolean;
  last: boolean;
  open: boolean;
  now: number; // thời điểm tải sổ (xét đến hạn)
  onToggle: () => void;
  onLook: LookFn;
  onChange: (meaning: string) => void;
  onDelete: () => void;
}) {
  const { t, lang } = useI18n();
  const [meaning, setMeaning] = useState(v.meaning);
  // Nghĩa đổi từ ngoài (AI điền hàng loạt, tải lại sổ) → cập nhật ô sửa
  const [shown, setShown] = useState(v.meaning);
  if (shown !== v.meaning) {
    setShown(v.meaning);
    setMeaning(v.meaning);
  }
  const [speaking, setSpeaking] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  // "/lesson/3" → màn hình bài trong app; "/watch/abc" → màn hình video
  const source = v.sourceUrl?.match(/^\/(lesson|watch)\/([\w-]+)$/);
  // Câu đánh dấu sao ở màn học: lưu nguyên câu, không có câu ví dụ. Có khoảng trắng + có câu ví dụ = cụm từ đã lưu
  const kind = kindOf(v);
  const sentence = kind === "sentence";
  const phrase = kind === "phrase";
  // Từ lẻ thuộc 1 cụm trong câu ví dụ (vd. "betrachte" trong "als … betrachten") → hiện cụm đó ngay ở dòng thu gọn
  const own = sentence
    ? []
    : phrases.filter((p) =>
        phrase
          ? p.base.toLowerCase() === v.word.toLowerCase()
          : p.parts.some((part) => part.split(/\s+/).some((w) => bare(w) === v.word.toLowerCase())),
      );
  // Mức nhớ + lịch ôn
  const m = masteryMeta(masteryOfItem({ stage: v.stage ?? 0, mastery: v.mastery }), t);
  const due = isDue({ stage: v.stage ?? 0, dueAt: v.dueAt ?? null }, now);

  /** Lưu nghĩa đang sửa; server lỗi → trả nghĩa cũ + báo lỗi (không âm thầm mất) */
  const save = () => {
    const m = meaning.trim();
    const old = v.meaning;
    if (m === old) return;
    onChange(m);
    api(`/vocab/${v.id}`, { method: "PATCH", body: { meaning: m } }).catch((e) => {
      onChange(old);
      setMeaning(old);
      showError(e, t("vocab.saveFailed"));
    });
  };
  // Thu gọn dòng khi đang gõ (ô nhập bị gỡ, iOS không chắc gọi onEndEditing) → vẫn lưu
  const saveOnClose = useEffectEvent(save);
  useEffect(() => {
    if (!open) saveOnClose();
  }, [open]);

  // AI ghi nghĩa theo câu ví dụ — server lưu luôn
  const fillAi = async () => {
    if (aiBusy) return;
    setAiBusy(true);
    setAiError("");
    try {
      const { meaning: m } = await api<{ meaning: string }>(`/vocab/${v.id}`, { method: "POST" });
      setMeaning(m);
      onChange(m);
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setAiBusy(false);
    }
  };
  const speak = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speakGerman(v.word, { onEnd: () => setSpeaking(false) }).catch(() => setSpeaking(false));
  };

  return (
    <View
      style={{
        backgroundColor: C.card,
        borderColor: C.border,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderTopWidth: first ? 1 : 0,
        borderBottomWidth: last ? 1 : 0,
        borderTopLeftRadius: first ? 16 : 0,
        borderTopRightRadius: first ? 16 : 0,
        borderBottomLeftRadius: last ? 16 : 0,
        borderBottomRightRadius: last ? 16 : 0,
        overflow: "hidden",
      }}
    >
      {!first && <View style={{ height: 1, backgroundColor: C.border, marginLeft: 16 }} />}
      {/* Chạm dòng → mở / đóng; tra nghĩa bằng nút ⓘ riêng (không lẫn 2 vùng chạm trên cùng dòng chữ) */}
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingLeft: 14,
          paddingRight: 6,
          paddingVertical: 11,
          backgroundColor: pressed ? C.card2 : "transparent",
        })}
      >
        {/* Chấm màu = mức nhớ */}
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.color, alignSelf: sentence ? "flex-start" : "center", marginTop: sentence ? 8 : 0 }} accessibilityLabel={m.label} />
        <View style={{ flex: 1, gap: 2 }}>
          {sentence ? (
            <View style={{ flexDirection: "row", gap: 6 }}>
              <SymbolView name="star.fill" size={13} tintColor={C.amber} style={{ marginTop: 4 }} />
              <View style={{ flex: 1 }}>
                <Sentence
                  text={v.word}
                  phrases={phrases}
                  onLook={open ? onLook : undefined}
                  style={{ color: C.text, fontSize: 16, lineHeight: 22, fontWeight: "600" }}
                />
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {phrase && <SymbolView name="sparkles" size={14} tintColor={C.phrase} />}
              <Text style={{ flexShrink: 1, color: phrase ? C.phrase : C.text, fontSize: 17, fontWeight: "700" }} numberOfLines={1}>
                <HeadWord word={v.word} color={phrase ? C.phrase : C.text} />
              </Text>
              {due && (
                <Text style={{ color: C.amber, fontSize: 11, fontWeight: "800", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: "rgba(250,204,21,0.12)", overflow: "hidden" }}>
                  {t("vocab.due")}
                </Text>
              )}
            </View>
          )}
          {/* Đang mở thì nghĩa nằm trong ô sửa bên dưới */}
          {open ? null : v.meaning ? (
            <Text style={{ color: C.muted, fontSize: 14 }} numberOfLines={sentence ? 3 : 1}>
              {v.meaning}
            </Text>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ color: "#a16207", fontSize: 14, fontStyle: "italic" }}>{t("vocab.noMeaning")}</Text>
              <AiButton busy={aiBusy} onPress={fillAi} label={t("vocab.aiFill")} />
            </View>
          )}
          {!open && !!aiError && <ErrorText>{aiError}</ErrorText>}
          {/* Câu đánh dấu sao: cụm từ trong câu · từ lẻ: cụm chứa từ đó (cụm đã lưu thì nghĩa chính là của cụm, khỏi lặp) */}
          {!open && !phrase && <PhraseLines phrases={sentence ? phrases : own} />}
        </View>
        {!sentence && (
          <Pressable onPress={() => onLook(v.word, v.context || v.word)} hitSlop={6} style={{ padding: 8 }} accessibilityLabel={t("vocab.explain")}>
            <SymbolView name="info.circle" size={18} tintColor={C.muted} />
          </Pressable>
        )}
        <Pressable onPress={speak} hitSlop={6} style={{ padding: 8 }} accessibilityLabel={t("vocab.listen")}>
          <SymbolView name={speaking ? "stop.fill" : "speaker.wave.2.fill"} size={18} tintColor={C.accent} />
        </Pressable>
      </Pressable>

      {open && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Input
              value={meaning}
              onChangeText={setMeaning}
              onEndEditing={save}
              placeholder={t("vocab.meaning")}
              returnKeyType="done"
              editable={!aiBusy}
              style={{ flex: 1 }}
            />
            <AiButton busy={aiBusy} onPress={fillAi} label={t("vocab.aiFill")} />
          </View>
          <ErrorText>{aiError}</ErrorText>
          {/* Mức nhớ · lịch ôn · số lần quên */}
          <Text style={{ color: C.muted, fontSize: 13 }}>
            <Text style={{ color: m.color, fontWeight: "700" }}>{m.label}</Text>
            {" · "}
            {!v.stage
              ? t("vocab.notReviewed")
              : due
                ? t("vocab.dueNow")
                : v.dueAt
                  ? t("vocab.nextReview", { d: new Date(v.dueAt).toLocaleDateString(lang, { day: "numeric", month: "numeric" }) })
                  : ""}
            {!!v.lapses && ` · ${t("vocab.lapses", { n: v.lapses })}`}
          </Text>
          {!!v.context && (
            <View style={{ backgroundColor: C.background, padding: 12, borderRadius: 12, gap: 6 }}>
              <Sentence text={v.context} phrases={phrase ? own : phrases} word={v.word} onLook={onLook} style={{ color: C.muted, fontSize: 15, lineHeight: 21 }} />
              {!phrase && <PhraseLines phrases={phrases} />}
            </View>
          )}
          {sentence && <PhraseLines phrases={phrases} />}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {source ? (
              <Pressable
                style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}
                hitSlop={8}
                onPress={() => router.push(source[1] === "lesson" ? `/lesson/${source[2]}` : `/watch/${source[2]}`)}
              >
                <SymbolView name="arrow.up.right.square" size={14} tintColor={C.amber} />
                <Text style={{ flex: 1, color: C.amber, fontWeight: "700" }} numberOfLines={1}>
                  {v.sourceTitle || t("vocab.openLesson")}
                </Text>
              </Pressable>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <Pressable hitSlop={10} style={{ flexDirection: "row", alignItems: "center", gap: 4 }} onPress={onDelete}>
              <SymbolView name="trash" size={14} tintColor={C.redText} />
              <Text style={{ color: C.redText, fontWeight: "700" }}>{t("delete")}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export default function VocabScreen() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [items, setItems] = useState<VocabItem[] | null>(null);
  const [loadedAt, setLoadedAt] = useState(0); // thời điểm tải sổ (xét đến hạn ôn)
  const loaded = useRef<{ version: number; at: number } | null>(null); // lần tải gần nhất ứng với phiên bản sổ nào
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("new");
  const [status, setStatus] = useState<Status | null>(null);
  const [kind, setKind] = useState<Kind | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [phr, setPhr] = useState<Record<string, Phrase[]>>({}); // "<ngôn ngữ>|<câu>" → cụm từ trong câu
  const phrAsked = useRef<Set<string>>(new Set());
  const [lookup, setLookup] = useState<{ word: string; context: string; marks?: string[]; source?: VocabItem } | null>(null);
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null); // AI điền nghĩa hàng loạt
  const [trash, setTrash] = useState<VocabItem | null>(null); // vừa xoá, còn hoàn tác được
  const trashRef = useRef<{ item: VocabItem; timer: ReturnType<typeof setTimeout> } | null>(null);
  const { tablet } = useLayout();
  const PAD = tablet ? 24 : 16;

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setError("");
      const version = getVocabVersion(); // lấy trước khi tải: có thay đổi trong lúc tải → lần sau tải lại
      setItems((await api<{ vocab: VocabItem[] }>("/vocab")).vocab);
      const at = Date.now();
      setLoadedAt(at);
      loaded.current = { version, at };
    } catch (e) {
      setError((e as Error).message);
    }
  }, [user]);

  // Đổi tài khoản → bỏ sổ cũ
  useEffect(() => {
    loaded.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- xoá dữ liệu của tài khoản trước
    setItems(null);
  }, [user]);

  // Mở tab: chỉ tải lại khi sổ đã đổi (lưu / sửa / ôn ở màn khác) hoặc lâu chưa tải — sổ lớn tải lại mỗi lần rất chậm
  useFocusEffect(
    useCallback(() => {
      const l = loaded.current;
      if (!l || l.version !== getVocabVersion() || Date.now() - l.at > STALE_MS) load();
    }, [load]),
  );

  /** Xoá thật trên server; lỗi → trả mục về danh sách + báo lỗi */
  const commitDelete = (v: VocabItem) =>
    api(`/vocab/${v.id}`, { method: "DELETE" }).catch((e) => {
      setItems((list) => (list ? [...list, v].sort(byNewest) : list));
      showError(e, t("vocab.deleteFailed"));
    });
  /** Mục đang chờ hoàn tác → xoá thật ngay */
  const flushTrash = () => {
    const p = trashRef.current;
    if (!p) return;
    clearTimeout(p.timer);
    trashRef.current = null;
    setTrash(null);
    commitDelete(p.item);
  };
  // Rời tab khi còn mục chờ hoàn tác → xoá thật luôn (cleanup cần bản hàm mới nhất → qua ref)
  const flushRef = useRef(flushTrash);
  useEffect(() => {
    flushRef.current = flushTrash;
  });
  useFocusEffect(useCallback(() => () => flushRef.current(), []));

  const all = useMemo(() => items ?? [], [items]);

  // ---- Cụm từ cố định: chỉ hỏi cho các dòng đang hiện trên màn hình (sổ lớn không gửi AI cả sổ một lúc) ----
  const [visibleTexts, setVisibleTexts] = useState<string[]>([]); // câu của các dòng đang hiện
  // onViewableItemsChanged không được đổi giữa các lần render → tạo 1 lần
  const [onViewable] = useState(() => ({ viewableItems }: { viewableItems: { item?: VocabItem | null }[] }) =>
    setVisibleTexts([...new Set(viewableItems.map((x) => (x.item ? phraseText(x.item) : "")).filter(Boolean))]),
  );
  useEffect(() => {
    const want = visibleTexts.filter((x) => x.length <= 500 && !phrAsked.current.has(`${lang}|${x}`)); // server nhận câu ≤ 500 ký tự
    if (!want.length) return;
    // Chờ cuộn dừng một chút → gom các dòng vừa hiện thành ít lần gọi (≤ 40 câu / lần)
    const timer = setTimeout(() => {
      for (let i = 0; i < want.length; i += 40) {
        const chunk = want.slice(i, i + 40);
        chunk.forEach((x) => phrAsked.current.add(`${lang}|${x}`));
        api<{ phrases: Phrase[][] }>("/phrases", { method: "POST", body: { sentences: chunk, lang } })
          .then((r) => setPhr((prev) => ({ ...prev, ...Object.fromEntries(chunk.map((x, k) => [`${lang}|${x}`, r.phrases[k] ?? []])) })))
          .catch(() => chunk.forEach((x) => phrAsked.current.delete(`${lang}|${x}`))); // lỗi → lần hiện sau hỏi lại
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [visibleTexts, lang]);

  // ---- Lọc + nhóm ----
  const counts = useMemo(
    () => ({
      due: all.filter((v) => isDue({ stage: v.stage ?? 0, dueAt: v.dueAt ?? null }, loadedAt)).length,
      weak: all.filter((v) => (v.lapses ?? 0) > 0).length,
      empty: all.filter((v) => !v.meaning).length,
      word: all.filter((v) => kindOf(v) === "word").length,
      phrase: all.filter((v) => kindOf(v) === "phrase").length,
      sentence: all.filter((v) => kindOf(v) === "sentence").length,
    }),
    [all, loadedAt],
  );
  const query = norm(q.trim());
  const shown = useMemo(
    () =>
      all.filter(
        (v) =>
          (status !== "due" || isDue({ stage: v.stage ?? 0, dueAt: v.dueAt ?? null }, loadedAt)) &&
          (status !== "weak" || (v.lapses ?? 0) > 0) &&
          (status !== "empty" || !v.meaning) &&
          (!kind || kindOf(v) === kind) &&
          (!query || norm(v.word).includes(query) || norm(v.meaning).includes(query) || norm(v.context).includes(query)),
      ),
    [all, status, kind, query, loadedAt],
  );
  const sections = useMemo(
    () => (sort === "az" ? byLetter(shown) : groupBySaved(shown, t, lang).map(({ title, data }) => ({ title, data }))),
    [shown, sort, t, lang],
  );

  if (!user) {
    return (
      <SafeAreaView style={[styles.screen, { padding: PAD, gap: 16 }]} edges={["top"]}>
        <Text style={styles.h1}>{t("vocab.title")}</Text>
        <Card style={{ maxWidth: FORM_MAX }}>
          <Text style={styles.muted}>{t("vocab.loginHint")}</Text>
          <Button title={t("login")} variant="primary" onPress={() => router.push("/account")} />
        </Card>
      </SafeAreaView>
    );
  }

  const lookUp = (word: string, context: string, marks?: string[], source?: VocabItem) => {
    stopSpeaking();
    setLookup({ word, context, marks, source });
  };
  const findSaved = (word: string) => all.find((x) => x.word.toLowerCase() === word.toLowerCase());
  // Lưu từ tra được (từ trong câu chưa có trong sổ) → hiện luôn trong danh sách; kèm nguồn (bài / video) của câu
  const saveLooked = async (word: string, context: string, meaning: string, source?: VocabItem) => {
    try {
      const r = await api<{ vocab: VocabItem[] }>("/vocab", {
        method: "POST",
        body: { word, context, sourceUrl: source?.sourceUrl ?? null, sourceTitle: source?.sourceTitle ?? "" },
      });
      const item = r.vocab.find((x) => x.word.toLowerCase() === word.toLowerCase());
      if (item && !item.meaning && meaning) await api(`/vocab/${item.id}`, { method: "PATCH", body: { meaning } }).catch(() => {});
      await load();
    } catch (e) {
      showError(e, t("player.saveFailed"));
    }
  };

  /** Xoá kèm "Hoàn tác": gỡ khỏi danh sách ngay, chờ UNDO_MS mới xoá thật (xoá mất cả lịch sử ôn) */
  const remove = (v: VocabItem) => {
    flushTrash(); // mục xoá trước đó → xoá thật luôn
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems((list) => list?.filter((x) => x.id !== v.id) ?? null);
    if (openId === v.id) setOpenId(null);
    const timer = setTimeout(() => {
      trashRef.current = null;
      setTrash(null);
      commitDelete(v);
    }, UNDO_MS);
    trashRef.current = { item: v, timer };
    setTrash(v);
  };
  const undo = () => {
    const p = trashRef.current;
    if (!p) return;
    clearTimeout(p.timer);
    trashRef.current = null;
    setTrash(null);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems((list) => (list ? [...list, p.item].sort(byNewest) : list));
  };
  const unsaveLooked = async (word: string) => {
    const item = findSaved(word);
    if (item) remove(item);
  };

  /** AI điền nghĩa cho mọi mục chưa có nghĩa (vài yêu cầu song song, mục nào xong hiện ngay) */
  const fillAll = async () => {
    const list = all.filter((v) => !v.meaning);
    if (!list.length || bulk) return;
    setBulk({ done: 0, total: list.length });
    let next = 0;
    let failed = 0;
    const worker = async () => {
      while (next < list.length) {
        const v = list[next++];
        try {
          const { meaning } = await api<{ meaning: string }>(`/vocab/${v.id}`, { method: "POST" });
          setItems((l) => l?.map((x) => (x.id === v.id ? { ...x, meaning } : x)) ?? null);
        } catch {
          failed++;
        }
        setBulk((b) => b && { ...b, done: b.done + 1 });
      }
    };
    await Promise.all(Array.from({ length: AI_WORKERS }, worker));
    setBulk(null);
    if (failed) notice(t("vocab.aiFillFailed", { n: failed }));
  };

  /** Xuất các mục đang hiện (theo lọc / tìm kiếm) dạng bảng TSV: từ · nghĩa · câu ví dụ — dán vào Anki / bảng tính */
  const exportList = () => {
    const clean = (s: string) => s.replace(/[\t\n]+/g, " ").trim();
    const tsv = shown.map((v) => [v.word, v.meaning, v.context].map(clean).join("\t")).join("\n");
    Share.share({ message: tsv, title: t("vocab.export") }).catch(() => {});
  };

  const toggle = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId(openId === id ? null : id);
  };
  const pickStatus = (s: Status) => setStatus(status === s ? null : s);
  const pickKind = (k: Kind) => setKind(kind === k ? null : k);
  const filtered = !!(query || status || kind);
  // Mỗi nút lọc chỉ hiện khi có mục — trừ khi đang bật (để luôn tắt được, kể cả khi vừa hết mục khớp)
  const statusChips: { key: Status; label: string; icon: SFSymbol; n: number }[] = [
    { key: "due", label: t("vocab.due"), icon: "clock", n: counts.due },
    { key: "weak", label: t("vocab.weak"), icon: "exclamationmark.triangle", n: counts.weak },
    { key: "empty", label: t("vocab.noMeaning"), icon: "pencil.line", n: counts.empty },
  ];
  const kindChips: { key: Kind; label: string; n: number }[] = [
    { key: "word", label: t("vocab.typeWord"), n: counts.word },
    { key: "phrase", label: t("vocab.typePhrase"), n: counts.phrase },
    { key: "sentence", label: t("vocab.typeSentence"), n: counts.sentence },
  ];
  // Chỉ có 1 loại mục thì lọc theo loại vô nghĩa
  const showKinds = kindChips.filter((c) => c.n > 0).length > 1 || !!kind;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <SectionList
        sections={sections}
        keyExtractor={(v) => String(v.id)}
        stickySectionHeadersEnabled
        style={{ width: "100%", maxWidth: CONTENT_MAX, alignSelf: "center" }}
        contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 10 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={C.accent}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 12, paddingTop: tablet ? 20 : 12, paddingBottom: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.h1}>{t("vocab.title")}</Text>
                <Text style={styles.muted}>{items ? t("vocab.count", { n: all.length }) : t("loading")}</Text>
              </View>
              {/* Thêm từ tự do (không cần gặp trong bài học) */}
              <Pressable onPress={() => router.push("/vocab-add")} hitSlop={8} style={{ padding: 6 }} accessibilityRole="button" accessibilityLabel={t("vocab.add")}>
                <SymbolView name="plus.circle.fill" size={24} tintColor={C.accent} />
              </Pressable>
              {all.length > 0 && (
                <Pressable onPress={exportList} hitSlop={8} style={{ padding: 6 }} accessibilityRole="button" accessibilityLabel={t("vocab.export")}>
                  <SymbolView name="square.and.arrow.up" size={20} tintColor={C.muted} />
                </Pressable>
              )}
              {/* Có mục đến hạn → nút nổi bật kèm số mục */}
              {all.length > 0 && (
                <Button
                  title={counts.due ? t("vocab.reviewDue", { n: counts.due }) : t("vocab.review")}
                  variant={counts.due ? "primary" : "amber"}
                  icon={<SymbolView name="rectangle.stack.fill" size={16} tintColor={counts.due ? "#fff" : C.amber} />}
                  onPress={() => router.push("/review")}
                  style={{ paddingVertical: 9 }}
                />
              )}
            </View>
            {all.length > 0 && (
              <>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.card2 }}
                >
                  <SymbolView name="magnifyingglass" size={16} tintColor={C.muted} />
                  <TextInput
                    value={q}
                    onChangeText={setQ}
                    placeholder={t("vocab.search")}
                    placeholderTextColor="#5b6b60"
                    autoCapitalize="none"
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                    returnKeyType="search"
                    style={{ flex: 1, color: C.text, fontSize: 16, height: "100%" }}
                  />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Segmented
                    options={[
                      ["new", t("vocab.sortNew")],
                      ["az", "A–Z"],
                    ]}
                    value={sort}
                    onChange={setSort}
                  />
                </View>
                {/* Lọc: tình trạng ôn · loại mục */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {statusChips
                    .filter((c) => c.n > 0 || status === c.key)
                    .map((c) => (
                      <Chip key={c.key} label={`${c.label} · ${c.n}`} icon={c.icon} active={status === c.key} onPress={() => pickStatus(c.key)} />
                    ))}
                  {showKinds &&
                    kindChips
                      .filter((c) => c.n > 0 || kind === c.key)
                      .map((c) => <Chip key={c.key} label={`${c.label} · ${c.n}`} active={kind === c.key} onPress={() => pickKind(c.key)} />)}
                </ScrollView>
                {/* Đang lọc "Chưa ghi nghĩa" → điền hết bằng AI một lần */}
                {status === "empty" && (counts.empty > 0 || bulk) && (
                  <Button
                    title={bulk ? t("vocab.aiFilling", { done: bulk.done, total: bulk.total }) : t("vocab.aiFillAll", { n: counts.empty })}
                    variant="amber"
                    loading={!!bulk}
                    icon={<SymbolView name="sparkles" size={15} tintColor={C.amber} />}
                    onPress={fillAll}
                  />
                )}
              </>
            )}
            <ErrorText>{error}</ErrorText>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={{ backgroundColor: C.background, paddingTop: 14, paddingBottom: 6, paddingHorizontal: 4, flexDirection: "row" }}>
            <Text style={{ flex: 1, color: C.muted, fontSize: 13, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" }}>
              {section.title}
            </Text>
            <Text style={{ color: "#4a5a50", fontSize: 13, fontWeight: "700" }}>{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <VocabRow
            v={item}
            first={index === 0}
            last={index === section.data.length - 1}
            open={openId === item.id}
            now={loadedAt}
            phrases={phr[`${lang}|${phraseText(item)}`] ?? []}
            onToggle={() => toggle(item.id)}
            onLook={(w, c, m) => lookUp(w, c, m, item)}
            onChange={(meaning) => setItems((list) => list?.map((x) => (x.id === item.id ? { ...x, meaning } : x)) ?? null)}
            onDelete={() => remove(item)}
          />
        )}
        ListEmptyComponent={
          items ? (
            <View style={{ alignItems: "center", gap: 10, marginTop: 40, paddingHorizontal: 24 }}>
              <SymbolView name={filtered ? "magnifyingglass" : "bookmark"} size={36} tintColor={C.muted} />
              <Text style={[styles.muted, { textAlign: "center" }]}>
                {query ? t("vocab.notFound", { q }) : filtered ? t("vocab.noMatch") : t("vocab.empty")}
              </Text>
              {!filtered && (
                <Button
                  title={t("vocab.add")}
                  variant="primary"
                  icon={<SymbolView name="plus" size={15} tintColor="#fff" />}
                  onPress={() => router.push("/vocab-add")}
                  style={{ marginTop: 6 }}
                />
              )}
            </View>
          ) : undefined
        }
      />
      {/* Vừa xoá: hoàn tác trong vài giây */}
      {trash && (
        <View
          style={{
            position: "absolute",
            left: PAD,
            right: PAD,
            bottom: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            padding: 14,
            borderRadius: 14,
            backgroundColor: C.card2,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <Text style={{ flex: 1, color: C.text }} numberOfLines={1}>
            {t("vocab.deleted", { w: trash.word })}
          </Text>
          <Pressable onPress={undo} hitSlop={10} accessibilityRole="button">
            <Text style={{ color: C.amber, fontWeight: "800" }}>{t("vocab.undo")}</Text>
          </Pressable>
        </View>
      )}
      <WordSheet
        word={lookup?.word ?? null}
        context={lookup?.context ?? ""}
        marks={lookup?.marks}
        saved={!!lookup && !!findSaved(lookup.word)}
        onSave={(meaning) => (lookup ? saveLooked(lookup.word, lookup.context, meaning, lookup.source) : Promise.resolve())}
        onRemove={() => (lookup ? unsaveLooked(lookup.word) : Promise.resolve())}
        onClose={() => setLookup(null)}
      />
    </SafeAreaView>
  );
}
