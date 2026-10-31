import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { LessonSheet } from "@/components/LessonSheet";
import Player from "@/components/Player";
import { Button } from "@/components/ui";
import { api, ApiError, type Transcript } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fetchTranscriptOnDevice } from "@/lib/youtube-device";
import { C } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

type StepKey = "watch.finding" | "watch.fetching" | "watch.saving" | "watch.ai";

class GuestNoSubtitles extends Error {
  constructor() {
    super("no-german-subtitles"); // màn hình hiện thông báo theo ngôn ngữ đang chọn
  }
}

/**
 * Lấy phụ đề cho video, rẻ & chắc nhất trước:
 *   1. Phụ đề đã lưu trên server (ai đó đã mở video này)
 *   2. Tự lấy trên điện thoại → đăng nhập rồi thì gửi lên server lưu cho mọi người (server thêm dấu câu)
 *   3. Nhờ server lấy hộ (YouTube có thể chặn IP VPS) / tạo bằng Whisper nếu video không có phụ đề tiếng Đức
 */
async function loadTranscript(videoId: string, loggedIn: boolean, step: (s: StepKey) => void): Promise<Transcript> {
  const id = encodeURIComponent(videoId);
  try {
    return await api<Transcript>(`/youtube/${id}?saved=1`);
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 404)) throw e;
  }

  step("watch.fetching");
  const local = await fetchTranscriptOnDevice(videoId);
  if (local) {
    if (!loggedIn) return local; // khách: dùng tạm trên máy (chưa thêm dấu câu, không lưu lên server)
    try {
      step("watch.saving");
      return await api<Transcript>(`/youtube/${id}`, { method: "POST", body: local });
    } catch {
      return local;
    }
  }

  if (!loggedIn) {
    // Khách: chỉ dùng phụ đề tiếng Đức có sẵn của YouTube (nhờ server lấy hộ), không tạo bằng AI
    step("watch.fetching");
    try {
      return await api<Transcript>(`/youtube/${id}`);
    } catch {
      throw new GuestNoSubtitles();
    }
  }
  step("watch.ai");
  return api<Transcript>(`/youtube/${id}`);
}

export default function WatchScreen() {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
  const { user, ready } = useAuth();
  const [data, setData] = useState<Transcript | null>(null);
  const [error, setError] = useState("");
  const [needLogin, setNeedLogin] = useState(false);
  const { t } = useI18n();
  const [step, setStep] = useState<StepKey>("watch.finding");
  const [adding, setAdding] = useState(false); // admin: đang mở form "Thêm thành bài học"

  useEffect(() => {
    if (!ready) return;
    loadTranscript(videoId, !!user, setStep)
      .then(setData)
      .catch((e: Error) => {
        setError(e.message);
        setNeedLogin(e instanceof GuestNoSubtitles);
      });
  }, [videoId, ready, user]);

  if (!data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
        {error ? (
          <>
            <Text style={{ color: C.redText, textAlign: "center" }}>{needLogin ? t("watch.noSubs") : error}</Text>
            {needLogin && (
              <>
                <Text style={{ color: C.muted, textAlign: "center" }}>
                  {t("watch.noSubsHint")}
                </Text>
                <Button title={t("loginOrRegister")} variant="primary" onPress={() => router.push("/account")} />
              </>
            )}
          </>
        ) : (
          <>
            <ActivityIndicator color={C.accent} />
            <Text style={{ color: C.muted, textAlign: "center" }}>{t(step)}</Text>
          </>
        )}
      </View>
    );
  }
  const isAdmin = user?.role === "admin";
  return (
    <>
      <Player
        title={data.title}
        videoId={data.videoId}
        segments={data.segments}
        sourceUrl={`/watch/${data.videoId}`}
        headerRight={
          isAdmin ? (
            <Pressable onPress={() => setAdding(true)} hitSlop={10} accessibilityLabel={t("addLesson.title")}>
              <SymbolView name="plus.rectangle.on.rectangle" size={22} tintColor={C.amber} />
            </Pressable>
          ) : undefined
        }
      />
      {isAdmin && <LessonSheet visible={adding} onClose={() => setAdding(false)} videoId={data.videoId} defaultTitle={data.title} />}
    </>
  );
}
