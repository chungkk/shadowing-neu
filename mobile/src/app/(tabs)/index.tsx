import { Image } from "expo-image";
import { router, useFocusEffect, type Href } from "expo-router";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FREE_PICKS } from "@shared/lesson-lock";
import { extractVideoId } from "@shared/youtube-id";
import { BrandBar } from "@/components/Brand";
import { Hero } from "@/components/Hero";
import { Mascot } from "@/components/Mascot";
import { DISPLAY, Text } from "@/components/Text";
import { Button, Card, ErrorText, Input, LevelBadge, styles } from "@/components/ui";
import {
  api,
  getLessonsVersion,
  thumb,
  type LessonSummary,
  type LockInfo,
  type ProgressSummary,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmtDuration } from "@/lib/dub";
import { useDueCount } from "@/lib/due";
import { haptic } from "@/lib/haptics";
import { useI18n, type TFn } from "@/lib/i18n";
import { useLayout } from "@/lib/layout";
import { usePoints } from "@/lib/points";
import { mergeProgress, useLocalProgress } from "@/lib/progress";
import { removeWatch, useRecentWatches } from "@/lib/watchRecent";
import { C, LEVELS, R, STICKER, alpha } from "@/lib/theme";

const STALE_MS = 5 * 60_000;
const CONTINUE_SHOWN = 3;
const CONTINUE_MAX = 20;
const SHELF_MAX = 10;

const percent = (p?: ProgressSummary) => {
  if (!p?.total) return 0;
  const done = Math.min(p.total, Math.max(p.seenCount ?? p.idx + 1, p.dictCount));
  return done ? Math.max(1, Math.floor((done * 100) / p.total)) : 0;
};

const sentences = (l: LessonSummary) => l.sentenceCount ?? l.segmentCount;

const lessonLabel = (l: LessonSummary, p: ProgressSummary | undefined, t: TFn) =>
  [
    l.title,
    l.level,
    t("sentences", { n: sentences(l) }),
    percent(p) >= 100 ? t("lessons.finished") : percent(p) > 0 ? `${percent(p)}%` : "",
    l.published ? "" : t("lessons.draft"),
  ]
    .filter(Boolean)
    .join(", ");

function ProgressBar({ p }: { p?: ProgressSummary }) {
  if (!p) return null;
  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, backgroundColor: "rgba(0,0,0,0.55)" }}>
      <View style={{ width: `${percent(p)}%`, height: "100%", backgroundColor: C.accent }} />
    </View>
  );
}

function ProgressText({ p }: { p?: ProgressSummary }) {
  const { t } = useI18n();
  const n = percent(p);
  if (!n && !p?.completed) return null;
  if (n >= 100) {
    return <Text style={{ color: C.okText, fontSize: 12, fontWeight: "800" }}>✓ {t("lessons.finished")}</Text>;
  }
  if (p?.completed) {
    return (
      <Text style={{ color: C.okText, fontSize: 12, fontWeight: "800" }}>
        ✓ {n ? t("lessons.relearning", { p: n }) : t("lessons.finished")}
      </Text>
    );
  }
  return <Text style={{ color: C.amber, fontSize: 12, fontWeight: "800" }}>{n}%</Text>;
}

function ContinueRow({
  p,
  title,
  dictation,
  videoId,
  onPress,
  last,
}: {
  p: ProgressSummary;
  title: string;
  dictation: boolean;
  videoId: string;
  onPress: () => void;
  last: boolean;
}) {
  const { t } = useI18n();
  const n = percent(p);
  const at =
    p.mode === "dictation" && dictation
      ? t("lessons.progressDict", { d: p.dictCount, n: p.total })
      : t("lessons.progressAt", { i: p.idx + 1, n: p.total });
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, at, n ? `${n}%` : ""].filter(Boolean).join(", ")}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        backgroundColor: pressed ? C.card2 : "transparent",
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.line,
      })}
    >
      <View style={{ borderRadius: 8, overflow: "hidden" }}>
        <Image source={thumb(videoId)} alt="" style={{ width: 96, aspectRatio: 16 / 9, backgroundColor: C.card2 }} contentFit="cover" transition={150} />
        <ProgressBar p={p} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: C.text, fontWeight: "600", fontSize: 15, lineHeight: 20 }} numberOfLines={2}>
          {title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: C.muted, fontSize: 13 }}>{at}</Text>
          {!!n && <Text style={{ color: C.accentText, fontSize: 13, fontWeight: "700" }}>{n}%</Text>}
        </View>
      </View>
      <SymbolView name="play.circle.fill" size={28} tintColor={C.accentText} />
    </Pressable>
  );
}

function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 8 }}>
      <Text style={{ color: C.text, fontFamily: DISPLAY, fontSize: 21, fontWeight: "700", letterSpacing: -0.3 }} accessibilityRole="header">
        {title}
      </Text>
      {count !== undefined && <Text style={{ color: C.muted, fontSize: 15 }}>{count}</Text>}
    </View>
  );
}

const isNew = (l: LessonSummary) => {
  const d = new Date(l.createdAt.replace(" ", "T") + "Z");
  return !isNaN(+d) && Date.now() - +d < 3 * 86_400_000;
};

function NewBadge() {
  const { t } = useI18n();
  return (
    <View style={{ backgroundColor: C.gold, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 1 }}>
      <Text style={{ color: "#16203a", fontWeight: "700", fontSize: 11 }}>{t("lessons.newest")}</Text>
    </View>
  );
}

function AccessBadge({ l, size, inset = 8 }: { l: LessonSummary; size: number; inset?: number }) {
  const { t } = useI18n();
  if (l.access === "locked")
    return (
      <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" }} pointerEvents="none">
        <SymbolView name="lock.fill" size={size} tintColor="#fff" />
      </View>
    );
  if (l.access === "free")
    return (
      <View style={{ position: "absolute", top: inset, left: inset, backgroundColor: C.ok, borderRadius: 6, paddingHorizontal: inset, paddingVertical: 2 }} pointerEvents="none">
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 11 }}>{t("lock.free")}</Text>
      </View>
    );
  return null;
}

function LessonRow({ l, p }: { l: LessonSummary; p?: ProgressSummary }) {
  const { t } = useI18n();
  const dur = fmtDuration(l.duration);
  return (
    <Pressable
      onPress={() => router.push(`/lesson/${l.id}`)}
      accessibilityRole="button"
      accessibilityLabel={lessonLabel(l, p, t)}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 8, borderRadius: 16, backgroundColor: pressed ? C.card2 : "transparent" })}
    >
      <View style={{ borderRadius: 10, overflow: "hidden" }}>
        <Image source={thumb(l.videoId)} alt="" style={{ width: 128, aspectRatio: 16 / 9, backgroundColor: C.card2 }} contentFit="cover" transition={150} />
        {!!dur && (
          <View style={{ position: "absolute", right: 4, bottom: p ? 6 : 4, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: "rgba(0,0,0,0.75)" }}>
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{dur}</Text>
          </View>
        )}
        <ProgressBar p={p} />
        <AccessBadge l={l} size={18} inset={4} />
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ color: C.text, fontWeight: "700", fontSize: 15, lineHeight: 20 }} numberOfLines={2}>
          {l.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <LevelBadge level={l.level} style={{ paddingHorizontal: 6, paddingVertical: 1 }} />
          <Text style={{ color: C.muted, fontSize: 12 }}>{t("sentences", { n: sentences(l) })}</Text>
          {l.dictation && (
            <Text style={{ color: C.accentText, fontSize: 11, fontWeight: "700" }}>· {t("player.dictation")}</Text>
          )}
          {isNew(l) && !p && <NewBadge />}
          {!l.published && <Text style={{ color: C.amber, fontSize: 12, fontWeight: "800" }}>{t("lessons.draft")}</Text>}
          <ProgressText p={p} />
        </View>
      </View>
    </Pressable>
  );
}

function Shelf({
  title,
  avatar,
  badge,
  lessons,
  cardWidth,
  pad,
  progressOf,
  onSeeAll,
}: {
  title?: string;
  avatar?: string | null;
  badge?: string;
  lessons: LessonSummary[];
  cardWidth: number;
  pad: number;
  progressOf: Map<string, ProgressSummary>;
  onSeeAll?: () => void;
}) {
  const { t } = useI18n();
  const more = onSeeAll && lessons.length > SHELF_MAX;
  return (
    <View style={{ gap: 10, marginTop: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {!!avatar && <Image source={avatar} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.card2 }} contentFit="cover" />}
        {badge ? <LevelBadge level={badge} style={{ paddingHorizontal: 8, paddingVertical: 2 }} /> : <Text style={{ color: C.text, fontSize: 16, fontWeight: "800" }}>{title}</Text>}
        <Text style={{ color: C.muted, fontSize: 14, flex: 1 }}>{t("lessons.count", { n: lessons.length })}</Text>
        {onSeeAll && (
          <Pressable onPress={onSeeAll} hitSlop={8} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ color: C.accentText, fontSize: 14, fontWeight: "700" }}>{t("lessons.seeAll")}</Text>
            <SymbolView name="chevron.right" size={12} tintColor={C.accentText} weight="semibold" />
          </Pressable>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={cardWidth + 12}
        style={{ marginHorizontal: -pad, overflow: "visible" }}
        contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: 6, gap: 12 }}
      >
        {(onSeeAll ? lessons.slice(0, SHELF_MAX) : lessons).map((l) => (
          <LessonCard key={l.id} l={l} width={cardWidth} p={progressOf.get(`/lesson/${l.id}`)} />
        ))}
        {more && (
          <Pressable
            onPress={onSeeAll}
            accessibilityRole="button"
            style={({ pressed }) => ({
              width: 120,
              borderRadius: 16,
              ...STICKER,
              backgroundColor: pressed ? C.card2 : C.card,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            })}
          >
            <SymbolView name="arrow.right.circle.fill" size={32} tintColor={C.accentText} />
            <Text style={{ color: C.text, fontSize: 14, fontWeight: "700", textAlign: "center" }}>{t("lessons.showAll", { n: lessons.length })}</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function LessonCard({ l, width, p }: { l: LessonSummary; width: number; p?: ProgressSummary }) {
  const { t } = useI18n();
  const dur = fmtDuration(l.duration);
  return (
    <Pressable
      onPress={() => router.push(`/lesson/${l.id}`)}
      accessibilityRole="button"
      accessibilityLabel={lessonLabel(l, p, t)}
      style={({ pressed }) => ({
        width,
        borderRadius: 16,
        backgroundColor: pressed ? C.card2 : C.card,
        ...STICKER,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View style={{ borderTopLeftRadius: 15, borderTopRightRadius: 15, overflow: "hidden" }}>
        <Image
          source={thumb(l.videoId, "hq")}
          alt=""
          style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: C.card2 }}
          contentFit="cover"
          transition={150}
        />
        {!!dur && (
          <View style={{ position: "absolute", right: 6, bottom: p ? 8 : 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: "rgba(0,0,0,0.75)" }}>
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{dur}</Text>
          </View>
        )}
        <ProgressBar p={p} />
        <AccessBadge l={l} size={30} />
        {!l.published && l.ownerId == null && (
          <View style={{ position: "absolute", bottom: 8, left: 8, backgroundColor: C.gold, borderRadius: 6, paddingHorizontal: 6 }}>
            <Text style={{ color: "#16203a", fontWeight: "800", fontSize: 12 }}>{t("lessons.draft")}</Text>
          </View>
        )}
      </View>
      <View style={{ padding: 12, gap: 6 }}>
        <Text style={{ color: C.text, fontWeight: "700", fontSize: 16, lineHeight: 21, minHeight: 42 }} numberOfLines={2}>
          {l.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {l.ownerId == null && <LevelBadge level={l.level} style={{ paddingHorizontal: 6, paddingVertical: 1 }} />}
          <Text style={{ color: C.muted, fontSize: 12 }}>{t("sentences", { n: sentences(l) })}</Text>
          {l.dictation && <Text style={{ color: C.accentText, fontSize: 11, fontWeight: "700" }}>· {t("player.dictation")}</Text>}
          {isNew(l) && !p && <NewBadge />}
          <ProgressText p={p} />
        </View>
      </View>
    </Pressable>
  );
}

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

function EmptyState({ title, text, action }: { title: string; text?: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 40, paddingHorizontal: 24 }}>
      <Mascot size={104} animated bob />
      <Text style={{ color: C.text, fontFamily: DISPLAY, fontWeight: "700", fontSize: 19, textAlign: "center" }}>{title}</Text>
      {!!text && <Text style={[styles.muted, { textAlign: "center", fontSize: 15, lineHeight: 21 }]}>{text}</Text>}
      {action && <Button title={action.label} variant="primary" onPress={action.onPress} style={{ marginTop: 6 }} />}
    </View>
  );
}

function Chip({ label, count, active, onPress }: { label: string; count?: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        if (!active) haptic.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={{ top: 5, bottom: 5 }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 36,
        paddingHorizontal: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: active ? C.text : C.border,
        backgroundColor: active ? C.text : pressed ? C.card2 : C.card,
      })}
    >
      <Text style={{ color: active ? C.background : C.text, fontWeight: "700", fontSize: 14 }}>{label}</Text>
      {count !== undefined && (
        <Text style={{ color: active ? alpha(C.background, 0.7) : C.muted, fontWeight: "600", fontSize: 13, fontVariant: ["tabular-nums"] }}>
          {count}
        </Text>
      )}
    </Pressable>
  );
}

function NavPill({ icon, label, badge, onPress }: { icon: SFSymbol; label: string; badge?: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: pressed ? C.card2 : C.card,
        ...STICKER,
      })}
    >
      <SymbolView name={icon} size={15} tintColor={C.accentText} weight="semibold" />
      <Text style={{ color: C.text, fontSize: 13, fontWeight: "700" }}>{label}</Text>
      {badge !== undefined && badge > 0 && (
        <View style={{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.red, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 }}>
          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

function LockNote({ lock, points }: { lock: LockInfo; points: number }) {
  const { t } = useI18n();
  const price = lock.price.toLocaleString("vi-VN");
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <SymbolView name="lock.fill" size={14} tintColor={C.muted} />
      <Text style={{ flex: 1, color: C.muted, fontSize: 14, lineHeight: 20 }}>
        {!lock.loggedIn
          ? t("lock.noteGuest", { n: FREE_PICKS })
          : lock.picksLeft > 0
            ? t("lock.notePicks", { n: lock.picksLeft, price })
            : t("lock.noteBuy", { price, points: points.toLocaleString("vi-VN") })}
      </Text>
    </View>
  );
}

type Item = {
  key: string;
  shelf?: { title?: string; avatar?: string | null; badge?: string; lessons: LessonSummary[]; seeAllLevel?: string };
  row?: LessonSummary[];
};

export default function LessonsScreen() {
  const { width, tablet } = useLayout();
  const { t } = useI18n();
  const PAD = tablet ? 20 : 16;
  const GAP = 16;
  const columns = tablet ? Math.min(4, Math.max(2, Math.floor((width - PAD * 2 + GAP) / (260 + GAP)))) : 1;
  const cardWidth = (width - PAD * 2 - GAP * (columns - 1)) / columns;
  const { user } = useAuth();
  const me = user?.id ?? null;
  const due = useDueCount();
  const recentWatches = useRecentWatches();

  const [lessons, setLessons] = useState<LessonSummary[] | null>(null);
  const [ownLessons, setOwnLessons] = useState<{ user: number | null; list: LessonSummary[] }>({ user: null, list: [] });
  const [lock, setLock] = useState<LockInfo | null>(null);
  const points = usePoints(user?.id);
  const [server, setServer] = useState<{ user: number | null; list: ProgressSummary[] }>({ user: null, list: [] });
  const local = useLocalProgress();

  const [level, setLevel] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dictOnly, setDictOnly] = useState(false);
  const [groupBy, setGroupBy] = useState<"level" | "channel">("level");
  const [ytUrl, setYtUrl] = useState("");
  const [ytErr, setYtErr] = useState("");

  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<Item>>(null);
  const [showAll, setShowAll] = useState(false);
  const loaded = useRef<{ user: number | null; version: number; at: number } | null>(null);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    const version = getLessonsVersion();
    try {
      setError("");
      const [l, p, own] = await Promise.all([
        api<{ lessons: LessonSummary[]; lock?: LockInfo }>("/lessons"),
        me !== null
          ? api<{ progress: ProgressSummary[] }>("/progress").then(
              (r) => r.progress,
              () => null,
            )
          : [],
        me !== null
          ? api<{ lessons: LessonSummary[] }>("/lessons/own").then(
              (r) => r.lessons,
              () => [] as LessonSummary[],
            )
          : ([] as LessonSummary[]),
      ]);
      if (seq !== loadSeq.current) return;
      setLessons(l.lessons);
      setOwnLessons({ user: me, list: own });
      setLock(l.lock ?? null);
      setLevel((cur) => (cur && l.lessons.some((x) => x.level === cur) ? cur : null));
      setServer((s) => (p ? { user: me, list: p } : s.user === me ? s : { user: me, list: [] }));
      loaded.current = { user: me, version, at: Date.now() };
    } catch (e) {
      if (seq === loadSeq.current) setError((e as Error).message);
    }
  }, [me]);

  const myOwnLessons = useMemo(() => (ownLessons.user === me ? ownLessons.list : []), [ownLessons, me]);
  const progress = useMemo(
    () => mergeProgress(server.user === me ? server.list : [], me ?? undefined, local),
    [server, me, local],
  );
  const progressOf = useMemo(() => new Map(progress.map((p) => [p.source, p])), [progress]);
  const lessonById = useMemo(
    () => new Map([...(lessons ?? []), ...myOwnLessons].map((l) => [String(l.id), l])),
    [lessons, myOwnLessons],
  );

  const continuing = useMemo(
    () =>
      progress
        .filter((p) => percent(p) < 100 && !p.source.startsWith("/watch/"))
        .map((p) => {
          const [, kind, id] = p.source.split("/");
          const lesson = kind === "lesson" ? lessonById.get(id) : undefined;
          return { p, kind, id, lesson, videoId: lesson?.videoId };
        })
        .filter((x): x is typeof x & { videoId: string } => !!x.videoId && (!level || x.lesson?.level === level))
        .slice(0, CONTINUE_MAX),
    [progress, lessonById, level],
  );

  useFocusEffect(
    useCallback(() => {
      const l = loaded.current;
      if (!l || l.user !== me || l.version !== getLessonsVersion() || Date.now() - l.at > STALE_MS) load();
    }, [load, me]),
  );

  const all = useMemo(() => lessons ?? [], [lessons]);
  const dictFiltered = useMemo(() => (dictOnly ? all.filter((l) => l.dictation) : all), [all, dictOnly]);

  const qLower = query.trim().toLowerCase();
  const baseMatching = useMemo(
    () =>
      dictFiltered.filter((l) => {
        if (!qLower) return true;
        return (
          l.title.toLowerCase().includes(qLower) ||
          l.description.toLowerCase().includes(qLower) ||
          (l.channel ?? "").toLowerCase().includes(qLower)
        );
      }),
    [dictFiltered, qLower],
  );
  const levels = useMemo(
    () => LEVELS.map((g) => ({ level: g.level, count: baseMatching.filter((l) => l.level === g.level).length })).filter((g) => g.count > 0),
    [baseMatching],
  );
  const hasAnyDictation = useMemo(() => all.some((l) => l.dictation), [all]);

  const shown = useMemo(
    () =>
      baseMatching
        .filter((l) => !level || l.level === level)
        .sort((a, b) => +(a.access === "locked") - +(b.access === "locked")),
    [baseMatching, level],
  );

  const items = useMemo((): Item[] => {
    if (!level && !qLower) {
      if (groupBy === "channel") {
        const other = t("lessons.otherChannel");
        const map = new Map<string, { title: string; avatar: string | null; lessons: LessonSummary[] }>();
        for (const l of shown) {
          const ch = l.channel?.trim() || other;
          const cur = map.get(ch);
          if (cur) {
            cur.lessons.push(l);
            if (!cur.avatar && l.channelAvatar) cur.avatar = l.channelAvatar;
          } else {
            map.set(ch, { title: ch, avatar: l.channelAvatar ?? null, lessons: [l] });
          }
        }
        return [...map.values()]
          .sort((a, b) => {
            if (a.title === other && b.title !== other) return 1;
            if (b.title === other && a.title !== other) return -1;
            return b.lessons.length - a.lessons.length || a.title.localeCompare(b.title);
          })
          .map((g) => ({
            key: `ch-${g.title}`,
            shelf: { title: g.title, avatar: g.avatar, lessons: g.lessons },
          }));
      }
      const groups = new Map<string, LessonSummary[]>(LEVELS.map((g) => [g.level, []]));
      for (const l of shown) (groups.get(l.level) ?? groups.set(l.level, []).get(l.level)!).push(l);
      return [...groups]
        .filter(([, ls]) => ls.length)
        .map(([lv, ls]) => ({
          key: `shelf-${lv}`,
          shelf: { badge: lv, lessons: ls, seeAllLevel: lv },
        }));
    }
    const out: Item[] = [];
    for (let i = 0; i < shown.length; i += columns) {
      const row = shown.slice(i, i + columns);
      out.push({ key: row.map((l) => l.id).join("-"), row });
    }
    return out;
  }, [shown, columns, level, qLower, groupBy, t]);

  const shelfCard = tablet ? 280 : Math.min(260, Math.round(width * 0.64));
  const seeLevel = (lv: string) => {
    setLevel(lv);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const openPastedYoutube = () => {
    const vid = extractVideoId(ytUrl.trim());
    if (!vid) {
      setYtErr(t("lessons.pasteInvalid"));
      return;
    }
    setYtErr("");
    setYtUrl("");
    router.push(`/watch/${vid}`);
  };

  const ownSet = useMemo(() => new Set(myOwnLessons.map((l) => l.videoId)), [myOwnLessons]);
  const filteredRecent = useMemo(
    () => recentWatches.filter((r) => !ownSet.has(r.videoId)),
    [recentWatches, ownSet],
  );

  const header = (
    <View style={{ gap: 14, paddingTop: tablet ? 20 : 12, paddingBottom: 4 }}>
      <Hero meta={lessons ? t("lessons.count", { n: all.length }) : undefined} />

      {/* Lối tắt khu Tiếng Đức: Ngữ pháp · Từ vựng · Ôn tập · Xếp hạng */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -PAD }} contentContainerStyle={{ paddingHorizontal: PAD, gap: 8 }}>
        <NavPill icon="book.closed.fill" label={t("lessons.navGrammar")} onPress={() => router.push("/grammar" as Href)} />
        <NavPill icon="character.book.closed.fill" label={t("lessons.navVocab")} badge={due} onPress={() => router.push("/vocab")} />
        {!!user && <NavPill icon="brain.head.profile" label={t("lessons.navReview")} badge={due} onPress={() => router.push("/review")} />}
        <NavPill icon="trophy.fill" label={t("lessons.navLeaderboard")} onPress={() => router.push("/leaderboard")} />
      </ScrollView>

      {/* Dán link YouTube bất kỳ */}
      <Card style={{ padding: 12, gap: 8 }}>
        <Text style={{ color: C.text, fontSize: 14, fontWeight: "700" }}>{t("lessons.pasteTitle")}</Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Input
              value={ytUrl}
              onChangeText={(v) => {
                setYtUrl(v);
                if (ytErr) setYtErr("");
              }}
              placeholder={t("lessons.pastePlaceholder")}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={openPastedYoutube}
            />
          </View>
          <Pressable
            onPress={openPastedYoutube}
            disabled={!ytUrl.trim()}
            style={{
              height: 44,
              paddingHorizontal: 14,
              borderRadius: R.md,
              backgroundColor: ytUrl.trim() ? C.accent : C.card2,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SymbolView name="play.fill" size={16} tintColor={ytUrl.trim() ? "#fff" : C.muted} />
          </Pressable>
        </View>
        <ErrorText>{ytErr}</ErrorText>
      </Card>

      {!!error && lessons && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: alpha(C.red, 0.1), borderWidth: 1, borderColor: alpha(C.red, 0.35) }}>
          <SymbolView name="wifi.exclamationmark" size={16} tintColor={C.redText} />
          <Text style={{ flex: 1, color: C.text, fontSize: 14 }} numberOfLines={2}>{t("lessons.loadError")}</Text>
          <Pressable onPress={load} hitSlop={8} accessibilityRole="button">
            <Text style={{ color: C.amber, fontSize: 14, fontWeight: "800" }}>{t("retry")}</Text>
          </Pressable>
        </View>
      )}

      {/* Tiếp tục học */}
      {continuing.length > 0 && (
        <View style={{ gap: 10 }}>
          <SectionTitle title={t("lessons.continueHeading")} />
          <View style={{ backgroundColor: C.card, borderRadius: 16, ...STICKER, overflow: "hidden" }}>
            {(showAll ? continuing : continuing.slice(0, CONTINUE_SHOWN)).map(({ p, kind, id, lesson, videoId }, i, arr) => (
              <ContinueRow
                key={p.source}
                p={p}
                title={lesson?.title ?? p.title}
                dictation={!!lesson?.dictation}
                videoId={videoId}
                last={i === arr.length - 1 && continuing.length <= CONTINUE_SHOWN}
                onPress={() => router.push(kind === "lesson" ? `/lesson/${id}` : `/watch/${id}`)}
              />
            ))}
            {continuing.length > CONTINUE_SHOWN && (
              <Pressable
                onPress={() => setShowAll(!showAll)}
                accessibilityRole="button"
                accessibilityState={{ expanded: showAll }}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, backgroundColor: pressed ? C.card2 : "transparent" })}
              >
                <Text style={{ color: C.accentText, fontSize: 14, fontWeight: "700" }}>
                  {showAll ? t("lessons.showLess") : t("lessons.showAll", { n: continuing.length })}
                </Text>
                <SymbolView name={showAll ? "chevron.up" : "chevron.down"} size={12} tintColor={C.accentText} weight="semibold" />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Bài học riêng của bạn */}
      {myOwnLessons.length > 0 && (
        <Shelf title={t("lessons.ownHeading")} lessons={myOwnLessons} cardWidth={shelfCard} pad={PAD} progressOf={progressOf} />
      )}

      {/* Video đã mở gần đây */}
      {filteredRecent.length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionTitle title={t("lessons.recentHeading")} count={filteredRecent.length} />
          <View style={{ backgroundColor: C.card, borderRadius: 16, ...STICKER, overflow: "hidden" }}>
            {filteredRecent.map((item, i) => (
              <Pressable
                key={item.videoId}
                onPress={() => router.push(`/watch/${item.videoId}`)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 10,
                  backgroundColor: pressed ? C.card2 : "transparent",
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: C.line,
                })}
              >
                <Image source={thumb(item.videoId)} style={{ width: 76, aspectRatio: 16 / 9, borderRadius: 6, backgroundColor: C.card2 }} contentFit="cover" />
                <Text style={{ flex: 1, color: C.text, fontSize: 13, fontWeight: "600" }} numberOfLines={2}>
                  {item.title}
                </Text>
                <Pressable onPress={() => removeWatch(item.videoId)} hitSlop={8} style={{ padding: 4 }}>
                  <SymbolView name="xmark.circle.fill" size={16} tintColor={C.muted} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Tìm kiếm & Bộ lọc thư viện */}
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder={t("lessons.searchPlaceholder")}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />

      {(levels.length > 0 || hasAnyDictation || dictOnly) && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -PAD }}>
          <View style={{ width: PAD - 8 }} />
          <Chip label={t("lessons.all")} count={baseMatching.length} active={!level} onPress={() => setLevel(null)} />
          {levels.map((g) => (
            <Chip key={g.level} label={g.level} count={g.count} active={level === g.level} onPress={() => setLevel(level === g.level ? null : g.level)} />
          ))}
          {hasAnyDictation && <Chip label={t("lessons.hasDictation")} active={dictOnly} onPress={() => setDictOnly((v) => !v)} />}
          {!level && !qLower && (
            <Chip
              label={groupBy === "level" ? t("lessons.groupChannel") : t("lessons.groupLevel")}
              active={groupBy === "channel"}
              onPress={() => setGroupBy((g) => (g === "level" ? "channel" : "level"))}
            />
          )}
          <View style={{ width: PAD - 8 }} />
        </ScrollView>
      )}

      {lessons && (level || qLower) && shown.length > 0 && <SectionTitle title={level ?? t("lessons.allHeading")} count={shown.length} />}
      {lock?.enabled && <LockNote lock={lock} points={points ?? lock.points} />}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <BrandBar />
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(it) => it.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 120, gap: (level || qLower) && columns === 1 ? 4 : GAP }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={C.accentText}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListHeaderComponent={header}
        renderItem={({ item }) =>
          item.shelf ? (
            <Shelf
              title={item.shelf.title}
              avatar={item.shelf.avatar}
              badge={item.shelf.badge}
              lessons={item.shelf.lessons}
              cardWidth={shelfCard}
              pad={PAD}
              progressOf={progressOf}
              onSeeAll={item.shelf.seeAllLevel ? () => seeLevel(item.shelf!.seeAllLevel!) : undefined}
            />
          ) : columns === 1 ? (
            <LessonRow l={item.row![0]} p={progressOf.get(`/lesson/${item.row![0].id}`)} />
          ) : (
            <View style={{ flexDirection: "row", gap: GAP }}>
              {item.row!.map((l) => (
                <LessonCard key={l.id} l={l} width={cardWidth} p={progressOf.get(`/lesson/${l.id}`)} />
              ))}
            </View>
          )
        }
        ListEmptyComponent={
          lessons === null ? (
            error ? (
              <EmptyState title={t("lessons.loadError")} text={error} action={{ label: t("retry"), onPress: load }} />
            ) : (
              <View>{Array.from({ length: 6 }, (_, i) => <SkeletonRow key={i} />)}</View>
            )
          ) : level || qLower || dictOnly ? (
            <EmptyState
              title={t("lessons.noResults")}
              text={t("lessons.noResultsHint")}
              action={{
                label: t("lessons.clearFilter"),
                onPress: () => {
                  setLevel(null);
                  setQuery("");
                  setDictOnly(false);
                },
              }}
            />
          ) : (
            <EmptyState title={t("lessons.empty")} text={t("lessons.emptyHint")} />
          )
        }
      />
    </SafeAreaView>
  );
}
