import { router, Stack, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DeckCover } from "@/components/DeckCover";
import { Button, ErrorText, LevelBadge, styles } from "@/components/ui";
import { api, type Deck, type DeckWord } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { notice, showError } from "@/lib/dialogs";
import { C } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { CONTENT_MAX, useLayout } from "@/lib/layout";
import { speakGerman, stopSpeaking } from "@/lib/speak";

/** Màu mạo từ theo giống — như sổ từ: der xanh dương · die đỏ · das xanh lá */
const GENDER: Record<string, string> = { der: C.phrase, die: C.redText, das: C.accent };
/** Thêm nhiều hơn chừng này từ 1 lần → hỏi lại (sổ đầy từ mới, lịch ôn dồn dập) */
const CONFIRM_OVER = 100;
const hasArticle = (g: DeckWord["gender"]): g is "der" | "die" | "das" => g === "der" || g === "die" || g === "das";

function WordRow({
  w,
  first,
  last,
  speaking,
  busy,
  canAdd,
  onSpeak,
  onAdd,
}: {
  w: DeckWord;
  first: boolean;
  last: boolean;
  speaking: boolean;
  busy: boolean;
  canAdd: boolean;
  onSpeak: () => void;
  onAdd: () => void;
}) {
  const { t } = useI18n();
  return (
    <View
      style={{
        backgroundColor: C.card,
        borderTopLeftRadius: first ? 14 : 0,
        borderTopRightRadius: first ? 14 : 0,
        borderBottomLeftRadius: last ? 14 : 0,
        borderBottomRightRadius: last ? 14 : 0,
      }}
    >
      {!first && <View style={{ height: 1, backgroundColor: C.border, marginLeft: 14 }} />}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 14, paddingRight: 4, paddingVertical: 10 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: "600" }}>
            {hasArticle(w.gender) && <Text style={{ color: GENDER[w.gender] }}>{w.gender} </Text>}
            {w.word}
            {!!w.plural && w.plural !== w.word && <Text style={{ color: C.muted, fontSize: 14, fontWeight: "500" }}>{`  · die ${w.plural}`}</Text>}
          </Text>
          <Text style={{ color: C.muted, fontSize: 14 }}>{w.meaning}</Text>
          {!!w.example && <Text style={{ color: C.muted, fontSize: 13, fontStyle: "italic", opacity: 0.8 }}>{w.example}</Text>}
        </View>
        <Pressable onPress={onSpeak} hitSlop={6} style={{ padding: 10 }} accessibilityLabel={t("vocab.listen")}>
          <SymbolView name={speaking ? "stop.fill" : "speaker.wave.2"} size={17} tintColor={speaking ? C.accent : C.muted} />
        </Pressable>
        {canAdd && (
          <Pressable
            onPress={onAdd}
            disabled={w.saved || busy}
            hitSlop={6}
            style={{ padding: 10 }}
            accessibilityRole="button"
            accessibilityLabel={w.saved ? t("decks.inNotebook") : t("decks.addWord")}
          >
            {busy ? (
              <ActivityIndicator size="small" color={C.accent} />
            ) : (
              <SymbolView name={w.saved ? "checkmark.circle.fill" : "plus.circle"} size={22} tintColor={w.saved ? C.accent : C.text} />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function DeckScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const { t } = useI18n();
  const { tablet } = useLayout();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [error, setError] = useState("");
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<string> | "all">(new Set()); // từ đang thêm · "all" = đang thêm cả bộ
  const PAD = tablet ? 24 : 16;

  const load = useCallback(async () => {
    try {
      setError("");
      setDeck((await api<{ deck: Deck }>(`/vocab/decks/${encodeURIComponent(slug)}`)).deck);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [slug]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu lần đầu · đổi tài khoản thì "đã có trong sổ" khác
    load();
  }, [load, user]);
  useEffect(
    () => () => {
      stopSpeaking();
    },
    [],
  );

  /** Đọc từ (danh từ đọc kèm mạo từ); chạm lần nữa để dừng */
  const speak = ({ word, gender }: DeckWord) => {
    if (speaking === word) {
      stopSpeaking();
      setSpeaking(null);
      return;
    }
    setSpeaking(word);
    speakGerman(hasArticle(gender) ? `${gender} ${word}` : word, { onEnd: () => setSpeaking((s) => (s === word ? null : s)) }).catch(() =>
      setSpeaking(null),
    );
  };

  const markSaved = (words: string[]) => {
    const set = new Set(words);
    setDeck((d) => d && { ...d, words: d.words.map((w) => (set.has(w.word) ? { ...w, saved: true } : w)) });
  };
  /** Thêm 1 từ vào sổ */
  const addOne = async (word: string) => {
    if (busy === "all") return;
    setBusy((b) => new Set(b === "all" ? [] : b).add(word));
    try {
      await api(`/vocab/decks/${encodeURIComponent(slug)}`, { method: "POST", body: { words: [word] } });
      markSaved([word]);
    } catch (e) {
      showError(e, t("decks.addFailed"));
    } finally {
      setBusy((b) => {
        if (b === "all") return b;
        const n = new Set(b);
        n.delete(word);
        return n;
      });
    }
  };
  /** Thêm mọi từ chưa có trong sổ (nhiều từ → hỏi lại trước) */
  const addAll = () => {
    if (!deck || busy === "all") return;
    const n = deck.words.filter((w) => !w.saved).length;
    if (n <= CONFIRM_OVER) return doAddAll();
    Alert.alert(t("decks.addAllConfirm", { n }), t("decks.addAllHint"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("decks.addAll", { n }), onPress: doAddAll },
    ]);
  };
  const doAddAll = async () => {
    if (!deck) return;
    const rest = deck.words.filter((w) => !w.saved).map((w) => w.word);
    setBusy("all");
    try {
      const { added } = await api<{ added: number }>(`/vocab/decks/${encodeURIComponent(slug)}`, { method: "POST", body: { words: rest } });
      markSaved(rest);
      notice(t("decks.added", { n: added }));
    } catch (e) {
      showError(e, t("decks.addFailed"));
    } finally {
      setBusy(new Set());
    }
  };

  const words = deck?.words ?? [];
  const saved = words.filter((w) => w.saved).length;
  const left = words.length - saved;

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <Stack.Screen options={{ title: deck?.title ?? "" }} />
      <FlatList
        data={words}
        keyExtractor={(w, i) => `${i}`} // từ đồng âm ("die Bank" ngân hàng / ghế băng) → không dùng từ làm khoá
        style={{ width: "100%", maxWidth: CONTENT_MAX, alignSelf: "center" }}
        contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 60 }}
        ListHeaderComponent={
          <View style={{ gap: 14, paddingTop: 8, paddingBottom: 18 }}>
            <ErrorText>{error}</ErrorText>
            {!deck && !error && <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />}
            {deck && (
              <>
                <DeckCover deck={deck} big />
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    {!!deck.level && <LevelBadge level={deck.level} />}
                    <Text style={[styles.h1, { flex: 1 }]}>{deck.title}</Text>
                  </View>
                  {!!deck.description && <Text style={[styles.muted, { fontSize: 15, lineHeight: 21 }]}>{deck.description}</Text>}
                  <Text style={{ color: C.muted, fontSize: 14, fontWeight: "600" }}>
                    {t("decks.words", { n: words.length })}
                    {!!user && saved > 0 && ` · ${t("decks.progress", { s: saved, n: words.length })}`}
                  </Text>
                </View>
                {!user ? (
                  <Button title={t("decks.loginToAdd")} variant="primary" onPress={() => router.push("/settings")} />
                ) : left > 0 ? (
                  <Button
                    title={t("decks.addAll", { n: left })}
                    variant="primary"
                    icon={<SymbolView name="plus" size={15} tintColor="#fff" />}
                    onPress={addAll}
                    loading={busy === "all"}
                  />
                ) : (
                  <Button
                    title={t("decks.allSaved")}
                    variant="primary"
                    icon={<SymbolView name="rectangle.stack" size={15} tintColor="#fff" />}
                    onPress={() => router.push("/review")}
                  />
                )}
              </>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <WordRow
            w={item}
            first={index === 0}
            last={index === words.length - 1}
            speaking={speaking === item.word}
            busy={busy === "all" ? !item.saved : busy.has(item.word)}
            canAdd={!!user}
            onSpeak={() => speak(item)}
            onAdd={() => addOne(item.word)}
          />
        )}
      />
    </SafeAreaView>
  );
}
