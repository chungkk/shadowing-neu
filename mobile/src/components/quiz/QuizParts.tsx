import type { ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandBar } from "@/components/Brand";
import { Text } from "@/components/Text";
import { IconBubble, Nhan, PageHeader, styles } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { C, SEC, STICKER, type Sec } from "@/lib/theme";
import { CONTENT_MAX, useLayout } from "@/lib/layout";
import type { RunMode } from "@/lib/quiz/run";
import type { QuizModule } from "@/lib/quiz/store";
import { useL } from "@/lib/quiz/strings";

export const openRun = (module: QuizModule, mode: RunMode, scope: string) => router.push({ pathname: "/quiz/run", params: { module, mode, scope } });

/** Khung tab Lái xe / LiD: thanh thương hiệu + cột cuộn */
export function QuizTabScreen({ children, refreshing, onRefresh }: { children: ReactNode; refreshing?: boolean; onRefresh?: () => void }) {
  const { tablet } = useLayout();
  const PAD = tablet ? 24 : 16;
  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <BrandBar />
      <ScrollView
        style={{ width: "100%", maxWidth: CONTENT_MAX + 2 * PAD, alignSelf: "center" }}
        contentContainerStyle={{ paddingHorizontal: PAD, paddingTop: tablet ? 20 : 12, paddingBottom: 120, gap: 16 }}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.accentText} /> : undefined}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Màn phụ (stack) có cột cuộn giữa màn */
export function QuizPage({ children }: { children: ReactNode }) {
  const { tablet } = useLayout();
  const PAD = tablet ? 24 : 16;
  return (
    <ScrollView style={styles.screen} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ width: "100%", maxWidth: CONTENT_MAX + 2 * PAD, alignSelf: "center", padding: PAD, paddingBottom: 60, gap: 16 }}>
      {children}
    </ScrollView>
  );
}

export function ProgressBar({ ok, wrong, total }: { ok: number; wrong: number; total: number }) {
  const pct = (n: number) => `${total ? (n / total) * 100 : 0}%` as const;
  return (
    <View
      style={{ height: 8, borderRadius: 4, backgroundColor: C.card2, flexDirection: "row", overflow: "hidden" }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: ok }}
    >
      <View style={{ width: pct(ok), backgroundColor: C.ok }} />
      <View style={{ width: pct(wrong), backgroundColor: C.red }} />
    </View>
  );
}

/** Đầu tab Lái xe / LiD: bìa vở màu khu vực + nhãn vở (tiêu đề · lựa chọn hiện tại · tiến độ), nút cài đặt dán trên bìa */
export function HeroCard({
  sec,
  icon,
  title,
  subtitle,
  summary,
  onSettings,
  settingsLabel,
}: {
  sec: Sec;
  icon: SFSymbol;
  title: string;
  subtitle: string;
  summary: { total: number; done: number; ok: number; wrong: number };
  onSettings?: () => void;
  settingsLabel?: string;
}) {
  const L = useL();
  const s = SEC[sec];
  return (
    <PageHeader
      sec={sec}
      icon={icon}
      title={title}
      sub={subtitle}
      meta={
        onSettings && (
          <Pressable
            onPress={() => {
              haptic.tap();
              onSettings();
            }}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={settingsLabel}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              height: 34,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: pressed ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.9)",
            })}
          >
            <SymbolView name="slider.horizontal.3" size={15} tintColor="#16203a" weight="semibold" />
            <Text style={{ color: "#16203a", fontWeight: "700", fontSize: 13 }}>{L("Tuỳ chọn", "Optionen")}</Text>
          </Pressable>
        )
      }
    >
      <View style={{ gap: 8, marginTop: 4 }}>
        <ProgressBar ok={summary.ok} wrong={summary.wrong} total={summary.total} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Stat value={`${summary.done}/${summary.total}`} label={L("đã làm", "bearbeitet")} color={s.secText} />
          <Stat value={String(summary.ok)} label={L("đang đúng", "richtig")} color={C.okText} />
          <Stat value={String(summary.wrong)} label={L("đang sai", "falsch")} color={C.redText} />
        </View>
      </View>
    </PageHeader>
  );
}

function Stat({ value, label, color = C.text }: { value: string; label: string; color?: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ color, fontSize: 18, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{value}</Text>
      <Text style={{ color: C.muted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

/**
 * Thẻ lớn (Học · Thi thử) như hai cuốn vở: bìa màu phẳng có gáy đậm bên trái, nhãn nhỏ ghi tên.
 * tone: "sec" = màu khu vực (học) · "ink" = bìa mực (thi — nghiêm túc hơn)
 */
export function BigTile({ icon, sec, tone = "sec", title, subtitle, onPress }: { icon: SFSymbol; sec: Sec; tone?: "sec" | "ink"; title: string; subtitle?: string; onPress: () => void }) {
  const { tablet } = useLayout();
  const big = useBigType();
  const s = SEC[tone === "ink" ? "ink" : sec];
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle].filter(Boolean).join(", ")}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: tablet ? 210 : 168,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: s.sec,
        paddingLeft: 22,
        paddingRight: 12,
        paddingVertical: 14,
        justifyContent: "space-between",
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 10, backgroundColor: s.secDark }} />
      <SymbolView name={icon} size={tablet ? 34 : 28} tintColor={s.onSec} weight="semibold" />
      <Nhan small style={{ marginTop: 12 }}>
        <Text style={{ color: C.text, fontSize: tablet ? 19 : 16, fontWeight: "700", lineHeight: tablet ? 24 : 21 }} numberOfLines={big ? 4 : 2}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={{ color: C.muted, fontSize: 12, lineHeight: 16 }} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </Nhan>
    </Pressable>
  );
}

/** Chữ to (Dynamic Type cỡ trợ năng) → bố cục thưa hơn: hàng 4 nút thành lưới 2 cột, thẻ lớn cho nhiều dòng */
const useBigType = () => useWindowDimensions().fontScale >= 1.3;

export function IconRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: useBigType() ? "wrap" : "nowrap", gap: 10 }}>{children}</View>;
}

/** Nút icon nhỏ trong hàng 4 nút: ô màu + nhãn ngắn + số đếm */
export function IconButton({ icon, tone, label, count, onPress }: { icon: SFSymbol; tone: Tone; label: string; count?: number; onPress: () => void }) {
  const { tablet } = useLayout();
  const big = useBigType();
  const box = tablet ? 52 : 42;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={count != null ? `${label}, ${count}` : label}
      style={({ pressed }) => ({
        flexGrow: 1,
        flexBasis: big ? "45%" : 0,
        paddingVertical: 12,
        paddingHorizontal: 4,
        gap: 6,
        borderRadius: 14,
        ...STICKER,
        backgroundColor: pressed ? C.card2 : C.card,
        alignItems: "center",
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View style={{ width: box, height: box, borderRadius: 12, backgroundColor: tone.bg, alignItems: "center", justifyContent: "center" }}>
        <SymbolView name={icon} size={box * 0.48} tintColor={tone.fg} weight="semibold" />
      </View>
      <Text style={{ color: C.text, fontSize: 12, fontWeight: "700", textAlign: "center" }} numberOfLines={2}>
        {label}
      </Text>
      {count != null && <Text style={{ color: C.muted, fontSize: 12, fontWeight: "600", fontVariant: ["tabular-nums"] }}>{count}</Text>}
    </Pressable>
  );
}

/** Dòng menu phụ: icon · tiêu đề · mô tả · mũi tên */
export function MenuRow({ icon, tone, title, subtitle, onPress }: { icon: SFSymbol; tone: Tone; title: string; subtitle?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle].filter(Boolean).join(", ")}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, minHeight: 64, borderRadius: 16, ...STICKER, backgroundColor: pressed ? C.card2 : C.card, transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <IconBubble name={icon} color={tone.fg} bg={tone.bg} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={{ color: C.muted, fontSize: 13 }} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      <SymbolView name="chevron.right" size={14} tintColor={C.muted} weight="semibold" />
    </Pressable>
  );
}

/** Dòng trong danh sách nhóm câu: tên · số câu · thanh tiến độ · 2 nút Đọc / Luyện */
export function SetRow({
  title,
  subtitle,
  summary,
  first,
  onLesen,
  onUeben,
}: {
  title: string;
  subtitle?: string;
  summary: { total: number; done: number; ok: number; wrong: number };
  first?: boolean;
  onLesen: () => void;
  onUeben: () => void;
}) {
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: C.line, padding: 14, gap: 8 }}>
      <Pressable onPress={onUeben} accessibilityRole="button" style={{ gap: 2 }}>
        <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }}>{title}</Text>
        {!!subtitle && <Text style={{ color: C.muted, fontSize: 13 }}>{subtitle}</Text>}
      </Pressable>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <ProgressBar ok={summary.ok} wrong={summary.wrong} total={summary.total} />
          <Text style={{ color: C.muted, fontSize: 12, fontVariant: ["tabular-nums"] }}>
            {summary.done}/{summary.total} · ✓ {summary.ok} · ✗ {summary.wrong}
          </Text>
        </View>
        <SmallBtn title="Lesen" onPress={onLesen} />
        <SmallBtn title="Üben" onPress={onUeben} primary />
      </View>
    </View>
  );
}

export function SmallBtn({ title, onPress, primary }: { title: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        minHeight: 36,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: primary ? C.accentSoft : C.border,
        backgroundColor: primary ? C.accentSoft : C.card,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <Text style={{ color: primary ? C.accentText : C.text, fontWeight: "700", fontSize: 14 }}>{title}</Text>
    </Pressable>
  );
}

export function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      {!!title && <Text style={{ color: C.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginLeft: 14 }}>{title}</Text>}
      <View style={{ backgroundColor: C.card, ...STICKER, borderRadius: 16, overflow: "hidden" }}>{children}</View>
    </View>
  );
}

/** Màu nút icon theo nghĩa (ô nhạt + biểu tượng đậm, như .icon-bubble .tint-* của web) */
export type Tone = { bg: string; fg: string };
export const TONES = () => ({
  doc: { bg: C.accentSoft, fg: C.accentText }, // đề mẫu, nội dung
  wrong: { bg: C.redSoft, fg: C.redText }, // câu sai
  marked: { bg: C.goldSoft, fg: C.amber }, // đánh dấu = bút dạ quang
  stats: { bg: C.gemSoft, fg: C.gem }, // thống kê
  state: { bg: C.coralSoft, fg: C.coralText }, // câu của bang
  all: { bg: C.card2, fg: C.text }, // luyện tất cả
});
