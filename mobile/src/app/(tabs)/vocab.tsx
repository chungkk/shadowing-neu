import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DeckCover } from "@/components/DeckCover";
import { ErrorText, styles } from "@/components/ui";
import { api, deckCover, getVocabVersion, type DeckSummary } from "@/lib/api";
import { PointsBadge } from "@/components/Points";
import { useAuth } from "@/lib/auth";
import { C } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { CONTENT_MAX, useLayout } from "@/lib/layout";

const STALE_MS = 10 * 60_000; // lâu chưa tải → mở tab thì tải lại (số mục đến hạn đổi theo thời gian)
const GAP = 12;

type Notebook = { total: number; due: number };

/** Nhóm theo category, giữ thứ tự server trả (đã xếp theo order) */
function byCategory(decks: DeckSummary[]): { title: string; data: DeckSummary[] }[] {
  const groups = new Map<string, DeckSummary[]>();
  for (const d of decks) (groups.get(d.category) ?? groups.set(d.category, []).get(d.category)!).push(d);
  return [...groups].map(([title, data]) => ({ title, data }));
}

/** Banner đầu tab: sổ từ cá nhân (từ lưu khi học bài / video / bộ từ) — kèm nút ôn khi có mục đến hạn */
function NotebookBanner({ notebook, loggedIn }: { notebook: Notebook | null; loggedIn: boolean }) {
  const { t } = useI18n();
  const due = notebook?.due ?? 0;
  return (
    <Pressable
      onPress={() => router.push(loggedIn ? "/notebook" : "/settings")}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: pressed ? C.card2 : C.card,
      })}
    >
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" }}>
        <SymbolView name="book.closed.fill" size={26} tintColor="#fff" />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: "800" }}>{t("vocab.title")}</Text>
        <Text style={{ color: C.muted, fontSize: 14 }} numberOfLines={1}>
          {!loggedIn
            ? t("decks.notebookGuest")
            : notebook
              ? [t("vocab.count", { n: notebook.total }), due ? t("decks.due", { n: due }) : ""].filter(Boolean).join(" · ")
              : t("loading")}
        </Text>
      </View>
      {due > 0 ? (
        <Pressable
          onPress={() => router.push("/review")}
          accessibilityRole="button"
          hitSlop={6}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            height: 34,
            borderRadius: 99,
            backgroundColor: C.accent,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <SymbolView name="rectangle.stack" size={13} tintColor="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>{t("vocab.review")}</Text>
        </Pressable>
      ) : (
        <SymbolView name="chevron.right" size={15} tintColor={C.muted} />
      )}
    </Pressable>
  );
}

/** Thẻ game từ vựng (Mưa từ vựng · Đào vàng) → màn chơi /game/<variant> */
const GAMES = [
  { variant: "rain", bg: "linear-gradient(to bottom, #0a1622, #0c2033, #0b2a40)", art: ["1f327-fe0f", "26f5"], tone: "#67e8f9" },
  { variant: "gold", bg: "linear-gradient(to bottom, #2a3442 0%, #2a3442 34%, #6b4520 34%, #2e1c0b 100%)", art: ["1f477", "1fa99"], tone: C.amber },
] as const;

function GameCard({ game, width }: { game: (typeof GAMES)[number]; width: number }) {
  const { t } = useI18n();
  const emoji = (code: string) => ({ uri: deckCover(`/emoji/${code}.webp`) });
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/game/[variant]", params: { variant: game.variant } })}
      accessibilityRole="button"
      accessibilityLabel={t(`games.${game.variant}.title`)}
      style={({ pressed }) => ({ width, borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: pressed ? C.card2 : C.card, overflow: "hidden" })}
    >
      <View style={{ height: 84, backgroundImage: game.bg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Image source={emoji(game.art[0])} style={{ width: 52, height: 52 }} />
        <Image source={emoji(game.art[1])} style={{ width: 34, height: 34, marginTop: 24 }} />
      </View>
      <View style={{ padding: 10, gap: 4 }}>
        <Text style={{ color: C.text, fontSize: 16, fontWeight: "800" }} numberOfLines={1}>
          {t(`games.${game.variant}.title`)}
        </Text>
        <Text style={{ color: C.muted, fontSize: 13, lineHeight: 17, minHeight: 51 }} numberOfLines={3}>
          {t(`games.${game.variant}.desc`)}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
          <SymbolView name="play.fill" size={11} tintColor={game.tone} />
          <Text style={{ color: game.tone, fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }}>{t("games.play")}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function DeckCard({ deck, width }: { deck: DeckSummary; width: number }) {
  const { t } = useI18n();
  const saved = deck.learned ?? 0;
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/deck/[slug]", params: { slug: deck.slug } })}
      accessibilityRole="button"
      accessibilityLabel={[deck.title, deck.level, t("decks.words", { n: deck.wordCount })].filter(Boolean).join(", ")}
      style={({ pressed }) => ({
        width,
        padding: 10,
        gap: 10,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: pressed ? C.card2 : C.card,
      })}
    >
      <DeckCover deck={deck} />
      <Text style={{ color: C.text, fontSize: 16, fontWeight: "700", lineHeight: 21, minHeight: 42, paddingHorizontal: 2 }} numberOfLines={2}>
        {deck.title}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 2 }}>
        <SymbolView name="square.stack.3d.up" size={14} tintColor={C.muted} />
        <Text style={{ flex: 1, color: C.muted, fontSize: 14, fontWeight: "600" }}>{deck.wordCount}</Text>
        {saved > 0 && (
          <Text style={{ color: saved >= deck.wordCount ? C.accent : C.amber, fontSize: 13, fontWeight: "700" }}>
            {saved >= deck.wordCount ? "✓" : `${saved}/${deck.wordCount}`}
          </Text>
        )}
      </View>
      {/* Tiến độ: phần đã học */}
      {saved > 0 && saved < deck.wordCount && (
        <View style={{ height: 3, borderRadius: 2, backgroundColor: C.card2, marginHorizontal: 2, marginTop: -4 }}>
          <View style={{ width: `${(saved * 100) / deck.wordCount}%`, height: "100%", borderRadius: 2, backgroundColor: C.amber }} />
        </View>
      )}
    </Pressable>
  );
}

export default function VocabTab() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { width, tablet } = useLayout();
  const [decks, setDecks] = useState<DeckSummary[] | null>(null);
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const loaded = useRef<{ version: number; at: number } | null>(null);
  const PAD = tablet ? 24 : 16;

  const load = useCallback(async () => {
    try {
      setError("");
      const version = getVocabVersion();
      const r = await api<{ decks: DeckSummary[]; notebook: Notebook | null }>("/vocab/decks");
      setDecks(r.decks);
      setNotebook(r.notebook);
      loaded.current = { version, at: Date.now() };
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // Đổi tài khoản → số liệu sổ / "đã có trong sổ" của người khác
  useEffect(() => {
    loaded.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- xoá dữ liệu của tài khoản trước
    setNotebook(null);
  }, [user]);

  // Mở tab: tải lại khi sổ đã đổi (lưu / ôn / thêm bộ từ ở màn khác) hoặc lâu chưa tải
  useFocusEffect(
    useCallback(() => {
      const l = loaded.current;
      if (!l || l.version !== getVocabVersion() || Date.now() - l.at > STALE_MS) load();
    }, [load]),
  );

  const sections = useMemo(() => byCategory(decks ?? []), [decks]);
  // Lưới thẻ: 2 cột trên điện thoại, nhiều hơn khi màn hình rộng
  const inner = Math.min(width, CONTENT_MAX + 2 * PAD) - 2 * PAD;
  const cols = inner >= 600 ? 3 : 2;
  const cardW = Math.floor((inner - GAP * (cols - 1)) / cols);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        style={{ width: "100%", maxWidth: CONTENT_MAX + 2 * PAD, alignSelf: "center" }}
        contentContainerStyle={{ paddingHorizontal: PAD, paddingTop: tablet ? 20 : 12, paddingBottom: 120, gap: 16 }}
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
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={[styles.h1, { flex: 1 }]}>{t("tabs.vocab")}</Text>
          <PointsBadge />
          {/* Thêm từ tự do vào sổ */}
          {!!user && (
            <Pressable onPress={() => router.push("/vocab-add")} hitSlop={6} style={{ padding: 6 }} accessibilityRole="button" accessibilityLabel={t("vocab.add")}>
              <SymbolView name="plus" size={20} tintColor={C.text} />
            </Pressable>
          )}
        </View>
        <NotebookBanner notebook={notebook} loggedIn={!!user} />
        {/* Trò chơi luyện từ (chơi được cả khi chưa đăng nhập) */}
        <View style={{ gap: 12, marginTop: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <SymbolView name="gamecontroller.fill" size={20} tintColor={C.amber} />
            <Text style={{ color: C.text, fontSize: 22, fontWeight: "800" }}>{t("games.title")}</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
            {GAMES.map((g) => (
              <GameCard key={g.variant} game={g} width={cardW} />
            ))}
          </View>
        </View>
        <ErrorText>{error}</ErrorText>
        {sections.map((s) => (
          <View key={s.title} style={{ gap: 12, marginTop: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ flexShrink: 1, color: C.text, fontSize: 22, fontWeight: "800" }}>{s.title}</Text>
              <View style={{ minWidth: 28, height: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>{s.data.length}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
              {s.data.map((d) => (
                <DeckCard key={d.slug} deck={d} width={cardW} />
              ))}
            </View>
          </View>
        ))}
        {decks && !decks.length && <Text style={[styles.muted, { textAlign: "center", marginTop: 24 }]}>{t("decks.empty")}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}
