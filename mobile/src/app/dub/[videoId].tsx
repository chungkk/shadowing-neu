import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
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

/** Chờ trước mỗi lần tự nối lại stream dịch ngầm */
const RECONNECT_DELAYS_MS = [1_500, 4_000, 10_000, 20_000];

/**
 * Gộp dữ liệu mới từ server vào phiên đang xem mà không làm mất câu đã dịch:
 * nối lại có thể nhận bản `ready` ít câu dịch hơn (server phải chạy lại từ đầu).
 */
function mergeSession(prev: DubResult, next: DubResult): DubResult {
  if (prev.videoId !== next.videoId || prev.cues.length !== next.cues.length) return next;
  return {
    ...next,
    cues: next.cues.map((c, i) => {
      const old = prev.cues[i];
      const nextDone = !c.pending && !c.untranslated;
      const oldDone = !old.pending && !old.untranslated;
      return !nextDone && oldDone ? old : c;
    }),
  };
}

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
  // Trạng thái kết nối dịch ngầm khi player đã mở: đang nối lại / hết lượt nối lại
  const [bgStatus, setBgStatus] = useState<"reconnecting" | "failed" | null>(null);
  const [error, setError] = useState("");
  const abortRef = useRef<(() => void) | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const waitActiveRef = useRef(false);
  const tRef = useRef(t);
  // Cho hẹn giờ nối lại gọi bản connect mới nhất (connect không tự tham chiếu được trong useCallback)
  const connectRef = useRef<(resume: boolean, attempt: number) => void>(() => {});
  useEffect(() => {
    tRef.current = t;
  });

  /**
   * Mở stream chuẩn bị. `resume` = player đang mở: giữ nguyên phiên, chỉ nhận tiếp phần dịch.
   * Server vẫn dịch tiếp khi app mất kết nối, nên nối lại sẽ nhận ngay bản mới nhất.
   */
  const connect = useCallback(
    (resume: boolean, attempt: number) => {
      if (!videoId) return;
      abortRef.current?.();
      clearTimeout(retryTimerRef.current);
      if (!resume) {
        setError("");
        setSession(null);
        setBgProgress(null);
        setBgStatus(null);
        setPrep({ pct: 3, stage: tRef.current("dub.connecting") });
      }

      let becameReady = resume;
      const { promise, abort } = startDubPrepareStream(videoId, {
        onProgress: (p) => {
          if (!resume) setPrep(p);
        },
        onReady: (partial, bg) => {
          if (!becameReady) saveRecentDub(partial.videoId, partial.title || partial.videoId);
          becameReady = true;
          setBgStatus(null);
          setSession((prev) => (prev ? mergeSession(prev, partial) : partial));
          setBgProgress(bg);
        },
        onChunk: (start, translations, bg) => {
          setBgStatus(null);
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
                  // "" = AI chưa dịch được → không đọc (đừng thay bằng câu gốc)
                  text: tr,
                  orig: nextCues[idx].orig,
                  ...(tr ? {} : { untranslated: true }),
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
          setSession((prev) => (prev ? mergeSession(prev, full) : full));
          setBgProgress(null);
          setBgStatus(null);
          if (!becameReady) saveRecentDub(full.videoId, full.title || full.videoId);
        })
        .catch((e: Error) => {
          if (e.name === "AbortError") return;
          if (!becameReady) {
            setError(e.message);
            return;
          }
          // Player đã mở → không xoá phiên, tự nối lại (đợi app quay lại nền trước nếu đang ẩn)
          if (attempt >= RECONNECT_DELAYS_MS.length) {
            setBgStatus("failed");
            return;
          }
          setBgStatus("reconnecting");
          if (AppState.currentState !== "active") {
            waitActiveRef.current = true;
            return;
          }
          retryTimerRef.current = setTimeout(() => connectRef.current(true, attempt + 1), RECONNECT_DELAYS_MS[attempt]);
        });
    },
    [videoId],
  );

  useEffect(() => {
    connectRef.current = connect;
  });

  const load = useCallback(() => connect(false, 0), [connect]);
  const retryBg = useCallback(() => {
    setBgStatus("reconnecting");
    connect(true, 0);
  }, [connect]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- khởi chạy stream chuẩn bị thuyết minh khi vào màn
    load();
    return () => {
      clearTimeout(retryTimerRef.current);
      abortRef.current?.();
      abortRef.current = null;
    };
  }, [load]);

  // Quay lại app sau khi bị ẩn lúc đang dịch ngầm → nối lại ngay
  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active" && waitActiveRef.current) {
        waitActiveRef.current = false;
        connect(true, 0);
      }
    });
    return () => sub.remove();
  }, [connect]);

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
      bgStatus={bgStatus}
      onRetryBg={retryBg}
    />
  );
}
