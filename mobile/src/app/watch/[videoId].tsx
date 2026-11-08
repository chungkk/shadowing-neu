import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Text } from "@/components/Text";
import Player from "@/components/Player";
import { api, ApiError, type Transcript } from "@/lib/api";
import { C } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

/** Video chưa có phụ đề lưu trên server (admin tạo phụ đề trên web) */
class NoSubtitles extends Error {
  constructor() {
    super("no-german-subtitles"); // màn hình hiện thông báo theo ngôn ngữ đang chọn
  }
}

/** App chỉ đọc phụ đề đã lưu trên server — không tự lấy từ YouTube, không nhờ server lấy hộ / tạo bằng Whisper */
async function loadTranscript(videoId: string): Promise<Transcript> {
  try {
    return await api<Transcript>(`/youtube/${encodeURIComponent(videoId)}?saved=1`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) throw new NoSubtitles();
    throw e;
  }
}

export default function WatchScreen() {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
  const [data, setData] = useState<Transcript | null>(null);
  const [error, setError] = useState("");
  const [noSubs, setNoSubs] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    loadTranscript(videoId)
      .then(setData)
      .catch((e: Error) => {
        // Video của bài đang khoá (admin bật khoá bài học) → sang màn bài học để mở khoá
        if (e instanceof ApiError && e.data.locked && typeof e.data.lessonId === "number") return router.replace(`/lesson/${e.data.lessonId}`);
        setError(e.message);
        setNoSubs(e instanceof NoSubtitles);
      });
  }, [videoId]);

  if (!data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
        {error ? (
          <Text style={{ color: C.redText, textAlign: "center" }}>{noSubs ? t("watch.noSubs") : error}</Text>
        ) : (
          <>
            <ActivityIndicator color={C.accentText} />
            <Text style={{ color: C.muted, textAlign: "center" }}>{t("watch.finding")}</Text>
          </>
        )}
      </View>
    );
  }
  return <Player title={data.title} videoId={data.videoId} segments={data.segments} sourceUrl={`/watch/${data.videoId}`} />;
}
