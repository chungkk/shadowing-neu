import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { locatePhrase } from "@shared/phrase-match";
import { api, type WordDetail, type WordInfo } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useLayout } from "@/lib/layout";
import { speakGerman, stopSpeaking } from "@/lib/speak";
import { C } from "@/lib/theme";

// Kết quả đã hỏi trong phiên này (ngôn ngữ + từ + câu) → mở lại không phải chờ
const meanings = new Map<string, WordInfo>();
const details = new Map<string, WordDetail>();

type Load<T> = { key: string; data?: T; error?: string } | null;

const isMeaning = (x: unknown): x is WordInfo => typeof (x as WordInfo)?.meaning === "string";
const isDetail = (x: unknown): x is WordDetail =>
  Array.isArray((x as WordDetail)?.examples) && typeof (x as WordDetail).explanation === "string";

/** Gọi API 1 lần cho mỗi khoá, có cache trong phiên + nút thử lại. Dữ liệu sai dạng (server cũ…) → báo lỗi, không crash */
function useWordApi<T>(
  cache: Map<string, T>,
  key: string,
  enabled: boolean,
  body: object,
  attempt: number,
  valid: (x: unknown) => x is T,
  invalidMsg: string,
): { data?: T; error?: string } {
  const [res, setRes] = useState<Load<T>>(null);
  useEffect(() => {
    if (!enabled || cache.has(key)) return;
    let alive = true;
    api<unknown>("/word", { method: "POST", body })
      .then((data) => {
        if (!valid(data)) throw new Error(invalidMsg);
        cache.set(key, data);
        if (alive) setRes({ key, data });
      })
      .catch((e: Error) => alive && setRes({ key, error: e.message }));
    return () => {
      alive = false;
    };
    // body dựng lại mỗi lần render; key đã gồm đủ nội dung của body
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache, key, enabled, attempt]);
  const data = cache.get(key) ?? (res?.key === key ? res.data : undefined);
  return { data, error: !data && res?.key === key ? res.error : undefined };
}

/**
 * Bảng trượt lên khi chạm vào một từ (giống Language Reactor):
 * từ + loa, nghĩa ngay bên dưới; tab Ví dụ (câu trong video + ví dụ AI, chạm để nghe) / Giải thích (dạng từ điển, ngữ pháp);
 * nút lưu vào sổ từ vựng. Khách thấy lời mời đăng nhập.
 */
export function WordSheet({
  word,
  context,
  marks,
  saved,
  onSave,
  onRemove,
  onClose,
}: {
  word: string | null;
  context: string;
  marks?: string[]; // mở từ cụm từ: các phần của cụm trong câu (cụm bị tách → nhiều phần) để tô sáng

  saved: boolean;
  onSave: (meaning: string) => Promise<void>;
  onRemove: () => Promise<void>; // bỏ khỏi sổ từ vựng
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { lang, t } = useI18n();
  const insets = useSafeAreaInsets();
  const { height, tablet } = useLayout();
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"examples" | "explain">("examples");

  // Giữ nội dung lần mở gần nhất để lúc đang đóng không bị trống
  const [shown, setShown] = useState({ word: word ?? "", context, marks });
  if (word && (word !== shown.word || context !== shown.context)) setShown({ word, context, marks });

  const key = `${lang}|${word}|${context}`;
  const enabled = !!word && !!user;
  const meaning = useWordApi(meanings, key, enabled, { word, context, lang }, attempt, isMeaning, t("word.unavailable"));
  const detail = useWordApi(details, key, enabled, { word, context, lang, detail: true }, attempt, isDetail, t("word.unavailable"));

  // Mở: trượt lên có độ nảy; đóng: trượt xuống rồi mới báo ra ngoài (Modal tự mờ nền)
  const [slide] = useState(() => new Animated.Value(1)); // 0 = mở, 1 = ẩn dưới đáy
  useEffect(() => {
    if (word) Animated.spring(slide, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
  }, [word, slide]);

  // Loa: chạm = đọc bình thường, nhấn giữ = đọc chậm
  const [speaking, setSpeaking] = useState<string | null>(null);
  const speak = (text: string, slow = false) => {
    setSpeaking(text);
    speakGerman(text, { slow, onEnd: () => setSpeaking(null) });
  };
  // Vừa chạm vào từ → đọc từ đó luôn
  useEffect(() => {
    if (!word) return;
    setSpeaking(word); // eslint-disable-line react-hooks/set-state-in-effect -- trạng thái loa đi cùng lệnh đọc
    speakGerman(word, { onEnd: () => setSpeaking(null) });
  }, [word]);
  const close = () => {
    stopSpeaking();
    Animated.timing(slide, { toValue: 1, duration: 180, useNativeDriver: true }).start(() => onClose());
  };

  /** Nút đáy: chưa lưu → lưu; đã lưu → bỏ lưu */
  const save = async () => {
    setSaving(true);
    try {
      if (saved) await onRemove();
      else await onSave(meaning.data?.meaning ?? "");
    } finally {
      setSaving(false);
    }
  };

  const retry = () => setAttempt((a) => a + 1);

  return (
    // Modal iOS mặc định chỉ cho màn dọc → iPad nằm ngang sẽ bị xoay ngược khi mở bảng
    <Modal
      visible={!!word}
      transparent
      animationType="fade"
      onRequestClose={close}
      supportedOrientations={["portrait", "portrait-upside-down", "landscape-left", "landscape-right"]}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)" }]} onPress={close} accessibilityLabel={t("close")} />
        {/* iPhone: bảng trượt sát đáy, rộng hết màn hình. iPad: thẻ nổi giữa đáy, rộng tối đa 640 */}
        <Animated.View
          style={{
            width: "100%",
            maxWidth: 640,
            alignSelf: "center",
            maxHeight: height * (tablet ? 0.75 : 0.8),
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

          {/* Từ + loa + đóng, nghĩa ngay bên dưới */}
          <View
            style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, gap: 6, borderBottomWidth: 1, borderBottomColor: C.border }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text
                style={{ flex: 1, color: C.amber, fontSize: 28, fontWeight: "800", letterSpacing: -0.3 }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {shown.word}
              </Text>
              {saved && (
                <View style={{ backgroundColor: "rgba(250,204,21,0.15)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ color: C.amber, fontSize: 12, fontWeight: "700" }}>{t("word.saved")}</Text>
                </View>
              )}
              <SpeakButton
                active={speaking === shown.word}
                onPress={() => speak(shown.word)}
                onLongPress={() => speak(shown.word, true)}
                label={t("word.listen")}
              />
              <Pressable
                onPress={close}
                hitSlop={12}
                style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: C.card2 }}
              >
                <SymbolView name="xmark" size={12} tintColor={C.muted} weight="bold" />
              </Pressable>
            </View>
            {user &&
              (meaning.data ? (
                <Text style={{ color: C.text, fontSize: 18, fontWeight: "600", lineHeight: 24 }} selectable>
                  {meaning.data.meaning}
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
              onPress={() => {
                onClose();
                router.push("/account");
              }}
            />
          ) : (
            <>
              {/* Tab */}
              <View style={{ flexDirection: "row", gap: 22, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
                {(
                  [
                    ["examples", t("word.tabExamples")],
                    ["explain", t("word.tabExplain")],
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

              <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 14, gap: 14 }}>
                {tab === "examples" ? (
                  <>
                    {/* Câu trong video */}
                    {!!shown.context && (
                      <ExampleRow
                        label={t("word.inVideo")}
                        de={markWord(shown.context, shown.word, shown.marks)}
                        playing={speaking === shown.context}
                        onPress={() => speak(shown.context)}
                        onLongPress={() => speak(shown.context, true)}
                      />
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
                      <Text style={{ color: C.text, fontSize: 18, fontWeight: "800" }}>{detail.data.lemma}</Text>
                      {!!detail.data.pos && (
                        <View style={{ backgroundColor: C.card2, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ color: C.muted, fontSize: 12, fontWeight: "700" }}>{detail.data.pos}</Text>
                        </View>
                      )}
                    </View>
                    {!!detail.data.grammar && (
                      <Text
                        style={{
                          color: C.amber,
                          fontSize: 14,
                          lineHeight: 20,
                          backgroundColor: C.background,
                          padding: 10,
                          borderRadius: 10,
                          overflow: "hidden",
                        }}
                      >
                        {detail.data.grammar}
                      </Text>
                    )}
                    <Rich text={detail.data.explanation} style={{ color: C.text, fontSize: 15, lineHeight: 23 }} />
                  </View>
                ) : detail.error ? (
                  <ErrorRow text={detail.error} onRetry={retry} retryLabel={t("retry")} />
                ) : (
                  <Skeleton widths={["40%", "95%", "85%", "70%"]} height={14} />
                )}
              </ScrollView>

              {/* Lưu từ */}
              <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
                {/* Chưa lưu → Lưu (nút chính); đã lưu → Bỏ lưu (nút trung tính) */}
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

/** "Câu có **từ** cần học" → bỏ dấu ** để đọc */
const plain = (s: string) => s.replace(/\*\*/g, "");

/** Bọc từ đang xem (hoặc các phần của cụm từ) trong câu gốc bằng ** để tô sáng như ví dụ AI */
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

/** Hiện chữ, phần **…** tô vàng đậm */
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

/** 1 ví dụ: ▶ câu tiếng Đức (từ cần học tô vàng) + bản dịch; chạm để nghe, giữ để nghe chậm */
function ExampleRow({
  label,
  de,
  tr,
  playing,
  onPress,
  onLongPress,
}: {
  label?: string;
  de: string;
  tr?: string;
  playing: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => ({ flexDirection: "row", gap: 10, opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ paddingTop: label ? 22 : 4 }}>
        <SymbolView name={playing ? "speaker.wave.2.fill" : "play.fill"} size={12} tintColor={C.accent} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        {!!label && <Text style={{ color: C.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>{label}</Text>}
        <Rich text={de} style={{ color: C.text, fontSize: 16, fontWeight: "600", lineHeight: 22 }} />
        {!!tr && <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20 }}>{tr}</Text>}
      </View>
    </Pressable>
  );
}

/** Nút loa tròn; sáng xanh khi đang đọc */
function SpeakButton({
  active,
  onPress,
  onLongPress,
  label,
}: {
  active: boolean;
  onPress: () => void;
  onLongPress: () => void;
  label: string;
}) {
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
        backgroundColor: active ? C.accent : "rgba(22,163,74,0.15)",
        transform: [{ scale: pressed ? 0.92 : 1 }],
      })}
    >
      <SymbolView name={active ? "speaker.wave.3.fill" : "speaker.wave.2.fill"} size={16} tintColor={active ? "#fff" : C.accent} />
    </Pressable>
  );
}

function Skeleton({ widths, height }: { widths: `${number}%`[]; height: number }) {
  return (
    <View style={{ gap: 8, paddingVertical: 2 }}>
      {widths.map((w, i) => (
        <View key={i} style={{ height, width: w, borderRadius: 6, backgroundColor: "rgba(238,245,239,0.08)" }} />
      ))}
    </View>
  );
}

function ErrorRow({ text, onRetry, retryLabel }: { text: string; onRetry: () => void; retryLabel: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Text style={{ flex: 1, color: C.redText }}>{text}</Text>
      <Pressable onPress={onRetry} hitSlop={8}>
        <Text style={{ color: C.accent, fontWeight: "800" }}>{retryLabel}</Text>
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
      <Pressable
        onPress={onPress}
        style={{ alignSelf: "flex-start", backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>{action}</Text>
      </Pressable>
    </View>
  );
}
