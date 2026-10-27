import { Stack } from "expo-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { ErrorText, styles } from "@/components/ui";
import { api, type Rate, type Stats } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { CONTENT_MAX } from "@/lib/layout";
import { masteryMeta } from "@/lib/mastery";
import { C } from "@/lib/theme";
import type { Mastery } from "@shared/srs";

const CHART_H = 96;
/** Mức thành thạo có thứ tự → sắc độ 1 màu xanh (tối → sáng = thạo hơn); "Mới lưu" xám trung tính */
const MASTERY_FILL: Record<Mastery, string> = { saved: "#3b4a41", learning: "#14532d", active: "#16a34a", mastered: "#4ade80" };
const MASTERY_ORDER: Mastery[] = ["saved", "learning", "active", "mastered"];

const pct = (r: Rate) => (r.n ? `${Math.round((r.ok / r.n) * 100)}%` : "—");

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, gap: 12 }}>
      <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700" }}>{title}</Text>
      {children}
    </View>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, paddingVertical: 14, paddingHorizontal: 12, gap: 4 }}>
      <Text style={{ color: C.text, fontSize: 24, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{value}</Text>
      <Text style={{ color: C.muted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

/** 1 tỉ lệ nhớ: số lớn + "x/y lần ôn"; chưa có dữ liệu thì nói rõ */
function RateRow({ label, r }: { label: string; r: Rate }) {
  const { t } = useI18n();
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
      <Text style={{ flex: 1, color: C.text, fontSize: 15 }}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 20, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{pct(r)}</Text>
      <Text style={{ color: C.muted, fontSize: 12, minWidth: 80, textAlign: "right" }}>
        {r.n ? t("stats.ofReviews", { ok: r.ok, n: r.n }) : t("stats.noData")}
      </Text>
    </View>
  );
}

/** Số lần ôn mỗi ngày (14 ngày): 1 chuỗi → 1 màu, cột mảnh bo đỉnh, chạm cột để xem số của ngày đó */
function DaysChart({ days }: { days: Stats["days"] }) {
  const { t, lang } = useI18n();
  const [sel, setSel] = useState(days.length - 1); // mặc định: hôm nay
  const max = Math.max(1, ...days.map((d) => d.reviews));
  const label = (day: string) => {
    const [y, m, d] = day.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "numeric" });
  };
  const cur = days[sel];
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: C.text, fontSize: 15 }}>
        <Text style={{ fontWeight: "800" }}>{t("stats.reviewsOn", { n: cur.reviews })}</Text>
        <Text style={{ color: C.muted }}> · {label(cur.day)}</Text>
      </Text>
      <View style={{ height: CHART_H, flexDirection: "row", alignItems: "flex-end", gap: 2, borderBottomWidth: 1, borderColor: C.border }}>
        {days.map((d, i) => (
          <Pressable
            key={d.day}
            onPress={() => setSel(i)}
            accessibilityRole="button"
            accessibilityLabel={`${label(d.day)}: ${t("stats.reviewsOn", { n: d.reviews })}`}
            style={{ flex: 1, height: "100%", justifyContent: "flex-end" }} // vùng chạm = cả cột cao, lớn hơn thanh
          >
            <View
              style={{
                height: d.reviews ? Math.max(3, (d.reviews / max) * CHART_H) : 0,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                backgroundColor: C.accent,
                opacity: i === sel ? 1 : 0.55,
              }}
            />
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: C.muted, fontSize: 11 }}>{label(days[0].day)}</Text>
        <Text style={{ color: C.muted, fontSize: 11 }}>{t("stats.today")}</Text>
      </View>
    </View>
  );
}

/** Phân bố mức thành thạo: 1 thanh xếp chồng + danh sách có nhãn và số (không chỉ dựa vào màu) */
function MasteryBar({ m }: { m: Stats["mastery"] }) {
  const { t } = useI18n();
  const total = MASTERY_ORDER.reduce((s, k) => s + m[k], 0);
  if (!total) return <Text style={{ color: C.muted, fontSize: 15 }}>{t("stats.noData")}</Text>;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ height: 12, flexDirection: "row", gap: 2, borderRadius: 6, overflow: "hidden" }}>
        {MASTERY_ORDER.filter((k) => m[k]).map((k) => (
          <View key={k} style={{ flex: m[k], backgroundColor: MASTERY_FILL[k] }} />
        ))}
      </View>
      {MASTERY_ORDER.map((k) => (
        <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: MASTERY_FILL[k] }} />
          <Text style={{ flex: 1, color: C.text, fontSize: 15 }}>{masteryMeta(k, t).label}</Text>
          <Text style={{ color: C.text, fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{m[k]}</Text>
        </View>
      ))}
      <Text style={{ color: C.muted, fontSize: 12, lineHeight: 17 }}>{t("stats.masteryNote")}</Text>
    </View>
  );
}

/** Thống kê học tập — mọi số liệu tính trên server từ lịch sử ôn thật (review_events, sổ từ vựng) */
export default function StatsScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      setStats(await api<Stats>(`/stats?tz=${new Date().getTimezoneOffset()}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu lần đầu
    if (user) load();
  }, [user, load]);

  const s = stats;
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: t("stats.title") }} />
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
        {!s && !error && <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />}
        {s && (
          <>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Tile label={t("stats.streak")} value={`${s.streak}`} />
              <Tile label={t("stats.due")} value={`${s.dueToday}`} />
            </View>

            <Card title={t("stats.recallTitle")}>
              <RateRow label={t("stats.all")} r={s.recall30} />
            </Card>

            <Card title={t("stats.retentionTitle")}>
              <RateRow label={t("stats.after7")} r={s.retention7} />
              <RateRow label={t("stats.after30")} r={s.retention30} />
              <Text style={{ color: C.muted, fontSize: 12, lineHeight: 17 }}>{t("stats.retentionNote")}</Text>
            </Card>

            <Card title={t("stats.daysTitle")}>
              <DaysChart days={s.days} />
            </Card>

            <Card title={t("stats.masteryTitle")}>
              <MasteryBar m={s.mastery} />
            </Card>


            {s.forgotten.length > 0 && (
              <Card title={t("stats.forgottenTitle")}>
                {s.forgotten.map((f) => (
                  <View key={f.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ flex: 1, color: C.text, fontSize: 15 }} numberOfLines={2}>
                      {f.word}
                      {!!f.meaning && <Text style={{ color: C.muted }}> — {f.meaning}</Text>}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 13, fontVariant: ["tabular-nums"] }}>{t("stats.lapses", { n: f.lapses })}</Text>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
