import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { Stack, useFocusEffect } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionSheetIOS, ActivityIndicator, AppState, FlatList, Platform, Pressable, ScrollView, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import YoutubePlayer, { PLAYER_STATES, type YoutubeIframeRef } from "react-native-youtube-iframe";
import { formatTime } from "@shared/subtitles";
import { Text } from "./Text";
import { ActionSheetModal, ErrorText, Label } from "./ui";
import { DUB_VOICES, fetchFittedDubCue, setDubVoice, type DubBgProgress, type DubCue, type DubVoiceId } from "@/lib/dub";
import { haptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { CONTENT_MAX, useLayout } from "@/lib/layout";
import { C, R, SEC, alpha } from "@/lib/theme";

const SPEEDS = [1, 1.15, 1.25, 1.35] as const;
const DUB_VOL_LEVELS = [100, 60, 0] as const;

/** Các mức âm lượng tiếng gốc khi chỉnh được thật (Android, hoặc iOS khi Web Audio chạy). */
const ORIG_LEVELS = [0, 15, 30, 60, 100] as const;
/** iOS khi không có Web Audio: WebKit khoá âm lượng video, chỉ tắt/bật được. */
const ORIG_TOGGLE = [0, 100] as const;

type GainStatus = "native" | "pending" | "ok" | "unsupported";
const GAIN_MSG = "__dubgain:";

function buildShim(allowGain: boolean, mutedInit: boolean): string {
  return `
(function () {
  if (window.top !== window) return;
  window.__dubMuted = ${mutedInit ? "true" : "false"};
  window.__dubVol = 100;
  function sendGain() {
    try {
      var f = window.player && player.getIframe && player.getIframe();
      if (f && f.contentWindow) f.contentWindow.postMessage(JSON.stringify({ __dubSetGain: window.__dubVol / 100 }), "*");
    } catch (_) {}
  }
  window.addEventListener("message", function (e) {
    if (typeof e.data !== "string") return;
    try {
      var m = JSON.parse(e.data);
      if (!m) return;
      if (m.__dubGain) {
        if (m.__dubGain === "hello") sendGain();
        else if (window.ReactNativeWebView)
          window.ReactNativeWebView.postMessage(JSON.stringify({ eventType: "playerQualityChange", data: "${GAIN_MSG}" + m.__dubGain }));
        return;
      }
      if (!window.player || !m.eventName) return;
      switch (m.eventName) {
        case "playVideo": player.playVideo(); break;
        case "pauseVideo": player.pauseVideo(); break;
        case "muteVideo": window.__dubMuted = true; player.mute(); break;
        case "unMuteVideo": window.__dubMuted = false; player.unMute(); break;
        case "setVolume":
          if (m.meta && typeof m.meta.volume === "number") {
            window.__dubVol = m.meta.volume;
            player.setVolume(m.meta.volume);
            sendGain();
          }
          break;
      }
    } catch (_) {}
  });
  (function hookPlayer() {
    if (!window.player || typeof player.getPlayerState !== "function") return setTimeout(hookPlayer, 250);
    if (window.__dubMuted) { try { player.mute(); } catch (_) {} }
    player.addEventListener("onStateChange", function (e) {
      if (e.data !== 1) return;
      try {
        if (window.__dubMuted) player.mute();
        player.unloadModule("captions");
        player.unloadModule("cc");
      } catch (_) {}
    });
  })();
})();
(function () {
  if (!${allowGain ? "true" : "false"} || window.top === window) return;
  if (!/(^|\\.)youtube(-nocookie)?\\.com$/.test(location.hostname)) return;
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, gainNode = null, gain = 1, reported = false;
  function post(s) { try { window.parent.postMessage(JSON.stringify({ __dubGain: s }), "*"); } catch (_) {} }
  window.addEventListener("message", function (e) {
    if (typeof e.data !== "string" || e.data.indexOf("__dubSetGain") < 0) return;
    try {
      var m = JSON.parse(e.data);
      if (typeof m.__dubSetGain !== "number") return;
      gain = Math.max(0, Math.min(1, m.__dubSetGain));
      if (gainNode) gainNode.gain.setTargetAtTime(gain, ctx.currentTime, 0.04);
    } catch (_) {}
  });
  function watchSilence(v, an) {
    var buf = new Float32Array(an.fftSize), flat = 0;
    var iv = setInterval(function () {
      if (v.paused || v.muted || gain <= 0.01 || v.readyState < 3 || ctx.state !== "running") return;
      an.getFloatTimeDomainData(buf);
      var mx = 0;
      for (var i = 0; i < buf.length; i++) { var a = Math.abs(buf[i]); if (a > mx) mx = a; }
      if (mx > 0.0001) { clearInterval(iv); post("verified"); return; }
      if (++flat >= 12) { clearInterval(iv); post("silent"); }
    }, 500);
  }
  function tryHook(v) {
    if (v.__dubHooked || v.__dubTrying) return;
    var src = v.currentSrc || v.src || "";
    if (!src) return;
    if (!AC || src.indexOf("blob:") !== 0) { if (!reported) { reported = true; post("unsupported"); } return; }
    v.__dubTrying = true;
    if (!ctx) ctx = new AC();
    var resumed = ctx.state === "running" ? Promise.resolve() : ctx.resume();
    Promise.race([resumed, new Promise(function (r) { setTimeout(r, 1200); })]).then(function () {
      v.__dubTrying = false;
      if (ctx.state !== "running") { post("suspended"); return; }
      var s = ctx.createMediaElementSource(v);
      gainNode = ctx.createGain();
      gainNode.gain.value = gain;
      s.connect(gainNode);
      gainNode.connect(ctx.destination);
      var an = ctx.createAnalyser();
      an.fftSize = 2048;
      s.connect(an);
      v.__dubHooked = true;
      reported = true;
      post("ok");
      post("hello");
      watchSilence(v, an);
    }).catch(function () { v.__dubTrying = false; post("unsupported"); });
  }
  (function findVideo() {
    var v = document.querySelector("video");
    if (!v) return setTimeout(findVideo, 400);
    if (!v.__dubListen) {
      v.__dubListen = true;
      v.addEventListener("playing", function () {
        if (ctx && ctx.state !== "running") ctx.resume().catch(function () {});
        tryHook(v);
      });
    }
    if (!v.paused) tryHook(v);
    if (!v.__dubHooked) setTimeout(findVideo, 1500);
  })();
  post("hello");
})();
true;
`;
}

function Pill({
  icon,
  label,
  on = false,
  disabled = false,
  onPress,
}: {
  icon: SFSymbol;
  label: string;
  on?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const sec = SEC.dub;
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => ({
        height: 34,
        paddingHorizontal: 11,
        borderRadius: 17,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: on ? sec.secSoft : C.card2,
        borderColor: on ? sec.sec : C.border,
        opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
      })}
    >
      <SymbolView name={icon} size={14} tintColor={on ? sec.secText : C.muted} weight="semibold" />
      <Text style={{ color: on ? sec.secText : C.text, fontSize: 13, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

export default function DubPlayer({
  videoId,
  title,
  sourceLang,
  cues,
  initialVoice = "edge:vi-VN-NamMinhNeural",
  onVoiceChange,
  bgProgress = null,
  bgStatus = null,
  bgError = "",
  repairing = false,
  onRetryBg,
  onRetranslate,
  onRepair,
}: {
  videoId: string;
  title: string;
  sourceLang?: string;
  cues: DubCue[];
  initialVoice?: DubVoiceId;
  onVoiceChange?: (v: DubVoiceId) => void;
  bgProgress?: DubBgProgress | null;
  bgStatus?: "reconnecting" | "failed" | null;
  bgError?: string;
  repairing?: boolean;
  onRetryBg?: () => void;
  onRetranslate?: () => void;
  onRepair?: () => void;
}) {
  const { t } = useI18n();
  const { width, tablet, split } = useLayout();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const sec = SEC.dub;

  const ytRef = useRef<YoutubeIframeRef>(null);
  const listRef = useRef<FlatList<DubCue>>(null);
  const audioRef = useRef<AudioPlayer | null>(null);
  const lastSpokenIdxRef = useRef(-1);
  const prevCuesRef = useRef<DubCue[]>(cues);
  const lastYtTimeRef = useRef(0);
  const lastPollWallRef = useRef(0);
  const speakGenRef = useRef(0);
  const playingCueRef = useRef<{ cueIndex: number; voiceId: DubVoiceId; speed: number } | null>(null);
  const pausedCueRef = useRef<{ cueIndex: number; voiceId: DubVoiceId; speed: number } | null>(null);

  const [playing, setPlaying] = useState(false);
  const [ytReady, setYtReady] = useState(false);
  const ytReadyRef = useRef(false);
  const ytStateRef = useRef<string>("");
  const pendingSeekRef = useRef<{ targetSec: number; until: number } | null>(null);
  const warmGenRef = useRef(0);
  const mountedRef = useRef(true);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false);
  const [warmingFirst, setWarmingFirst] = useState(false);
  const [voiceId, setVoiceId] = useState<DubVoiceId>(initialVoice);
  const [speedIdx, setSpeedIdx] = useState(1); // mặc định 1.15x
  const [origVol, setOrigVol] = useState(0);
  const [gainStatus, setGainStatus] = useState<GainStatus>(Platform.OS === "ios" ? "pending" : "native");
  const [gainAllowed, setGainAllowed] = useState(Platform.OS === "ios");
  const [playerKey, setPlayerKey] = useState(0);
  const [playerStart, setPlayerStart] = useState(0);
  const [origMutedInit, setOrigMutedInit] = useState(true);
  const origMutedInitRef = useRef(true);
  const shim = useMemo(() => buildShim(gainAllowed, origMutedInit), [gainAllowed, origMutedInit]);
  const canGain = gainStatus === "native" || gainStatus === "ok";
  const [dubVol, setDubVol] = useState<number>(100);
  const [showOrig, setShowOrig] = useState(false);
  const [activeCueIdx, setActiveCueIdx] = useState(-1);
  const activeCueIdxRef = useRef(-1);
  const [engineErr, setEngineErr] = useState("");
  const [ytErr, setYtErr] = useState("");

  const speed = SPEEDS[speedIdx];
  const hasOrig = useMemo(() => cues.some((c) => Boolean(c.orig)), [cues]);
  const untranslatedCount = useMemo(() => cues.filter((c) => c.untranslated).length, [cues]);
  const activeCue = activeCueIdx >= 0 ? cues[activeCueIdx] : null;

  const stateRef = useRef({ voiceId, speed, dubVol, cues, playing });
  useEffect(() => {
    stateRef.current = { voiceId, speed, dubVol, cues, playing };
    activeCueIdxRef.current = activeCueIdx;
    origMutedInitRef.current = origVol <= 0;
  });

  // Remap các chỉ số đang phát/đã đọc theo `start_ms` khi danh sách `cues` co lại (do `done` bỏ câu [SKIP])
  useEffect(() => {
    const prev = prevCuesRef.current;
    prevCuesRef.current = cues;
    if (prev === cues || prev.length === cues.length) return;
    const remap = (idx: number) => {
      if (idx < 0 || idx >= prev.length) return idx;
      const targetMs = prev[idx].start_ms;
      const found = cues.findIndex((c) => c.start_ms === targetMs);
      if (found >= 0) return found;
      let fallback = -1;
      for (let i = 0; i < cues.length; i++) {
        if (cues[i].start_ms <= targetMs) fallback = i;
        else break;
      }
      return fallback;
    };
    lastSpokenIdxRef.current = remap(lastSpokenIdxRef.current);
    if (playingCueRef.current) playingCueRef.current.cueIndex = remap(playingCueRef.current.cueIndex);
    if (pausedCueRef.current) pausedCueRef.current.cueIndex = remap(pausedCueRef.current.cueIndex);
  }, [cues]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      interruptionMode: "mixWithOthers",
    }).catch(() => {});
  }, []);

  const onGainMessage = useCallback((msg: string) => {
    if (!msg.startsWith(GAIN_MSG)) return;
    const status = msg.slice(GAIN_MSG.length);
    if (status === "ok" || status === "verified") {
      setGainStatus("ok");
    } else if (status === "unsupported") {
      setGainStatus((s) => (s === "ok" ? s : "unsupported"));
    } else if (status === "silent") {
      setGainStatus("unsupported");
      setGainAllowed(false);
      setOrigVol((v) => (v > 0 ? 100 : 0));
      setOrigMutedInit(origMutedInitRef.current);
      setPlayerStart(Math.floor(lastYtTimeRef.current));
      ytReadyRef.current = false;
      setYtReady(false);
      setPlayerKey((k) => k + 1);
    }
  }, []);

  const stopDub = useCallback(() => {
    speakGenRef.current += 1;
    playingCueRef.current = null;
    pausedCueRef.current = null;
    try {
      audioRef.current?.pause();
    } catch {}
  }, []);

  const pauseDub = useCallback(() => {
    speakGenRef.current += 1;
    const p = audioRef.current;
    if (p && playingCueRef.current && !pausedCueRef.current) {
      const hasRemaining = p.playing || (p.duration > 0 && p.currentTime < p.duration - 0.15);
      if (hasRemaining) {
        pausedCueRef.current = playingCueRef.current;
      }
    }
    try {
      p?.pause();
    } catch {}
  }, []);

  const resumeDub = useCallback(async () => {
    const p = audioRef.current;
    const paused = pausedCueRef.current;
    if (!p || !paused) return;
    pausedCueRef.current = null;

    const myGen = speakGenRef.current;
    const { voiceId: vId, speed: spd, cues: list } = stateRef.current;
    if (
      paused.cueIndex !== lastSpokenIdxRef.current ||
      paused.voiceId !== vId ||
      paused.speed !== spd ||
      (p.duration > 0 && p.currentTime >= p.duration - 0.15)
    ) {
      return;
    }

    const cue = list[paused.cueIndex];
    if (!cue || !ytRef.current || !ytReadyRef.current) return;
    try {
      const tSec = await Promise.race([
        ytRef.current.getCurrentTime(),
        new Promise<number>((_, rej) => setTimeout(() => rej(new Error("yt_timeout")), 500)),
      ]);
      if (!mountedRef.current || myGen !== speakGenRef.current || !stateRef.current.playing) return;
      const tMs = tSec * 1000;
      const nextStart = list[paused.cueIndex + 1]?.start_ms ?? cue.end_ms + 5000;
      if (tMs < cue.start_ms - 400 || tMs >= Math.min(nextStart - 60, cue.end_ms + 800)) return;
      const curVol = stateRef.current.dubVol;
      p.muted = curVol <= 0;
      p.volume = Math.max(0, Math.min(1, curVol / 100));
      p.play();
      for (let k = paused.cueIndex + 1; k <= Math.min(list.length - 1, paused.cueIndex + 4); k++) {
        void fetchFittedDubCue(list, k, vId, spd);
      }
    } catch {}
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const p = createAudioPlayer(null, { keepAudioSessionActive: true });
    audioRef.current = p;

    return () => {
      mountedRef.current = false;
      warmGenRef.current += 1;
      clearTimeout(scrollTimerRef.current);
      stopDub();
      try {
        p.remove();
      } catch {}
      audioRef.current = null;
    };
  }, [stopDub]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      if (st !== "active" && stateRef.current.playing) {
        setPlaying(false);
        pauseDub();
      }
    });
    return () => sub.remove();
  }, [pauseDub]);

  useFocusEffect(
    useCallback(
      () => () => {
        setPlaying(false);
        pauseDub();
      },
      [pauseDub],
    ),
  );

  useEffect(() => {
    const p = audioRef.current;
    if (p) {
      p.muted = dubVol <= 0;
      p.volume = Math.max(0, Math.min(1, dubVol / 100));
    }
  }, [dubVol]);

  // Prefetch trước từ vị trí hiện tại
  useEffect(() => {
    const startIdx = Math.max(0, activeCueIdxRef.current);
    const count = voiceId.startsWith("piper:") ? 2 : 3;
    for (let k = startIdx; k < Math.min(cues.length, startIdx + count); k++) {
      void fetchFittedDubCue(cues, k, voiceId, speed);
    }
  }, [cues, voiceId, speed]);

  useEffect(() => {
    if (activeCueIdx >= 0 && listRef.current) {
      try {
        listRef.current.scrollToIndex({ index: activeCueIdx, viewPosition: 0.25, animated: true });
      } catch {}
    }
  }, [activeCueIdx]);

  const speakCue = useCallback(async (cueIndex: number) => {
    const { voiceId: vId, speed: spd, cues: list } = stateRef.current;
    const cue = list[cueIndex];
    if (!cue || cue.pending || !cue.text.trim()) return;

    const myGen = ++speakGenRef.current;
    const rollbackIfStillCurrent = () => {
      if (lastSpokenIdxRef.current === cueIndex) {
        lastSpokenIdxRef.current = cueIndex - 1;
      }
    };

    const file = await fetchFittedDubCue(list, cueIndex, vId, spd, {
      urgent: true,
      onError: (msg) => setEngineErr(t("dub.ttsError", { msg })),
    });
    if (!file) {
      // Không rollback khi lỗi TTS để tránh vòng lặp retry 140ms
      return;
    }
    setEngineErr("");
    if (myGen !== speakGenRef.current || !stateRef.current.playing) {
      rollbackIfStillCurrent();
      return;
    }
    if (lastSpokenIdxRef.current !== cueIndex || stateRef.current.voiceId !== vId) return;

    const lookahead = vId.startsWith("piper:") ? 2 : 4;
    for (let k = cueIndex + 1; k <= Math.min(list.length - 1, cueIndex + lookahead); k++) {
      void fetchFittedDubCue(list, k, vId, spd);
    }

    const p = audioRef.current;
    if (!p) return;

    // Nếu câu trước vẫn còn đang đọc dở (≤ 2.2s), chờ nó kết thúc để tránh cắt ngang
    if (p.playing && p.duration > 0) {
      const remMs = (p.duration - p.currentTime) * 1000;
      if (remMs > 60 && remMs <= 2200) {
        await new Promise((r) => setTimeout(r, Math.min(remMs + 20, 2200)));
        if (myGen !== speakGenRef.current || !stateRef.current.playing) {
          rollbackIfStillCurrent();
          return;
        }
      }
    }

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
        interruptionMode: "mixWithOthers",
      }).catch(() => {});
      if (myGen !== speakGenRef.current || !stateRef.current.playing) {
        rollbackIfStillCurrent();
        return;
      }
      if (lastSpokenIdxRef.current !== cueIndex || stateRef.current.voiceId !== vId) return;
      pausedCueRef.current = null;
      playingCueRef.current = { cueIndex, voiceId: vId, speed: spd };
      p.replace({ uri: file.uri });
      const curVol = stateRef.current.dubVol;
      p.muted = curVol <= 0;
      p.volume = Math.max(0, Math.min(1, curVol / 100));
      const nextCue = list[cueIndex + 1];
      const slotSec = nextCue ? Math.max(0.5, (nextCue.start_ms - cue.start_ms) / 1000) : 0;
      const isPiper = vId.startsWith("piper:");
      const estAudioSec = isPiper ? Math.max(0, file.size - 44) / 44100 : file.size / 6000;
      const squeeze = slotSec > 0 && estAudioSec > slotSec ? Math.min(1.16, estAudioSec / slotSec) : 1;
      p.setPlaybackRate(squeeze, "high");
      p.play();
    } catch {}
  }, [t]);

  useEffect(() => {
    if (!playing) {
      lastPollWallRef.current = 0;
      return;
    }
    lastPollWallRef.current = 0;
    let busy = false;
    const timer = setInterval(async () => {
      if (busy || !ytRef.current || !ytReadyRef.current || ytStateRef.current === PLAYER_STATES.BUFFERING) {
        if (ytStateRef.current === PLAYER_STATES.BUFFERING) lastPollWallRef.current = 0;
        return;
      }
      busy = true;
      try {
        const tSec = await Promise.race([
          ytRef.current.getCurrentTime(),
          new Promise<number>((_, rej) => setTimeout(() => rej(new Error("yt_timeout")), 1000)),
        ]);
        if (!Number.isFinite(tSec) || ytStateRef.current === PLAYER_STATES.BUFFERING) return;
        const ps = pendingSeekRef.current;
        if (ps) {
          if (Math.abs(tSec - ps.targetSec) <= 1.5 || Date.now() >= ps.until) {
            pendingSeekRef.current = null;
          } else {
            return;
          }
        }
        const nowWall = Date.now();
        const dtWall = lastPollWallRef.current > 0 ? Math.max(0, (nowWall - lastPollWallRef.current) / 1000) : 0;
        lastPollWallRef.current = nowWall;

        const tMs = tSec * 1000;
        const dtVideo = tSec - lastYtTimeRef.current;
        lastYtTimeRef.current = tSec;

        const seekedBack = dtVideo < -0.5;
        const seekedForward = dtVideo > Math.max(1.5, dtWall * 1.5 + 1.2);
        const jumped = seekedBack || seekedForward;

        if (seekedBack) {
          stopDub();
          lastSpokenIdxRef.current = -1;
        } else if (seekedForward) {
          stopDub();
        }

        const list = stateRef.current.cues;
        let curIdx = -1;
        for (let i = 0; i < list.length; i++) {
          const c = list[i];
          const nextStart = list[i + 1]?.start_ms ?? c.end_ms + 5000;
          if (tMs >= c.start_ms - 140 && tMs < Math.min(nextStart - 60, c.end_ms + 800)) {
            curIdx = i;
            break;
          }
        }

        if (!seekedBack && curIdx !== -1 && curIdx < lastSpokenIdxRef.current) {
          curIdx = lastSpokenIdxRef.current;
        }

        setActiveCueIdx((prev) => (prev === curIdx ? prev : curIdx));

        if (curIdx !== -1 && curIdx > lastSpokenIdxRef.current) {
          const curCue = list[curIdx];
          if (!curCue.pending && curCue.text.trim()) {
            const lateMs = tMs - curCue.start_ms;
            const remainingMs = curCue.end_ms - tMs;
            if (!jumped || lateMs < 2500 || remainingMs > 1200) {
              lastSpokenIdxRef.current = curIdx;
              void speakCue(curIdx);
            } else {
              lastSpokenIdxRef.current = curIdx;
            }
          }
        }
      } catch {
      } finally {
        busy = false;
      }
    }, 140);

    return () => clearInterval(timer);
  }, [playing, speakCue, stopDub]);

  const togglePlay = async () => {
    if (ytErr || !ytReadyRef.current) return;
    haptic.tap();
    if (playing) {
      warmGenRef.current += 1;
      setPlaying(false);
      pauseDub();
      return;
    }
    const myWarmGen = ++warmGenRef.current;
    // Tải trước câu sắp đọc để video & giọng Việt bắt đầu khớp nhau
    const targetIdx = activeCueIdx >= 0 ? activeCueIdx : cues.findIndex((c) => !c.pending && c.text.trim());
    if (targetIdx >= 0 && lastSpokenIdxRef.current < targetIdx) {
      setWarmingFirst(true);
      let warmTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          fetchFittedDubCue(cues, targetIdx, voiceId, speed, { urgent: true }),
          new Promise<void>((r) => {
            warmTimer = setTimeout(r, 2500);
          }),
        ]);
      } finally {
        clearTimeout(warmTimer);
        if (mountedRef.current) setWarmingFirst(false);
      }
    }
    if (!mountedRef.current || myWarmGen !== warmGenRef.current || ytErr) return;
    setPlaying(true);
  };

  const restart = () => {
    if (ytErr || !ytReadyRef.current) return;
    haptic.tap();
    warmGenRef.current += 1;
    stopDub();
    lastSpokenIdxRef.current = -1;
    lastYtTimeRef.current = 0;
    lastPollWallRef.current = 0;
    pendingSeekRef.current = { targetSec: 0, until: Date.now() + 1500 };
    setActiveCueIdx(-1);
    ytRef.current?.seekTo(0, true);
    setPlaying(true);
  };

  const seekToCue = (index: number) => {
    if (ytErr || !ytReadyRef.current) return;
    const cue = cues[index];
    if (!cue) return;
    haptic.tap();
    warmGenRef.current += 1;
    stopDub();
    lastSpokenIdxRef.current = -1;
    const targetSec = cue.start_ms / 1000;
    lastYtTimeRef.current = targetSec;
    lastPollWallRef.current = 0;
    // eslint-disable-next-line react-hooks/purity -- chỉ chạy khi người dùng bấm chọn câu, không phải lúc render
    pendingSeekRef.current = { targetSec, until: Date.now() + 1500 };
    setActiveCueIdx(index);
    ytRef.current?.seekTo(targetSec, true);
    setPlaying(true);
  };

  const applyVoice = (next: DubVoiceId) => {
    if (next === voiceId) return;
    stopDub();
    lastSpokenIdxRef.current = -1;
    setVoiceId(next);
    setDubVoice(next);
    onVoiceChange?.(next);
  };

  const pickVoice = () => {
    if (Platform.OS === "ios") {
      const labels = DUB_VOICES.map((v) => t(v.shortKey));
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: t("dub.voicePick"),
          options: [...labels, t("cancel")],
          cancelButtonIndex: labels.length,
        },
        (idx) => {
          if (idx >= 0 && idx < DUB_VOICES.length) applyVoice(DUB_VOICES[idx].id);
        },
      );
      return;
    }
    setVoiceMenuOpen(true);
  };

  const cycleOrigVol = () => {
    const levels: readonly number[] = canGain ? ORIG_LEVELS : ORIG_TOGGLE;
    setOrigVol((v) => levels.find((l) => l > v) ?? 0);
  };

  const cycleDubVol = () => {
    setDubVol((v) => {
      const idx = DUB_VOL_LEVELS.indexOf(v as 100 | 60 | 0);
      return DUB_VOL_LEVELS[(idx + 1) % DUB_VOL_LEVELS.length];
    });
  };

  const cycleSpeed = () => {
    stopDub();
    lastSpokenIdxRef.current = -1;
    setSpeedIdx((i) => (i + 1) % SPEEDS.length);
  };

  const shareLink = () => {
    void Share.share({
      title,
      url: `https://hallovn.de/thuyet-minh?v=${videoId}`,
      message: `${title}\nhttps://hallovn.de/thuyet-minh?v=${videoId}`,
    }).catch(() => {});
  };

  const onYtError = (codeStr: string) => {
    const code = codeStr ? Number(codeStr) : NaN;
    warmGenRef.current += 1;
    stopDub();
    setPlaying(false);
    if (codeStr === "embed_not_allowed" || code === 101 || code === 150) {
      setYtErr(t("dub.ytBlocked", { code: Number.isFinite(code) ? code : 150 }));
    } else if (codeStr === "video_not_found" || code === 100) {
      setYtErr(t("dub.ytNotFound"));
    } else if (codeStr === "invalid_parameter" || code === 2) {
      setYtErr(t("dub.ytInvalid"));
    } else if (codeStr === "HTML5_error" || code === 5) {
      setYtErr(t("dub.ytHtml5"));
    } else {
      setYtErr(t("dub.ytGeneric", { code: Number.isFinite(code) ? code : codeStr || "?" }));
    }
  };

  const videoWidth = split ? Math.min(Math.floor(width * 0.48), 540) : Math.min(width, CONTENT_MAX);
  const voiceObj = DUB_VOICES.find((v) => v.id === voiceId) ?? DUB_VOICES[0];
  const voiceLabel = t(voiceObj.shortKey);
  const origLabel =
    origVol <= 0 ? t("dub.origOff") : !canGain || origVol >= 100 ? t("dub.origOn") : t("dub.origPct", { n: origVol });
  const dubLabel = dubVol <= 0 ? t("dub.dubMuted") : dubVol < 100 ? t("dub.dubVol", { n: dubVol }) : t("dub.dubOn");

  const showBgFailedInProgress = !!(bgProgress && bgProgress.done < bgProgress.total && bgStatus === "failed");

  const videoPane = (
    <ScrollView
      bounces={false}
      scrollEnabled={split}
      style={{ width: split ? videoWidth : "100%", flexGrow: 0, backgroundColor: C.background }}
      contentContainerStyle={{ alignItems: "center", paddingBottom: split ? insets.bottom + 12 : 0 }}
    >
      <View style={{ width: videoWidth, height: Math.round((videoWidth * 9) / 16), backgroundColor: "#000" }}>
        <YoutubePlayer
          key={playerKey}
          ref={ytRef}
          height={Math.round((videoWidth * 9) / 16)}
          width={videoWidth}
          videoId={videoId}
          play={playing}
          mute={origVol <= 0}
          volume={origVol > 0 ? origVol : 100}
          initialPlayerParams={{
            rel: false,
            controls: true,
            modestbranding: true,
            iv_load_policy: 3,
            showClosedCaptions: false,
            preventFullScreen: true,
            start: playerStart,
          }}
          webViewProps={{
            injectedJavaScript: shim,
            injectedJavaScriptForMainFrameOnly: false,
            allowsInlineMediaPlayback: true,
            mediaPlaybackRequiresUserAction: false,
          }}
          onReady={() => {
            ytReadyRef.current = true;
            setYtReady(true);
          }}
          onError={onYtError}
          onPlaybackQualityChange={onGainMessage}
          onChangeState={(s: string) => {
            ytStateRef.current = s;
            if (s === PLAYER_STATES.PLAYING) {
              setPlaying(true);
              void resumeDub();
            } else if (s === PLAYER_STATES.PAUSED || s === PLAYER_STATES.BUFFERING) {
              if (s === PLAYER_STATES.PAUSED) setPlaying(false);
              pauseDub();
            } else if (s === PLAYER_STATES.ENDED) {
              setPlaying(false);
              stopDub();
              lastSpokenIdxRef.current = -1;
              setActiveCueIdx(-1);
            }
          }}
        />
      </View>

      {!!ytErr && (
        <View style={{ width: "100%", maxWidth: CONTENT_MAX, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.redSoft, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <ErrorText>{ytErr}</ErrorText>
        </View>
      )}

      {!!engineErr && (
        <View style={{ width: "100%", maxWidth: CONTENT_MAX, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.redSoft, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <ErrorText>{engineErr}</ErrorText>
          </View>
          <Pressable
            onPress={() => {
              setEngineErr("");
              if (activeCueIdx >= 0) {
                lastSpokenIdxRef.current = activeCueIdx;
                setPlaying(true);
                stateRef.current.playing = true;
                void speakCue(activeCueIdx);
              }
            }}
            style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: C.red }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{t("retry")}</Text>
          </Pressable>
        </View>
      )}

      {!!bgError && !showBgFailedInProgress && (
        <View style={{ width: "100%", maxWidth: CONTENT_MAX, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.redSoft, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <ErrorText>{bgError}</ErrorText>
          </View>
          {onRetryBg && (
            <Pressable
              onPress={() => {
                haptic.tap();
                onRetryBg();
              }}
              style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: C.red }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{t("retry")}</Text>
            </Pressable>
          )}
        </View>
      )}

      {untranslatedCount > 0 && onRepair && !repairing && (!bgProgress || bgProgress.done >= bgProgress.total) && (
        <Pressable
          onPress={() => {
            haptic.tap();
            stopDub();
            setPlaying(false);
            onRepair();
          }}
          style={{
            width: "100%",
            maxWidth: CONTENT_MAX,
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: C.goldSoft,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <Text style={{ color: C.amber, fontSize: 12, fontWeight: "700", flex: 1 }}>
            {t("dub.repairBanner", { n: untranslatedCount })}
          </Text>
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: C.gold }}>
            <Text style={{ color: C.onAmber, fontSize: 12, fontWeight: "800" }}>{t("dub.repairBtn")}</Text>
          </View>
        </Pressable>
      )}

      {repairing && !bgProgress && !bgError && (
        <View
          style={{
            width: "100%",
            maxWidth: CONTENT_MAX,
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: sec.secSoft,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ActivityIndicator size="small" color={sec.secText} />
          <Text style={{ color: C.text, fontSize: 12, fontWeight: "600", flex: 1 }}>{t("dub.repairing")}</Text>
        </View>
      )}

      {bgProgress && bgProgress.done < bgProgress.total && (
        <View
          style={{
            width: "100%",
            maxWidth: CONTENT_MAX,
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: sec.secSoft,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
            gap: 5,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
              {bgStatus === "failed" ? (
                <SymbolView name="wifi.exclamationmark" size={14} tintColor={C.muted} weight="semibold" />
              ) : (
                <ActivityIndicator size="small" color={sec.secText} />
              )}
              <Text style={{ color: C.text, fontSize: 12, fontWeight: "600", flex: 1 }} numberOfLines={1}>
                {bgStatus === "failed"
                  ? bgError || t("dub.bgFailed")
                  : bgStatus === "reconnecting"
                    ? t("dub.reconnecting")
                    : t("dub.bgTranslating", { d: bgProgress.done, n: bgProgress.total })}
              </Text>
            </View>
            {bgStatus === "failed" && onRetryBg ? (
              <Pressable
                onPress={() => {
                  haptic.tap();
                  onRetryBg();
                }}
                accessibilityRole="button"
                hitSlop={8}
                style={({ pressed }) => ({
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: sec.sec,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ color: sec.onSec, fontSize: 12, fontWeight: "800" }}>{t("retry")}</Text>
              </Pressable>
            ) : (
              <Text style={{ color: sec.secText, fontSize: 12, fontWeight: "800", fontVariant: ["tabular-nums"] }}>
                {bgProgress.pct}%
              </Text>
            )}
          </View>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: alpha(sec.sec, 0.2), overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${bgProgress.pct}%`, backgroundColor: sec.sec }} />
          </View>
        </View>
      )}

      {/* Khung phụ đề tiếng Việt hiện tại */}
      <View
        style={{
          width: "100%",
          maxWidth: CONTENT_MAX,
          minHeight: 68,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: C.card,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          justifyContent: "center",
          alignItems: "center",
          gap: 4,
        }}
      >
        {activeCue ? (
          <>
            {activeCue.untranslated ? (
              <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21, fontStyle: "italic", textAlign: "center" }}>
                {activeCue.orig} ({t("dub.untranslated")})
              </Text>
            ) : (
              <Text style={{ color: C.text, fontSize: 16, lineHeight: 22, fontWeight: "700", textAlign: "center" }}>
                {activeCue.pending ? t("dub.translatingCue") : activeCue.text}
              </Text>
            )}
            {showOrig && !!activeCue.orig && !activeCue.untranslated && (
              <Text style={{ color: C.muted, fontSize: 13, lineHeight: 18, textAlign: "center" }}>
                {activeCue.orig}
              </Text>
            )}
          </>
        ) : (
          <Text style={{ color: C.muted, fontSize: 13, lineHeight: 18, textAlign: "center" }}>
            {t("dub.tapPlay")}
          </Text>
        )}
      </View>

      {/* Thanh điều khiển ngang */}
      <View style={{ width: "100%", maxWidth: CONTENT_MAX, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10, gap: 8, alignItems: "center" }}
        >
          <Pressable
            onPress={() => void togglePlay()}
            disabled={!ytReady || !!ytErr || warmingFirst}
            accessibilityRole="button"
            style={({ pressed }) => ({
              height: 36,
              paddingHorizontal: 14,
              borderRadius: 18,
              backgroundColor: !ytReady || ytErr ? C.card2 : sec.sec,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              opacity: !ytReady && !ytErr ? 0.65 : pressed ? 0.85 : 1,
            })}
          >
            {warmingFirst || (!ytReady && !ytErr) ? (
              <ActivityIndicator size="small" color={ytReady ? "#fff" : C.muted} />
            ) : (
              <SymbolView name={playing ? "pause.fill" : "play.fill"} size={14} tintColor={ytErr ? C.muted : "#fff"} weight="bold" />
            )}
            <Text style={{ color: !ytReady || ytErr ? C.muted : "#fff", fontSize: 14, fontWeight: "800" }}>
              {playing ? t("dub.pause") : t("dub.play")}
            </Text>
          </Pressable>

          <Pressable
            onPress={restart}
            disabled={!ytReady || !!ytErr}
            accessibilityRole="button"
            accessibilityLabel={t("player.restart")}
            style={({ pressed }) => ({
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: C.card2,
              borderWidth: 1,
              borderColor: C.border,
              alignItems: "center",
              justifyContent: "center",
              opacity: !ytReady || ytErr ? 0.45 : pressed ? 0.72 : 1,
            })}
          >
            <SymbolView name="gobackward" size={15} tintColor={C.text} weight="semibold" />
          </Pressable>

          <Pill icon="waveform" label={voiceLabel} on onPress={pickVoice} />
          <Pill icon="gauge.with.dots.needle.67percent" label={`${speed.toFixed(2).replace(/\.00$/, "")}×`} onPress={cycleSpeed} />
          <Pill
            icon={origVol <= 0 ? "speaker.slash" : origVol < 50 && canGain ? "speaker.wave.1" : "speaker.wave.2"}
            label={origLabel}
            on={origVol > 0}
            onPress={cycleOrigVol}
          />
          <Pill
            icon={dubVol <= 0 ? "speaker.slash.fill" : dubVol < 100 ? "speaker.wave.2.fill" : "speaker.wave.3.fill"}
            label={dubLabel}
            on={dubVol > 0}
            onPress={cycleDubVol}
          />
          {hasOrig && (
            <Pill icon="captions.bubble" label={t("dub.bilingual")} on={showOrig} onPress={() => setShowOrig((v) => !v)} />
          )}
          {onRetranslate && (
            <Pill
              icon="arrow.clockwise"
              label={t("dub.retranslate")}
              disabled={repairing || !!(bgProgress && bgProgress.done < bgProgress.total)}
              onPress={() => {
                stopDub();
                setPlaying(false);
                onRetranslate();
              }}
            />
          )}
        </ScrollView>
      </View>
    </ScrollView>
  );

  const scriptList = (
    <FlatList
      ref={listRef}
      data={cues}
      keyExtractor={(item, idx) => `${item.start_ms}-${idx}`}
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: tablet ? 20 : 14,
        paddingTop: 12,
        paddingBottom: insets.bottom + 24,
        gap: 6,
      }}
      onScrollToIndexFailed={({ index, averageItemLength }) => {
        try {
          listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: false });
        } catch {}
        clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = setTimeout(() => {
          try {
            listRef.current?.scrollToIndex({ index, viewPosition: 0.25, animated: true });
          } catch {}
        }, 100);
      }}
      ListHeaderComponent={
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <Label>{t("dub.transcript")}</Label>
          <Text style={{ color: C.muted, fontSize: 12, fontWeight: "600" }}>
            {t("sentences", { n: cues.length })}
            {sourceLang && sourceLang !== "auto" && !sourceLang.startsWith("vi") ? ` · ${sourceLang.toUpperCase()}` : ""}
          </Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const active = index === activeCueIdx;
        return (
          <Pressable
            onPress={() => seekToCue(index)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: R.md,
              backgroundColor: active ? sec.secSoft : pressed ? C.card2 : C.card,
              borderWidth: 1,
              borderColor: active ? sec.sec : C.line,
            })}
          >
            <Text
              style={{
                color: active ? sec.secText : C.muted,
                fontSize: 12,
                fontWeight: "700",
                fontVariant: ["tabular-nums"],
                marginTop: 2,
                minWidth: 38,
              }}
            >
              {formatTime(item.start_ms / 1000)}
            </Text>
            <View style={{ flex: 1, gap: 3 }}>
              <Text
                style={{
                  color: item.pending || item.untranslated ? C.muted : C.text,
                  fontSize: 15,
                  lineHeight: 21,
                  fontWeight: active ? "700" : "500",
                  fontStyle: item.pending || item.untranslated ? "italic" : "normal",
                }}
              >
                {item.pending
                  ? t("dub.translatingCue")
                  : item.untranslated
                    ? `${item.orig ?? ""} (${t("dub.untranslated")})`
                    : item.text}
              </Text>
              {showOrig && !!item.orig && !item.untranslated && (
                <Text style={{ color: C.muted, fontSize: 13, lineHeight: 18 }}>{item.orig}</Text>
              )}
            </View>
          </Pressable>
        );
      }}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.background, paddingTop: headerHeight }}>
      <Stack.Screen
        options={{
          title,
          headerRight: () => (
            <Pressable onPress={shareLink} hitSlop={8} style={{ padding: 6 }}>
              <SymbolView name="square.and.arrow.up" size={20} tintColor={C.link} weight="semibold" />
            </Pressable>
          ),
        }}
      />
      <View style={{ flex: 1, flexDirection: split ? "row" : "column" }}>
        <View style={split ? { borderRightWidth: 1, borderRightColor: C.border } : undefined}>{videoPane}</View>
        {scriptList}
      </View>
      <ActionSheetModal
        visible={voiceMenuOpen}
        title={t("dub.voicePick")}
        onClose={() => setVoiceMenuOpen(false)}
        options={DUB_VOICES.map((v) => ({
          label: t(v.shortKey),
          checked: v.id === voiceId,
          onPress: () => applyVoice(v.id),
        }))}
      />
    </View>
  );
}
