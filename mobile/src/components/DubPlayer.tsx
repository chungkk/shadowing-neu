import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { Stack } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import YoutubePlayer, { PLAYER_STATES, type YoutubeIframeRef } from "react-native-youtube-iframe";
import { formatTime } from "@shared/subtitles";
import { Text } from "./Text";
import { Label } from "./ui";
import { DUB_VOICES, fetchFittedDubCue, type DubBgProgress, type DubCue, type DubVoiceId } from "@/lib/dub";
import { haptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { CONTENT_MAX, useLayout } from "@/lib/layout";
import { C, R, SEC, alpha } from "@/lib/theme";

const SPEEDS = [1, 1.15, 1.25, 1.35] as const;

/** Các mức âm lượng tiếng gốc khi chỉnh được thật (Android, hoặc iOS khi Web Audio chạy). */
const ORIG_LEVELS = [0, 15, 30, 60, 100] as const;
/** iOS khi không có Web Audio: WebKit khoá âm lượng video, chỉ tắt/bật được. */
const ORIG_TOGGLE = [0, 100] as const;

/**
 * Trạng thái chỉnh âm lượng tiếng gốc:
 * - native: Android, setVolume của YouTube chạy bình thường.
 * - pending: iOS, đang chờ khung YouTube nối Web Audio (chỉ nối được khi video bắt đầu phát).
 * - ok: iOS, đã nối GainNode → chỉnh âm lượng thật.
 * - unsupported: iOS, không nối được hoặc bị câm → quay về tắt/bật.
 */
type GainStatus = "native" | "pending" | "ok" | "unsupported";

/** Tiền tố tin nhắn trạng thái gain, đi nhờ kênh playerQualityChange vì thư viện bỏ qua eventType lạ. */
const GAIN_MSG = "__dubgain:";

/**
 * Đoạn JS chèn vào WebView. Với injectedJavaScriptForMainFrameOnly=false nó chạy ở mọi khung:
 *
 * Khung chính (trang của react-native-youtube-iframe):
 * - Hỗ trợ lệnh play/pause/volume/mute ổn định trên WKWebView iOS, tự tắt phụ đề YouTube.
 * - Giữ __dubMuted để khi người dùng bấm thẳng vào iframe trên iOS không bị tự bỏ mute.
 * - Chuyển mức âm lượng xuống khung YouTube và chuyển trạng thái gain từ khung YouTube về app
 *   (ReactNativeWebView chỉ có ở khung chính).
 *
 * Khung youtube.com/embed (chỉ khi allowGain):
 * - iOS khoá HTMLMediaElement.volume, nên nối <video> qua Web Audio GainNode để chỉnh âm lượng thật.
 * - Chỉ nối khi nguồn là blob: (MSE); luồng HLS gốc bị lỗi WebKit làm câm khi nối Web Audio.
 * - Kiểm tra bằng AnalyserNode: phát có tiếng nhưng đo toàn im lặng ~6 giây → báo "silent" để app tải lại không nối.
 */
function buildShim(allowGain: boolean): string {
  return `
(function () {
  if (window.top !== window) return;
  window.__dubMuted = true;
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
  if (!/(^|\.)youtube(-nocookie)?\.com$/.test(location.hostname)) return;
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
    setTimeout(findVideo, 1500);
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
  onPress,
}: {
  icon: SFSymbol;
  label: string;
  on?: boolean;
  onPress: () => void;
}) {
  const sec = SEC.dub;
  return (
    <Pressable
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
        opacity: pressed ? 0.72 : 1,
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
  bgProgress = null,
  bgStatus = null,
  onRetryBg,
}: {
  videoId: string;
  title: string;
  sourceLang?: string;
  cues: DubCue[];
  initialVoice?: DubVoiceId;
  bgProgress?: DubBgProgress | null;
  /** Kết nối dịch ngầm: đang tự nối lại / đã hết lượt nối lại */
  bgStatus?: "reconnecting" | "failed" | null;
  onRetryBg?: () => void;
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
  const lastYtTimeRef = useRef(0);
  const lastPollWallRef = useRef(0);
  const speakGenRef = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [voiceId, setVoiceId] = useState<DubVoiceId>(initialVoice);
  const [speedIdx, setSpeedIdx] = useState(1); // mặc định 1.15x
  // Âm lượng tiếng gốc 0–100; mặc định tắt để nghe tiếng Việt rõ
  const [origVol, setOrigVol] = useState(0);
  const [gainStatus, setGainStatus] = useState<GainStatus>(Platform.OS === "ios" ? "pending" : "native");
  // Tắt hẳn việc nối Web Audio (sau khi phát hiện bị câm) → tải lại player không nối, quay về tắt/bật
  const [gainAllowed, setGainAllowed] = useState(Platform.OS === "ios");
  const [playerKey, setPlayerKey] = useState(0);
  const [playerStart, setPlayerStart] = useState(0);
  const shim = useMemo(() => buildShim(gainAllowed), [gainAllowed]);
  const canGain = gainStatus === "native" || gainStatus === "ok";
  const [dubMuted, setDubMuted] = useState(false);
  const [showOrig, setShowOrig] = useState(false);
  const [activeCueIdx, setActiveCueIdx] = useState(-1);

  const speed = SPEEDS[speedIdx];
  const hasOrig = useMemo(() => cues.some((c) => Boolean(c.orig)), [cues]);
  const activeCue = activeCueIdx >= 0 ? cues[activeCueIdx] : null;

  const stateRef = useRef({ voiceId, speed, dubMuted, cues, playing });
  useEffect(() => {
    stateRef.current = { voiceId, speed, dubMuted, cues, playing };
  });

  // AVAudioSession: trộn tiếng video (WebView) với giọng thuyết minh.
  // Không dùng duckOthers: nó chỉ hạ tiếng app khác, không hạ được video trong chính app.
  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      interruptionMode: "mixWithOthers",
    }).catch(() => {});
  }, []);

  // Trạng thái Web Audio từ khung YouTube (đi nhờ sự kiện playerQualityChange)
  const onGainMessage = useCallback((msg: string) => {
    if (!msg.startsWith(GAIN_MSG)) return;
    const status = msg.slice(GAIN_MSG.length);
    if (status === "ok" || status === "verified") {
      setGainStatus("ok");
    } else if (status === "unsupported") {
      setGainStatus((s) => (s === "ok" ? s : "unsupported"));
    } else if (status === "silent") {
      // Nối Web Audio nhưng ra im lặng (lỗi WebKit) → tải lại player không nối, giữ vị trí đang xem
      setGainStatus("unsupported");
      setGainAllowed(false);
      setOrigVol((v) => (v > 0 ? 100 : 0));
      setPlayerStart(Math.floor(lastYtTimeRef.current));
      setPlayerKey((k) => k + 1);
    }
  }, []);

  const stopDub = useCallback(() => {
    speakGenRef.current += 1;
    try {
      audioRef.current?.pause();
    } catch {}
  }, []);

  // Khởi tạo AudioPlayer native cho giọng thuyết minh
  useEffect(() => {
    const p = createAudioPlayer(null, { keepAudioSessionActive: true });
    audioRef.current = p;

    return () => {
      stopDub();
      try {
        p.remove();
      } catch {}
      audioRef.current = null;
    };
  }, [stopDub]);

  // Cập nhật mute của giọng tiếng Việt ngay lập tức
  useEffect(() => {
    const p = audioRef.current;
    if (p) {
      p.muted = dubMuted;
      p.volume = dubMuted ? 0 : 1;
    }
  }, [dubMuted]);

  // Prefetch trước 3 câu đầu ngay khi mở màn hình
  useEffect(() => {
    for (let k = 0; k < Math.min(3, cues.length); k++) {
      void fetchFittedDubCue(cues, k, voiceId, speed);
    }
  }, [cues, voiceId, speed]);

  // Cuộn danh sách lời thoại theo câu đang phát
  useEffect(() => {
    if (activeCueIdx >= 0 && listRef.current) {
      try {
        listRef.current.scrollToIndex({ index: activeCueIdx, viewPosition: 0.25, animated: true });
      } catch {}
    }
  }, [activeCueIdx]);

  const speakCue = useCallback(async (cueIndex: number) => {
    const { voiceId: vId, speed: spd, cues: list, dubMuted: muted } = stateRef.current;
    const cue = list[cueIndex];
    if (!cue || cue.pending || !cue.text.trim()) return;

    const myGen = ++speakGenRef.current;

    // Tải trước 4 câu tiếp theo vào cache máy
    for (let k = cueIndex + 1; k <= Math.min(list.length - 1, cueIndex + 4); k++) {
      void fetchFittedDubCue(list, k, vId, spd);
    }

    const file = await fetchFittedDubCue(list, cueIndex, vId, spd);
    if (!file) return;
    if (myGen !== speakGenRef.current || !stateRef.current.playing) return;
    if (lastSpokenIdxRef.current !== cueIndex || stateRef.current.voiceId !== vId) return;

    const p = audioRef.current;
    if (!p) return;

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
        interruptionMode: "mixWithOthers",
      }).catch(() => {});
      if (myGen !== speakGenRef.current || !stateRef.current.playing) return;
      if (lastSpokenIdxRef.current !== cueIndex || stateRef.current.voiceId !== vId) return;
      p.replace({ uri: file.uri });
      p.muted = muted;
      p.volume = muted ? 0 : 1;
      p.setPlaybackRate(1, "high");
      p.play();
    } catch {}
  }, []);

  // Vòng đồng bộ 140ms theo thời gian thực của YouTube player
  useEffect(() => {
    if (!playing) {
      lastPollWallRef.current = 0;
      return;
    }
    lastPollWallRef.current = 0;
    let busy = false;
    const timer = setInterval(async () => {
      if (busy || !ytRef.current) return;
      busy = true;
      try {
        const tSec = await ytRef.current.getCurrentTime();
        if (!Number.isFinite(tSec)) return;
        const nowWall = Date.now();
        const dtWall = lastPollWallRef.current > 0 ? Math.max(0, (nowWall - lastPollWallRef.current) / 1000) : 0;
        lastPollWallRef.current = nowWall;

        const tMs = tSec * 1000;
        const dtVideo = tSec - lastYtTimeRef.current;
        lastYtTimeRef.current = tSec;

        // Chỉ coi là tua thật khi lùi > 0.5s hoặc nhảy tới vượt xa thời gian thực đã trôi qua
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

        // Chống giật lùi câu khi getCurrentTime() dao động nhẹ vài chục ms quanh mốc chuyển câu
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
              // Tua rơi đúng phần đuôi câu → đánh dấu bỏ qua để tick sau không đọc muộn
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

  const togglePlay = () => {
    haptic.tap();
    if (playing) {
      setPlaying(false);
      stopDub();
    } else {
      setPlaying(true);
    }
  };

  const restart = () => {
    haptic.tap();
    stopDub();
    lastSpokenIdxRef.current = -1;
    lastYtTimeRef.current = 0;
    lastPollWallRef.current = 0;
    setActiveCueIdx(-1);
    ytRef.current?.seekTo(0, true);
    setPlaying(true);
  };

  const seekToCue = (index: number) => {
    const cue = cues[index];
    if (!cue) return;
    haptic.tap();
    stopDub();
    lastSpokenIdxRef.current = -1;
    const targetSec = cue.start_ms / 1000;
    lastYtTimeRef.current = targetSec;
    lastPollWallRef.current = 0;
    setActiveCueIdx(index);
    ytRef.current?.seekTo(targetSec, true);
    setPlaying(true);
  };

  const cycleVoice = () => {
    stopDub();
    lastSpokenIdxRef.current = -1;
    setVoiceId((v) => (v === DUB_VOICES[0].id ? DUB_VOICES[1].id : DUB_VOICES[0].id));
  };

  const cycleOrigVol = () => {
    const levels: readonly number[] = canGain ? ORIG_LEVELS : ORIG_TOGGLE;
    setOrigVol((v) => levels.find((l) => l > v) ?? 0);
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

  const videoWidth = split ? Math.min(Math.floor(width * 0.48), 540) : Math.min(width, CONTENT_MAX);
  const voiceLabel = voiceId === DUB_VOICES[0].id ? t("dub.voiceMale") : t("dub.voiceFemale");
  const origLabel =
    origVol <= 0 ? t("dub.origOff") : !canGain || origVol >= 100 ? t("dub.origOn") : t("dub.origPct", { n: origVol });

  const videoPane = (
    <View style={{ width: split ? videoWidth : "100%", alignItems: "center", backgroundColor: C.background }}>
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
            // iOS: chạy cả trong khung youtube.com để nối Web Audio chỉnh âm lượng gốc
            injectedJavaScriptForMainFrameOnly: false,
            allowsInlineMediaPlayback: true,
            mediaPlaybackRequiresUserAction: false,
          }}
          onPlaybackQualityChange={onGainMessage}
          onChangeState={(s: string) => {
            if (s === PLAYER_STATES.PLAYING) {
              setPlaying(true);
            } else if (s === PLAYER_STATES.PAUSED || s === PLAYER_STATES.ENDED) {
              setPlaying(false);
              stopDub();
            }
          }}
        />
      </View>

      {/* Thanh tiến trình dịch ngầm khi đang phát cuốn chiếu */}
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
                  ? t("dub.bgFailed")
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

      {/* Thanh điều khiển ngang gọn gàng */}
      <View style={{ width: "100%", maxWidth: CONTENT_MAX, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10, gap: 8, alignItems: "center" }}
        >
          <Pressable
            onPress={togglePlay}
            accessibilityRole="button"
            style={({ pressed }) => ({
              height: 36,
              paddingHorizontal: 14,
              borderRadius: 18,
              backgroundColor: sec.sec,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <SymbolView name={playing ? "pause.fill" : "play.fill"} size={14} tintColor="#fff" weight="bold" />
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "800" }}>
              {playing ? t("dub.pause") : t("dub.play")}
            </Text>
          </Pressable>

          <Pressable
            onPress={restart}
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
              opacity: pressed ? 0.72 : 1,
            })}
          >
            <SymbolView name="gobackward" size={15} tintColor={C.text} weight="semibold" />
          </Pressable>

          <Pill icon="waveform" label={voiceLabel} on onPress={cycleVoice} />
          <Pill icon="gauge.with.dots.needle.67percent" label={`${speed.toFixed(2).replace(/\.00$/, "")}×`} onPress={cycleSpeed} />
          <Pill
            icon={origVol <= 0 ? "speaker.slash" : origVol < 50 && canGain ? "speaker.wave.1" : "speaker.wave.2"}
            label={origLabel}
            on={origVol > 0}
            onPress={cycleOrigVol}
          />
          <Pill
            icon={dubMuted ? "speaker.slash.fill" : "speaker.wave.3.fill"}
            label={dubMuted ? t("dub.dubMuted") : t("dub.dubOn")}
            on={!dubMuted}
            onPress={() => setDubMuted((m) => !m)}
          />
          {hasOrig && (
            <Pill icon="captions.bubble" label={t("dub.bilingual")} on={showOrig} onPress={() => setShowOrig((v) => !v)} />
          )}
        </ScrollView>
      </View>
    </View>
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
        listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: false });
        setTimeout(() => listRef.current?.scrollToIndex({ index, viewPosition: 0.25, animated: true }), 100);
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
      {split ? (
        <View style={{ flex: 1, flexDirection: "row" }}>
          <View style={{ borderRightWidth: 1, borderRightColor: C.border }}>{videoPane}</View>
          {scriptList}
        </View>
      ) : (
        <>
          {videoPane}
          {scriptList}
        </>
      )}
    </View>
  );
}
