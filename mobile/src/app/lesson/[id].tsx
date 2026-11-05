import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useState } from "react";
import { ActionSheetIOS, ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { Image } from "expo-image";
import { LessonSheet } from "@/components/LessonSheet";
import Player from "@/components/Player";
import { Gem } from "@/components/Points";
import { Button, LevelBadge } from "@/components/ui";
import { api, ApiError, thumb, type Lesson, type LessonSummary, type LockInfo } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { confirmDestructive, showError } from "@/lib/dialogs";
import { useI18n } from "@/lib/i18n";
import { C } from "@/lib/theme";

type Locked = { lesson: LessonSummary; lock: LockInfo };
const fmt = (n: number) => n.toLocaleString("vi-VN");

/**
 * Bài đang bị khoá (admin bật khoá bài học trên web): khách → đăng nhập · còn lượt chọn → mở miễn phí · hết lượt → trả điểm.
 * Mở xong gọi onUnlocked để tải lại bài.
 */
function LockedView({ lesson, lock, onUnlocked }: Locked & { onUnlocked: () => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const short = lock.points < lock.price;

  const unlock = () =>
    Alert.alert(
      lesson.title,
      lock.picksLeft > 0 ? t("lock.pickConfirm", { n: lock.picksLeft }) : t("lock.buyConfirm", { price: fmt(lock.price), points: fmt(lock.points) }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("lock.unlock"),
          onPress: () => {
            setBusy(true);
            api(`/lessons/${lesson.id}/unlock`, { method: "POST", body: { expected: lock.picksLeft > 0 ? "pick" : "buy" } }).then(onUnlocked, (e: Error) => {
              setBusy(false);
              showError(e);
              if (e instanceof ApiError && e.status === 409) onUnlocked(); // màn hình đã cũ → tải lại để hiện đúng cách mở
            });
          },
        },
      ],
    );

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
      <View style={{ borderRadius: 16, overflow: "hidden" }}>
        <Image source={thumb(lesson.videoId, "hq")} alt="" style={{ width: "100%", aspectRatio: 16 / 9, opacity: 0.4 }} contentFit="cover" />
        <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
          <SymbolView name="lock.fill" size={40} tintColor="#fff" />
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <Text style={{ flex: 1, color: C.text, fontSize: 20, fontWeight: "800" }}>{lesson.title}</Text>
        <LevelBadge level={lesson.level} />
      </View>
      {!!lesson.description && <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20 }}>{lesson.description}</Text>}
      <Text style={{ color: C.text, fontSize: 16, fontWeight: "800" }}>{t("lock.title")}</Text>
      {!lock.loggedIn ? (
        <>
          <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>{t("lock.guest", { n: 2 }) /* FREE_PICKS bên server (src/lib/lesson-lock.ts) */}</Text>
          <Button title={t("loginOrRegister")} variant="primary" onPress={() => router.push("/settings")} />
        </>
      ) : lock.picksLeft > 0 ? (
        <>
          <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>{t("lock.picks", { n: lock.picksLeft })}</Text>
          <Button title={t("lock.pickAction")} variant="primary" loading={busy} onPress={unlock} />
        </>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Gem size={18} />
            <Text style={{ flex: 1, color: C.muted, fontSize: 15, lineHeight: 21 }}>
              {t("lock.price", { price: fmt(lock.price), points: fmt(lock.points) })}
            </Text>
          </View>
          {short && <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20 }}>{t("lock.short")}</Text>}
          <Button
            title={short ? t("lock.needMore", { n: fmt(lock.price - lock.points) }) : t("lock.buyAction", { price: fmt(lock.price) })}
            variant="primary"
            disabled={short}
            loading={busy}
            onPress={unlock}
          />
        </>
      )}
    </ScrollView>
  );
}

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useI18n();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [locked, setLocked] = useState<Locked | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const load = useCallback(
    () =>
      api<{ lesson: Lesson }>(`/lessons/${id}`).then(
        (r) => {
          setLocked(null);
          setLesson(r.lesson);
        },
        (e: Error) => {
          if (e instanceof ApiError && e.data.locked) setLocked(e.data as unknown as Locked);
          else setError(e.message);
        },
      ),
    [id],
  );

  // Tải lại khi đổi tài khoản (vd. khách đăng nhập từ màn khoá rồi quay lại)
  useEffect(() => {
    load();
  }, [load, user?.id]);

  if (locked && !lesson) return <LockedView {...locked} onUnlocked={load} />;

  if (!lesson) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        {error ? <Text style={{ color: C.redText, textAlign: "center" }}>{error}</Text> : <ActivityIndicator color={C.accentText} />}
      </View>
    );
  }

  /** Admin: đăng / chuyển về nháp */
  const togglePublished = () =>
    api(`/lessons/${lesson.id}`, { method: "PATCH", body: { published: !lesson.published } }).then(
      () => setLesson({ ...lesson, published: !lesson.published }),
      (e: Error) => showError(e),
    );

  const remove = () =>
    confirmDestructive(t("admin.deleteLessonConfirm"), t("admin.deleteLessonBody", { title: lesson.title }), t("delete"), () =>
      api(`/lessons/${lesson.id}`, { method: "DELETE" }).then(
        () => router.back(),
        (e: Error) => showError(e),
      ),
    );

  /** Menu admin: Sửa · Đăng / Ẩn · Xoá */
  const menu = () =>
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: lesson.title,
        message: lesson.published ? t("admin.isPublished") : t("admin.isDraft"),
        options: [t("admin.edit"), lesson.published ? t("admin.unpublish") : t("admin.publish"), t("admin.deleteLesson"), t("cancel")],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 3,
      },
      (i) => {
        if (i === 0) setEditing(true);
        else if (i === 1) togglePublished();
        else if (i === 2) remove();
      },
    );

  return (
    <>
      <Player
        title={lesson.title}
        videoId={lesson.videoId}
        segments={lesson.segments}
        sourceUrl={`/lesson/${lesson.id}`}
        allowDictation={lesson.dictation}
        headerRight={
          user?.role === "admin" ? (
            <Pressable onPress={menu} hitSlop={10} accessibilityLabel={t("admin.manageLesson")}>
              <SymbolView name="ellipsis.circle" size={22} tintColor={C.amber} />
            </Pressable>
          ) : undefined
        }
      />
      {user?.role === "admin" && (
        <LessonSheet
          key={`${lesson.title}|${lesson.level}|${lesson.published}|${lesson.dictation}`} // mở lại form → lấy giá trị mới nhất
          visible={editing}
          onClose={() => setEditing(false)}
          videoId={lesson.videoId}
          lesson={lesson}
          onSaved={(l) => setLesson({ ...lesson, ...l, segments: lesson.segments })}
        />
      )}
    </>
  );
}
