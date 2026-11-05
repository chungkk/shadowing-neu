import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Image as RNImage, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Text, TextInput } from "./Text";
import { SymbolView } from "expo-symbols";
import { checkSlots, hintFor, isOpenWord, nextOpenSlot, POINTS_HINT, slotForTyped, slotsFromInput, splitWords, type DictationLevel, type WordState } from "@shared/dictation";
import { AnimatedMascot } from "./Mascot";
import { Gem, useReduceMotion } from "./Points";
import { Button } from "./ui";
import { C, STICKER, alpha, themed } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { useLayout } from "@/lib/layout";

const BOX = themed((): Record<WordState | "hint", { border: string; bg: string; fg: string }> => ({
  correct: { border: C.ink, bg: alpha(C.accent, 0.2), fg: C.text },
  close: { border: C.amber, bg: alpha(C.gold, 0.1), fg: C.amber },
  wrong: { border: C.red, bg: alpha(C.red, 0.1), fg: C.redText },
  missing: { border: alpha(C.red, 0.6), bg: "transparent", fg: C.muted },
  revealed: { border: alpha(C.gold, 0.6), bg: alpha(C.gold, 0.05), fg: C.amber },
  given: { border: alpha(C.inkLine, 0.4), bg: C.card2, fg: C.text },
  hint: { border: alpha(C.inkLine, 0.3), bg: C.card, fg: C.muted },
}));
const TILT = ["-1.5deg", "1deg", "-0.5deg", "1.5deg"];

/** Từ vừa gõ đúng: "dán" sticker xuống ô */
function Stick({ on, reduce, children }: { on: boolean; reduce: boolean; children: ReactNode }) {
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!on || reduce) return;
    scale.setValue(1.22);
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }).start();
  }, [on, reduce, scale]);
  return <Animated.View style={{ alignItems: "center", maxWidth: "100%", transform: [{ scale }] }}>{children}</Animated.View>;
}

const UMLAUTS = ["ä", "ö", "ü", "ß"];

/** Bản nháp 1 câu: chữ đã gõ + các từ đã bấm xem — giữ lại khi chuyển sang câu khác rồi quay về */
export type DictDraft = { input: string; revealed: number[] };

/**
 * Nghe chép chính tả 1 câu (bản di động của components/DictationPanel.tsx trên web).
 * Mỗi từ là 1 ô, gõ thẳng vào ô đang chọn (ô nhập thật ẩn đi); gõ đúng thì tự nhảy ô — không cần dấu cách, phím cách chỉ phát / dừng video.
 * Từ sai thì chạm ô khác để đổi ô; "Kiểm tra" để xem từ sai / thiếu; chạm 👁 phía trên ô để xem từ (tính là lỗi, có tài khoản thì −2 điểm: `onHint`).
 * Câu đã làm xong (`saved`, kể cả lưu trên server từ lần trước) → hiện đủ câu + điểm, có nút "Làm lại";
 * chạm vào từ để tra nghĩa (`onWord`), có bản dịch câu nếu đang bật dịch.
 * `onEarn` gọi mỗi lần gõ, trả về số điểm vừa được (+1 mỗi từ đúng mới) → hiện "+N điểm".
 * Đang gõ: hàng phím ä ö ü ß chèn vào ô đang chọn. `autoFocus`: sang câu mới khi bàn phím đang mở → gõ tiếp luôn.
 */
export function DictationPanel({
  text,
  level,
  onReplay,
  onTogglePlay,
  onNext,
  onDone,
  hasNext,
  draft,
  saved,
  onDraft,
  onHint,
  onEarn,
  onWord,
  translation,
  autoFocus,
}: {
  text: string;
  level: DictationLevel;
  onReplay: () => void;
  onTogglePlay: () => void; // phím cách khi đang gõ: phát / dừng video
  onNext: () => void;
  onDone: (correct: number, total: number) => void;
  onEarn?: (correct: number, total: number, input: string, revealed: number[]) => number; // input, revealed: câu đang chép + các từ đã xem, server chấm lại
  hasNext: boolean;
  draft?: DictDraft; // bản nháp lần trước (trong phiên học này)
  saved?: { correct: number; total: number }; // kết quả đã lưu của câu này
  onDraft: (d: DictDraft | null) => void;
  onHint?: (n: number) => void; // vừa chạm xem n từ → trừ điểm (chỉ khi có tài khoản)
  onWord: (word: string) => void; // câu đã xong: chạm vào từ → bảng tra từ
  translation?: string; // bản dịch câu (chỉ hiện khi đã xong)
  autoFocus?: boolean;
}) {
  const { t } = useI18n();
  const { tablet } = useLayout();
  const refWords = useMemo(() => splitWords(text), [text]);
  // Có nháp → dựng lại đúng như lúc rời đi; chỉ có kết quả đã lưu → hiện đủ câu (các ô điền sẵn câu gốc)
  const [slots, setSlots] = useState(() => (draft ? slotsFromInput(text, draft.input) : saved ? refWords : refWords.map(() => "")));
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set(draft?.revealed ?? []));
  const result = useMemo(() => checkSlots(text, slots, revealed), [text, slots, revealed]);
  const [checked, setChecked] = useState(() => !!saved || (!!draft && result.done));
  const [active, setActive] = useState(() => nextOpenSlot(result.words, result.words.length - 1)); // ô đang gõ
  const [reported, setReported] = useState(!!saved);
  // Điểm hiển thị: lần làm này (nếu vừa làm xong) hoặc điểm đã lưu
  const [score, setScore] = useState(saved);
  const [gained, setGained] = useState(0); // điểm vừa được ở câu này
  const [stuck, setStuck] = useState(-1); // ô vừa gõ đúng → hiệu ứng dán sticker
  // Linh vật học cùng: gõ đúng 1 từ thì nhảy, kiểm tra còn sai thì lắc đầu, vừa xong câu thì bật cao
  const reduce = useReduceMotion();
  const [lift] = useState(() => new Animated.Value(0));
  const [turn] = useState(() => new Animated.Value(0));
  const hop = (h: number) => {
    if (reduce) return;
    lift.setValue(0);
    Animated.sequence([
      Animated.timing(lift, { toValue: -h, duration: 130, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(lift, { toValue: 0, friction: 4, tension: 160, useNativeDriver: true }),
    ]).start();
  };
  const nope = () => {
    if (reduce) return;
    turn.setValue(0);
    Animated.timing(turn, { toValue: 1, duration: 460, easing: Easing.linear, useNativeDriver: true }).start();
  };
  // Số từ đã bấm xem
  const revealedCount = result.words.filter((w) => w.state === "revealed").length;
  const [focused, setFocused] = useState(!!autoFocus);
  const inputRef = useRef<TextInput>(null);
  const focusInput = () => inputRef.current?.focus();
  // Vừa nhảy ô: JS xoá ô nhập nhưng gõ nhanh thì bản gốc có thể chưa kịp xoá ("also" + "n" → "alson") → cắt phần từ trước đi
  const justDone = useRef("");
  const moveTo = (k: number) => {
    justDone.current = "";
    setActive(k);
  };

  const change = (nextSlots: string[], nextRevealed: Set<number>) => {
    const nextInput = nextSlots.join(" ");
    setSlots(nextSlots);
    setRevealed(nextRevealed);
    onDraft({ input: nextInput, revealed: [...nextRevealed] });
    const r = checkSlots(text, nextSlots, nextRevealed);
    const gain = onEarn?.(r.correct, r.total, nextInput, r.words.flatMap((w, k) => (w.state === "revealed" || w.state === "given" ? [k] : []))) ?? 0;
    if (gain > 0) setGained((g) => g + gain);
    setChecked(r.done);
    if (r.done && !reported) {
      setReported(true);
      setScore({ correct: r.correct, total: r.total });
      hop(18);
      onDone(r.correct, r.total);
    }
    return r;
  };
  /** Gõ vào ô đang chọn; từ gõ đúng → nhảy sang ô chưa xong kế tiếp */
  const type = (raw: string) => {
    if (result.done || !refWords.length) return;
    if (raw === `${slots[active]} `) return onTogglePlay();
    let fresh = raw;
    if (justDone.current && raw.startsWith(justDone.current)) fresh = raw.slice(justDone.current.length);
    else justDone.current = "";
    const value = fresh.replace(/\s/g, "").replace(/^[^\p{L}\p{N}]+/u, ""); // dấu câu gõ theo thói quen ngay sau khi nhảy ô thì bỏ
    const at = slotForTyped(result.words, active, value);
    const next = [...slots];
    if (at !== active) next[active] = "";
    next[at] = value;
    const r = change(next, revealed);
    if (r.words[at].state === "correct") {
      setStuck(at);
      if (!r.done) hop(8);
      setActive(nextOpenSlot(r.words, at));
      justDone.current = raw;
    } else setActive(at);
  };
  /** Làm lại câu này từ đầu (kết quả mới sẽ ghi đè khi làm xong) */
  const retry = () => {
    setSlots(refWords.map(() => ""));
    moveTo(refWords.length > 1 ? 1 : 0); // từ đầu câu hiện sẵn
    setRevealed(new Set());
    setChecked(false);
    setReported(false);
    setScore(undefined);
    setGained(0);
    setStuck(-1);
    onDraft(null);
    focusInput();
  };
  /** Chạm xem các từ ks (bỏ qua từ đã gõ đúng / đã xem) → hiện từ, trừ điểm */
  const reveal = (ks: number[]) => {
    const fresh = ks.filter((k) => isOpenWord(result.words[k]));
    if (!fresh.length) return;
    const r = change(slots, new Set([...revealed, ...fresh]));
    if (!isOpenWord(r.words[active])) moveTo(nextOpenSlot(r.words, active));
    onHint?.(fresh.length);
  };
  const check = () => {
    setChecked(true);
    if (result.done) return;
    nope();
    moveTo(nextOpenSlot(result.words, result.words.length - 1));
  };
  const submit = () => (result.done ? onNext() : check());

  const left = result.words.filter(isOpenWord).length;
  const solved = result.total - left; // số từ đã xong (đúng + đã xem)
  const shownScore = score ?? { correct: result.correct, total: result.total };
  const praise = t("review.praise").split("|");
  const nums = { c: shownScore.correct, n: shownScore.total };
  const say = result.done
    ? shownScore.correct === shownScore.total
      ? t("dict.sayPerfect", { ...nums, praise: praise[text.length % praise.length] })
      : t("dict.sayDone", { ...nums, r: revealedCount ? t("dict.revealed", { k: revealedCount }) : "" })
    : checked
      ? t("dict.sayPartial", { c: result.correct, n: result.total })
      : solved
        ? t("dict.sayLeft", { n: left })
        : t("dict.sayIdle");

  return (
    <View style={{ gap: 12 }}>
      <View style={{ ...STICKER, backgroundColor: C.card, borderRadius: 18, padding: 14, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {/* Linh vật lật lại để nhìn và "nói" về phía bong bóng thoại */}
          <Animated.View
            style={{
              transform: [{ translateY: lift }, { rotate: turn.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ["0deg", "-9deg", "8deg", "-4deg", "0deg"] }) }],
            }}
          >
            <View style={{ width: 48, height: 48, transform: [{ scaleX: -1 }] }}>
              {reduce ? <Image source={require("@/assets/images/mascot.svg")} alt="" style={{ width: 48, height: 48 }} /> : <AnimatedMascot size={48} />}
            </View>
          </Animated.View>
          <View style={{ flexShrink: 1, justifyContent: "center" }}>
            <View
              style={{
                position: "absolute",
                left: -5,
                width: 11,
                height: 11,
                backgroundColor: C.card,
                borderLeftWidth: 2,
                borderBottomWidth: 2,
                borderColor: C.ink,
                transform: [{ rotate: "45deg" }],
                zIndex: 1,
              }}
            />
            <View style={{ borderWidth: 2, borderColor: C.ink, borderRadius: 14, backgroundColor: C.card, paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text accessibilityLiveRegion="polite" style={{ color: C.text, fontWeight: "800", fontSize: 13 }}>
                {say}
              </Text>
            </View>
          </View>
          <Pressable onPress={onReplay} hitSlop={6} style={{ marginLeft: "auto" }}>
            <Text style={{ color: C.link, fontWeight: "800", fontSize: 12 }}>{t("dict.replay")}</Text>
          </Pressable>
        </View>

        {/* Tiến độ câu: dải sọc kẹo như thân linh vật */}
        <View style={{ height: 12, borderRadius: 6, borderWidth: 2, borderColor: C.ink, backgroundColor: C.card2, overflow: "hidden" }}>
          <View style={{ width: `${result.total ? (solved / result.total) * 100 : 0}%`, height: "100%", overflow: "hidden" }}>
            <RNImage source={require("@/assets/images/candy-stripe.png")} resizeMode="repeat" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
          </View>
        </View>

        {/* Ô từng từ: chưa gõ → gợi ý theo mức độ (đáp án ẩn), gõ tới đâu hiện trong ô tới đó; mắt phía trên ô để xem từ; xong → chạm để tra từ */}
        <Pressable onPress={focusInput} style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 8, rowGap: 18, paddingTop: 10 }}>
          <TextInput
            ref={inputRef}
            accessibilityLabel={t("dict.typeWhat")}
            value={slots[active] ?? ""}
            onChangeText={type}
            onSubmitEditing={submit}
            onKeyPress={({ nativeEvent: { key } }) => {
              // Ô trống → lùi về ô trước (kể cả ô vừa tự nhảy qua: "ein" đúng nhưng định gõ "einen")
              if (key !== "Backspace" || slots[active] || result.done) return;
              for (let k = active - 1; k >= 1; k--) {
                if (!revealed.has(k)) return moveTo(k);
              }
            }}
            autoFocus={autoFocus}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            submitBehavior="submit"
            returnKeyType={result.done ? "next" : "done"}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            caretHidden
            style={{ position: "absolute", top: 0, left: 0, width: 1, height: 1, opacity: 0 }}
          />
          {result.words.map((w, k) => {
            const shown = w.state === "correct" || w.state === "revealed" || w.state === "given";
            const b = BOX[shown || checked ? w.state : "hint"];
            const isActive = k === active && focused && !result.done;
            const typed = slots[k];
            const label = shown ? w.text : typed || (isActive ? "" : hintFor(w.text, level));
            const fg = typed && !shown && !checked ? C.text : b.fg;
            return (
              <Stick key={k} on={k === stuck} reduce={reduce}>
                <Pressable
                  disabled={(w.state === "revealed" || w.state === "given") && !result.done}
                  onPress={() => {
                    if (result.done) return onWord(w.text);
                    moveTo(k);
                    focusInput();
                  }}
                  accessibilityLabel={shown ? w.text : typed || t("dict.hiddenWord")}
                  style={{
                    flexDirection: "row",
                    borderColor: isActive ? C.link : typed && !shown && !checked ? alpha(C.inkLine, 0.6) : b.border,
                    backgroundColor: isActive ? C.card : b.bg,
                    borderWidth: 2,
                    borderStyle: !shown && !typed && !isActive && (!checked || w.state === "missing") ? "dashed" : "solid",
                    borderRadius: 12,
                    boxShadow: isActive ? `0 3px 0 ${C.link}` : w.state === "correct" ? `0 2px 0 ${C.ink}` : undefined,
                    transform: w.state === "correct" ? [{ rotate: TILT[k % TILT.length] }] : isActive ? [{ translateY: -2 }] : undefined,
                    paddingHorizontal: 8,
                    minHeight: 32,
                    minWidth: 40,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {!!label && <Text style={{ flexShrink: 1, color: fg, fontFamily: "Menlo", fontWeight: "700", fontSize: 15 }}>{label}</Text>}
                  {isActive && <View style={{ width: 2, height: 16, marginLeft: 1, backgroundColor: C.link }} />}
                </Pressable>
                {k === active && isOpenWord(w) && !result.done && (
                  <Pressable
                    onPress={() => reveal([k])}
                    hitSlop={5}
                    accessibilityRole="button"
                    accessibilityLabel={t("dict.revealWord")}
                    style={{
                      position: "absolute",
                      top: -13,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: C.ink,
                      backgroundColor: C.card,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <SymbolView name="eye" size={12} tintColor={C.text} />
                  </Pressable>
                )}
              </Stick>
            );
          })}
        </Pressable>

        {/* Đang gõ: phím chữ Đức (bàn phím tiếng Việt / tiếng Anh không có sẵn) */}
        {focused && !result.done && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {UMLAUTS.map((ch) => (
              <Pressable
                key={ch}
                onPress={() => {
                  justDone.current = "";
                  type((slots[active] ?? "") + ch);
                }}
                accessibilityLabel={ch}
                style={({ pressed }) => ({
                  width: 40,
                  height: 34,
                  borderRadius: 9,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed ? C.border : C.card2,
                })}
              >
                <Text style={{ color: C.text, fontSize: 17, fontWeight: "700" }}>{ch}</Text>
              </Pressable>
            ))}
            <Text style={{ flex: 1, color: C.muted, fontSize: 12, textAlign: "right" }} numberOfLines={1}>
              {t("dict.umlautTip")}
            </Text>
          </View>
        )}
      </View>

      {result.done && translation && <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>{translation}</Text>}
      {gained > 0 && (
        <View
          style={{
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingLeft: 3,
            paddingRight: 9,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: alpha(C.gem, 0.15),
          }}
        >
          <Gem size={16} />
          <Text style={{ color: C.gem, fontWeight: "800", fontSize: 12 }}>{t("dict.point", { n: gained })}</Text>
        </View>
      )}
      <Text style={{ color: C.muted, fontSize: 12 }}>
        {checked
          ? result.done
            ? t("dict.tapWord")
            : t("dict.fixHint")
          : onHint
            ? t("dict.tapHintCost", { n: POINTS_HINT })
            : t("dict.tapHint")}
      </Text>

      {/* Nút chính (Kiểm tra / Câu tiếp) đứng trước; "Hiện tất cả" (bỏ cuộc) chỉ là nút phụ. iPad: 2 nút cạnh nhau, nút chính rộng hơn */}
      <View style={{ flexDirection: tablet ? "row" : "column", gap: 12 }}>
        <Button
          title={result.done ? t("dict.next") : t("dict.check")}
          variant="primary"
          disabled={result.done && !hasNext}
          onPress={submit}
          style={tablet ? { flex: 2 } : undefined}
        />
        {result.done ? (
          <Button title={t("dict.retry")} variant="plain" onPress={retry} style={tablet ? { flex: 1 } : undefined} />
        ) : (
          <Button
            title={t("dict.showAll")}
            variant="plain"
            onPress={() => reveal(result.words.map((_, k) => k))}
            style={tablet ? { flex: 1 } : undefined}
          />
        )}
      </View>
    </View>
  );
}
