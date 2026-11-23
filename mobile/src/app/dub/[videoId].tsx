import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import DubPlayer from "@/components/DubPlayer";
import { Text } from "@/components/Text";
import { Button, Card, ErrorText } from "@/components/ui";
import {
  saveRecentDub,
  startDubPrepareStream,
  type DubBgProgress,
  type DubProgress,
  type DubResult,
  type DubVoiceId,
} from "@/lib/dub";
import { useI18n } from "@/lib/i18n";
import { C, SEC, alpha } from "@/lib/theme";

/**
 * Màn hình xem YouTube thuyết minh tiếng Việt:
 * - Hiện tiến trình 0% → 100% theo thời gian thực khi chuẩn bị.
 * - Mở trình phát ngay khi xong 20 câu đầu (~3 giây), phần còn lại dịch ngầm & cập nhật mượt vào player.
 */
export default function DubWatchScreen() {
  const { videoId, voice } = useLocalSearchParams<{ videoId: string; voice?: string }>();
  const { t } = useI18n();
  const sec = SEC.dub;

  const initialVoice: DubVoiceId =
    voice === "edge:vi-VN-HoaiMyNeural" ? "edge:vi-VN-HoaiMyNeural" : "edge:vi-VN-NamMinhNeural";

  const [session, setSession] = useState<DubResult | null>(null);
  const [prep, setPrep] = useState<DubProgress>({ pct: 3, stage: t("dub.connecting") });
  const [bgProgress, setBgProgress] = useState<DubBgProgress | null>(null);
  const [error, setError] = useState("");
  const abortRef = useRef<(() => void) | null>(null);

  const load = useCallback(() => {
    if (!videoId) return;
    abortRef.current?.();
    setError("");
    setSession(null);
    setBgProgress(null);
    setPrep({ pct: 3, stage: t("dub.connecting") });

    let becameReady = false;
    const { promise, abort } = startDubPrepareStream(videoId, {
      onProgress: (p) => setPrep(p),
      onReady: (partial, bg) => {
        becameReady = true;
        setSession(partial);
        setBgProgress(bg);
        saveRecentDub(partial.videoId, partial.title || partial.videoId);
      },
      onChunk: (start, translations, bg) => {
        setBgProgress(bg);
        setSession((prev) => {
          if (!prev || prev.videoId !== videoId) return prev;
          const nextCues = prev.cues.slice();
          translations.forEach((tr, k) => {
            const idx = start + k;
            if (nextCues[idx]) {
              nextCues[idx] = {
                start_ms: nextCues[idx].start_ms,
                end_ms: nextCues[idx].end_ms,
                text: tr || nextCues[idx].orig || nextCues[idx].text,
                orig: nextCues[idx].orig,
              };
            }
          });
          return { ...prev, cues: nextCues };
        });
      },
    });
    abortRef.current = abort;

    promise
      .then((full) => {
        setSession(full);
        setBgProgress(null);
        if (!becameReady) saveRecentDub(full.videoId, full.title || full.videoId);
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") {
          setError(e.message);
        }
      });
  }, [videoId, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- khởi chạy stream chuẩn bị thuyết minh khi vào màn
    load();
    return () => {
      abortRef.current?.();
      abortRef.current = null;
    };
  }, [load]);

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, justifyContent: "center", padding: 20 }}>
        <Stack.Screen options={{ title: t("dub.title") }} />
        <Card style={{ maxWidth: 440, width: "100%", alignSelf: "center" }}>
          {error ? (
            <>
              <ErrorText>{error}</ErrorText>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Button title={t("retry")} variant="primary" onPress={load} style={{ flex: 1, backgroundColor: sec.sec, borderColor: sec.sec }} />
                <Button title={t("cancel")} onPress={() => router.back()} style={{ flex: 1 }} />
              </View>
            </>
          ) : (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                  <ActivityIndicator color={sec.secText} />
                  <Text style={{ color: C.text, fontSize: 15, fontWeight: "700", flex: 1 }}>{prep.stage}</Text>
                </View>
                <Text style={{ color: sec.secText, fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] }}>
                  {prep.pct}%
                </Text>
              </View>

              <View style={{ height: 8, borderRadius: 4, backgroundColor: alpha(sec.sec, 0.18), overflow: "hidden" }}>
                <View style={{ height: "100%", width: `${Math.max(4, prep.pct)}%`, backgroundColor: sec.sec }} />
              </View>

              <Button
                title={t("cancel")}
                onPress={() => {
                  abortRef.current?.();
                  router.back();
                }}
              />
            </>
          )}
        </Card>
      </View>
    );
  }

  return (
    <DubPlayer
      videoId={session.videoId}
      title={session.title || session.videoId}
      sourceLang={session.sourceLang}
      cues={session.cues}
      initialVoice={initialVoice}
      bgProgress={bgProgress}
    />
  );
}
