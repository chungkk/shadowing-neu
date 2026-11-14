import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { Hero } from "@/components/Hero";
import { Mascot } from "@/components/Mascot";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandBar } from "@/components/Brand";
import { LevelBadge, styles } from "@/components/ui";
import {
  api,
  getLessonsVersion,
  thumb,
  type LessonSummary,
  type LockInfo,
  type ProgressSummary,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { C, LEVELS, STICKER, alpha } from "@/lib/theme";
import { useI18n, type TFn } from "@/lib/i18n";
import { useLayout } from "@/lib/layout";
import { usePoints } from "@/lib/points";
import { mergeProgress, useLocalProgress } from "@/lib/progress";
import { FREE_PICKS } from "@shared/lesson-lock";

const STALE_MS = 5 * 60_000; // mở tab: chỉ tải lại khi lâu chưa tải (tiến độ học trên máy này đã có sẵn qua @/lib/progress)
const CONTINUE_SHOWN = 3; // "Tiếp tục học" thu gọn
const CONTINUE_MAX = 20; // "Xem tất cả"
const SHELF_MAX = 10; // mỗi kệ cấp độ (tab "Tất cả") hiện tối đa ngần này bài, còn lại → "Xem tất cả"

/**
 * % đã học: số câu đã nghe (Shadowing) hoặc đã làm chính tả, lấy cái nhiều hơn. Server cũ chưa gửi seenCount → theo câu đang học.
 * Làm tròn xuống (199/200 câu là 99%, chưa "Xong"); đã học ít nhất 1 câu thì tối thiểu 1% (1/300 câu không hiện 0%)
 */
const percent = (p?: ProgressSummary) => {
  if (!p?.total) return 0;
  const done = Math.min(
    p.total,
    Math.max(p.seenCount ?? p.idx + 1, p.dictCount),
  );
  return done ? Math.max(1, Math.floor((done * 100) / p.total)) : 0;
};

/** Số câu như màn học đếm (sau khi gộp dòng phụ đề); server cũ chỉ có số dòng phụ đề */
const sentences = (l: LessonSummary) => l.sentenceCount ?? l.segmentCount;

/** Đọc cho VoiceOver: tên · cấp độ · số câu · tiến độ · nháp */
const lessonLabel = (
  l: LessonSummary,
  p: ProgressSummary | undefined,
  t: TFn,
) =>
  [
    l.title,
    l.level,
    t("sentences", { n: sentences(l) }),
    percent(p) >= 100
      ? t("lessons.finished")
      : percent(p) > 0
        ? `${percent(p)}%`
        : "",
    l.published ? "" : t("lessons.draft"),
  ]
    .filter(Boolean)
    .join(", ");

/** Thanh tiến độ mỏng ở đáy ảnh bìa (giống YouTube) */
function ProgressBar({ p }: { p?: ProgressSummary }) {
  if (!p) return null;
  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 4,
        backgroundColor: "rgba(0,0,0,0.55)",
      }}
    >
      <View
        style={{
          width: `${percent(p)}%`,
          height: "100%",
          backgroundColor: C.accent,
        }}
      />
    </View>
  );
}

/** "45%" / "✓ Xong" cạnh số câu (mở bài nhưng chưa học câu nào → không hiện "0%") */
function ProgressText({ p }: { p?: ProgressSummary }) {
  const { t } = useI18n();
  const n = percent(p);
  if (!n) return null;
  return (
    <Text
      style={{
        color: n >= 100 ? C.accentText : C.amber,
        fontSize: 13,
        fontWeight: "800",
      }}
    >
      {n >= 100 ? `✓ ${t("lessons.finished")}` : `${n}%`}
    </Text>
  );
}

/**
 * 1 bài đang học dở: ảnh nhỏ (có thanh tiến độ) · tên · "Câu 3/74" · %.
 * title: tên hiện tại của bài (admin có thể đã đổi sau lần học trước); dictation: bài còn bật Chính tả không
 */
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
      accessibilityLabel={[title, at, n ? `${n}%` : ""]
        .filter(Boolean)
        .join(", ")}
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
        <Image
          source={thumb(videoId)}
          alt=""
          style={{ width: 96, aspectRatio: 16 / 9, backgroundColor: C.card2 }}
          contentFit="cover"
          transition={150}
        />
        <ProgressBar p={p} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={{
            color: C.text,
            fontWeight: "600",
            fontSize: 15,
            lineHeight: 20,
          }}
          numberOfLines={2}
        >
          {title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: C.muted, fontSize: 13 }}>{at}</Text>
          {!!n && (
            <Text
              style={{ color: C.accentText, fontSize: 13, fontWeight: "700" }}
            >
              {n}%
            </Text>
          )}
        </View>
      </View>
      <SymbolView name="play.circle.fill" size={28} tintColor={C.accentText} />
    </Pressable>
  );
}

/** Tiêu đề mục: chữ thường, đậm; số lượng nhạt bên cạnh */
function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        gap: 8,
        marginTop: 8,
      }}
    >
      <Text
        style={{ color: C.text, fontSize: 20, fontWeight: "700" }}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {count !== undefined && (
        <Text style={{ color: C.muted, fontSize: 15 }}>{count}</Text>
      )}
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
    <View
      style={{
        backgroundColor: C.gold,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 1,
      }}
    >
      <Text style={{ color: "#000", fontWeight: "700", fontSize: 11 }}>
        {t("lessons.newest")}
      </Text>
    </View>
  );
}

/** Phủ lên ảnh bìa khi admin bật khoá bài: ổ khoá (chưa mở) / nhãn "Miễn phí" */
function AccessBadge({
  l,
  size,
  inset = 8,
}: {
  l: LessonSummary;
  size: number;
  inset?: number;
}) {
  const { t } = useI18n();
  if (l.access === "locked")
    return (
      <View
        style={{
          position: "absolute",
          inset: 0,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.45)",
        }}
        pointerEvents="none"
      >
        <SymbolView name="lock.fill" size={size} tintColor="#fff" />
      </View>
    );
  if (l.access === "free")
    return (
      <View
        style={{
          position: "absolute",
          top: inset,
          left: inset,
          backgroundColor: C.accent,
          borderRadius: 999,
          paddingHorizontal: inset,
          paddingVertical: 2,
        }}
        pointerEvents="none"
      >
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 11 }}>
          {t("lock.free")}
        </Text>
      </View>
    );
  return null;
}

/** Hàng gọn (điện thoại, khi lọc cấp độ): ảnh nhỏ bên trái, tên + cấp độ + số câu bên phải — ~6 bài/màn */
function LessonRow({ l, p }: { l: LessonSummary; p?: ProgressSummary }) {
  const { t } = useI18n();
  return (
    <Pressable
      onPress={() => router.push(`/lesson/${l.id}`)}
      accessibilityRole="button"
      accessibilityLabel={lessonLabel(l, p, t)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 8,
        borderRadius: 16,
        backgroundColor: pressed ? C.card2 : "transparent",
      })}
    >
      <View style={{ borderRadius: 10, overflow: "hidden" }}>
        <Image
          source={thumb(l.videoId)}
          alt=""
          style={{ width: 128, aspectRatio: 16 / 9, backgroundColor: C.card2 }}
          contentFit="cover"
          transition={150}
        />
        <ProgressBar p={p} />
        <AccessBadge l={l} size={18} inset={4} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text
          style={{
            color: C.text,
            fontWeight: "700",
            fontSize: 15,
            lineHeight: 20,
          }}
          numberOfLines={2}
        >
          {l.title}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <LevelBadge
            level={l.level}
            style={{ paddingHorizontal: 6, paddingVertical: 1 }}
          />
          <Text style={{ color: C.muted, fontSize: 13 }}>
            {t("sentences", { n: sentences(l) })}
          </Text>
          {isNew(l) && !p && <NewBadge />}
          {!l.published && (
            <Text style={{ color: C.gold, fontSize: 12, fontWeight: "800" }}>
              {t("lessons.draft")}
            </Text>
          )}
          <ProgressText p={p} />
        </View>
      </View>
    </Pressable>
  );
}

/** Kệ ngang 1 cấp độ (tab "Tất cả"): tiêu đề + "Xem tất cả ›", vuốt ngang tối đa SHELF_MAX thẻ */
function Shelf({
  level,
  lessons,
  cardWidth,
  pad,
  progressOf,
  onSeeAll,
}: {
  level: string;
  lessons: LessonSummary[];
  cardWidth: number;
  pad: number;
  progressOf: Map<string, ProgressSummary>;
  onSeeAll: () => void;
}) {
  const { t } = useI18n();
  const more = lessons.length > SHELF_MAX;
  return (
    <View style={{ gap: 10, marginTop: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <LevelBadge
          level={level}
          style={{ paddingHorizontal: 8, paddingVertical: 2 }}
        />
        <Text style={{ color: C.muted, fontSize: 15, flex: 1 }}>
          {t("lessons.count", { n: lessons.length })}
        </Text>
        <Pressable
          onPress={onSeeAll}
          hitSlop={8}
          accessibilityRole="button"
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Text
            style={{ color: C.accentText, fontSize: 14, fontWeight: "700" }}
          >
            {t("lessons.seeAll")}
          </Text>
          <SymbolView
            name="chevron.right"
            size={12}
            tintColor={C.accentText}
            weight="semibold"
          />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={cardWidth + 12}
        style={{ marginHorizontal: -pad, overflow: "visible" }}
        contentContainerStyle={{
          paddingHorizontal: pad,
          paddingBottom: 6,
          gap: 12,
        }}
      >
        {lessons.slice(0, SHELF_MAX).map((l) => (
          <LessonCard
            key={l.id}
            l={l}
            width={cardWidth}
            p={progressOf.get(`/lesson/${l.id}`)}
          />
        ))}
        {more && (
          <Pressable
            onPress={onSeeAll}
            accessibilityRole="button"
            style={({ pressed }) => ({
              width: 120,
              borderRadius: 24,
              ...STICKER,
              backgroundColor: pressed ? C.card2 : C.card,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            })}
          >
            <SymbolView
              name="arrow.right.circle.fill"
              size={32}
              tintColor={C.accentText}
            />
            <Text
              style={{
                color: C.text,
                fontSize: 14,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              {t("lessons.showAll", { n: lessons.length })}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

/** Thẻ dọc trong lưới (iPad): ảnh to phía trên, tên + cấp độ bên dưới */
function LessonCard({
  l,
  width,
  p,
}: {
  l: LessonSummary;
  width: number;
  p?: ProgressSummary;
}) {
  const { t } = useI18n();
  return (
    <Pressable
      onPress={() => router.push(`/lesson/${l.id}`)}
      accessibilityRole="button"
      accessibilityLabel={lessonLabel(l, p, t)}
      style={({ pressed }) => ({
        width,
        borderRadius: 24,
        backgroundColor: pressed ? C.card2 : C.card,
        ...STICKER,
        transform: [{ translateY: pressed ? 2 : 0 }],
      })}
    >
      <View>
        {/* Thẻ rộng ~300pt (~600px trên Retina) → ảnh 480px cho đỡ mờ */}
        <Image
          source={thumb(l.videoId, "hq")}
          alt=""
          style={{
            width: "100%",
            aspectRatio: 16 / 9,
            backgroundColor: C.card2,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
          }}
          contentFit="cover"
          transition={150}
        />
        <ProgressBar p={p} />
        <AccessBadge l={l} size={30} />
        {!l.published && (
          <View
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              backgroundColor: C.gold,
              borderRadius: 6,
              paddingHorizontal: 6,
            }}
          >
            <Text style={{ color: "#000", fontWeight: "800", fontSize: 12 }}>
              {t("lessons.draft")}
            </Text>
          </View>
        )}
      </View>
      <View style={{ padding: 12, gap: 8 }}>
        <Text
          style={{
            color: C.text,
            fontWeight: "700",
            fontSize: 16,
            lineHeight: 21,
            minHeight: 42,
          }}
          numberOfLines={2}
        >
          {l.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <LevelBadge
            level={l.level}
            style={{ paddingHorizontal: 6, paddingVertical: 1 }}
          />
          <Text style={{ color: C.muted, fontSize: 13 }}>
            {t("sentences", { n: sentences(l) })}
          </Text>
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
    <View
      style={{
        flexDirection: "row",
        gap: 12,
        padding: 8,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 120,
          aspectRatio: 16 / 9,
          borderRadius: 10,
          backgroundColor: C.card2,
        }}
      />
      <View style={{ flex: 1, gap: 8 }}>
        <View
          style={{
            height: 14,
            borderRadius: 4,
            backgroundColor: C.card2,
            width: "90%",
          }}
        />
        <View
          style={{
            height: 14,
            borderRadius: 4,
            backgroundColor: C.card2,
            width: "60%",
          }}
        />
        <View
          style={{
            height: 12,
            borderRadius: 4,
            backgroundColor: C.card2,
            width: "35%",
          }}
        />
      </View>
    </View>
  );
}

function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View
      style={{
        alignItems: "center",
        gap: 10,
        paddingVertical: 48,
        paddingHorizontal: 24,
      }}
    >
      <Mascot size={104} animated bob />
      <Text
        style={{
          color: C.text,
          fontWeight: "800",
          fontSize: 17,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      {!!text && (
        <Text style={[styles.muted, { textAlign: "center" }]}>{text}</Text>
      )}
      {action && (
        <Pressable
          onPress={action.onPress}
          style={{
            marginTop: 6,
            backgroundColor: C.accent,
            borderRadius: 12,
            paddingHorizontal: 18,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function Chip({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 34,
        paddingHorizontal: 14,
        borderRadius: 17,
        borderWidth: 2,
        borderColor: C.ink,
        backgroundColor: active ? C.accent : C.card,
      }}
    >
      <Text
        style={{
          color: active ? "#fff" : C.text,
          fontWeight: "800",
          fontSize: 14,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: active ? "rgba(255,255,255,0.75)" : C.muted,
          fontWeight: "700",
          fontSize: 13,
        }}
      >
        {count}
      </Text>
    </Pressable>
  );
}

/** Dòng giải thích khoá bài trên danh sách bài (admin bật khoá bài học) — như web */
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
            : t("lock.noteBuy", {
                price,
                points: points.toLocaleString("vi-VN"),
              })}
      </Text>
    </View>
  );
}

/** 1 mục của danh sách chính: kệ 1 cấp độ (tab "Tất cả") hoặc 1 hàng bài (khi lọc cấp độ) */
type Item = {
  key: string;
  shelf?: { level: string; lessons: LessonSummary[] };
  row?: LessonSummary[];
};

export default function LessonsScreen() {
  const { width, tablet } = useLayout();
  const { t } = useI18n();
  // iPad: lưới thẻ, mỗi thẻ rộng khoảng 260–340pt (2 cột khi chia đôi màn hình, 4 cột khi nằm ngang)
  const PAD = tablet ? 20 : 16;
  const GAP = 16;
  const columns = tablet
    ? Math.min(
        4,
        Math.max(2, Math.floor((width - PAD * 2 + GAP) / (260 + GAP))),
      )
    : 1;
  const cardWidth = (width - PAD * 2 - GAP * (columns - 1)) / columns;
  const { user } = useAuth();
  const me = user?.id ?? null;
  const [lessons, setLessons] = useState<LessonSummary[] | null>(null);
  const [lock, setLock] = useState<LockInfo | null>(null); // server cũ không gửi
  const points = usePoints(user?.id); // số mới nhất: danh sách không tải lại mỗi lần học xong
  // Tiến độ tải từ server, kèm tài khoản của nó (đổi tài khoản → không dùng của người trước)
  const [server, setServer] = useState<{
    user: number | null;
    list: ProgressSummary[];
  }>({ user: null, list: [] });
  const local = useLocalProgress(); // tiến độ vừa học trên máy này (có thể chưa lưu tới server)
  const [level, setLevel] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<Item>>(null);
  const [showAll, setShowAll] = useState(false); // "Tiếp tục học": hiện hết thay vì 3 bài
  const loaded = useRef<{
    user: number | null;
    version: number;
    at: number;
  } | null>(null); // lần tải gần nhất
  const loadSeq = useRef(0); // mở tab + kéo tải lại cùng lúc → chỉ nhận kết quả của lần gọi sau cùng

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    const version = getLessonsVersion(); // lấy trước khi tải: admin sửa bài trong lúc tải → lần sau tải lại
    try {
      setError("");
      const [l, p] = await Promise.all([
        api<{ lessons: LessonSummary[]; lock?: LockInfo }>("/lessons"),
        // Lỗi tải tiến độ → null: giữ bản đang có thay vì xoá hết thanh tiến độ / "Tiếp tục học"
        me !== null
          ? api<{ progress: ProgressSummary[] }>("/progress").then(
              (r) => r.progress,
              () => null,
            )
          : [],
      ]);
      if (seq !== loadSeq.current) return;
      setLessons(l.lessons);
      setLock(l.lock ?? null);
      // Cấp đang lọc không còn bài (admin xoá / chuyển về nháp) → nút lọc đó biến mất, bỏ lọc luôn
      // để không kẹt ở "Không tìm thấy bài nào" (hết sạch bài thì cả hàng nút lọc cũng ẩn)
      setLevel((cur) =>
        cur && l.lessons.some((x) => x.level === cur) ? cur : null,
      );
      setServer((s) =>
        p ? { user: me, list: p } : s.user === me ? s : { user: me, list: [] },
      );
      loaded.current = { user: me, version, at: Date.now() };
    } catch (e) {
      if (seq === loadSeq.current) setError((e as Error).message);
    }
  }, [me]);
  const progress = useMemo(
    () =>
      mergeProgress(
        server.user === me ? server.list : [],
        me ?? undefined,
        local,
      ),
    [server, me, local],
  );
  const progressOf = useMemo(
    () => new Map(progress.map((p) => [p.source, p])),
    [progress],
  );
  const lessonById = useMemo(
    () => new Map((lessons ?? []).map((l) => [String(l.id), l])),
    [lessons],
  );
  // Đang học dở (chưa xong 100%), mới nhất trước — bài học còn tồn tại hoặc video YouTube tự mở.
  // Đang lọc cấp độ → chỉ các bài của cấp đó (video tự mở không có cấp độ)
  const continuing = useMemo(
    () =>
      progress
        .filter((p) => percent(p) < 100)
        .map((p) => {
          const [, kind, id] = p.source.split("/");
          const lesson = kind === "lesson" ? lessonById.get(id) : undefined;
          return {
            p,
            kind,
            id,
            lesson,
            videoId: kind === "watch" ? id : lesson?.videoId,
          };
        })
        .filter(
          (x): x is typeof x & { videoId: string } =>
            !!x.videoId && (!level || x.lesson?.level === level),
        )
        .slice(0, CONTINUE_MAX),
    [progress, lessonById, level],
  );

  // Mở tab → tải lại khi: chưa tải / đổi tài khoản / admin vừa thêm, sửa bài / lâu chưa tải.
  // Không tải lại mỗi lần quay về từ màn học: tiến độ bài vừa học đã có trong `local`
  useFocusEffect(
    useCallback(() => {
      const l = loaded.current;
      if (
        !l ||
        l.user !== me ||
        l.version !== getLessonsVersion() ||
        Date.now() - l.at > STALE_MS
      )
        load();
    }, [load, me]),
  );

  const all = useMemo(() => lessons ?? [], [lessons]);
  // Chỉ hiện cấp độ có bài, kèm số bài
  const levels = useMemo(
    () =>
      LEVELS.map((g) => ({
        level: g.level,
        count: all.filter((l) => l.level === g.level).length,
      })).filter((g) => g.count > 0),
    [all],
  );
  // API trả bài mới nhất trước; bài học được (miễn phí / đã mở) lên đầu, bài khoá xuống cuối — giữ thứ tự mới nhất trong mỗi nhóm
  const shown = useMemo(
    () =>
      all
        .filter((l) => !level || l.level === level)
        .sort((a, b) => +(a.access === "locked") - +(b.access === "locked")),
    [all, level],
  );
  // Mỗi hàng của danh sách = 1 bài (điện thoại) hoặc 1 hàng thẻ (iPad). Tự chia hàng thay cho numColumns:
  // đổi số cột (xoay iPad) không phải dựng lại cả danh sách → không nhảy về đầu
  // "Tất cả": mỗi cấp độ 1 kệ ngang (trang luôn ngắn dù có nhiều bài); lọc cấp độ: danh sách dọc
  const items = useMemo((): Item[] => {
    if (!level) {
      const groups = new Map<string, LessonSummary[]>(
        LEVELS.map((g) => [g.level, []]),
      );
      for (const l of shown)
        (groups.get(l.level) ?? groups.set(l.level, []).get(l.level)!).push(l);
      return [...groups]
        .filter(([, ls]) => ls.length)
        .map(([lv, ls]) => ({
          key: `shelf-${lv}`,
          shelf: { level: lv, lessons: ls },
        }));
    }
    const out: Item[] = [];
    for (let i = 0; i < shown.length; i += columns) {
      const row = shown.slice(i, i + columns);
      out.push({ key: row.map((l) => l.id).join("-"), row });
    }
    return out;
  }, [shown, columns, level]);
  const shelfCard = tablet ? 280 : Math.min(260, Math.round(width * 0.64));
  const seeLevel = (lv: string) => {
    setLevel(lv);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const header = (
    <View style={{ gap: 16, paddingTop: tablet ? 20 : 12, paddingBottom: 4 }}>
      <Hero />

      {/* Tải lại thất bại khi đã có danh sách → báo nhỏ, vẫn giữ danh sách cũ */}
      {!!error && lessons && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 12,
            backgroundColor: alpha(C.red, 0.1),
            borderWidth: 1,
            borderColor: alpha(C.red, 0.35),
          }}
        >
          <SymbolView
            name="wifi.exclamationmark"
            size={16}
            tintColor={C.redText}
          />
          <Text
            style={{ flex: 1, color: C.text, fontSize: 14 }}
            numberOfLines={2}
          >
            {t("lessons.loadError")}
          </Text>
          <Pressable onPress={load} hitSlop={8} accessibilityRole="button">
            <Text style={{ color: C.amber, fontSize: 14, fontWeight: "800" }}>
              {t("retry")}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Lọc cấp độ */}
      {levels.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          style={{ marginHorizontal: -PAD }}
        >
          <View style={{ width: PAD - 8 }} />
          <Chip
            label={t("lessons.all")}
            count={all.length}
            active={!level}
            onPress={() => setLevel(null)}
          />
          {levels.map((g) => (
            <Chip
              key={g.level}
              label={g.level}
              count={g.count}
              active={level === g.level}
              onPress={() => setLevel(level === g.level ? null : g.level)}
            />
          ))}
          <View style={{ width: PAD - 8 }} />
        </ScrollView>
      )}

      {/* Tiếp tục học: 3 bài, "Xem tất cả" → tối đa CONTINUE_MAX bài, dọc trong 1 khung */}
      {continuing.length > 0 && (
        <View style={{ gap: 10 }}>
          <SectionTitle title={t("lessons.continueHeading")} />
          <View
            style={{ backgroundColor: C.card, borderRadius: 24, ...STICKER }}
          >
            {(showAll ? continuing : continuing.slice(0, CONTINUE_SHOWN)).map(
              ({ p, kind, id, lesson, videoId }, i, arr) => (
                <ContinueRow
                  key={p.source}
                  p={p}
                  title={lesson?.title ?? p.title}
                  dictation={!!lesson?.dictation}
                  videoId={videoId}
                  last={
                    i === arr.length - 1 && continuing.length <= CONTINUE_SHOWN
                  }
                  onPress={() =>
                    router.push(
                      kind === "lesson" ? `/lesson/${id}` : `/watch/${id}`,
                    )
                  }
                />
              ),
            )}
            {continuing.length > CONTINUE_SHOWN && (
              <Pressable
                onPress={() => setShowAll(!showAll)}
                accessibilityRole="button"
                accessibilityState={{ expanded: showAll }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 12,
                  backgroundColor: pressed ? C.card2 : "transparent",
                })}
              >
                <Text
                  style={{
                    color: C.accentText,
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  {showAll
                    ? t("lessons.showLess")
                    : t("lessons.showAll", { n: continuing.length })}
                </Text>
                <SymbolView
                  name={showAll ? "chevron.up" : "chevron.down"}
                  size={12}
                  tintColor={C.accentText}
                  weight="semibold"
                />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {lessons && level && shown.length > 0 && (
        <SectionTitle title={level} count={shown.length} />
      )}
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
        contentContainerStyle={{
          paddingHorizontal: PAD,
          paddingBottom: 120,
          gap: level && columns === 1 ? 4 : GAP,
        }} // chừa chỗ cho thanh tab nổi
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
              level={item.shelf.level}
              lessons={item.shelf.lessons}
              cardWidth={shelfCard}
              pad={PAD}
              progressOf={progressOf}
              onSeeAll={() => seeLevel(item.shelf!.level)}
            />
          ) : columns === 1 ? (
            <LessonRow
              l={item.row![0]}
              p={progressOf.get(`/lesson/${item.row![0].id}`)}
            />
          ) : (
            <View style={{ flexDirection: "row", gap: GAP }}>
              {item.row!.map((l) => (
                <LessonCard
                  key={l.id}
                  l={l}
                  width={cardWidth}
                  p={progressOf.get(`/lesson/${l.id}`)}
                />
              ))}
            </View>
          )
        }
        ListEmptyComponent={
          lessons === null ? (
            error ? (
              <EmptyState
                title={t("lessons.loadError")}
                text={error}
                action={{ label: t("retry"), onPress: load }}
              />
            ) : (
              <View>
                {Array.from({ length: 6 }, (_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </View>
            )
          ) : level ? (
            <EmptyState
              title={t("lessons.noResults")}
              text={t("lessons.noResultsHint")}
              action={{
                label: t("lessons.clearFilter"),
                onPress: () => setLevel(null),
              }}
            />
          ) : (
            <EmptyState
              title={t("lessons.empty")}
              text={t("lessons.emptyHint")}
            />
          )
        }
      />
    </SafeAreaView>
  );
}
