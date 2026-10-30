import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { checkDictation, hintFor, type DictationLevel, type WordState } from "@shared/dictation";
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

/** Bản nháp 1 câu: chữ đã gõ + các từ đã bấm xem — giữ lại khi chuyển sang câu khác rồi quay về */
export type DictDraft = { input: string; revealed: number[] };

/**
 * Nghe chép chính tả 1 câu (bản di động của components/DictationPanel.tsx trên web).
 * Gõ đúng từ nào hiện từ đó; "Kiểm tra" để xem từ sai / thiếu; chạm 👁 để xem từ (tính là lỗi).
 * Câu đã làm xong (`saved`, kể cả lưu trên server từ lần trước) → hiện đủ câu + điểm, có nút "Làm lại";
 * chạm vào từ để tra nghĩa (`onWord`), có bản dịch câu nếu đang bật dịch.
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
  onWord,
  translation,
}: {
  text: string;
  level: DictationLevel;
  onReplay: () => void;
  onNext: () => void;
  onDone: (correct: number, total: number) => void;
  hasNext: boolean;
  draft?: DictDraft; // bản nháp lần trước (trong phiên học này)
  saved?: { correct: number; total: number }; // kết quả đã lưu của câu này
  onDraft: (d: DictDraft | null) => void;
  onWord: (word: string) => void; // câu đã xong: chạm vào từ → bảng tra từ
  translation?: string; // bản dịch câu (chỉ hiện khi đã xong)
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
  // Số từ phải bấm xem — không tính từ đã gõ đúng (bấm "Hiện tất cả" thêm cả chúng vào `revealed`)
  const revealedCount = result.words.filter((w) => w.state === "revealed").length;

  const change = (nextInput: string, nextRevealed: Set<number>) => {
    setInput(nextInput);
    setRevealed(nextRevealed);
    onDraft({ input: nextInput, revealed: [...nextRevealed] });
    const r = checkDictation(text, nextInput, nextRevealed);
    setChecked(r.done);
    if (r.done && !reported) {
      setReported(true);
      setScore({ correct: r.correct, total: r.total });
      onDone(r.correct, r.total);
    }
  };
  /** Làm lại câu này từ đầu (kết quả mới sẽ ghi đè khi làm xong) */
  const retry = () => {
    setInput("");
    setRevealed(new Set());
    setChecked(false);
    setReported(false);
    setScore(undefined);
    onDraft(null);
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
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {result.words.map((w, k) => {
          const shown = w.state === "correct" || w.state === "revealed";
          const b = BOX[shown || checked ? w.state : "hint"];
          return (
            <Pressable
              key={k}
              disabled={shown && !result.done}
              onPress={() => (result.done ? onWord(w.text) : change(input, new Set(revealed).add(k)))}
              style={{ borderColor: b.border, backgroundColor: b.bg, borderWidth: 2, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}
            >
              <Text style={{ color: b.fg, fontFamily: "Menlo", fontWeight: "700", fontSize: 15 }}>
                {shown ? w.text : checked && w.typed ? w.typed : hintFor(w.text, level) || "👁"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {checked && result.extra.length > 0 && <Text style={{ color: C.redText }}>{t("dict.extra", { w: result.extra.join(", ") })}</Text>}
      {result.done && translation && <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>{translation}</Text>}
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
          : t("dict.tapHint")}
      </Text>

      {/* iPad: 2 nút cạnh nhau */}
      <View style={{ flexDirection: tablet ? "row" : "column", gap: 12 }}>
        {result.done ? (
          <Button title={t("dict.retry")} variant="plain" onPress={retry} style={tablet ? { flex: 1 } : undefined} />
        ) : (
          <Button
            title={t("dict.showAll")}
            variant="amber"
            onPress={() => change(input, new Set(result.words.map((_, k) => k)))}
            style={tablet ? { flex: 1 } : undefined}
          />
        )}
        <Button
          title={result.done ? t("dict.next") : t("dict.check")}
          variant="primary"
          disabled={result.done && !hasNext}
          onPress={submit}
          style={tablet ? { flex: 1 } : undefined}
        />
      </View>
    </View>
  );
}
