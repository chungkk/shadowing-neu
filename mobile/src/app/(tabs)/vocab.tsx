import { router, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Fragment, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
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
import { Button, Card, ErrorText, Input, styles } from "@/components/ui";
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

/** Từ đang ở dạng số nhiều của danh từ ("Hunde" của "der Hund") */
const isPluralForm = (v: VocabItem) =>
  !!v.plural && v.word.toLowerCase() === v.plural.toLowerCase() && v.word.toLowerCase() !== (v.singular ?? "").toLowerCase();

/**
 * Từ kèm mạo từ tô màu theo giống: lưu sẵn mạo từ ("der Hund"), hoặc danh từ AI đã xác định giống ("Hund" → "der Hund").
 * Từ ở dạng số nhiều → "die" (mạo từ số nhiều, màu nhạt).
 */
function HeadWord({ v, color }: { v: VocabItem; color: string }) {
  const m = v.word.match(/^(der|die|das) /i);
  if (m)
    return (
      <>
        <Text style={{ color: GENDER[m[1].toLowerCase()] }}>{m[0]}</Text>
        <Text style={{ color }}>{v.word.slice(m[0].length)}</Text>
      </>
    );
  const g = v.gender;
  if (g !== "der" && g !== "die" && g !== "das") return v.word;
  const plural = isPluralForm(v);
  return (
    <>
      <Text style={{ color: plural ? C.muted : GENDER[g] }}>{plural ? "die " : `${g} `}</Text>
      <Text style={{ color }}>{v.word}</Text>
    </>
  );
}

/** Nút ✨ AI ghi nghĩa (cạnh ô sửa nghĩa) */
function AiButton({ busy, onPress, label }: { busy: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      hitSlop={8}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? C.border : C.card2,
      })}
    >
      {busy ? <ActivityIndicator size="small" color={C.amber} /> : <SymbolView name="sparkles" size={17} tintColor={C.amber} />}
    </Pressable>
  );
}

/** Nút lọc dạng viên thuốc, chỉ chữ + số (chạm lần nữa để bỏ lọc) */
function Chip({ label, n, active, onPress }: { label: string; n: number; active: boolean; onPress: () => void }) {
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
        paddingVertical: 7,
        borderRadius: 99,
        backgroundColor: active ? C.text : C.card2,
      }}
    >
      <Text style={{ color: active ? C.background : C.text, fontWeight: "600", fontSize: 13 }}>{label}</Text>
      <Text style={{ color: active ? C.background : C.muted, fontWeight: "600", fontSize: 13, opacity: active ? 0.6 : 1 }}>{n}</Text>
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
  phrasesOf,
  onDeleteExample,
  selecting,
  checked,
  onSelect,
  onLongPress,
}: {
  v: VocabItem;
  phrases: Phrase[]; // cụm từ cố định trong câu (câu đánh dấu sao, hoặc câu ví dụ của từ)
  phrasesOf: (text: string) => Phrase[]; // cụm từ của 1 câu ví dụ thêm
  onDeleteExample: (exampleId: number) => void;
  selecting: boolean; // đang chọn nhiều mục (để xoá)
  checked: boolean;
  onSelect: () => void;
  onLongPress: () => void; // nhấn giữ → bắt đầu chọn nhiều mục
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
        borderTopLeftRadius: first ? 14 : 0,
        borderTopRightRadius: first ? 14 : 0,
        borderBottomLeftRadius: last ? 14 : 0,
        borderBottomRightRadius: last ? 14 : 0,
        overflow: "hidden",
      }}
    >
      {!first && <View style={{ height: 1, backgroundColor: C.border, marginLeft: selecting ? 48 : 32 }} />}
      {/* Chạm dòng → mở / đóng; tra nghĩa bằng nút "Giải thích" khi mở (không lẫn 2 vùng chạm trên cùng dòng chữ) */}
      <Pressable
        onPress={selecting ? onSelect : onToggle}
        onLongPress={selecting ? undefined : onLongPress}
        delayLongPress={350}
        accessibilityRole={selecting ? "checkbox" : "button"}
        accessibilityState={selecting ? { checked } : { expanded: open }}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingLeft: 14,
          paddingRight: 4,
          paddingVertical: 12,
          backgroundColor: pressed ? C.card2 : "transparent",
        })}
      >
        {/* Đang chọn nhiều: ô chọn · bình thường: chấm màu = mức nhớ */}
        {selecting ? (
          <SymbolView name={checked ? "checkmark.circle.fill" : "circle"} size={22} tintColor={checked ? C.accent : C.muted} />
        ) : (
          <View
            style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: m.color, alignSelf: sentence ? "flex-start" : "center", marginTop: sentence ? 9 : 0 }}
            accessibilityLabel={m.label}
          />
        )}
        <View style={{ flex: 1, gap: 3 }}>
          {sentence ? (
            <Sentence
              text={v.word}
              phrases={phrases}
              onLook={open ? onLook : undefined}
              style={{ color: C.text, fontSize: 16, lineHeight: 22, fontWeight: "500" }}
            />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ flexShrink: 1, color: phrase ? C.phrase : C.text, fontSize: 17, fontWeight: "600" }} numberOfLines={1}>
                <HeadWord v={v} color={phrase ? C.phrase : C.text} />
              </Text>
              {due && <SymbolView name="clock" size={12} tintColor={C.amber} accessibilityLabel={t("vocab.due")} />}
            </View>
          )}
          {/* Đang mở thì nghĩa nằm trong ô sửa bên dưới */}
          {!open && (
            <Text
              style={{ color: C.muted, fontSize: 14, fontStyle: v.meaning ? "normal" : "italic", opacity: v.meaning ? 1 : 0.6 }}
              numberOfLines={sentence ? 2 : 1}
            >
              {v.meaning || t("vocab.noMeaning")}
            </Text>
          )}
        </View>
        {!selecting && (
          <Pressable onPress={speak} hitSlop={6} style={{ padding: 10 }} accessibilityLabel={t("vocab.listen")}>
            <SymbolView name={speaking ? "stop.fill" : "speaker.wave.2"} size={17} tintColor={speaking ? C.accent : C.muted} />
          </Pressable>
        )}
      </Pressable>

      {open && !selecting && (
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
          {/* Danh từ: dạng số ít kèm mạo từ · số nhiều */}
          {(v.gender === "der" || v.gender === "die" || v.gender === "das") && (
            <Text style={{ color: C.muted, fontSize: 14 }}>
              <Text style={{ color: GENDER[v.gender], fontWeight: "700" }}>{v.gender}</Text>
              <Text style={{ color: C.text, fontWeight: "700" }}> {v.singular || v.word}</Text>
              {" · "}
              {v.plural ? t("vocab.plural", { p: `die ${v.plural}` }) : t("vocab.noPlural")}
            </Text>
          )}
          {!!v.context && (
            <View style={{ backgroundColor: C.background, padding: 12, borderRadius: 12, gap: 6 }}>
              <Sentence text={v.context} phrases={phrase ? own : phrases} word={v.word} onLook={onLook} style={{ color: C.muted, fontSize: 15, lineHeight: 21 }} />
              {!phrase && <PhraseLines phrases={phrases} />}
            </View>
          )}
          {sentence && <PhraseLines phrases={phrases} />}
          {/* Câu ví dụ khác: gặp lại từ ở các câu khác (bài / video khác) */}
          {!!v.examples?.length && (
            <View style={{ gap: 8 }}>
              <Text style={{ color: C.muted, fontSize: 13, fontWeight: "600" }}>
                {t("vocab.moreExamples", { n: v.examples.length })}
              </Text>
              {v.examples.map((ex) => {
                const exSource = ex.sourceUrl?.match(/^\/(lesson|watch)\/([\w-]+)$/);
                return (
                  <View key={ex.id} style={{ backgroundColor: C.background, padding: 12, borderRadius: 12, gap: 6 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Sentence text={ex.context} phrases={phrasesOf(ex.context)} word={v.word} onLook={onLook} style={{ color: C.muted, fontSize: 15, lineHeight: 21 }} />
                      </View>
                      <Pressable onPress={() => onDeleteExample(ex.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("vocab.removeExample")}>
                        <SymbolView name="xmark" size={13} tintColor={C.muted} />
                      </Pressable>
                    </View>
                    {exSource && (
                      <Pressable
                        style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                        hitSlop={8}
                        onPress={() => router.push(exSource[1] === "lesson" ? `/lesson/${exSource[2]}` : `/watch/${exSource[2]}`)}
                      >
                        <SymbolView name="arrow.up.right" size={11} tintColor={C.muted} />
                        <Text style={{ flex: 1, color: C.muted, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                          {ex.sourceTitle || t("vocab.openLesson")}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          )}
          {/* Nguồn · giải thích · xoá */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingTop: 2 }}>
            {source ? (
              <Pressable
                style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}
                hitSlop={8}
                onPress={() => router.push(source[1] === "lesson" ? `/lesson/${source[2]}` : `/watch/${source[2]}`)}
              >
                <SymbolView name="arrow.up.right" size={12} tintColor={C.muted} />
                <Text style={{ flex: 1, color: C.muted, fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
                  {v.sourceTitle || t("vocab.openLesson")}
                </Text>
              </Pressable>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            {!sentence && (
              <Pressable
                hitSlop={10}
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                onPress={() => onLook(v.word, v.context || v.word)}
                accessibilityRole="button"
              >
                <SymbolView name="text.book.closed" size={14} tintColor={C.text} />
                <Text style={{ color: C.text, fontSize: 14, fontWeight: "600" }}>{t("vocab.explain")}</Text>
              </Pressable>
            )}
            <Pressable hitSlop={10} onPress={onDelete} accessibilityRole="button" accessibilityLabel={t("delete")}>
              <SymbolView name="trash" size={16} tintColor={C.redText} />
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
  const [trash, setTrash] = useState<VocabItem[] | null>(null); // vừa xoá, còn hoàn tác được
  const trashRef = useRef<{ items: VocabItem[]; timer: ReturnType<typeof setTimeout> } | null>(null);
  const [selected, setSelected] = useState<Set<number> | null>(null); // null = không ở chế độ chọn nhiều
  const nounAsked = useRef<Set<number>>(new Set()); // mục đã hỏi mạo từ
  const { tablet } = useLayout();
  const PAD = tablet ? 24 : 16;

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setError("");
      const version = getVocabVersion(); // lấy trước khi tải: có thay đổi trong lúc tải → lần sau tải lại
      // Câu ⭐ chỉ là đánh dấu trong bài học → không hiện trong sổ từ vựng
      setItems((await api<{ vocab: VocabItem[] }>("/vocab")).vocab.filter((v) => !isSentence(v)));
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

  /** Xoá thật trên server (1 mục, hoặc nhiều mục 1 lần); lỗi → trả các mục về danh sách + báo lỗi */
  const commitDelete = (list: VocabItem[]) =>
    (list.length === 1
      ? api(`/vocab/${list[0].id}`, { method: "DELETE" })
      : api("/vocab", { method: "DELETE", body: { ids: list.map((v) => v.id) } })
    ).catch((e) => {
      setItems((cur) => (cur ? [...cur, ...list].sort(byNewest) : cur));
      showError(e, t("vocab.deleteFailed"));
    });
  /** Mục đang chờ hoàn tác → xoá thật ngay */
  const flushTrash = () => {
    const p = trashRef.current;
    if (!p) return;
    clearTimeout(p.timer);
    trashRef.current = null;
    setTrash(null);
    commitDelete(p.items);
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
  const [visibleNouns, setVisibleNouns] = useState<number[]>([]); // từ lẻ đang hiện chưa biết có phải danh từ
  // onViewableItemsChanged không được đổi giữa các lần render → tạo 1 lần
  const [onViewable] = useState(() => ({ viewableItems }: { viewableItems: { item?: unknown }[] }) => {
    // SectionList: tiêu đề / chân nhóm cũng "hiện" với item = cả nhóm { title, data } → chỉ giữ mục sổ từ thật
    const list = viewableItems.map((x) => x.item).filter((x): x is VocabItem => typeof (x as VocabItem | null)?.word === "string");
    setVisibleTexts([...new Set(list.map(phraseText).filter(Boolean))]);
    // gender "" = chưa xác định (undefined = server cũ, không có API → bỏ qua)
    setVisibleNouns(list.filter((v) => v.gender === "" && kindOf(v) === "word").map((v) => v.id));
  });
  // Câu ví dụ thêm của dòng đang mở cũng cần cụm từ
  const openExamples = useMemo(() => all.find((v) => v.id === openId)?.examples?.map((e) => e.context) ?? [], [all, openId]);
  useEffect(() => {
    const want = [...new Set([...visibleTexts, ...openExamples])].filter((x) => x.length <= 500 && !phrAsked.current.has(`${lang}|${x}`)); // server nhận câu ≤ 500 ký tự
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
  }, [visibleTexts, openExamples, lang]);

  // Mạo từ + số nhiều cho danh từ đang hiện (AI xác định 1 lần, server lưu vào sổ)
  useEffect(() => {
    const want = visibleNouns.filter((id) => !nounAsked.current.has(id)).slice(0, 40);
    if (!want.length) return;
    const timer = setTimeout(() => {
      want.forEach((id) => nounAsked.current.add(id));
      api<{ items: { id: number; gender: VocabItem["gender"]; singular: string; plural: string }[] }>("/vocab/nouns", {
        method: "POST",
        body: { ids: want },
      })
        .then(({ items: got }) => {
          const m = new Map(got.map((g) => [g.id, g]));
          setItems((list) => list?.map((v) => (m.has(v.id) ? { ...v, ...m.get(v.id)!, id: v.id } : v)) ?? null);
        })
        .catch(() => want.forEach((id) => nounAsked.current.delete(id))); // lỗi → lần hiện sau hỏi lại
    }, 400);
    return () => clearTimeout(timer);
  }, [visibleNouns]);

  // ---- Lọc + nhóm ----
  const counts = useMemo(
    () => ({
      due: all.filter((v) => isDue({ stage: v.stage ?? 0, dueAt: v.dueAt ?? null }, loadedAt)).length,
      weak: all.filter((v) => (v.lapses ?? 0) > 0).length,
      empty: all.filter((v) => !v.meaning).length,
      word: all.filter((v) => kindOf(v) === "word").length,
      phrase: all.filter((v) => kindOf(v) === "phrase").length,
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
          (!query ||
            norm(v.word).includes(query) ||
            norm(v.meaning).includes(query) ||
            norm(v.context).includes(query) ||
            !!v.examples?.some((e) => norm(e.context).includes(query))),
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

  /** Xoá kèm "Hoàn tác" (1 hoặc nhiều mục): gỡ khỏi danh sách ngay, chờ UNDO_MS mới xoá thật (xoá mất cả lịch sử ôn) */
  const remove = (list: VocabItem[]) => {
    if (!list.length) return;
    flushTrash(); // mục xoá trước đó → xoá thật luôn
    const ids = new Set(list.map((v) => v.id));
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems((cur) => cur?.filter((x) => !ids.has(x.id)) ?? null);
    if (openId !== null && ids.has(openId)) setOpenId(null);
    const timer = setTimeout(() => {
      trashRef.current = null;
      setTrash(null);
      commitDelete(list);
    }, UNDO_MS);
    trashRef.current = { items: list, timer };
    setTrash(list);
  };
  const undo = () => {
    const p = trashRef.current;
    if (!p) return;
    clearTimeout(p.timer);
    trashRef.current = null;
    setTrash(null);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems((list) => (list ? [...list, ...p.items].sort(byNewest) : list));
  };
  const unsaveLooked = async (word: string) => {
    const item = findSaved(word);
    if (item) remove([item]);
  };

  /** Bỏ 1 câu ví dụ thêm (lỗi → trả lại + báo) */
  const deleteExample = (v: VocabItem, exampleId: number) => {
    const before = v.examples ?? [];
    const patch = (examples: typeof before) => setItems((list) => list?.map((x) => (x.id === v.id ? { ...x, examples } : x)) ?? null);
    patch(before.filter((e) => e.id !== exampleId));
    api(`/vocab/${v.id}/examples/${exampleId}`, { method: "DELETE" }).catch((e) => {
      patch(before);
      showError(e, t("vocab.deleteFailed"));
    });
  };

  // ---- Chọn nhiều mục để xoá ----
  const startSelect = (id?: number) => {
    setOpenId(null);
    setSelected(new Set(id === undefined ? [] : [id]));
  };
  const toggleSelect = (id: number) =>
    setSelected((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allShownSelected = !!selected && shown.length > 0 && shown.every((v) => selected.has(v.id));
  const deleteSelected = () => {
    if (!selected?.size) return;
    remove(all.filter((v) => selected.has(v.id)));
    setSelected(null);
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
    const tsv = shown
      .map((v) => [v.word, v.meaning, v.context, (v.examples ?? []).map((e) => e.context).join(" | ")].map(clean).join("\t"))
      .join("\n");
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
  const statusChips: { key: Status; label: string; n: number }[] = [
    { key: "due", label: t("vocab.due"), n: counts.due },
    { key: "weak", label: t("vocab.weak"), n: counts.weak },
    { key: "empty", label: t("vocab.noMeaning"), n: counts.empty },
  ];
  const kindChips: { key: Kind; label: string; n: number }[] = [
    { key: "word", label: t("vocab.typeWord"), n: counts.word },
    { key: "phrase", label: t("vocab.typePhrase"), n: counts.phrase },
  ];
  // Chỉ có 1 loại mục thì lọc theo loại vô nghĩa
  const showKinds = kindChips.filter((c) => c.n > 0).length > 1 || !!kind;

  /** Menu ⋯: sắp xếp · chọn nhiều · xuất */
  const openMenu = () => {
    const actions: [string, () => void][] = [
      [sort === "new" ? t("vocab.sortToAz") : t("vocab.sortToNew"), () => setSort(sort === "new" ? "az" : "new")],
      [t("vocab.select"), () => startSelect()],
      [t("vocab.export"), exportList],
    ];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...actions.map(([label]) => label), t("cancel")], cancelButtonIndex: actions.length },
        (i) => actions[i]?.[1](),
      );
    } else {
      Alert.alert(t("vocab.more"), undefined, [
        ...actions.map(([text, onPress]) => ({ text, onPress })),
        { text: t("cancel"), style: "cancel" as const },
      ]);
    }
  };

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
            {/* Đang chọn nhiều: Huỷ · Đã chọn n · Chọn tất cả · Xoá — thay hàng tiêu đề */}
            {selected ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56 }}>
                <Pressable onPress={() => setSelected(null)} hitSlop={8} accessibilityRole="button">
                  <Text style={{ color: C.muted, fontWeight: "700", fontSize: 16 }}>{t("vocab.cancel")}</Text>
                </Pressable>
                <Text style={{ flex: 1, color: C.text, fontWeight: "800", fontSize: 17, textAlign: "center" }}>{t("vocab.selected", { n: selected.size })}</Text>
                <Pressable
                  onPress={() => setSelected(allShownSelected ? new Set() : new Set(shown.map((v) => v.id)))}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <Text style={{ color: C.amber, fontWeight: "700", fontSize: 15 }}>{allShownSelected ? t("vocab.selectNone") : t("vocab.selectAll")}</Text>
                </Pressable>
                <Pressable onPress={deleteSelected} disabled={!selected.size} hitSlop={8} accessibilityRole="button">
                  <Text style={{ color: C.redText, fontWeight: "700", fontSize: 15, opacity: selected.size ? 1 : 0.4 }}>
                    {t("vocab.deleteSelected", { n: selected.size })}
                  </Text>
                </Pressable>
              </View>
            ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.h1}>{t("vocab.title")}</Text>
                <Text style={[styles.muted, { fontSize: 14 }]}>{items ? t("vocab.count", { n: all.length }) : t("loading")}</Text>
              </View>
              {/* Có mục đến hạn → viên xanh kèm số mục */}
              {all.length > 0 && (
                <Pressable
                  onPress={() => router.push("/review")}
                  accessibilityRole="button"
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 14,
                    height: 36,
                    borderRadius: 99,
                    backgroundColor: counts.due ? C.accent : C.card2,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <SymbolView name="rectangle.stack" size={14} tintColor={counts.due ? "#fff" : C.text} />
                  <Text style={{ color: counts.due ? "#fff" : C.text, fontWeight: "700", fontSize: 14 }}>
                    {counts.due ? t("vocab.reviewDue", { n: counts.due }) : t("vocab.review")}
                  </Text>
                </Pressable>
              )}
              {/* Thêm từ tự do (không cần gặp trong bài học) */}
              <Pressable onPress={() => router.push("/vocab-add")} hitSlop={6} style={{ padding: 6 }} accessibilityRole="button" accessibilityLabel={t("vocab.add")}>
                <SymbolView name="plus" size={20} tintColor={C.text} />
              </Pressable>
              {all.length > 0 && (
                <Pressable onPress={openMenu} hitSlop={6} style={{ padding: 6 }} accessibilityRole="button" accessibilityLabel={t("vocab.more")}>
                  <SymbolView name="ellipsis" size={20} tintColor={C.text} />
                </Pressable>
              )}
            </View>
            )}
            {all.length > 0 && (
              <>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 40, paddingHorizontal: 12, borderRadius: 10, backgroundColor: C.card2 }}
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
                {/* Lọc: tình trạng ôn · loại mục (vạch mảnh ngăn 2 nhóm) */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: "center" }}>
                  {statusChips
                    .filter((c) => c.n > 0 || status === c.key)
                    .map((c) => (
                      <Chip key={c.key} label={c.label} n={c.n} active={status === c.key} onPress={() => pickStatus(c.key)} />
                    ))}
                  {showKinds && <View style={{ width: 1, height: 18, backgroundColor: C.border }} />}
                  {showKinds &&
                    kindChips
                      .filter((c) => c.n > 0 || kind === c.key)
                      .map((c) => <Chip key={c.key} label={c.label} n={c.n} active={kind === c.key} onPress={() => pickKind(c.key)} />)}
                </ScrollView>
                {/* Đang lọc "Chưa ghi nghĩa" → điền hết bằng AI một lần */}
                {status === "empty" && (counts.empty > 0 || bulk) && (
                  <Pressable
                    onPress={fillAll}
                    disabled={!!bulk}
                    accessibilityRole="button"
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingHorizontal: 14,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: pressed ? C.border : C.card2,
                    })}
                  >
                    {bulk ? <ActivityIndicator size="small" color={C.amber} /> : <SymbolView name="sparkles" size={15} tintColor={C.amber} />}
                    <Text style={{ color: C.text, fontWeight: "600", fontSize: 15 }}>
                      {bulk ? t("vocab.aiFilling", { done: bulk.done, total: bulk.total }) : t("vocab.aiFillAll", { n: counts.empty })}
                    </Text>
                  </Pressable>
                )}
              </>
            )}
            <ErrorText>{error}</ErrorText>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={{ backgroundColor: C.background, paddingTop: 18, paddingBottom: 8, paddingHorizontal: 4, flexDirection: "row" }}>
            <Text style={{ flex: 1, color: C.muted, fontSize: 13, fontWeight: "600" }}>{section.title}</Text>
            <Text style={{ color: C.muted, fontSize: 13, opacity: 0.6 }}>{section.data.length}</Text>
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
            onDelete={() => remove([item])}
            phrasesOf={(text) => phr[`${lang}|${text}`] ?? []}
            onDeleteExample={(exampleId) => deleteExample(item, exampleId)}
            selecting={!!selected}
            checked={!!selected?.has(item.id)}
            onSelect={() => toggleSelect(item.id)}
            onLongPress={() => startSelect(item.id)}
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
            {trash.length === 1 ? t("vocab.deleted", { w: trash[0].word }) : t("vocab.deletedMany", { n: trash.length })}
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
