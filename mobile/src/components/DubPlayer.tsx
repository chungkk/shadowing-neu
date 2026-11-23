import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { Stack } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import YoutubePlayer, { PLAYER_STATES, type YoutubeIframeRef } from "react-native-youtube-iframe";
import { formatTime } from "@shared/subtitles";
import { Text } from "./Text";
import { Label } from "./ui";
import { DUB_VOICES, fetchDubCueFile, type DubBgProgress, type DubCue, type DubVoiceId } from "@/lib/dub";
import { haptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { CONTENT_MAX, useLayout } from "@/lib/layout";
import { C, R, SEC, alpha } from "@/lib/theme";

type OrigAudioMode = "off" | "low" | "on";

const SPEEDS = [1, 1.15, 1.25, 1.35] as const;

/**
 * Hỗ trợ lệnh play/pause/volume/mute ổn định trên WKWebView iOS và tự tắt phụ đề YouTube để không đè phụ đề tiếng Việt.
 * Giữ trạng thái __dubMuted để khi người dùng bấm trực tiếp vào iframe trên iOS không bị tự bỏ mute.
 */
const YT_DUB_SHIM = `
window.__dubMuted = true;
window.addEventListener("message", function (e) {
  try {
    var m = JSON.parse(e.data);
    if (!window.player || !m || !m.eventName) return;
    switch (m.eventName) {
      case "playVideo": player.playVideo(); break;
      case "pauseVideo": player.pauseVideo(); break;
      case "muteVideo": window.__dubMuted = true; player.mute(); break;
      case "unMuteVideo": window.__dubMuted = false; player.unMute(); break;
      case "setVolume": if (m.meta && typeof m.meta.volume === "number") player.setVolume(m.meta.volume); break;
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
true;
`;

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
}: {
  videoId: string;
  title: string;
  sourceLang?: string;
  cues: DubCue[];
  initialVoice?: DubVoiceId;
  bgProgress?: DubBgProgress | null;
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
  const speakGenRef = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [voiceId, setVoiceId] = useState<DubVoiceId>(initialVoice);
  const [speedIdx, setSpeedIdx] = useState(1); // mặc định 1.15x
  const [origMode, setOrigMode] = useState<OrigAudioMode>("off"); // iOS WKWebView: tắt gốc mặc định để nghe tiếng Việt trong rõ
  const [dubMuted, setDubMuted] = useState(false);
  const [showOrig, setShowOrig] = useState(false);
  const [activeCueIdx, setActiveCueIdx] = useState(-1);

  const speed = SPEEDS[speedIdx];
  const hasOrig = useMemo(() => cues.some((c) => Boolean(c.orig)), [cues]);
  const activeCue = activeCueIdx >= 0 ? cues[activeCueIdx] : null;

  const stateRef = useRef({ voiceId, speed, dubMuted, origMode, cues, playing });
  useEffect(() => {
    stateRef.current = { voiceId, speed, dubMuted, origMode, cues, playing };
  });

  // Cập nhật AVAudioSession theo chế độ tiếng gốc:
  // - "low" (Gốc: Nhỏ): dùng duckOthers của iOS để hệ thống tự hạ nhỏ tiếng YouTube xuống ~20% mỗi khi giọng Việt đọc!
  // - "off" / "on": mixWithOthers
  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      interruptionMode: origMode === "low" ? "duckOthers" : "mixWithOthers",
    }).catch(() => {});
  }, [origMode]);

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
      const c = cues[k];
      if (c && !c.pending && c.text.trim()) {
        void fetchDubCueFile(c.text, voiceId, speed);
      }
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
      const next = list[k];
      if (next && !next.pending && next.text.trim()) {
        void fetchDubCueFile(next.text, vId, spd);
      }
    }

    const file = await fetchDubCueFile(cue.text, vId, spd);
    if (!file) return;
    if (myGen !== speakGenRef.current || !stateRef.current.playing) return;
    if (lastSpokenIdxRef.current !== cueIndex || stateRef.current.voiceId !== vId) return;

    const p = audioRef.current;
    if (!p) return;

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
        interruptionMode: stateRef.current.origMode === "low" ? "duckOthers" : "mixWithOthers",
      }).catch(() => {});
      p.replace({ uri: file.uri });
      p.muted = muted;
      p.volume = muted ? 0 : 1;
      p.setPlaybackRate(1, "high");
      p.play();
    } catch {}
  }, []);

  // Vòng đồng bộ 140ms theo thời gian thực của YouTube player
  useEffect(() => {
    if (!playing) return;
    let busy = false;
    const timer = setInterval(async () => {
      if (busy || !ytRef.current) return;
      busy = true;
      try {
        const tSec = await ytRef.current.getCurrentTime();
        if (!Number.isFinite(tSec)) return;
        const tMs = tSec * 1000;
        const jumped = Math.abs(tSec - lastYtTimeRef.current) > 1.3;
        lastYtTimeRef.current = tSec;

        if (jumped) {
          stopDub();
          lastSpokenIdxRef.current = -1;
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

        setActiveCueIdx((prev) => (prev === curIdx ? prev : curIdx));

        if (curIdx !== -1) {
          const curCue = list[curIdx];
          if (!curCue.pending && curCue.text.trim() && curIdx !== lastSpokenIdxRef.current) {
            const lateMs = tMs - curCue.start_ms;
            const remainingMs = curCue.end_ms - tMs;
            if (!jumped || lateMs < 2500 || remainingMs > 1200) {
              lastSpokenIdxRef.current = curIdx;
              void speakCue(curIdx);
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
    setActiveCueIdx(index);
    ytRef.current?.seekTo(targetSec, true);
    setPlaying(true);
  };

  const cycleVoice = () => {
    stopDub();
    lastSpokenIdxRef.current = -1;
    setVoiceId((v) => (v === DUB_VOICES[0].id ? DUB_VOICES[1].id : DUB_VOICES[0].id));
  };

  const cycleOrigMode = () => {
    setOrigMode((m) => (m === "off" ? "low" : m === "low" ? "on" : "off"));
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
  const origLabel = origMode === "off" ? t("dub.origOff") : origMode === "low" ? t("dub.origLow") : t("dub.origOn");

  const videoPane = (
    <View style={{ width: split ? videoWidth : "100%", alignItems: "center", backgroundColor: C.background }}>
      <View style={{ width: videoWidth, height: Math.round((videoWidth * 9) / 16), backgroundColor: "#000" }}>
        <YoutubePlayer
          ref={ytRef}
          height={Math.round((videoWidth * 9) / 16)}
          width={videoWidth}
          videoId={videoId}
          play={playing}
          mute={origMode === "off"}
          volume={origMode === "low" ? 20 : 100}
          initialPlayerParams={{
            rel: false,
            controls: true,
            modestbranding: true,
            iv_load_policy: 3,
            showClosedCaptions: false,
            preventFullScreen: true,
          }}
          webViewProps={{
            injectedJavaScript: YT_DUB_SHIM,
            allowsInlineMediaPlayback: true,
            mediaPlaybackRequiresUserAction: false,
          }}
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
              <ActivityIndicator size="small" color={sec.secText} />
              <Text style={{ color: C.text, fontSize: 12, fontWeight: "600", flex: 1 }} numberOfLines={1}>
                {t("dub.bgTranslating", { d: bgProgress.done, n: bgProgress.total })}
              </Text>
            </View>
            <Text style={{ color: sec.secText, fontSize: 12, fontWeight: "800", fontVariant: ["tabular-nums"] }}>
              {bgProgress.pct}%
            </Text>
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
            <Text style={{ color: C.text, fontSize: 16, lineHeight: 22, fontWeight: "700", textAlign: "center" }}>
              {activeCue.pending ? t("dub.translatingCue") : activeCue.text}
            </Text>
            {showOrig && !!activeCue.orig && (
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
            icon={origMode === "off" ? "speaker.slash" : "speaker.wave.2"}
            label={origLabel}
            on={origMode !== "off"}
            onPress={cycleOrigMode}
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
                  color: item.pending ? C.muted : C.text,
                  fontSize: 15,
                  lineHeight: 21,
                  fontWeight: active ? "700" : "500",
                  fontStyle: item.pending ? "italic" : "normal",
                }}
              >
                {item.pending ? t("dub.translatingCue") : item.text}
              </Text>
              {showOrig && !!item.orig && (
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
