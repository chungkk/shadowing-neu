import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { Text } from "./Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { locatePhrase } from "@shared/phrase-match";
import { api, type VocabExample, type WordDetail, type WordInfo } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useLayout } from "@/lib/layout";
import { speakGerman, stopSpeaking } from "@/lib/speak";
import { C, alpha, themed } from "@/lib/theme";

const MAX_CACHE = 200;
const meanings = new Map<string, WordInfo>();
const details = new Map<string, WordDetail>();
const inflightMeanings = new Map<string, Promise<WordInfo>>();
const inflightDetails = new Map<string, Promise<WordDetail>>();

function cacheSet<T>(cache: Map<string, T>, key: string, value: T) {
  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

type Load<T> = { key: string; attempt: number; data?: T; error?: string } | null;

const isMeaning = (x: unknown): x is WordInfo => typeof (x as WordInfo)?.meaning === "string";
const isDetail = (x: unknown): x is WordDetail =>
  Array.isArray((x as WordDetail)?.examples) && typeof (x as WordDetail).explanation === "string";

function useWordApi<T>(
  cache: Map<string, T>,
  inflight: Map<string, Promise<T>>,
  key: string,
  enabled: boolean,
  body: object,
  attempt: number,
  valid: (x: unknown) => x is T,
  invalidMsg: string,
): { data?: T; error?: string } {
  const [res, setRes] = useState<Load<T>>(null);
  const reqKey = `${key}|${enabled ? 1 : 0}|${attempt}`;
  const [prevReq, setPrevReq] = useState(reqKey);
  if (prevReq !== reqKey) {
    setPrevReq(reqKey);
    if (res?.error) setRes(null);
  }
  useEffect(() => {
    if (!enabled || cache.has(key)) return;
    let alive = true;
    let job = inflight.get(key);
    if (!job) {
      job = api<unknown>("/word", { method: "POST", body })
        .then((data) => {
          if (!valid(data)) throw new Error(invalidMsg);
          cacheSet(cache, key, data);
          return data;
        })
        .finally(() => {
          inflight.delete(key);
        });
      inflight.set(key, job);
    }
    job
      .then((data) => alive && setRes({ key, attempt, data }))
      .catch((e: Error) => alive && setRes({ key, attempt, error: e.message }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache, inflight, key, enabled, attempt]);
  const data = cache.get(key) ?? (res?.key === key ? res.data : undefined);
  return { data, error: enabled && !data && res?.key === key && res.attempt === attempt ? res.error : undefined };
}

/**
 * Bảng trượt lên khi chạm vào một từ:
 * IPA, nghĩa trong câu, từ đồng nghĩa, tab Giải thích (mặc định) / Ví dụ (kèm ví dụ đã lưu từ bài khác),
 * nút tự động lưu & lưu/bỏ lưu vào sổ từ vựng.
 */
export function WordSheet({
  word,
  context,
  marks,
  initialMeaning,
  extraExamples,
  saved,
  autoSave,
  onAutoSaveChange,
  onSave,
  onRemove,
  onClose,
}: {
  word: string | null;
  context: string;
  marks?: string[];
  initialMeaning?: string;
  extraExamples?: VocabExample[];
  saved: boolean;
  autoSave?: boolean;
  onAutoSaveChange?: (v: boolean) => void;
  onSave: (meaning: string, silent?: boolean) => Promise<boolean | void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { lang, t } = useI18n();
  const insets = useSafeAreaInsets();
  const { height, tablet } = useLayout();
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"explain" | "examples">("explain");
  const [justAutoSaved, setJustAutoSaved] = useState(false);

  const [shown, setShown] = useState({ word: word ?? "", context, marks, initialMeaning, extraExamples });
  const keyChanged = !!word && (word !== shown.word || context !== shown.context);
  if (
    word &&
    (keyChanged || initialMeaning !== shown.initialMeaning || extraExamples !== shown.extraExamples || marks !== shown.marks)
  ) {
    setShown({ word, context, marks, initialMeaning, extraExamples });
    if (keyChanged) {
      setTab("explain");
      setJustAutoSaved(false);
    }
  }

  const key = `${lang}|${word}|${context}`;
  const enabled = !!word && !!user;
  const meaning = useWordApi(
    meanings,
    inflightMeanings,
    key,
    enabled && !initialMeaning,
    { word, context, lang },
    attempt,
    isMeaning,
    t("word.unavailable"),
  );
  const detail = useWordApi(
    details,
    inflightDetails,
    key,
    enabled,
    { word, context, lang, detail: true },
    attempt,
    isDetail,
    t("word.unavailable"),
  );

  const resolvedMeaning = initialMeaning || meaning.data?.meaning || "";

  // Tự động lưu khi mở từ và đã có nghĩa (nếu bật autoSave)
  const autoSavedRef = useRef<string>("");
  const dismissedRef = useRef<string>("");
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  });

  useEffect(() => {
    if (!word || !user || !autoSave || !resolvedMeaning) return;
    const k = `${word.toLowerCase()}|${context}`;
    if (dismissedRef.current === k || autoSavedRef.current === k) return;
    autoSavedRef.current = k;
    let alive = true;
    // Đã lưu rồi nhưng mở ở ngữ cảnh khác -> lặng lẽ bổ sung ví dụ vào sổ
    if (!saved || context) {
      void Promise.resolve(onSaveRef.current(resolvedMeaning, true)).then((ok) => {
        if (alive && !saved && ok !== false) setJustAutoSaved(true);
      });
    }
    return () => {
      alive = false;
    };
  }, [word, context, user, autoSave, saved, resolvedMeaning]);

  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [key, tab]);

  const closingRef = useRef(false);
  const [slide] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (word) {
      closingRef.current = false;
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
    }
  }, [word, slide]);

  const [speaking, setSpeaking] = useState<string | null>(null);
  const speak = (text: string, slow = false) => {
    setSpeaking(text);
    speakGerman(text, { slow, onEnd: () => setSpeaking((cur) => (cur === text ? null : cur)) });
  };

  useEffect(() => {
    if (!word) return;
    setSpeaking(word); // eslint-disable-line react-hooks/set-state-in-effect
    speakGerman(word, { onEnd: () => setSpeaking((cur) => (cur === word ? null : cur)) });
    return () => {
      void stopSpeaking();
    };
  }, [word]);

  const close = (afterClose?: () => void) => {
    if (closingRef.current) return;
    closingRef.current = true;
    void stopSpeaking();
    Animated.timing(slide, { toValue: 1, duration: 180, useNativeDriver: true }).start(({ finished }) => {
      closingRef.current = false;
      if (!finished) return;
      onClose();
      afterClose?.();
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      if (saved && word) {
        dismissedRef.current = `${word.toLowerCase()}|${context}`;
        setJustAutoSaved(false);
        await onRemove();
      } else {
        dismissedRef.current = "";
        setJustAutoSaved(false);
        await onSave(resolvedMeaning, false);
      }
    } finally {
      setSaving(false);
    }
  };

  const retry = () => setAttempt((a) => a + 1);
  const exampleCount =
    (shown.context ? 1 : 0) + (shown.extraExamples?.length ?? 0) + (detail.data?.examples.length ?? 0);

  return (
    <Modal
      visible={!!word}
      transparent
      animationType="fade"
      onRequestClose={() => close()}
      supportedOrientations={["portrait", "portrait-upside-down", "landscape-left", "landscape-right"]}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)" }]} onPress={() => close()} accessibilityLabel={t("close")} />
        <Animated.View
          style={{
            width: "100%",
            maxWidth: 640,
            alignSelf: "center",
            maxHeight: height * (tablet ? 0.78 : 0.84),
            marginBottom: tablet ? Math.max(insets.bottom, 24) : 0,
            backgroundColor: C.card,
            borderRadius: tablet ? 28 : 0,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderWidth: tablet ? 1 : 0,
            borderTopWidth: 1,
            borderColor: C.border,
            paddingBottom: tablet ? 20 : Math.max(insets.bottom, 16) + 4,
            transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [0, height] }) }],
          }}
        >
          <View style={{ alignSelf: "center", width: 36, height: 5, borderRadius: 3, backgroundColor: C.border, marginTop: 8 }} />

          {/* Đầu bảng: Từ + IPA + loa + đóng */}
          <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, gap: 6, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: C.amber, fontSize: 26, fontWeight: "800", letterSpacing: -0.3 }} numberOfLines={1} adjustsFontSizeToFit>
                  {shown.word}
                </Text>
                {!!detail.data?.ipa && (
                  <Text style={{ color: C.muted, fontSize: 13, fontFamily: "Menlo" }}>{detail.data.ipa}</Text>
                )}
              </View>
              {saved && (
                <View style={{ backgroundColor: alpha(C.gold, 0.15), borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ color: C.amber, fontSize: 12, fontWeight: "700" }}>{justAutoSaved ? t("word.autoSaved") : t("word.saved")}</Text>
                </View>
              )}
              <SpeakButton
                active={speaking === shown.word}
                onPress={() => speak(shown.word)}
                onLongPress={() => speak(shown.word, true)}
                label={t("word.listen")}
              />
              <Pressable
                onPress={() => close()}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t("close")}
                style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: C.card2 }}
              >
                <SymbolView name="xmark" size={12} tintColor={C.muted} weight="bold" />
              </Pressable>
            </View>
            {user &&
              (resolvedMeaning ? (
                <Text style={{ color: C.text, fontSize: 18, fontWeight: "600", lineHeight: 24 }} selectable>
                  {resolvedMeaning}
                </Text>
              ) : meaning.error ? (
                <ErrorRow text={meaning.error} onRetry={retry} retryLabel={t("retry")} />
              ) : (
                <Skeleton widths={["55%"]} height={18} />
              ))}
          </View>

          {!user ? (
            <GuestCta
              title={t("word.loginTitle")}
              body={t("word.loginBody")}
              action={t("loginOrRegister")}
              onPress={() => close(() => router.push("/settings"))}
            />
          ) : (
            <>
              {/* Tab Giải thích (mặc định) · Ví dụ */}
              <View style={{ flexDirection: "row", gap: 22, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
                {(
                  [
                    ["explain", t("word.tabExplain")],
                    ["examples", exampleCount > 0 ? `${t("word.tabExamples")} (${exampleCount})` : t("word.tabExamples")],
                  ] as const
                ).map(([k, label]) => (
                  <Pressable
                    key={k}
                    onPress={() => setTab(k)}
                    style={{
                      paddingVertical: 11,
                      borderBottomWidth: 2,
                      borderBottomColor: tab === k ? C.accent : "transparent",
                      marginBottom: -1,
                    }}
                  >
                    <Text style={{ color: tab === k ? C.text : C.muted, fontWeight: "700", fontSize: 15 }}>{label}</Text>
                  </Pressable>
                ))}
              </View>

              <ScrollView ref={scrollRef} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 14, gap: 14 }}>
                {tab === "examples" ? (
                  <>
                    {!!shown.context && (
                      <ExampleRow
                        label={t("word.inVideo")}
                        de={markWord(shown.context, shown.word, shown.marks)}
                        playing={speaking === shown.context}
                        onPress={() => speak(shown.context)}
                        onLongPress={() => speak(shown.context, true)}
                      />
                    )}
                    {!!shown.extraExamples?.length && (
                      <View style={{ gap: 10 }}>
                        <Text style={sectionLabel}>{t("word.extraExamples")}</Text>
                        {shown.extraExamples.map((ex) => {
                          const srcMatch = ex.sourceUrl?.match(/^\/(lesson|watch)\/([\w-]+)$/);
                          return (
                            <ExampleRow
                              key={ex.id}
                              label={ex.sourceTitle || (srcMatch ? t("vocab.openLesson") : undefined)}
                              de={markWord(ex.context, shown.word)}
                              playing={speaking === ex.context}
                              onPress={() => speak(ex.context)}
                              onLongPress={() => speak(ex.context, true)}
                              onOpenSource={
                                srcMatch
                                  ? () => close(() => router.push(srcMatch[1] === "lesson" ? `/lesson/${srcMatch[2]}` : `/watch/${srcMatch[2]}`))
                                  : undefined
                              }
                            />
                          );
                        })}
                      </View>
                    )}
                    {detail.data ? (
                      detail.data.examples.map((ex, i) => (
                        <ExampleRow
                          key={i}
                          de={ex.de}
                          tr={ex.tr}
                          playing={speaking === plain(ex.de)}
                          onPress={() => speak(plain(ex.de))}
                          onLongPress={() => speak(plain(ex.de), true)}
                        />
                      ))
                    ) : detail.error ? (
                      <ErrorRow text={detail.error} onRetry={retry} retryLabel={t("retry")} />
                    ) : (
                      <Skeleton widths={["90%", "60%", "80%", "50%"]} height={14} />
                    )}
                  </>
                ) : detail.data ? (
                  <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                      {!!detail.data.lemma.trim() && (detail.data.lemma.toLowerCase() !== shown.word.toLowerCase() ? (
                        <Pressable
                          onPress={() => speak(detail.data!.lemma)}
                          onLongPress={() => speak(detail.data!.lemma, true)}
                          style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: C.card2 }}
                        >
                          <SymbolView name="speaker.wave.2.fill" size={13} tintColor={C.accentText} />
                          <Text style={{ color: C.text, fontSize: 17, fontWeight: "800" }}>{detail.data.lemma}</Text>
                        </Pressable>
                      ) : (
                        <Text style={{ color: C.text, fontSize: 18, fontWeight: "800" }}>{detail.data.lemma}</Text>
                      ))}
                      {!!detail.data.pos && (
                        <View style={{ backgroundColor: C.card2, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ color: C.muted, fontSize: 12, fontWeight: "700" }}>{detail.data.pos}</Text>
                        </View>
                      )}
                    </View>

                    {!!detail.data.explanation && (
                      <Rich text={detail.data.explanation} style={{ color: C.text, fontSize: 15, lineHeight: 23 }} />
                    )}

                    {!!detail.data.grammar && (
                      <Text style={{ color: C.amber, fontSize: 14, lineHeight: 20, backgroundColor: C.background, padding: 10, borderRadius: 10, overflow: "hidden" }}>
                        {detail.data.grammar}
                      </Text>
                    )}

                    {!!detail.data.senses?.length && (
                      <View style={{ gap: 10 }}>
                        <Text style={sectionLabel}>{t("word.senses")}</Text>
                        {detail.data.senses.map((s, i) => (
                          <View
                            key={i}
                            style={{
                              gap: 4,
                              padding: 12,
                              borderRadius: 12,
                              backgroundColor: s.current ? alpha(C.accent, 0.1) : C.background,
                              borderWidth: 1,
                              borderColor: s.current ? alpha(C.accent, 0.4) : C.border,
                            }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                              <Text style={{ flex: 1, color: C.text, fontSize: 16, fontWeight: "700" }}>
                                {i + 1}. {s.meaning}
                              </Text>
                              {s.current && <Text style={{ color: C.accentText, fontSize: 11, fontWeight: "700" }}>{t("word.inThisSentence")}</Text>}
                            </View>
                            {!!s.use && <Rich text={s.use} style={{ color: C.amber, fontSize: 14, fontWeight: "600" }} />}
                            <Pressable
                              onPress={() => speak(plain(s.de))}
                              onLongPress={() => speak(plain(s.de), true)}
                              accessibilityRole="button"
                              style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 2 }}
                            >
                              <SymbolView
                                name={speaking === plain(s.de) ? "speaker.wave.2.fill" : "play.fill"}
                                size={12}
                                tintColor={C.accentText}
                                style={{ marginTop: 5 }}
                              />
                              <View style={{ flex: 1 }}>
                                <Rich text={s.de} style={{ color: C.text, fontSize: 15, lineHeight: 22 }} />
                                {!!s.tr && <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20 }}>{s.tr}</Text>}
                              </View>
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    )}

                    {!!detail.data.synonyms?.length && (
                      <View style={{ gap: 8 }}>
                        <Text style={sectionLabel}>{t("word.synonyms")}</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                          {detail.data.synonyms.map((syn, i) => (
                            <Pressable
                              key={i}
                              onPress={() => speak(syn.word)}
                              onLongPress={() => speak(syn.word, true)}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 5,
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 10,
                                backgroundColor: C.background,
                                borderWidth: 1,
                                borderColor: speaking === syn.word ? C.accent : C.border,
                              }}
                            >
                              <SymbolView name="speaker.wave.2" size={12} tintColor={C.accentText} />
                              <Text style={{ color: C.text, fontSize: 14, fontWeight: "700" }}>{syn.word}</Text>
                              {!!syn.note && <Text style={{ color: C.muted, fontSize: 12 }}>({syn.note})</Text>}
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}

                    {!!detail.data.forms?.length && (
                      <View style={{ gap: 8 }}>
                        <Text style={sectionLabel}>{t("word.forms")}</Text>
                        {detail.data.forms.map((f, i) => (
                          <View key={i} style={{ flexDirection: "row", gap: 8 }}>
                            <Text style={{ color: C.muted, fontSize: 15, lineHeight: 22 }}>•</Text>
                            <Text style={{ flex: 1, color: C.text, fontSize: 15, lineHeight: 22 }}>
                              <Text style={{ fontWeight: "700" }}>{f.form}</Text>
                              {!!f.note && <Text style={{ color: C.muted }}>: {f.note}</Text>}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {(!!detail.data.tip || !!detail.data.cues?.length) && (
                      <View style={{ gap: 8, padding: 12, borderRadius: 12, backgroundColor: alpha(C.gold, 0.08), borderWidth: 1, borderColor: alpha(C.gold, 0.3) }}>
                        <Text style={{ color: C.amber, fontSize: 14, fontWeight: "700" }}>💡 {t("word.tip")}</Text>
                        {!!detail.data.tip && <Text style={{ color: C.text, fontSize: 15, lineHeight: 22 }}>{detail.data.tip}</Text>}
                        {detail.data.cues?.map((c, i) => (
                          <Text key={i} style={{ color: C.text, fontSize: 15, lineHeight: 22 }}>
                            <Text style={{ fontStyle: "italic", fontWeight: "600" }}>{c.cue}</Text>
                            <Text style={{ color: C.muted }}> → {c.meaning}</Text>
                          </Text>
                        ))}
                      </View>
                    )}

                    {!!detail.data.idiom && (
                      <Pressable
                        onPress={() => speak(detail.data!.idiom!.de)}
                        onLongPress={() => speak(detail.data!.idiom!.de, true)}
                        accessibilityRole="button"
                        style={{ gap: 4, padding: 12, borderRadius: 12, backgroundColor: C.background, borderWidth: 1, borderColor: speaking === detail.data.idiom.de ? C.accent : C.border }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <Text style={sectionLabel}>{t("word.idiom")}</Text>
                          <SymbolView name="speaker.wave.2" size={13} tintColor={C.accentText} />
                        </View>
                        <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }}>„{detail.data.idiom.de}“</Text>
                        {!!detail.data.idiom.note && <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20 }}>{detail.data.idiom.note}</Text>}
                      </Pressable>
                    )}
                  </View>
                ) : detail.error ? (
                  <ErrorRow text={detail.error} onRetry={retry} retryLabel={t("retry")} />
                ) : (
                  <Skeleton widths={["40%", "95%", "85%", "70%"]} height={14} />
                )}
              </ScrollView>

              {/* Công tắc tự động lưu + Nút lưu từ */}
              <View style={{ paddingHorizontal: 20, paddingTop: 6, gap: 10 }}>
                {onAutoSaveChange && (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ color: C.muted, fontSize: 13, fontWeight: "600" }}>{t("word.autoSave")}</Text>
                    <Switch value={!!autoSave} onValueChange={onAutoSaveChange} trackColor={{ true: C.accent }} />
                  </View>
                )}
                <Pressable
                  onPress={save}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityLabel={saved ? t("word.unsave") : t("word.saveToVocab")}
                  style={({ pressed }) => ({
                    height: 50,
                    borderRadius: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    backgroundColor: saved ? C.card2 : C.accent,
                    borderWidth: saved ? 1 : 0,
                    borderColor: C.border,
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  {saving ? (
                    <ActivityIndicator color={saved ? C.text : "#fff"} />
                  ) : (
                    <SymbolView name={saved ? "bookmark.slash" : "bookmark.fill"} size={17} tintColor={saved ? C.text : "#fff"} />
                  )}
                  <Text style={{ color: saved ? C.text : "#fff", fontWeight: "700", fontSize: 16 }}>
                    {saved ? t("word.unsave") : t("word.saveToVocab")}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const plain = (s: string) => s.replace(/\*\*/g, "");

function markWord(sentence: string, word: string, parts?: string[]) {
  const ranges = parts && locatePhrase(sentence, parts);
  if (ranges) {
    let out = sentence;
    for (const [s, e] of [...ranges].sort((a, b) => b[0] - a[0])) out = `${out.slice(0, s)}**${out.slice(s, e)}**${out.slice(e)}`;
    return out;
  }
  const i = sentence.toLowerCase().indexOf(word.toLowerCase());
  return i < 0 ? sentence : `${sentence.slice(0, i)}**${sentence.slice(i, i + word.length)}**${sentence.slice(i + word.length)}`;
}

const sectionLabel = themed(() => ({ color: C.muted, fontSize: 12, fontWeight: "700" as const, letterSpacing: 1, textTransform: "uppercase" as const }));

function Rich({ text, style }: { text: string; style: object }) {
  return (
    <Text style={style}>
      {text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
        i % 2 ? (
          <Text key={i} style={{ color: C.amber, fontWeight: "800" }}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

function ExampleRow({
  label,
  de,
  tr,
  playing,
  onPress,
  onLongPress,
  onOpenSource,
}: {
  label?: string;
  de: string;
  tr?: string;
  playing: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onOpenSource?: () => void;
}) {
  return (
    <View style={{ gap: 3 }}>
      <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => ({ flexDirection: "row", gap: 10, opacity: pressed ? 0.6 : 1 })}>
        <View style={{ paddingTop: label ? 22 : 4 }}>
          <SymbolView name={playing ? "speaker.wave.2.fill" : "play.fill"} size={12} tintColor={C.accentText} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          {(!!label || !!onOpenSource) && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ color: C.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1, flex: 1 }} numberOfLines={1}>
                {label}
              </Text>
              {onOpenSource && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onOpenSource();
                  }}
                  hitSlop={8}
                >
                  <SymbolView name="arrow.up.right.square" size={12} tintColor={C.accentText} />
                </Pressable>
              )}
            </View>
          )}
          <Rich text={de} style={{ color: C.text, fontSize: 16, fontWeight: "600", lineHeight: 22 }} />
          {!!tr && <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20 }}>{tr}</Text>}
        </View>
      </Pressable>
    </View>
  );
}

function SpeakButton({ active, onPress, onLongPress, label }: { active: boolean; onPress: () => void; onLongPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={8}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? C.accent : alpha(C.accent, 0.15),
        transform: [{ scale: pressed ? 0.92 : 1 }],
      })}
    >
      <SymbolView name={active ? "speaker.wave.3.fill" : "speaker.wave.2.fill"} size={16} tintColor={active ? "#fff" : C.accentText} />
    </Pressable>
  );
}

function Skeleton({ widths, height }: { widths: `${number}%`[]; height: number }) {
  return (
    <View style={{ gap: 8, paddingVertical: 2 }}>
      {widths.map((w, i) => (
        <View key={i} style={{ height, width: w, borderRadius: 6, backgroundColor: alpha(C.inkLine, 0.08) }} />
      ))}
    </View>
  );
}

function ErrorRow({ text, onRetry, retryLabel }: { text: string; onRetry: () => void; retryLabel: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Text style={{ flex: 1, color: C.redText }}>{text}</Text>
      <Pressable onPress={onRetry} hitSlop={8}>
        <Text style={{ color: C.accentText, fontWeight: "800" }}>{retryLabel}</Text>
      </Pressable>
    </View>
  );
}

function GuestCta({ title, body, action, onPress }: { title: string; body: string; action: string; onPress: () => void }) {
  return (
    <View style={{ margin: 20, gap: 12, padding: 16, borderRadius: 18, backgroundColor: C.card2 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <SymbolView name="lock.fill" size={14} tintColor={C.amber} />
        <Text style={{ color: C.text, fontWeight: "800", fontSize: 16 }}>{title}</Text>
      </View>
      <Text style={{ color: C.muted, lineHeight: 20 }}>{body}</Text>
      <Pressable onPress={onPress} style={{ alignSelf: "flex-start", backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
        <Text style={{ color: "#fff", fontWeight: "800" }}>{action}</Text>
      </Pressable>
    </View>
  );
}
