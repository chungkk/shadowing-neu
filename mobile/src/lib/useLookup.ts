import { useState } from "react";
import { api, type VocabItem } from "./api";
import { showError } from "./dialogs";
import { useI18n } from "./i18n";
import { stopSpeaking } from "./speak";

type Source = { sourceUrl: string | null; sourceTitle: string };
type Lookup = { word: string; context: string; marks?: string[]; source?: Source };

/**
 * Tra từ trong buổi ôn: mở bảng giải thích (WordSheet) cho 1 từ / cụm trong câu, lưu / bỏ lưu vào sổ từ.
 * `pool`: sổ từ hiện có (biết từ nào đã lưu). Trả về `open` và `sheet` (props cho <WordSheet {...sheet} />).
 */
export function useLookup(pool: VocabItem[]) {
  const { t } = useI18n();
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [savedItems, setSavedItems] = useState(() => new Map(pool.map((p) => [p.word.toLowerCase(), p])));
  const [changed, setChanged] = useState(false); // đã lưu / bỏ lưu → quay lại thì tải lại sổ từ

  /** marks: các phần của cụm trong câu (để tô sáng); source: bài / video của câu (lưu kèm từ mới) */
  const open = (word: string, context: string, marks?: string[], source?: Source) => {
    stopSpeaking();
    setLookup({ word, context, marks, source });
  };

  const save = async (l: Lookup, meaning: string): Promise<boolean> => {
    try {
      const r = await api<{ vocab: VocabItem[] }>("/vocab", {
        method: "POST",
        body: { word: l.word, context: l.context, sourceUrl: l.source?.sourceUrl ?? null, sourceTitle: l.source?.sourceTitle ?? "" },
      });
      setChanged(true);
      const item = r.vocab.find((x) => x.word.toLowerCase() === l.word.toLowerCase());
      if (item) {
        let nextItem = item;
        if (!item.meaning && meaning) {
          await api(`/vocab/${item.id}`, { method: "PATCH", body: { meaning } }).catch(() => {});
          nextItem = { ...item, meaning };
        }
        setSavedItems((m) => new Map(m).set(l.word.toLowerCase(), nextItem));
      }
      return true;
    } catch (e) {
      showError(e, t("player.saveFailed"));
      return false;
    }
  };

  const remove = async (word: string) => {
    const key = word.toLowerCase();
    const prev = savedItems.get(key);
    if (!prev) return;
    setChanged(true);
    setSavedItems((m) => {
      const n = new Map(m);
      n.delete(key);
      return n;
    });
    // Lỗi → trả lại trạng thái "đã lưu" + báo (không âm thầm coi như đã bỏ lưu)
    await api(`/vocab/${prev.id}`, { method: "DELETE" }).catch((e) => {
      setSavedItems((m) => new Map(m).set(key, prev));
      showError(e, t("vocab.deleteFailed"));
    });
  };

  const matched = lookup ? savedItems.get(lookup.word.toLowerCase()) : undefined;
  const sheet = {
    word: lookup?.word ?? null,
    context: lookup?.context ?? "",
    marks: lookup?.marks,
    saved: !!matched,
    initialMeaning: matched?.meaning,
    extraExamples: matched?.examples,
    onSave: (meaning: string) => (lookup ? save(lookup, meaning) : Promise.resolve(false)),
    onRemove: () => (lookup ? remove(lookup.word) : Promise.resolve()),
    onClose: () => setLookup(null),
  };

  return { open, sheet, changed };
}
