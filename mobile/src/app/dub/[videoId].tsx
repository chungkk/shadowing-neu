import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import DubPlayer from "@/components/DubPlayer";
import { Text } from "@/components/Text";
import { Button, Card, ErrorText } from "@/components/ui";
import {
  ensureDubVoiceLoaded,
  getDubVoice,
  isDubVoiceId,
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
  const { lang, t } = useI18n();
  const sec = SEC.dub;

  const initialVoice: DubVoiceId = isDubVoiceId(voice) ? voice : getDubVoice();

  const [session, setSession] = useState<DubResult | null>(null);
  const [activeVoice, setActiveVoice] = useState<DubVoiceId>(initialVoice);
  const [prep, setPrep] = useState<DubProgress>({ pct: 3, stage: t("dub.connecting") });
  const [bgProgress, setBgProgress] = useState<DubBgProgress | null>(null);
  const [bgStatus, setBgStatus] = useState<"reconnecting" | "failed" | null>(null);
  const [bgError, setBgError] = useState("");
  const [repairing, setRepairing] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<(() => void) | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const waitActiveRef = useRef(false);
  const mountedRef = useRef(true);
  const loadSeqRef = useRef(0);
  const tRef = useRef(t);
  const voiceRef = useRef<DubVoiceId>(initialVoice);
  const connectRef = useRef<(resume: boolean, attempt: number, opts?: { force?: boolean; repair?: boolean }) => void>(
    () => {},
  );
  const lastOptsRef = useRef<{ force?: boolean; repair?: boolean } | undefined>(undefined);
  useEffect(() => {
    tRef.current = t;
  });

  const connect = useCallback(
    (resume: boolean, attempt: number, opts?: { force?: boolean; repair?: boolean }) => {
      waitActiveRef.current = false;
      if (!videoId) {
        setError(tRef.current("dub.ytInvalid"));
        return;
      }
      abortRef.current?.();
      clearTimeout(retryTimerRef.current);
      lastOptsRef.current = opts;
      setBgError("");
      if (opts?.repair) setRepairing(true);
      if (!resume) {
        setError("");
        setSession(null);
        setBgProgress(null);
        setBgStatus(null);
        setRepairing(false);
        setPrep({ pct: 3, stage: tRef.current("dub.connecting") });
      }

      let becameReady = resume;
      const { promise, abort } = startDubPrepareStream(videoId, {
        voiceId: voiceRef.current,
        speed: 1.15,
        force: opts?.force,
        repair: opts?.repair,
        onProgress: (p) => {
          if (!resume) setPrep(p);
        },
        onReady: (partial, bg) => {
          if (!becameReady) saveRecentDub(partial.videoId, partial.title || partial.videoId);
          becameReady = true;
          setBgStatus(null);
          setBgError("");
          setSession((prev) => (prev ? mergeSession(prev, partial) : partial));
          setBgProgress(bg);
        },
        onChunk: (start, translations, skipped, bg) => {
          setBgStatus(null);
          setBgError("");
          setBgProgress(bg);
          const skipSet = new Set(skipped);
          setSession((prev) => {
            if (!prev || prev.videoId !== videoId) return prev;
            const nextCues = prev.cues.slice();
            translations.forEach((tr, k) => {
              const idx = start + k;
              if (nextCues[idx]) {
                const isSkip = skipSet.has(k);
                nextCues[idx] = {
                  start_ms: nextCues[idx].start_ms,
                  end_ms: nextCues[idx].end_ms,
                  text: tr,
                  orig: nextCues[idx].orig,
                  spk: nextCues[idx].spk,
                  ...(tr || isSkip ? {} : { untranslated: true }),
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
          waitActiveRef.current = false;
          lastOptsRef.current = undefined;
          setRepairing(false);
          setSession((prev) => (prev ? mergeSession(prev, full) : full));
          setBgProgress(null);
          setBgStatus(null);
          setBgError("");
          if (!becameReady) saveRecentDub(full.videoId, full.title || full.videoId);
        })
        .catch((e: Error) => {
          if (e.name === "AbortError") return;
          if (!becameReady) {
            setRepairing(false);
            setError(e.message);
            return;
          }
          if (attempt >= RECONNECT_DELAYS_MS.length) {
            setRepairing(false);
            setBgStatus("failed");
            setBgError(e.message);
            return;
          }
          setBgStatus("reconnecting");
          if (AppState.currentState !== "active") {
            waitActiveRef.current = true;
            return;
          }
          retryTimerRef.current = setTimeout(() => connectRef.current(true, attempt + 1, opts), RECONNECT_DELAYS_MS[attempt]);
        });
    },
    [videoId],
  );

  useEffect(() => {
    connectRef.current = connect;
  });

  const load = useCallback(() => {
    const seq = ++loadSeqRef.current;
    void ensureDubVoiceLoaded().then((v) => {
      if (!mountedRef.current || seq !== loadSeqRef.current) return;
      if (!isDubVoiceId(voice)) {
        voiceRef.current = v;
        setActiveVoice(v);
      }
      connect(false, 0);
    });
  }, [connect, voice]);
  const retryBg = useCallback(() => {
    setBgStatus("reconnecting");
    setBgError("");
    connect(true, 0, lastOptsRef.current);
  }, [connect]);
  const retranslate = useCallback(() => connect(false, 0, { force: true }), [connect]);
  const repair = useCallback(() => {
    setBgStatus(null);
    setBgError("");
    connect(true, 0, { repair: true });
  }, [connect]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
      waitActiveRef.current = false;
      clearTimeout(retryTimerRef.current);
      abortRef.current?.();
      abortRef.current = null;
    };
  }, [load]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active" && waitActiveRef.current) {
        waitActiveRef.current = false;
        connect(true, 0, lastOptsRef.current);
      }
    });
    return () => sub.remove();
  }, [connect]);

  const prepLabel =
    lang === "de"
      ? prep.done != null && prep.total != null && prep.total > 0
        ? `Übersetze ins Vietnamesische (${prep.done}/${prep.total})…`
        : prep.pct >= 45
          ? "Übersetze Untertitel ins Vietnamesische…"
          : prep.pct >= 15
            ? "Untertitel werden geladen…"
            : t("dub.connecting")
      : prep.stage;

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
                  <Text style={{ color: C.text, fontSize: 15, fontWeight: "700", flex: 1 }}>{prepLabel}</Text>
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
      key={session.videoId}
      videoId={session.videoId}
      title={session.title || session.videoId}
      sourceLang={session.sourceLang}
      cues={session.cues}
      initialVoice={activeVoice}
      onVoiceChange={(v) => {
        voiceRef.current = v;
        setActiveVoice(v);
      }}
      bgProgress={bgProgress}
      bgStatus={bgStatus}
      bgError={bgError}
      repairing={repairing}
      onRetryBg={retryBg}
      onRetranslate={retranslate}
      onRepair={repair}
    />
  );
}
