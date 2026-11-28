import { router } from "expo-router";
import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./Text";
import { ErrorText, Input, styles } from "@/components/ui";
import { api, ApiError, thumb, type LessonSummary } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { FORM_MAX } from "@/lib/layout";
import { C, LEVEL_COLORS, LEVELS, themed } from "@/lib/theme";

type Editable = Pick<LessonSummary, "id" | "title" | "level" | "description" | "published" | "dictation">;

/**
 * Admin: thêm bài từ video đang xem, hoặc sửa thông tin bài (giống trang admin trên web).
 * - Thêm (`lesson` trống): phụ đề do server lấy (bản đã lưu khi mở video), app chỉ gửi tiêu đề / cấp độ / mô tả.
 * - Sửa (`lesson` có id): đổi tiêu đề / cấp độ / mô tả / trạng thái đăng / Chính tả; phụ đề giữ nguyên.
 */
export function LessonSheet({
  visible,
  onClose,
  videoId,
  defaultTitle = "",
  lesson,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  defaultTitle?: string;
  lesson?: Editable;
  onSaved?: (l: LessonSummary) => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const editing = !!lesson;
  const [title, setTitle] = useState(lesson?.title ?? defaultTitle);
  const [level, setLevel] = useState<string>(lesson?.level ?? "B1");
  const [description, setDescription] = useState(lesson?.description ?? "");
  const [published, setPublished] = useState(lesson?.published ?? true);
  const [dictation, setDictation] = useState(lesson?.dictation ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const syncKey = `${visible ? 1 : 0}|${lesson?.id ?? 0}|${videoId}|${lesson?.title ?? defaultTitle}|${lesson?.level ?? "B1"}|${lesson?.description ?? ""}|${lesson?.published ?? true}|${lesson?.dictation ?? true}`;
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey);
  if (prevSyncKey !== syncKey) {
    setPrevSyncKey(syncKey);
    if (visible) {
      setTitle(lesson?.title ?? defaultTitle);
      setLevel(lesson?.level ?? "B1");
      setDescription(lesson?.description ?? "");
      setPublished(lesson?.published ?? true);
      setDictation(lesson?.dictation ?? true);
      setError("");
    }
  }

  const openLesson = (id: unknown) => router.replace(`/lesson/${id}`);

  const closeSafely = () => {
    if (!busy) onClose();
  };

  const save = async () => {
    if (busy || !title.trim()) return;
    setBusy(true);
    setError("");
    try {
      if (lesson) {
        const r = await api<{ lesson: LessonSummary }>(`/lessons/${lesson.id}`, {
          method: "PATCH",
          body: { title, level, description, published, dictation },
        });
        onSaved?.(r.lesson);
        onClose();
        return;
      }
      const r = await api<{ id: number }>("/lessons", { method: "POST", body: { videoId, title, level, description, published, dictation } });
      onClose();
      // Đợi modal đóng hoàn toàn trên iOS rồi mới mở Alert
      setTimeout(() => {
        Alert.alert(t("addLesson.added"), published ? t("addLesson.publishedNote") : t("addLesson.draftNote"), [
          { text: t("close"), style: "cancel" },
          { text: t("addLesson.open"), onPress: () => openLesson(r.id) },
        ]);
      }, 350);
    } catch (e) {
      // Video đã có bài → cho mở bài đó
      if (e instanceof ApiError && e.status === 409 && e.data.id) {
        const existingId = e.data.id;
        const msg = e.message;
        onClose();
        setTimeout(() => {
          Alert.alert(t("addLesson.existsTitle"), msg, [
            { text: t("close"), style: "cancel" },
            { text: t("addLesson.open"), onPress: () => openLesson(existingId) },
          ]);
        }, 350);
      } else setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      supportedOrientations={["portrait", "portrait-upside-down", "landscape-left", "landscape-right"]}
      onRequestClose={closeSafely}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.background, paddingTop: Platform.OS === "ios" ? 0 : insets.top }}>
        {/* Thanh trên: Huỷ · tiêu đề · Lưu */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            height: 56,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <Pressable onPress={closeSafely} disabled={busy} hitSlop={10} style={{ flex: 1, opacity: busy ? 0.5 : 1 }}>
            <Text style={{ color: C.muted, fontSize: 16 }}>{t("cancel")}</Text>
          </Pressable>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: "700" }}>{editing ? t("addLesson.editTitle") : t("addLesson.title")}</Text>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            {busy ? (
              <ActivityIndicator color={C.accentText} />
            ) : (
              <Pressable onPress={save} disabled={!title.trim()} hitSlop={10}>
                <Text style={{ color: title.trim() ? C.accentText : C.muted, fontSize: 16, fontWeight: "800" }}>{t("addLesson.save")}</Text>
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ width: "100%", maxWidth: FORM_MAX, alignSelf: "center", padding: 16, gap: 18, paddingBottom: Math.max(insets.bottom, 20) + 20 }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <Image source={thumb(videoId)} style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 14, backgroundColor: C.card }} />

          <View style={{ gap: 8 }}>
            <Text style={label}>{t("addLesson.name")}</Text>
            <Input value={title} onChangeText={setTitle} multiline maxLength={200} style={{ minHeight: 52 }} />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={label}>{t("addLesson.level")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {LEVELS.map(({ level: l }) => {
                const active = level === l;
                const c = LEVEL_COLORS[l[0]];
                return (
                  <Pressable
                    key={l}
                    onPress={() => setLevel(l)}
                    style={{
                      minWidth: 52,
                      alignItems: "center",
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: active ? c.bg : C.border,
                      backgroundColor: active ? c.bg : C.card,
                    }}
                  >
                    <Text style={{ color: active ? c.fg : C.text, fontWeight: "800", fontSize: 15 }}>{l}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={label}>{t("addLesson.desc")}</Text>
            <Input value={description} onChangeText={setDescription} multiline maxLength={2000} style={{ minHeight: 90, textAlignVertical: "top" }} />
          </View>

          <View style={[styles.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }}>{t("addLesson.publish")}</Text>
              <Text style={styles.muted}>{t("addLesson.publishHint")}</Text>
            </View>
            <Switch value={published} onValueChange={setPublished} trackColor={{ true: C.accent }} />
          </View>

          <View style={[styles.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }}>{t("addLesson.dictation")}</Text>
              <Text style={styles.muted}>{t("addLesson.dictationHint")}</Text>
            </View>
            <Switch value={dictation} onValueChange={setDictation} trackColor={{ true: C.accent }} />
          </View>

          <ErrorText>{error}</ErrorText>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const label = themed(() => ({ color: C.muted, fontSize: 13, fontWeight: "700" as const, letterSpacing: 0.5, textTransform: "uppercase" as const }));
