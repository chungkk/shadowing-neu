import { router } from "expo-router";
import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { ErrorText, Input, styles } from "@/components/ui";
import { api, ApiError, thumb, type LessonSummary } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { C, LEVEL_COLORS, LEVELS } from "@/lib/theme";

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
  const editing = !!lesson;
  const [title, setTitle] = useState(lesson?.title ?? defaultTitle);
  const [level, setLevel] = useState<string>(lesson?.level ?? "B1");
  const [description, setDescription] = useState(lesson?.description ?? "");
  const [published, setPublished] = useState(lesson?.published ?? true);
  const [dictation, setDictation] = useState(lesson?.dictation ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const openLesson = (id: unknown) => router.replace(`/lesson/${id}`);

  const save = async () => {
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
      // Giữ Alert riêng: cần nút "Mở bài" (các hộp thoại khác dùng @/lib/dialogs)
      Alert.alert(t("addLesson.added"), published ? t("addLesson.publishedNote") : t("addLesson.draftNote"), [
        { text: t("close"), style: "cancel" },
        { text: t("addLesson.open"), onPress: () => openLesson(r.id) },
      ]);
    } catch (e) {
      // Video đã có bài → cho mở bài đó
      if (e instanceof ApiError && e.status === 409 && e.data.id) {
        onClose();
        Alert.alert(t("addLesson.existsTitle"), e.message, [
          { text: t("close"), style: "cancel" },
          { text: t("addLesson.open"), onPress: () => openLesson(e.data.id) },
        ]);
      } else setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.background }}>
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
          <Pressable onPress={onClose} hitSlop={10} style={{ flex: 1 }}>
            <Text style={{ color: C.muted, fontSize: 16 }}>{t("cancel")}</Text>
          </Pressable>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: "700" }}>{editing ? t("addLesson.editTitle") : t("addLesson.title")}</Text>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            {busy ? (
              <ActivityIndicator color={C.accent} />
            ) : (
              <Pressable onPress={save} disabled={!title.trim()} hitSlop={10}>
                <Text style={{ color: title.trim() ? C.accent : C.muted, fontSize: 16, fontWeight: "800" }}>{t("addLesson.save")}</Text>
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Image source={thumb(videoId)} style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 14, backgroundColor: C.card }} />

          <View style={{ gap: 8 }}>
            <Text style={label}>{t("addLesson.name")}</Text>
            <Input value={title} onChangeText={setTitle} multiline style={{ minHeight: 52 }} />
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
            <Input value={description} onChangeText={setDescription} multiline style={{ minHeight: 90, textAlignVertical: "top" }} />
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
      </View>
    </Modal>
  );
}

const label = { color: C.muted, fontSize: 13, fontWeight: "700" as const, letterSpacing: 0.5, textTransform: "uppercase" as const };
