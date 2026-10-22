import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { ActionSheetIOS, ActivityIndicator, Pressable, Text, View } from "react-native";
import { LessonSheet } from "@/components/LessonSheet";
import Player from "@/components/Player";
import { api, type Lesson } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { confirmDestructive, showError } from "@/lib/dialogs";
import { useI18n } from "@/lib/i18n";
import { C } from "@/lib/theme";

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useI18n();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    api<{ lesson: Lesson }>(`/lessons/${id}`)
      .then((r) => setLesson(r.lesson))
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (!lesson) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        {error ? <Text style={{ color: C.redText, textAlign: "center" }}>{error}</Text> : <ActivityIndicator color={C.accent} />}
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
