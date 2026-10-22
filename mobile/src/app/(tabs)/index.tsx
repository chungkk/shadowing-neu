import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LevelBadge, styles } from "@/components/ui";
import { api, thumb, type LessonSummary, type ProgressSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { C, LEVELS } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { useLayout } from "@/lib/layout";

/** % đã học: số câu đã qua (Shadowing) hoặc đã làm chính tả, lấy cái nhiều hơn */
const percent = (p?: ProgressSummary) => (p && p.total ? Math.min(100, Math.round((Math.max(p.idx + 1, p.dictCount) / p.total) * 100)) : 0);

/** Thanh tiến độ mỏng ở đáy ảnh bìa (giống YouTube) */
function ProgressBar({ p }: { p?: ProgressSummary }) {
  if (!p) return null;
  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, backgroundColor: "rgba(0,0,0,0.55)" }}>
      <View style={{ width: `${percent(p)}%`, height: "100%", backgroundColor: C.accent }} />
    </View>
  );
}

/** "45%" / "✓ Xong" cạnh số câu */
function ProgressText({ p }: { p?: ProgressSummary }) {
  const { t } = useI18n();
  if (!p) return null;
  const n = percent(p);
  return <Text style={{ color: n >= 100 ? C.accent : C.amber, fontSize: 13, fontWeight: "800" }}>{n >= 100 ? `✓ ${t("lessons.finished")}` : `${n}%`}</Text>;
}

/** 1 bài đang học dở: ảnh nhỏ (có thanh tiến độ) · tên · "Câu 3/74" · % */
function ContinueRow({ p, videoId, onPress, last }: { p: ProgressSummary; videoId: string; onPress: () => void; last: boolean }) {
  const { t } = useI18n();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        backgroundColor: pressed ? C.card2 : "transparent",
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.border,
      })}
    >
      <View style={{ borderRadius: 8, overflow: "hidden" }}>
        <Image source={thumb(videoId)} alt="" style={{ width: 96, aspectRatio: 16 / 9, backgroundColor: C.card2 }} contentFit="cover" transition={150} />
        <ProgressBar p={p} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: C.text, fontWeight: "600", fontSize: 15, lineHeight: 20 }} numberOfLines={2}>
          {p.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: C.muted, fontSize: 13 }}>
            {p.mode === "dictation"
              ? t("lessons.progressDict", { d: p.dictCount, n: p.total })
              : t("lessons.progressAt", { i: p.idx + 1, n: p.total })}
          </Text>
          <Text style={{ color: C.accent, fontSize: 13, fontWeight: "700" }}>{percent(p)}%</Text>
        </View>
      </View>
      <SymbolView name="play.circle.fill" size={28} tintColor={C.accent} />
    </Pressable>
  );
}

/** Tiêu đề mục: chữ thường, đậm; số lượng nhạt bên cạnh */
function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 8 }}>
      <Text style={{ color: C.text, fontSize: 20, fontWeight: "700" }} accessibilityRole="header">
        {title}
      </Text>
      {count !== undefined && <Text style={{ color: C.muted, fontSize: 15 }}>{count}</Text>}
    </View>
  );
}

/** Bài đăng trong 14 ngày gần đây → nhãn "Mới" */
const isNew = (l: LessonSummary) => {
  const d = new Date(l.createdAt.replace(" ", "T") + "Z");
  return !isNaN(+d) && Date.now() - +d < 14 * 86_400_000;
};
function NewBadge() {
  const { t } = useI18n();
  return (
    <View style={{ backgroundColor: "rgba(250,204,21,0.15)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
      <Text style={{ color: C.amber, fontWeight: "700", fontSize: 11 }}>{t("lessons.newest")}</Text>
    </View>
  );
}

/** Hàng gọn: ảnh nhỏ bên trái, tên + cấp độ + số câu bên phải */
function LessonRow({ l, p }: { l: LessonSummary; p?: ProgressSummary }) {
  const { t } = useI18n();
  return (
    <Pressable
      onPress={() => router.push(`/lesson/${l.id}`)}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 12,
        backgroundColor: pressed ? C.card2 : "transparent",
      })}
    >
      <View>
        <Image
          source={thumb(l.videoId)}
          alt=""
          style={{ width: 120, aspectRatio: 16 / 9, borderRadius: 10, backgroundColor: C.card2 }}
          contentFit="cover"
          transition={150}
        />
        <View style={{ position: "absolute", inset: 0, borderRadius: 10, overflow: "hidden" }} pointerEvents="none">
          <ProgressBar p={p} />
        </View>
        {!l.published && (
          <View style={{ position: "absolute", bottom: 4, left: 4, backgroundColor: C.amber, borderRadius: 6, paddingHorizontal: 6 }}>
            <Text style={{ fontWeight: "800", fontSize: 11 }}>{t("lessons.draft")}</Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ color: C.text, fontWeight: "600", fontSize: 15, lineHeight: 20 }} numberOfLines={2}>
          {l.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <LevelBadge level={l.level} style={{ paddingHorizontal: 6, paddingVertical: 1 }} />
          <Text style={{ color: C.muted, fontSize: 13 }}>{t("sentences", { n: l.segmentCount })}</Text>
          {isNew(l) && !p && <NewBadge />}
          <ProgressText p={p} />
        </View>
      </View>
    </Pressable>
  );
}

/** Thẻ dọc trong lưới (iPad): ảnh to phía trên, tên + cấp độ bên dưới */
function LessonCard({ l, width, p }: { l: LessonSummary; width: number; p?: ProgressSummary }) {
  const { t } = useI18n();
  return (
    <Pressable
      onPress={() => router.push(`/lesson/${l.id}`)}
      style={({ pressed }) => ({
        width,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: pressed ? C.card2 : C.card,
        borderWidth: 1,
        borderColor: C.border,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View>
        <Image source={thumb(l.videoId)} alt="" style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: C.card2 }} contentFit="cover" transition={150} />
        <ProgressBar p={p} />
        {!l.published && (
          <View style={{ position: "absolute", bottom: 8, left: 8, backgroundColor: C.amber, borderRadius: 6, paddingHorizontal: 6 }}>
            <Text style={{ fontWeight: "800", fontSize: 12 }}>{t("lessons.draft")}</Text>
          </View>
        )}
      </View>
      <View style={{ padding: 12, gap: 8 }}>
        <Text style={{ color: C.text, fontWeight: "700", fontSize: 16, lineHeight: 21, minHeight: 42 }} numberOfLines={2}>
          {l.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <LevelBadge level={l.level} style={{ paddingHorizontal: 6, paddingVertical: 1 }} />
          <Text style={{ color: C.muted, fontSize: 13 }}>{t("sentences", { n: l.segmentCount })}</Text>
          {isNew(l) && !p && <NewBadge />}
          <ProgressText p={p} />
        </View>
      </View>
    </Pressable>
  );
}

/** Khung xám giữ chỗ khi đang tải */
function SkeletonRow() {
  return (
    <View style={{ flexDirection: "row", gap: 12, padding: 8, alignItems: "center" }}>
      <View style={{ width: 120, aspectRatio: 16 / 9, borderRadius: 10, backgroundColor: C.card2 }} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ height: 14, borderRadius: 4, backgroundColor: C.card2, width: "90%" }} />
        <View style={{ height: 14, borderRadius: 4, backgroundColor: C.card2, width: "60%" }} />
        <View style={{ height: 12, borderRadius: 4, backgroundColor: C.card2, width: "35%" }} />
      </View>
    </View>
  );
}

function EmptyState({ icon, title, text, action }: { icon: SFSymbol; title: string; text?: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 48, paddingHorizontal: 24 }}>
      <SymbolView name={icon} size={40} tintColor={C.muted} />
      <Text style={{ color: C.text, fontWeight: "800", fontSize: 17 }}>{title}</Text>
      {!!text && <Text style={[styles.muted, { textAlign: "center" }]}>{text}</Text>}
      {action && (
        <Pressable onPress={action.onPress} style={{ marginTop: 6, backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
          <Text style={{ color: "#fff", fontWeight: "800" }}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

function Chip({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 34,
        paddingHorizontal: 14,
        borderRadius: 17,
        backgroundColor: active ? C.accent : C.card2,
      }}
    >
      <Text style={{ color: active ? "#fff" : C.text, fontWeight: "800", fontSize: 14 }}>{label}</Text>
      <Text style={{ color: active ? "rgba(255,255,255,0.75)" : C.muted, fontWeight: "700", fontSize: 13 }}>{count}</Text>
    </Pressable>
  );
}

export default function LessonsScreen() {
  const { width, tablet } = useLayout();
  const { t } = useI18n();
  // iPad: lưới thẻ, mỗi thẻ rộng khoảng 260–340pt (2 cột khi chia đôi màn hình, 4 cột khi nằm ngang)
  const PAD = tablet ? 20 : 8;
  const GAP = 16;
  const columns = tablet ? Math.min(4, Math.max(2, Math.floor((width - PAD * 2 + GAP) / (260 + GAP)))) : 1;
  const cardWidth = (width - PAD * 2 - GAP * (columns - 1)) / columns;
  const { user } = useAuth();
  const [lessons, setLessons] = useState<LessonSummary[] | null>(null);
  const [progress, setProgress] = useState<ProgressSummary[]>([]); // tiến độ của tài khoản (trống khi là khách)
  const [level, setLevel] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const [l, p] = await Promise.all([
        api<{ lessons: LessonSummary[] }>("/lessons"),
        user ? api<{ progress: ProgressSummary[] }>("/progress").catch(() => ({ progress: [] })) : { progress: [] },
      ]);
      setLessons(l.lessons);
      setProgress(p.progress);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [user]);
  const progressOf = useMemo(() => new Map(progress.map((p) => [p.source, p])), [progress]);
  // Đang học dở (chưa xong 100%), mới nhất trước — bài học còn tồn tại hoặc video YouTube tự mở
  const continuing = useMemo(
    () =>
      progress
        .filter((p) => percent(p) < 100)
        .map((p) => {
          const [, kind, id] = p.source.split("/");
          const lesson = kind === "lesson" ? lessons?.find((l) => String(l.id) === id) : undefined;
          return { p, kind, id, videoId: kind === "watch" ? id : lesson?.videoId };
        })
        .filter((x): x is typeof x & { videoId: string } => !!x.videoId)
        .slice(0, 10),
    [progress, lessons],
  );

  // Mỗi lần mở tab thì tải lại (admin vừa thêm bài trên app sẽ hiện ra)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const all = useMemo(() => lessons ?? [], [lessons]);
  // Chỉ hiện cấp độ có bài, kèm số bài
  const levels = useMemo(
    () => LEVELS.map((g) => ({ level: g.level, count: all.filter((l) => l.level === g.level).length })).filter((g) => g.count > 0),
    [all],
  );
  const shown = all.filter((l) => !level || l.level === level); // API trả bài mới nhất trước

  const header = (
    <View style={{ gap: 16, paddingHorizontal: tablet ? 0 : 8, paddingTop: tablet ? 20 : 8, paddingBottom: 4 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ color: C.text, fontWeight: "800", fontSize: tablet ? 40 : 34 }} accessibilityRole="header">
          {t("lessons.title")}
        </Text>
        <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>{t("lessons.subtitle")}</Text>
      </View>

      {/* Lọc cấp độ */}
      {levels.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -PAD }}>
          <View style={{ width: PAD - 8 }} />
          <Chip label={t("lessons.all")} count={all.length} active={!level} onPress={() => setLevel(null)} />
          {levels.map((g) => (
            <Chip key={g.level} label={g.level} count={g.count} active={level === g.level} onPress={() => setLevel(level === g.level ? null : g.level)} />
          ))}
          <View style={{ width: PAD - 8 }} />
        </ScrollView>
      )}

      {/* Tiếp tục học: tối đa 3 bài, dọc trong 1 khung */}
      {!level && continuing.length > 0 && (
        <View style={{ gap: 10 }}>
          <SectionTitle title={t("lessons.continueHeading")} />
          <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
            {continuing.slice(0, 3).map(({ p, kind, id, videoId }, i, arr) => (
              <ContinueRow
                key={p.source}
                p={p}
                videoId={videoId}
                last={i === arr.length - 1}
                onPress={() => router.push(kind === "lesson" ? `/lesson/${id}` : `/watch/${id}`)}
              />
            ))}
          </View>
        </View>
      )}

      {lessons && shown.length > 0 && <SectionTitle title={level ? level : t("lessons.allHeading")} count={shown.length} />}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <FlatList
        key={columns}
        data={shown}
        numColumns={columns}
        keyExtractor={(l) => String(l.id)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 120, gap: tablet ? GAP : 0 }} // chừa chỗ cho thanh tab nổi
        ItemSeparatorComponent={tablet ? undefined : () => <View style={{ height: 1, backgroundColor: C.border, marginLeft: 142, marginRight: 8 }} />}
        columnWrapperStyle={columns > 1 ? { gap: GAP } : undefined}
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
        ListHeaderComponent={header}
        renderItem={({ item }) => {
          const p = progressOf.get(`/lesson/${item.id}`);
          return tablet ? <LessonCard l={item} width={cardWidth} p={p} /> : <LessonRow l={item} p={p} />;
        }}
        ListEmptyComponent={
          lessons === null ? (
            error ? (
              <EmptyState icon="wifi.exclamationmark" title={t("lessons.loadError")} text={error} action={{ label: t("retry"), onPress: load }} />
            ) : (
              <View>
                {Array.from({ length: 6 }, (_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </View>
            )
          ) : level ? (
            <EmptyState icon="magnifyingglass" title={t("lessons.noResults")} text={t("lessons.noResultsHint")} />
          ) : (
            <EmptyState icon="books.vertical" title={t("lessons.empty")} text={t("lessons.emptyHint")} />
          )
        }
      />
    </SafeAreaView>
  );
}
