import type { ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandBar } from "@/components/Brand";
import { DISPLAY, Text } from "@/components/Text";
import { styles } from "@/components/ui";
import { C, STICKER, alpha } from "@/lib/theme";
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
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
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
    <View style={{ height: 12, borderRadius: 6, borderWidth: 2, borderColor: C.ink, backgroundColor: C.card2, flexDirection: "row", overflow: "hidden" }}>
      <View style={{ width: pct(ok), backgroundColor: C.accent }} />
      <View style={{ width: pct(wrong), backgroundColor: C.red }} />
    </View>
  );
}

/** Thẻ đầu trang: tiêu đề phần · lựa chọn hiện tại (hạng / bang) · tiến độ */
export function HeroCard({
  emoji,
  title,
  subtitle,
  summary,
  onSettings,
  settingsLabel,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  summary: { total: number; done: number; ok: number; wrong: number };
  onSettings: () => void;
  settingsLabel: string;
}) {
  const { fs } = useLayout();
  const L = useL();
  return (
    <View style={{ backgroundColor: C.card, ...STICKER, borderRadius: 24, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text style={{ fontSize: 40 }}>{emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontFamily: DISPLAY, fontWeight: "800", fontSize: fs(24) }} accessibilityRole="header">
            {title}
          </Text>
          <Text style={{ color: C.muted, fontSize: 14 }} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        <Pressable
          onPress={onSettings}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={settingsLabel}
          style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: C.ink, backgroundColor: pressed ? C.card2 : C.card, alignItems: "center", justifyContent: "center" })}
        >
          <SymbolView name="slider.horizontal.3" size={18} tintColor={C.text} />
        </Pressable>
      </View>
      <ProgressBar ok={summary.ok} wrong={summary.wrong} total={summary.total} />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Stat value={`${summary.done}/${summary.total}`} label={L("đã làm", "bearbeitet")} />
        <Stat value={String(summary.ok)} label={L("đang đúng", "richtig")} color={C.accentText} />
        <Stat value={String(summary.wrong)} label={L("đang sai", "falsch")} color={C.redText} />
      </View>
    </View>
  );
}

function Stat({ value, label, color = C.text }: { value: string; label: string; color?: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ color, fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{value}</Text>
      <Text style={{ color: C.muted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

/** Thẻ lớn ở giữa (như app Führerschein cũ): 2 thẻ cạnh nhau cho Học · Thi thử */
export function BigTile({ icon, tone, title, subtitle, onPress }: { icon: SFSymbol; tone: string; title: string; subtitle?: string; onPress: () => void }) {
  const { tablet } = useLayout();
  const size = tablet ? 72 : 54;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle].filter(Boolean).join(", ")}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: tablet ? 220 : 160,
        padding: 14,
        gap: 6,
        borderRadius: 22,
        ...STICKER,
        backgroundColor: tone,
        opacity: pressed ? 0.9 : 1,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ translateY: pressed ? 2 : 0 }],
      })}
    >
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: "#fff", backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
        <SymbolView name={icon} size={size * 0.46} tintColor="#fff" weight="semibold" />
      </View>
      <Text style={{ color: "#fff", fontSize: tablet ? 22 : 17, fontWeight: "800", textAlign: "center" }} numberOfLines={2}>
        {title}
      </Text>
      {!!subtitle && (
        <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, textAlign: "center" }} numberOfLines={2}>
          {subtitle}
        </Text>
      )}
    </Pressable>
  );
}

export function IconRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", gap: 10 }}>{children}</View>;
}

/** Nút icon nhỏ trong hàng 4 nút: ô màu + nhãn ngắn + số đếm */
export function IconButton({ icon, tone, label, count, onPress }: { icon: SFSymbol; tone: string; label: string; count?: number; onPress: () => void }) {
  const { tablet } = useLayout();
  const box = tablet ? 52 : 42;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={count != null ? `${label}, ${count}` : label}
      style={({ pressed }) => ({
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 4,
        gap: 6,
        borderRadius: 18,
        ...STICKER,
        backgroundColor: pressed ? C.card2 : C.card,
        alignItems: "center",
        transform: [{ translateY: pressed ? 2 : 0 }],
      })}
    >
      <View style={{ width: box, height: box, borderRadius: 13, backgroundColor: tone, alignItems: "center", justifyContent: "center" }}>
        <SymbolView name={icon} size={box * 0.48} tintColor="#fff" weight="semibold" />
      </View>
      <Text style={{ color: C.text, fontSize: 12, fontWeight: "700", textAlign: "center" }} numberOfLines={2}>
        {label}
      </Text>
      {count != null && <Text style={{ color: C.muted, fontSize: 11, fontVariant: ["tabular-nums"] }}>{count}</Text>}
    </Pressable>
  );
}

/** Dòng menu phụ: icon · tiêu đề · mô tả · mũi tên */
export function MenuRow({ icon, tone, title, subtitle, onPress }: { icon: SFSymbol; tone: string; title: string; subtitle?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle].filter(Boolean).join(", ")}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, ...STICKER, backgroundColor: pressed ? C.card2 : C.card })}
    >
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: tone, alignItems: "center", justifyContent: "center" }}>
        <SymbolView name={icon} size={19} tintColor="#fff" weight="semibold" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: C.text, fontSize: 16, fontWeight: "800" }} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={{ color: C.muted, fontSize: 13 }} numberOfLines={1}>
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
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: C.border, padding: 14, gap: 8 }}>
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
        height: 34,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: C.ink,
        backgroundColor: primary ? C.accent : C.card,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Text style={{ color: primary ? "#fff" : C.text, fontWeight: "800", fontSize: 13 }}>{title}</Text>
    </Pressable>
  );
}

export function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      {!!title && <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginLeft: 14 }}>{title}</Text>}
      <View style={{ backgroundColor: C.card, ...STICKER, borderRadius: 24, overflow: "hidden" }}>{children}</View>
    </View>
  );
}

export const TONES = () => ({ green: C.accent, gold: "#d08a06", red: C.red, blue: C.gemFill, purple: "#7c3aed", teal: "#0f766e", ink: alpha(C.ink, 0.9) });
