import { useMemo, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { checkDictation, hintFor, POINTS_CORRECT, POINTS_HINT, type DictationLevel, type WordState } from "@shared/dictation";
import { GEM, Gem } from "./Points";
import { Button } from "./ui";
import { C } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { useLayout } from "@/lib/layout";

const BOX: Record<WordState | "hint", { border: string; bg: string; fg: string }> = {
  correct: { border: C.accent, bg: "rgba(22,163,74,0.15)", fg: C.text },
  close: { border: C.amber, bg: "rgba(250,204,21,0.1)", fg: C.amber },
  wrong: { border: C.red, bg: "rgba(220,38,38,0.1)", fg: C.redText },
  missing: { border: "rgba(220,38,38,0.6)", bg: "transparent", fg: C.muted },
  revealed: { border: "rgba(250,204,21,0.6)", bg: "rgba(250,204,21,0.05)", fg: C.amber },
  hint: { border: C.border, bg: C.background, fg: C.muted },
};

const UMLAUTS = ["ä", "ö", "ü", "ß"];

/** Bản nháp 1 câu: chữ đã gõ + các từ đã bấm xem — giữ lại khi chuyển sang câu khác rồi quay về */
export type DictDraft = { input: string; revealed: number[] };

/**
 * Nghe chép chính tả 1 câu (bản di động của components/DictationPanel.tsx trên web).
 * Gõ đúng từ nào hiện từ đó; "Kiểm tra" để xem từ sai / thiếu; chạm 👁 để xem từ (tính là lỗi, có tài khoản thì −1 điểm: `onHint`).
 * Câu đã làm xong (`saved`, kể cả lưu trên server từ lần trước) → hiện đủ câu + điểm, có nút "Làm lại";
 * chạm vào từ để tra nghĩa (`onWord`), có bản dịch câu nếu đang bật dịch.
 * `onDone` trả về true = câu này được +2 điểm (chép đúng hết lần đầu) → hiệu ứng +2.
 * Đang gõ: hàng phím ä ö ü ß chèn vào đúng chỗ con trỏ. `autoFocus`: sang câu mới khi bàn phím đang mở → gõ tiếp luôn.
 */
export function DictationPanel({
  text,
  level,
  onReplay,
  onNext,
  onDone,
  hasNext,
  draft,
  saved,
  onDraft,
  onHint,
  onWord,
  translation,
  autoFocus,
}: {
  text: string;
  level: DictationLevel;
  onReplay: () => void;
  onNext: () => void;
  onDone: (correct: number, total: number, input: string) => boolean | void; // true = được +2 điểm · input: câu đã chép, server chấm lại
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
  // Có nháp → dựng lại đúng như lúc rời đi; chỉ có kết quả đã lưu → hiện đủ câu (gõ sẵn câu gốc)
  const [input, setInput] = useState(() => draft?.input ?? (saved ? text : ""));
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set(draft?.revealed ?? []));
  const [checked, setChecked] = useState(() => !!saved || (!!draft && checkDictation(text, draft.input, new Set(draft.revealed)).done));
  const [reported, setReported] = useState(!!saved);
  // Điểm hiển thị: lần làm này (nếu vừa làm xong) hoặc điểm đã lưu
  const [score, setScore] = useState(saved);
  const result = useMemo(() => checkDictation(text, input, revealed), [text, input, revealed]);
  const [won, setWon] = useState(false); // vừa được điểm ở câu này
  // Số từ đã bấm xem
  const revealedCount = result.words.filter((w) => w.state === "revealed").length;
  const [focused, setFocused] = useState(!!autoFocus);
  // Vị trí con trỏ (để chèn ä ö ü ß đúng chỗ); forceSel: đặt lại con trỏ ngay sau chữ vừa chèn
  const sel = useRef({ start: input.length, end: input.length });
  const [forceSel, setForceSel] = useState<{ start: number; end: number }>();

  const change = (nextInput: string, nextRevealed: Set<number>) => {
    setInput(nextInput);
    setRevealed(nextRevealed);
    onDraft({ input: nextInput, revealed: [...nextRevealed] });
    const r = checkDictation(text, nextInput, nextRevealed);
    setChecked(r.done);
    if (r.done && !reported) {
      setReported(true);
      setScore({ correct: r.correct, total: r.total });
      if (onDone(r.correct, r.total, nextInput) === true) {
        setWon(true);
      }
    }
  };
  /** Làm lại câu này từ đầu (kết quả mới sẽ ghi đè khi làm xong) */
  const retry = () => {
    setInput("");
    setRevealed(new Set());
    setChecked(false);
    setReported(false);
    setScore(undefined);
    setWon(false);
    onDraft(null);
  };
  /** Chạm xem các từ ks (bỏ qua từ đã gõ đúng / đã xem) → hiện từ, trừ điểm */
  const reveal = (ks: number[]) => {
    const fresh = ks.filter((k) => !revealed.has(k) && result.words[k].state !== "correct");
    if (!fresh.length) return;
    change(input, new Set([...revealed, ...fresh]));
    onHint?.(fresh.length);
  };
  const insert = (ch: string) => {
    const { start, end } = sel.current;
    const a = Math.min(start, input.length);
    const b = Math.min(end, input.length);
    change(input.slice(0, a) + ch + input.slice(b), revealed);
    sel.current = { start: a + ch.length, end: a + ch.length };
    setForceSel(sel.current);
  };
  const check = () => setChecked(true);
  const submit = () => (result.done ? onNext() : check());

  return (
    <View style={{ gap: 12 }}>
      <View style={{ backgroundColor: C.background, borderColor: C.border, borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: C.amber, fontWeight: "800", fontSize: 12, letterSpacing: 1 }}>{t("dict.typeWhat")}</Text>
          <Pressable onPress={onReplay}>
            <Text style={{ color: C.amber, fontWeight: "700", fontSize: 12 }}>{t("dict.replay")}</Text>
          </Pressable>
        </View>
        <TextInput
          value={input}
          onChangeText={(v) => change(v, revealed)}
          onSubmitEditing={submit}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selection={forceSel}
          onSelectionChange={(e) => {
            sel.current = e.nativeEvent.selection;
            if (forceSel) setForceSel(undefined);
          }}
          submitBehavior="submit"
          returnKeyType={result.done ? "next" : "done"}
          placeholder={t("dict.placeholder")}
          placeholderTextColor={C.muted}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          multiline
          style={{ color: C.text, fontSize: 18, minHeight: 60 }}
        />
        {/* Đang gõ: phím chữ Đức (bàn phím tiếng Việt / tiếng Anh không có sẵn) */}
        {focused && !result.done && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {UMLAUTS.map((ch) => (
              <Pressable
                key={ch}
                onPress={() => insert(ch)}
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

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {result.words.map((w, k) => {
          const shown = w.state === "correct" || w.state === "revealed";
          const b = BOX[shown || checked ? w.state : "hint"];
          const label = shown ? w.text : checked && w.typed ? w.typed : hintFor(w.text, level);
          return (
            <Pressable
              key={k}
              disabled={shown && !result.done}
              onPress={() => (result.done ? onWord(w.text) : reveal([k]))}
              accessibilityLabel={label || t("dict.hiddenWord")}
              style={{
                borderColor: b.border,
                backgroundColor: b.bg,
                borderWidth: 2,
                borderRadius: 10,
                paddingHorizontal: 8,
                minHeight: 32,
                minWidth: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {label ? (
                <Text style={{ color: b.fg, fontFamily: "Menlo", fontWeight: "700", fontSize: 15 }}>{label}</Text>
              ) : (
                // Khó: không gợi ý gì — chỉ biểu tượng "chạm để xem"
                <SymbolView name="eye" size={15} tintColor={C.muted} />
              )}
            </Pressable>
          );
        })}
      </View>
      {checked && result.extra.length > 0 && <Text style={{ color: C.redText }}>{t("dict.extra", { w: result.extra.join(", ") })}</Text>}
      {result.done && translation && <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>{translation}</Text>}
      {won && (
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
            backgroundColor: "rgba(56,189,248,0.15)",
          }}
        >
          <Gem size={16} />
          <Text style={{ color: GEM, fontWeight: "800", fontSize: 12 }}>{t("dict.point", { n: POINTS_CORRECT })}</Text>
        </View>
      )}
      <Text style={{ color: C.muted, fontSize: 12 }}>
        {checked
          ? result.done
            ? t("dict.done", {
                c: score?.correct ?? result.correct,
                n: score?.total ?? result.total,
                r: revealedCount ? t("dict.revealed", { k: revealedCount }) : "",
              }) +
              " " +
              t("dict.tapWord")
            : t("dict.partial", { c: result.correct, n: result.total })
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
