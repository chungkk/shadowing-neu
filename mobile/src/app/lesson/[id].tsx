import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, ScrollView, Share, View } from "react-native";
import { FREE_PICKS } from "@shared/lesson-lock";
import { Text } from "@/components/Text";
import { Image } from "expo-image";
import { LessonSheet } from "@/components/LessonSheet";
import Player from "@/components/Player";
import { Gem } from "@/components/Points";
import { ActionSheetModal, Button, LevelBadge } from "@/components/ui";
import { api, ApiError, thumb, type Lesson, type LessonSummary, type LockInfo } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { confirmDestructive, showError } from "@/lib/dialogs";
import { useI18n } from "@/lib/i18n";
import { FORM_MAX } from "@/lib/layout";
import { C } from "@/lib/theme";

type Locked = { lesson: LessonSummary; lock: LockInfo };
const fmt = (n: number) => n.toLocaleString("vi-VN");

function LockedView({ lesson, lock, onUnlocked }: Locked & { onUnlocked: () => Promise<unknown> }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const short = lock.points < lock.price;

  const unlock = () => {
    if (busy) return;
    Alert.alert(
      lesson.title,
      lock.picksLeft > 0 ? t("lock.pickConfirm", { n: lock.picksLeft }) : t("lock.buyConfirm", { price: fmt(lock.price), points: fmt(lock.points) }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("lock.unlock"),
          onPress: () => {
            setBusy(true);
            api(`/lessons/${lesson.id}/unlock`, { method: "POST", body: { expected: lock.picksLeft > 0 ? "pick" : "buy" } }).then(
              () => void Promise.resolve(onUnlocked()).finally(() => setBusy(false)),
              (e: Error) => {
                showError(e);
                if (e instanceof ApiError && e.status === 409) {
                  void Promise.resolve(onUnlocked()).finally(() => setBusy(false));
                } else {
                  setBusy(false);
                }
              },
            );
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ width: "100%", maxWidth: FORM_MAX, alignSelf: "center", padding: 20, gap: 14 }}
    >
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
          <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>{t("lock.guest", { n: FREE_PICKS })}</Text>
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
  const [menuOpen, setMenuOpen] = useState(false);

  const scopeKey = `${id ?? ""}|${user?.id ?? "guest"}`;
  const [curScopeKey, setCurScopeKey] = useState(scopeKey);
  if (curScopeKey !== scopeKey) {
    setCurScopeKey(scopeKey);
    setLesson(null);
    setLocked(null);
    setError("");
    setEditing(false);
    setMenuOpen(false);
  }

  const reqSeqRef = useRef(0);
  const load = useCallback(() => {
    const seq = ++reqSeqRef.current;
    return api<{ lesson: Lesson }>(`/lessons/${id}`).then(
      (r) => {
        if (seq !== reqSeqRef.current) return;
        setLocked(null);
        setError("");
        setLesson(r.lesson);
      },
      (e: Error) => {
        if (seq !== reqSeqRef.current) return;
        setLesson(null);
        if (e instanceof ApiError && e.data.locked) {
          setLocked(e.data as unknown as Locked);
          setError("");
        } else {
          setLocked(null);
          setError(e.message);
        }
      },
    );
  }, [id]);

  useEffect(() => {
    void load();
    return () => {
      reqSeqRef.current += 1;
    };
  }, [load, user?.id]);

  if (locked && !lesson) return <LockedView {...locked} onUnlocked={load} />;

  if (!lesson) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        {error ? (
          <View style={{ alignItems: "center", gap: 12 }}>
            <Text style={{ color: C.redText, textAlign: "center" }}>{error}</Text>
            <Button
              title={t("retry")}
              onPress={() => {
                setError("");
                load();
              }}
            />
          </View>
        ) : (
          <ActivityIndicator color={C.accentText} />
        )}
      </View>
    );
  }

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

  const menu = () => {
    if (Platform.OS !== "ios") {
      setMenuOpen(true);
      return;
    }
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
  };

  const shareLesson = () => {
    const path = lesson.slug ? `/tieng-duc/${lesson.slug}` : `/lesson/${lesson.id}`;
    void Share.share({
      title: lesson.title,
      url: `https://hallovn.de${path}`,
      message: `${lesson.title}\nhttps://hallovn.de${path}`,
    }).catch(() => {});
  };

  const isOwn = lesson.ownerId != null;

  return (
    <>
      <Player
        key={`${lesson.id}-${user?.id ?? "guest"}`}
        title={lesson.title}
        videoId={lesson.videoId}
        segments={lesson.segments}
        sourceUrl={`/lesson/${lesson.id}`}
        allowDictation={lesson.dictation}
        earnPoints={!isOwn}
        topBanner={
          isOwn ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.card2, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <SymbolView name="lock.fill" size={13} tintColor={C.muted} />
              <Text style={{ flex: 1, color: C.muted, fontSize: 12, fontWeight: "600" }}>{t("watch.privateNotice")}</Text>
            </View>
          ) : undefined
        }
        headerRight={
          !isOwn || user?.role === "admin" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {!isOwn && (
                <Pressable onPress={shareLesson} hitSlop={8}>
                  <SymbolView name="square.and.arrow.up" size={20} tintColor={C.link} weight="semibold" />
                </Pressable>
              )}
              {user?.role === "admin" && (
                <Pressable onPress={menu} hitSlop={10} accessibilityLabel={t("admin.manageLesson")}>
                  <SymbolView name="ellipsis.circle" size={22} tintColor={C.amber} />
                </Pressable>
              )}
            </View>
          ) : undefined
        }
      />
      {user?.role === "admin" && editing && (
        <LessonSheet
          key={lesson.id}
          visible
          onClose={() => setEditing(false)}
          videoId={lesson.videoId}
          lesson={lesson}
          onSaved={(l) => setLesson({ ...lesson, ...l, segments: lesson.segments })}
        />
      )}
      {user?.role === "admin" && (
        <ActionSheetModal
          visible={menuOpen}
          title={lesson.title}
          onClose={() => setMenuOpen(false)}
          options={[
            { label: t("admin.edit"), icon: "pencil", onPress: () => setEditing(true) },
            { label: lesson.published ? t("admin.unpublish") : t("admin.publish"), icon: lesson.published ? "eye.slash" : "eye", onPress: () => void togglePublished() },
            { label: t("admin.deleteLesson"), icon: "trash", destructive: true, onPress: remove },
          ]}
        />
      )}
    </>
  );
}
