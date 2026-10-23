import { router, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, LayoutAnimation, Pressable, RefreshControl, SectionList, Text, TextInput, View, type TextStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { tokenize, type Phrase } from "@shared/phrase-match";
import { Button, Card, ErrorText, Input, Segmented, styles } from "@/components/ui";
import { WordSheet } from "@/components/WordSheet";
import { api, type VocabItem } from "@/lib/api";
import { confirmDestructive, showError } from "@/lib/dialogs";
import { useAuth } from "@/lib/auth";
import { C } from "@/lib/theme";
import { useI18n, type TFn } from "@/lib/i18n";
import { CONTENT_MAX, FORM_MAX, useLayout } from "@/lib/layout";
import { speakGerman, stopSpeaking } from "@/lib/speak";

type Sort = "new" | "az";
type Section = { title: string; data: VocabItem[] };

/** Bỏ dấu + chữ thường: "Straße" ~ "strasse", "Ärger" ~ "arger" (tìm kiếm + nhóm A–Z) */
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

/** "2026-10-19 08:00:00" (UTC) → Date */
const parseDate = (s: string) => new Date(s.replace(" ", "T") + "Z");

/** Nhóm theo thời gian lưu: Hôm nay · Hôm qua · 7 ngày qua · từng tháng */
function byDate(items: VocabItem[], t: TFn, lang: string): Section[] {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const day = 86400000;
  const groups = new Map<string, VocabItem[]>();
  for (const v of items) {
    const d = parseDate(v.createdAt);
    const title = isNaN(+d)
      ? "—"
      : d >= startOfDay
        ? t("vocab.today")
        : +d >= +startOfDay - day
          ? t("vocab.yesterday")
          : +d >= +startOfDay - 6 * day
            ? t("vocab.week")
            : d.toLocaleDateString(lang, { month: "long", year: "numeric" });
    (groups.get(title) ?? groups.set(title, []).get(title)!).push(v);
  }
  return [...groups].map(([title, data]) => ({ title, data }));
}

/** Nhóm theo chữ cái đầu (Ä → A, số / ký hiệu → #) */
function byLetter(items: VocabItem[]): Section[] {
  const sorted = [...items].sort((a, b) => a.word.localeCompare(b.word, "de", { sensitivity: "base" }));
  const groups = new Map<string, VocabItem[]>();
  for (const v of sorted) {
    const c = norm(v.word)[0]?.toUpperCase() ?? "#";
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

function VocabRow({
  v,
  first,
  last,
  open,
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
  onToggle: () => void;
  onLook: LookFn;
  onChange: (meaning: string) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const [meaning, setMeaning] = useState(v.meaning);
  const [speaking, setSpeaking] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  // "/lesson/3" → màn hình bài trong app; "/watch/abc" → màn hình video
  const source = v.sourceUrl?.match(/^\/(lesson|watch)\/([\w-]+)$/);
  // Câu đánh dấu sao ở màn học: lưu nguyên câu, không có câu ví dụ. Có khoảng trắng + có câu ví dụ = cụm từ đã lưu
  const sentence = v.word.includes(" ") && !v.context;
  const isPhrase = v.word.includes(" ") && !!v.context;
  // Từ lẻ thuộc 1 cụm trong câu ví dụ (vd. "betrachte" trong "als … betrachten") → hiện cụm đó ngay ở dòng thu gọn
  const own = sentence
    ? []
    : phrases.filter((p) =>
        isPhrase
          ? p.base.toLowerCase() === v.word.toLowerCase()
          : p.parts.some((part) => part.split(/\s+/).some((w) => bare(w) === v.word.toLowerCase())),
      );

  const save = () => {
    const m = meaning.trim();
    if (m === v.meaning) return;
    onChange(m);
    api(`/vocab/${v.id}`, { method: "PATCH", body: { meaning: m } }).catch(() => {});
  };
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
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingLeft: 16,
          paddingRight: 8,
          paddingVertical: 11,
          backgroundColor: pressed ? C.card2 : "transparent",
        })}
      >
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
              {isPhrase && <SymbolView name="sparkles" size={14} tintColor={C.phrase} />}
              {/* Chạm vào từ → bảng giải thích; chạm chỗ khác của dòng → mở/đóng */}
              <Text
                onPress={() => onLook(v.word, v.context || v.word)}
                suppressHighlighting={false}
                style={{ flexShrink: 1, color: isPhrase ? C.phrase : C.text, fontSize: 17, fontWeight: "700" }}
                numberOfLines={1}
              >
                {v.word}
              </Text>
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
          {!open && !isPhrase && <PhraseLines phrases={sentence ? phrases : own} />}
        </View>
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
          {!!v.context && (
            <View style={{ backgroundColor: C.background, padding: 12, borderRadius: 12, gap: 6 }}>
              <Sentence
                text={v.context}
                phrases={isPhrase ? own : phrases}
                word={v.word}
                onLook={onLook}
                style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}
              />
              {!isPhrase && <PhraseLines phrases={phrases} />}
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
            <Pressable
              hitSlop={10}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              onPress={() => confirmDestructive(t("vocab.deleteConfirm", { w: v.word }), t("vocab.deleteBody"), t("delete"), onDelete)}
            >
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
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("new");
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [phr, setPhr] = useState<Record<string, Phrase[]>>({}); // "<ngôn ngữ>|<câu>" → cụm từ trong câu
  const phrAsked = useRef<Set<string>>(new Set());
  const [lookup, setLookup] = useState<{ word: string; context: string; marks?: string[] } | null>(null);
  const { tablet } = useLayout();
  const PAD = tablet ? 24 : 16;

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setError("");
      setItems((await api<{ vocab: VocabItem[] }>("/vocab")).vocab);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [user]);

  // Mỗi lần mở tab thì tải lại (từ vừa lưu ở màn hình học sẽ hiện ra)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const all = useMemo(() => items ?? [], [items]);

  // Cụm từ của câu đánh dấu sao / câu ví dụ — câu đã học thì server có sẵn trong kho (không tốn AI)
  useEffect(() => {
    const texts = [...new Set(all.map((v) => v.context || (v.word.includes(" ") ? v.word : "")).filter(Boolean))].filter(
      (x) => x.length <= 500 && !phrAsked.current.has(`${lang}|${x}`), // server nhận câu ≤ 500 ký tự
    );
    for (let i = 0; i < texts.length; i += 40) {
      const chunk = texts.slice(i, i + 40);
      chunk.forEach((x) => phrAsked.current.add(`${lang}|${x}`));
      api<{ phrases: Phrase[][] }>("/phrases", { method: "POST", body: { sentences: chunk, lang } })
        .then((r) => setPhr((prev) => ({ ...prev, ...Object.fromEntries(chunk.map((x, k) => [`${lang}|${x}`, r.phrases[k] ?? []])) })))
        .catch(() => chunk.forEach((x) => phrAsked.current.delete(`${lang}|${x}`))); // lỗi → lần mở tab sau hỏi lại
    }
  }, [all, lang]);
  const emptyCount = all.filter((v) => !v.meaning).length;
  const query = norm(q.trim());
  const sections = useMemo(() => {
    const shown = all.filter(
      (v) =>
        (!onlyEmpty || !v.meaning) &&
        (!query || norm(v.word).includes(query) || norm(v.meaning).includes(query) || norm(v.context).includes(query)),
    );
    return sort === "az" ? byLetter(shown) : byDate(shown, t, lang);
  }, [all, onlyEmpty, query, sort, t, lang]);

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

  const lookUp: LookFn = (word, context, marks) => {
    stopSpeaking();
    setLookup({ word, context, marks });
  };
  const findSaved = (word: string) => all.find((x) => x.word.toLowerCase() === word.toLowerCase());
  // Lưu từ tra được (từ trong câu chưa có trong sổ) → hiện luôn trong danh sách
  const saveLooked = async (word: string, context: string, meaning: string) => {
    try {
      const r = await api<{ vocab: VocabItem[] }>("/vocab", { method: "POST", body: { word, context } });
      const item = r.vocab.find((x) => x.word.toLowerCase() === word.toLowerCase());
      if (item && !item.meaning && meaning) await api(`/vocab/${item.id}`, { method: "PATCH", body: { meaning } }).catch(() => {});
      await load();
    } catch (e) {
      showError(e, t("player.saveFailed"));
    }
  };
  const unsaveLooked = async (word: string) => {
    const item = findSaved(word);
    if (!item) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems((list) => list?.filter((x) => x.id !== item.id) ?? null);
    await api(`/vocab/${item.id}`, { method: "DELETE" }).catch(() => {});
  };

  const toggle = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId(openId === id ? null : id);
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
              {all.length > 0 && (
                <Button
                  title={t("vocab.review")}
                  variant="amber"
                  icon={<SymbolView name="mic.fill" size={16} tintColor={C.amber} />}
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
                  <View style={{ flex: 1 }} />
                  {emptyCount > 0 && (
                    <Pressable
                      onPress={() => setOnlyEmpty(!onlyEmpty)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 99,
                        borderWidth: 1,
                        borderColor: onlyEmpty ? C.amber : C.border,
                        backgroundColor: onlyEmpty ? "rgba(250,204,21,0.12)" : C.card2,
                      }}
                    >
                      <SymbolView name="pencil.line" size={13} tintColor={onlyEmpty ? C.amber : C.muted} />
                      <Text style={{ color: onlyEmpty ? C.amber : C.muted, fontWeight: "700", fontSize: 13 }}>
                        {t("vocab.noMeaning")} · {emptyCount}
                      </Text>
                    </Pressable>
                  )}
                </View>
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
            phrases={phr[`${lang}|${item.context || item.word}`] ?? []}
            onToggle={() => toggle(item.id)}
            onLook={lookUp}
            onChange={(meaning) => setItems((list) => list?.map((x) => (x.id === item.id ? { ...x, meaning } : x)) ?? null)}
            onDelete={async () => {
              await api(`/vocab/${item.id}`, { method: "DELETE" }).catch(() => {});
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setItems((list) => list?.filter((x) => x.id !== item.id) ?? null);
            }}
          />
        )}
        ListEmptyComponent={
          items ? (
            <View style={{ alignItems: "center", gap: 10, marginTop: 40, paddingHorizontal: 24 }}>
              <SymbolView name={query || onlyEmpty ? "magnifyingglass" : "bookmark"} size={36} tintColor={C.muted} />
              <Text style={[styles.muted, { textAlign: "center" }]}>{query ? t("vocab.notFound", { q }) : t("vocab.empty")}</Text>
            </View>
          ) : undefined
        }
      />
      <WordSheet
        word={lookup?.word ?? null}
        context={lookup?.context ?? ""}
        marks={lookup?.marks}
        saved={!!lookup && !!findSaved(lookup.word)}
        onSave={(meaning) => (lookup ? saveLooked(lookup.word, lookup.context, meaning) : Promise.resolve())}
        onRemove={() => (lookup ? unsaveLooked(lookup.word) : Promise.resolve())}
        onClose={() => setLookup(null)}
      />
    </SafeAreaView>
  );
}
