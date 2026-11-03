import { Stack } from "expo-router";
import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { GEM, Gem } from "@/components/Points";
import { ErrorText, styles } from "@/components/ui";
import { api, avatarSource, type Leaderboard, type LeaderboardEntry } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { CONTENT_MAX } from "@/lib/layout";
import { C, STICKER } from "@/lib/theme";

const fmt = (n: number) => n.toLocaleString("vi-VN");
/** Nền · chữ của số hạng 3 người đầu */
const PODIUM: [string, string][] = [
  [C.amber, "#fff"],
  [C.border, C.text],
  ["rgba(217,119,6,0.25)", C.amber],
];

/** Ảnh đại diện chỉ chính chủ xem được → người khác hiện chữ cái đầu tên */
function Face({ name, url, size }: { name: string; url?: string | null; size: number }) {
  if (url) return <Image source={avatarSource(url)} alt="" style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.amber, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontSize: size * 0.45, fontWeight: "800" }}>{name.trim()[0]?.toUpperCase() ?? "?"}</Text>
    </View>
  );
}

function BoardRow({ r, first, mine, url }: { r: LeaderboardEntry; first: boolean; mine: boolean; url?: string | null }) {
  const { t } = useI18n();
  const podium = PODIUM[r.rank - 1];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: C.border,
        backgroundColor: mine ? C.card2 : "transparent",
      }}
    >
      <View style={{ minWidth: 30, height: 30, paddingHorizontal: 4, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: podium?.[0] ?? "transparent" }}>
        <Text style={{ color: podium?.[1] ?? C.muted, fontSize: 14, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{r.rank}</Text>
      </View>
      <Face name={r.name} url={mine ? url : null} size={34} />
      <Text style={{ flex: 1, color: C.text, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
        {r.name}
        {mine && <Text style={{ color: C.accent }}> ({t("board.you")})</Text>}
      </Text>
      <Gem size={18} />
      <Text style={{ color: GEM, fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{fmt(r.total)}</Text>
    </View>
  );
}

/** Bảng xếp hạng điểm + hạng của mình (bản di động của trang /leaderboard trên web) */
export default function LeaderboardScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      setBoard(await api<Leaderboard>("/leaderboard"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu lần đầu
    if (user) load();
  }, [user, load]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: t("board.title") }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ width: "100%", maxWidth: CONTENT_MAX, alignSelf: "center", padding: 16, gap: 12, paddingBottom: 48 }}
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
        <ErrorText>{error}</ErrorText>
        {!board && !error && <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />}
        {board && user && (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: 24, ...STICKER, padding: 16 }}>
              <Face name={user.name} url={user.avatarUrl} size={46} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: C.muted, fontSize: 12, fontWeight: "700" }}>{t("board.yourRank")}</Text>
                {board.me.rank === null ? (
                  <>
                    <Text style={{ color: C.text, fontSize: 18, fontWeight: "800" }}>{t("board.unranked")}</Text>
                    <Text style={{ color: C.muted, fontSize: 13, lineHeight: 17 }}>{t("board.unrankedHint")}</Text>
                  </>
                ) : (
                  <Text style={{ color: C.text, fontSize: 26, fontWeight: "800", fontVariant: ["tabular-nums"] }}>
                    #{fmt(board.me.rank)} <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700" }}>{t("board.ofPlayers", { n: fmt(board.players) })}</Text>
                  </Text>
                )}
              </View>
              <Gem size={22} />
              <Text style={{ color: GEM, fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{fmt(board.me.total)}</Text>
            </View>

            {board.top.length === 0 ? (
              <Text style={[styles.muted, { textAlign: "center", marginTop: 16 }]}>{t("board.empty")}</Text>
            ) : (
              <View style={{ backgroundColor: C.card, borderRadius: 24, ...STICKER, overflow: "hidden" }}>
                {board.top.map((r, i) => (
                  <BoardRow key={r.id} r={r} first={i === 0} mine={r.id === user.id} url={user.avatarUrl} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
