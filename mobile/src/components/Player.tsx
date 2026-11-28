import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { Stack, router, useFocusEffect } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import * as SecureStore from "expo-secure-store";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  FlatList,
  type GestureResponderEvent,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import YoutubePlayer, { PLAYER_STATES, type YoutubeIframeRef } from "react-native-youtube-iframe";
import { comboGain, hasWords, hasWrongSlot, normalizeDictLevel, POINTS_HINT, slotsFromInput, type DictationLevel } from "@shared/dictation";
import { tokenize, type Phrase } from "@shared/phrase-match";
import { isSentence } from "@shared/review";
import { formatTime, mergeIntoSentences, type Segment } from "@shared/subtitles";
import { api, type DictResult, type Points, type Progress, type VocabItem } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { askLogin, micDenied, showError } from "@/lib/dialogs";
import { pickDictation } from "@/lib/dictPick";
import { haptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { CONTENT_MAX, useLayout } from "@/lib/layout";
import { addPoints, setPointsTotal, usePoints } from "@/lib/points";
import { noteProgress, progressSaved } from "@/lib/progress";
import { prefetchGerman } from "@/lib/speak";
import { C, R, alpha, stageBg } from "@/lib/theme";
import { DictationPanel, type DictDraft } from "./DictationPanel";
import { Mascot } from "./Mascot";
import { Gem, PointsPill } from "./Points";
import { Text } from "./Text";
import { WordSheet } from "./WordSheet";
import { Button, Label, Segmented } from "./ui";

const RATES = [0.5, 0.75, 0.85, 1, 1.25] as const;
const REPEATS = [1, 2, 3, 5] as const;
const GAP_FACTORS = [0, 1, 1.2, 1.5, 2] as const;
const SETTINGS_KEY = "player-settings";
const AUTO_SAVE_KEY = "vocab-auto-save";

type PlayerSettings = {
  rate: number;
  hideText: boolean;
  autoStop: boolean;
  trOn: boolean;
  repeat: number;
  gapFactor: number;
  autoNext: boolean;
  hideMedia: boolean;
  dictLevel: DictationLevel;
};

const DEFAULT_SETTINGS: PlayerSettings = {
  rate: 1,
  hideText: false,
  autoStop: true,
  trOn: false,
  repeat: 1,
  gapFactor: 0,
  autoNext: false,
  hideMedia: false,
  dictLevel: "easy",
};

const YT_COMMAND_SHIM = `
window.addEventListener("message", function (e) {
  try {
    var m = JSON.parse(e.data);
    if (!window.player || !m || !m.eventName) return;
    switch (m.eventName) {
      case "playVideo": player.playVideo(); break;
      case "pauseVideo": player.pauseVideo(); break;
      case "setPlaybackRate": player.setPlaybackRate(m.meta.playbackRate); break;
    }
  } catch (_) {}
});
(function hideCaptions() {
  if (!window.player || typeof player.getPlayerState !== "function") return setTimeout(hideCaptions, 300);
  player.addEventListener("onStateChange", function (e) {
    if (e.data !== 1) return;
    try {
      player.unloadModule("captions");
      player.unloadModule("cc");
    } catch (_) {}
  });
})();
true;
`;

function IconButton({ icon, onPress, disabled, label }: { icon: SFSymbol; onPress: () => void; disabled?: boolean; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={6}
      style={({ pressed }) => ({ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.3 : pressed ? 0.5 : 1 })}
    >
      <SymbolView name={icon} size={20} tintColor={C.text} weight="semibold" />
    </Pressable>
  );
}

function Chip({ icon, iconOn, on, onPress, label, hint }: { icon: SFSymbol; iconOn?: SFSymbol; on: boolean; onPress: () => void; label: string; hint: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityLabel={hint}
      accessibilityState={{ checked: on }}
      style={({ pressed }) => ({
        height: 34,
        paddingHorizontal: 12,
        gap: 6,
        borderRadius: 17,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: on ? alpha(C.accent, 0.16) : C.card2,
        borderColor: on ? C.accent : C.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <SymbolView name={on && iconOn ? iconOn : icon} size={14} tintColor={on ? C.accentText : C.muted} weight="semibold" />
      <Text style={{ color: on ? C.accentText : C.text, fontSize: 13, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function ChipGroup<T extends string>({ icon, hint, options, value, onChange }: { icon: SFSymbol; hint: string; options: readonly (readonly [T, string])[]; value: T; onChange: (v: T) => void }) {
  return (
    <View
      accessibilityLabel={hint}
      style={{ height: 34, borderRadius: 17, borderWidth: 1, borderColor: C.border, backgroundColor: C.card2, flexDirection: "row", alignItems: "center", paddingLeft: 10, paddingRight: 2, gap: 2 }}
    >
      <SymbolView name={icon} size={14} tintColor={C.amber} weight="semibold" style={{ marginRight: 4 }} />
      {options.map(([v, label]) => (
        <Pressable
          key={v}
          onPress={() => onChange(v)}
          accessibilityRole="radio"
          accessibilityState={{ selected: v === value }}
          style={{ height: 28, paddingHorizontal: 11, borderRadius: 14, justifyContent: "center", backgroundColor: v === value ? C.accent : "transparent" }}
        >
          <Text style={{ color: v === value ? "#fff" : C.muted, fontSize: 13, fontWeight: "700" }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const mask = (s: string) => s.replace(/[\p{L}\p{N}]/gu, "*");
const cleanWord = (w: string) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

export default function Player({
  title,
  videoId,
  segments: rawSegments,
  sourceUrl,
  headerRight,
  topBanner,
  allowDictation = false,
  isWatch = false,
  earnPoints = true,
}: {
  title: string;
  videoId: string;
  segments: Segment[];
  sourceUrl: string;
  headerRight?: ReactNode;
  topBanner?: ReactNode;
  allowDictation?: boolean;
  isWatch?: boolean;
  earnPoints?: boolean;
}) {
  const { user } = useAuth();
  const { lang, t } = useI18n();
  const { width, tablet, split, fs } = useLayout();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const segments = useMemo(() => mergeIntoSentences(rawSegments), [rawSegments]);
  const texts = useMemo(() => segments.map((s) => s.text), [segments]);
  const dictTotal = useMemo(() => texts.filter(hasWords).length, [texts]);

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState<number>(DEFAULT_SETTINGS.rate);
  const [hideText, setHideText] = useState<boolean>(DEFAULT_SETTINGS.hideText);
  const [autoStop, setAutoStop] = useState<boolean>(DEFAULT_SETTINGS.autoStop);
  const [trOn, setTrOn] = useState<boolean>(DEFAULT_SETTINGS.trOn);
  const [repeat, setRepeat] = useState<number>(DEFAULT_SETTINGS.repeat);
  const [gapFactor, setGapFactor] = useState<number>(DEFAULT_SETTINGS.gapFactor);
  const [autoNext, setAutoNext] = useState<boolean>(DEFAULT_SETTINGS.autoNext);
  const [hideMedia, setHideMedia] = useState<boolean>(DEFAULT_SETTINGS.hideMedia);
  const [dictLevel, setDictLevel] = useState<DictationLevel>(DEFAULT_SETTINGS.dictLevel);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [autoSave, setAutoSave] = useState(true);
  useEffect(() => {
    SecureStore.getItemAsync(AUTO_SAVE_KEY)
      .then((v) => {
        if (v === "0") setAutoSave(false);
      })
      .catch(() => {});
  }, []);
  const updateAutoSave = (v: boolean) => {
    setAutoSave(v);
    SecureStore.setItemAsync(AUTO_SAVE_KEY, v ? "1" : "0").catch(() => {});
  };

  useEffect(() => {
    SecureStore.getItemAsync(SETTINGS_KEY)
      .then((raw) => {
        if (!raw) return;
        const s = JSON.parse(raw) as Partial<PlayerSettings>;
        if (typeof s.rate === "number" && (RATES as readonly number[]).includes(s.rate)) setRate(s.rate);
        if (typeof s.hideText === "boolean") setHideText(s.hideText);
        if (typeof s.autoStop === "boolean") setAutoStop(s.autoStop);
        if (typeof s.trOn === "boolean") setTrOn(s.trOn);
        if (typeof s.repeat === "number" && (REPEATS as readonly number[]).includes(s.repeat)) setRepeat(s.repeat);
        if (typeof s.gapFactor === "number" && (GAP_FACTORS as readonly number[]).includes(s.gapFactor)) setGapFactor(s.gapFactor);
        if (typeof s.autoNext === "boolean") setAutoNext(s.autoNext);
        if (typeof s.hideMedia === "boolean") setHideMedia(s.hideMedia);
        if (s.dictLevel) setDictLevel(normalizeDictLevel(s.dictLevel));
      })
      .catch(() => {})
      .finally(() => setSettingsLoaded(true));
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    const payload: PlayerSettings = { rate, hideText, autoStop, trOn, repeat, gapFactor, autoNext, hideMedia, dictLevel };
    SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(payload)).catch(() => {});
  }, [settingsLoaded, rate, hideText, autoStop, trOn, repeat, gapFactor, autoNext, hideMedia, dictLevel]);

  const [practice, setPractice] = useState<"shadow" | "dictation">("shadow");
  const [dictDone, setDictDone] = useState<Record<number, DictResult>>({});
  const [dictEpoch, setDictEpoch] = useState(0);
  const [dictDrafts, setDictDrafts] = useState<Record<number, DictDraft>>({});
  const [dictPick, setDictPick] = useState<number[]>([]);
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const points = usePoints(user?.id);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [pointsGain, setPointsGain] = useState(0);
  const [pointIdx, setPointIdx] = useState<Set<number>>(new Set());
  const awardedWords = useRef<Record<number, number>>({});
  const streakRef = useRef(0);
  const [dictStreak, setDictStreak] = useState(0);
  const [earned, setEarned] = useState<Record<number, number>>({});
  const [spent, setSpent] = useState<Record<number, number>>({});
  const [recordings, setRecordings] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState<Map<string, VocabItem>>(new Map());
  const [stars, setStars] = useState<Map<string, number>>(new Map());
  const [starFilter, setStarFilter] = useState(false);

  // Cho phép khách dùng bản dịch & nút dịch lẻ từng câu
  const showTr = trOn;
  const [trShown, setTrShown] = useState<Set<number>>(new Set());
  const [tr, setTr] = useState<Record<string, string>>({});
  const [trError, setTrError] = useState("");
  const trPending = useRef<Set<string>>(new Set());

  const showPhr = !!user;
  const [phr, setPhr] = useState<Record<string, Phrase[]>>({});
  const [phrError, setPhrError] = useState("");
  const phrPending = useRef<Set<string>>(new Set());
  const phrasesOf = (text: string) => phr[`${lang}|${text}`];

  const [gapLeftMs, setGapLeftMs] = useState(0);
  const [lessonEnded, setLessonEnded] = useState(false);
  const [serverCompleted, setServerCompleted] = useState(false);

  const ytRef = useRef<YoutubeIframeRef | null>(null);
  const listRef = useRef<FlatList<Segment>>(null);
  const stopAt = useRef<number | null>(null);
  const armAtRef = useRef(0);
  const repeatLeftRef = useRef(1);
  const gapTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearGap = useCallback(() => {
    if (gapTimerRef.current) {
      clearInterval(gapTimerRef.current);
      gapTimerRef.current = null;
    }
    setGapLeftMs(0);
  }, []);
  useEffect(() => clearGap, [clearGap]);

  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, directory: "document" });
  const recState = useAudioRecorderState(recorder);
  const playback = useAudioPlayer(null);

  const current = segments[idx];
  const dictation = allowDictation && practice === "dictation";
  const starredOnly = !!user && starFilter && !dictation;
  const shadowModeOn = autoStop && gapFactor > 0;
  const videoWidth = Math.round(width * (split ? 0.58 : tablet && dictation ? 0.6 : 1));
  const playingRef = useRef(false);
  const live = useRef({ dictation, autoStop, starredOnly, split, repeat, gapFactor, autoNext, rate, idx });
  useEffect(() => {
    playingRef.current = playing;
    live.current = { dictation, autoStop, starredOnly, split, repeat, gapFactor, autoNext, rate, idx };
  });

  const markSeen = useCallback((i: number) => {
    if (!live.current.dictation) setSeen((s) => (s.has(i) ? s : new Set(s).add(i)));
  }, []);

  const dictBreakStreak = useCallback(() => {
    if (streakRef.current === 0) return;
    streakRef.current = 0;
    setDictStreak(0);
    if (user && earnPoints && !isWatch)
      api("/points", { method: "POST", body: { resetStreak: true, tz: new Date().getTimezoneOffset() } }).catch(() => {});
  }, [user, earnPoints, isWatch]);

  const checkLeaveDraft = useCallback(
    (leavingIdx: number) => {
      if (!live.current.dictation) return;
      const d = dictDrafts[leavingIdx];
      const txt = texts[leavingIdx];
      if (!d || !txt || dictDone[leavingIdx]) return;
      const slots = slotsFromInput(txt, d.input);
      if (hasWrongSlot(txt, slots, new Set(d.revealed), dictLevel)) {
        dictBreakStreak();
      }
    },
    [dictDrafts, texts, dictDone, dictLevel, dictBreakStreak],
  );

  const stopsAtEnd = autoStop || dictation;
  const playSegment = useCallback(
    (i: number, stop = stopsAtEnd, keepRepeat = false) => {
      const s = segments[i];
      if (!s) return;
      clearGap();
      if (i !== live.current.idx) checkLeaveDraft(live.current.idx);
      if (!keepRepeat) repeatLeftRef.current = live.current.repeat;
      setLessonEnded(false);
      setIdx(i);
      markSeen(i);
      const durMs = Math.max(0, ((s.end - s.start) / Math.max(0.5, live.current.rate)) * 1000);
      armAtRef.current = Date.now() + Math.min(900, Math.max(200, durMs * 0.45));
      ytRef.current?.seekTo(s.start, true);
      stopAt.current = stop ? s.end : null;
      playingRef.current = true;
      setPlaying(true);
    },
    [segments, stopsAtEnd, markSeen, clearGap, checkLeaveDraft],
  );

  const pause = useCallback(() => {
    clearGap();
    playingRef.current = false;
    setPlaying(false);
  }, [clearGap]);
  const togglePlay = () => {
    clearGap();
    if (playing) pause();
    else if (stopAt.current !== null || !stopsAtEnd) {
      markSeen(idx);
      playingRef.current = true;
      setPlaying(true);
    } else playSegment(idx);
  };

  const toggleTranslation = () => setTrOn((v) => !v);
  const toggleAutoStop = () => {
    const on = !autoStop;
    setAutoStop(on);
    if (!on) repeatLeftRef.current = 1;
    stopAt.current = on && playing && current ? current.end : null;
  };
  const toggleShadowMode = () => {
    if (shadowModeOn) {
      setGapFactor(0);
      setAutoNext(false);
    } else {
      setAutoStop(true);
      if (playing && current) stopAt.current = current.end;
      if (gapFactor === 0) setGapFactor(1.2);
      setAutoNext(true);
    }
  };

  const [kbOpen, setKbOpen] = useState(false);
  const dictPanelY = useRef({ block: 0, panel: 0 });
  useEffect(() => {
    const subs = [
      Keyboard.addListener("keyboardWillShow", () => setKbOpen(true)),
      Keyboard.addListener("keyboardWillHide", () => setKbOpen(false)),
      Keyboard.addListener("keyboardDidShow", () => {
        if (live.current.dictation && !live.current.split)
          listRef.current?.scrollToOffset({ offset: Math.max(0, dictPanelY.current.block + dictPanelY.current.panel - 8), animated: true });
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);
  const typing = kbOpen && dictation && !split;

  useEffect(() => {
    if (dictation || !segments.length) return;
    listRef.current?.scrollToIndex({ index: idx, viewPosition: 0.3, animated: true });
  }, [idx, dictation, segments.length]);

  const starredIdx = useMemo(() => segments.flatMap((s, i) => (stars.has(s.text.toLowerCase()) ? [i] : [])), [segments, stars]);
  const queue = starredOnly ? starredIdx : dictation ? dictPick : null;
  const inQueue = useMemo(() => queue && new Set(queue), [queue]);
  const nextIdx = queue ? queue.find((i) => i > idx) : idx < segments.length - 1 ? idx + 1 : undefined;
  const prevIdx = queue ? queue.findLast((i) => i < idx) : idx > 0 ? idx - 1 : undefined;
  const next = () => nextIdx !== undefined && playSegment(nextIdx);
  const dictNextIdx = nextIdx ?? dictPick.find((k) => !dictDone[k] && k !== idx);
  const prev = () => prevIdx !== undefined && playSegment(prevIdx);

  const nextIdxRef = useRef(nextIdx);
  useEffect(() => {
    nextIdxRef.current = nextIdx;
  }, [nextIdx]);

  const onSegmentEnd = useCallback(() => {
    stopAt.current = null;
    playingRef.current = false;
    setPlaying(false);
    if ((live.current.autoStop || live.current.dictation) && repeatLeftRef.current > 1) {
      repeatLeftRef.current -= 1;
      playSegment(live.current.idx, true, true);
      return;
    }
    if (live.current.dictation) return;
    const seg = segments[live.current.idx];
    const nIdx = nextIdxRef.current;
    if (nIdx === undefined && !live.current.starredOnly) setLessonEnded(true);
    if (live.current.gapFactor > 0 && seg) {
      const totalMs = Math.max(800, Math.round(((seg.end - seg.start) / Math.max(0.5, live.current.rate)) * live.current.gapFactor * 1000 + 300));
      clearGap();
      const endWall = Date.now() + totalMs;
      setGapLeftMs(totalMs);
      gapTimerRef.current = setInterval(() => {
        const rem = endWall - Date.now();
        if (rem <= 0) {
          clearGap();
          if (live.current.autoNext && nextIdxRef.current !== undefined) {
            playSegment(nextIdxRef.current);
          }
        } else {
          setGapLeftMs(rem);
        }
      }, 100);
    } else if (live.current.autoNext && nIdx !== undefined) {
      playSegment(nIdx);
    }
  }, [segments, playSegment, clearGap]);

  // Theo dõi thời gian & xử lý Shadowing repeat + speaking gap + autoNext
  useEffect(() => {
    if (!playing) return;
    let stopped = false;
    let inFlight = false;
    const timer = setInterval(async () => {
      if (stopped || inFlight || !playingRef.current) return;
      inFlight = true;
      try {
        const now = await ytRef.current?.getCurrentTime();
        if (stopped || now === undefined || !playingRef.current) return;
        if (stopAt.current !== null) {
          const curSeg = segments[live.current.idx];
          if (curSeg && now >= curSeg.start - 0.3 && now < stopAt.current - 0.15) {
            armAtRef.current = 0;
          }
          if (Date.now() < armAtRef.current) return;
          if (now > stopAt.current + 1) {
            stopAt.current = null;
          } else if (now >= stopAt.current - 0.05) {
            stopped = true;
            onSegmentEnd();
          }
          return;
        }
        const i = segments.findIndex((s) => now >= s.start && now < s.end);
        if (i >= 0) {
          setIdx(i);
          markSeen(i);
        }
      } finally {
        inFlight = false;
      }
    }, 100);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [playing, segments, markSeen, onSegmentEnd]);

  // ---- Ghi âm (Shadowing) ----
  const recIdx = useRef(0);
  const toggleRecord = async () => {
    try {
      if (recState.isRecording) {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        const i = recIdx.current;
        if (recorder.uri) setRecordings((r) => ({ ...r, [i]: recorder.uri! }));
        return;
      }
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) return micDenied();
      pause();
      recIdx.current = idx;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    }
  };

  useEffect(
    () => () => {
      try {
        if (recorder.isRecording) recorder.stop().catch(() => {});
      } catch {}
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    },
    [recorder],
  );

  const playRecording = (i: number) => {
    const uri = recordings[i];
    if (!uri) return;
    pause();
    playback.replace({ uri });
    playback.play();
  };

  // ---- Chạm vào từ ----
  const [picked, setPicked] = useState<{ word: string; context: string; marks?: string[] } | null>(null);
  const pickWord = (w: string) => {
    const word = cleanWord(w);
    if (!word || !current) return;
    pause();
    setPicked({ word, context: current.text });
  };
  const pickPhrase = (p: Phrase, context: string) => {
    pause();
    setPicked({ word: p.base, context, marks: p.parts });
  };

  const curHidden = dictation ? !dictDone[idx] : hideText && !revealed.has(idx);
  const curPhrases = current && showPhr && !curHidden ? phrasesOf(current.text) : undefined;
  useEffect(() => {
    if (!user || !current || curHidden) return;
    const timer = setTimeout(() => {
      const phrases = curPhrases ?? [];
      const words = tokenize(current.text, phrases).flatMap(({ word, phrase }) => (phrase >= 0 ? [] : [cleanWord(word)]));
      new Set([...words, ...phrases.map((p) => p.base)]).forEach((w) => w && prefetchGerman(w));
    }, 600);
    return () => clearTimeout(timer);
  }, [user, current, curHidden, curPhrases]);

  const saveWord = useCallback(
    async (word: string, context: string, meaning: string, silent = false): Promise<boolean> => {
      if (!user) {
        if (!silent) askLogin(t("player.needLogin"), t("player.needLoginBody"));
        return false;
      }
      try {
        const r = await api<{ vocab: VocabItem[] }>("/vocab", {
          method: "POST",
          body: { word, context, sourceUrl, sourceTitle: title, meaning },
        });
        const item = r.vocab.find((v) => v.word.toLowerCase() === word.toLowerCase());
        if (item) {
          const nextItem = !item.meaning && meaning ? { ...item, meaning } : item;
          setSaved((s) => new Map(s).set(word.toLowerCase(), nextItem));
        }
        return true;
      } catch (e) {
        if (!silent) showError(e, t("player.saveFailed"));
        return false;
      }
    },
    [user, sourceUrl, title, t],
  );

  const unsave = async (text: string) => {
    const key = text.toLowerCase();
    const prev = saved.get(key);
    if (!prev) return;
    setSaved((s) => {
      const m = new Map(s);
      m.delete(key);
      return m;
    });
    await api(`/vocab/${prev.id}`, { method: "DELETE" }).catch((e) => {
      setSaved((s) => new Map(s).set(key, prev));
      showError(e, t("vocab.deleteFailed"));
    });
  };

  const toggleStar = async (text: string) => {
    if (!user) return askLogin(t("player.needLogin"), t("player.needLoginBody"));
    const key = text.toLowerCase();
    const id = stars.get(key);
    try {
      if (id === undefined) {
        const { star } = await api<{ star: { id: number } }>("/stars", { method: "POST", body: { text, sourceUrl, sourceTitle: title } });
        setStars((s) => new Map(s).set(key, star.id));
      } else {
        setStars((s) => {
          const m = new Map(s);
          m.delete(key);
          if (starredOnly && current && current.text.toLowerCase() === key) {
            const rem = segments.flatMap((seg, i) => (m.has(seg.text.toLowerCase()) ? [i] : []));
            if (!rem.length) setStarFilter(false);
            else setIdx(rem.find((i) => i > idx) ?? rem[0]);
          }
          return m;
        });
        await api("/stars", { method: "DELETE", body: { id } });
      }
    } catch (e) {
      if (id !== undefined) setStars((s) => new Map(s).set(key, id));
      showError(e, t("player.saveFailed"));
    }
  };

  const [prevUserId, setPrevUserId] = useState(user?.id ?? null);
  if (prevUserId !== (user?.id ?? null)) {
    setPrevUserId(user?.id ?? null);
    if (!user) {
      setSaved(new Map());
      setStars(new Map());
      setStarFilter(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    let alive = true;
    api<{ vocab: VocabItem[] }>("/vocab")
      .then(({ vocab }) => alive && setSaved(new Map(vocab.filter((v) => !isSentence(v)).map((v) => [v.word.toLowerCase(), v]))))
      .catch(() => {});
    api<{ stars: { id: number; text: string }[] }>("/stars")
      .then(({ stars: list }) => alive && setStars(new Map(list.map((s) => [s.text.toLowerCase(), s.id]))))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  const select = (i: number) => {
    pause();
    if (i !== idx) checkLeaveDraft(idx);
    stopAt.current = null;
    setIdx(i);
    ytRef.current?.seekTo(segments[i].start, true);
  };
  const roundStart = (round: number[]) => (round.includes(idx) ? idx : (round.find((k) => !dictDone[k]) ?? round[0]));
  const ensureRound = () => {
    if (dictPick.length) return dictPick;
    const round = pickDictation(texts, dictDone);
    setDictPick(round);
    return round;
  };
  const newRound = () => {
    const round = pickDictation(texts, dictDone);
    setDictPick(round);
    setDictDrafts({});
    setEarned({});
    setSpent({});
    if (round.length) select(round[0]);
  };
  const toNearestStarred = () => {
    const i = starredIdx.find((k) => k >= idx) ?? starredIdx.at(-1);
    if (i !== undefined && i !== idx) select(i);
  };
  const toggleStarredOnly = () => {
    setStarFilter(!starFilter);
    if (!starFilter) toNearestStarred();
  };

  const [swipeX] = useState(() => new Animated.Value(0));
  const swipeStart = useRef({ x: 0, y: 0 });
  const swipeDelta = (e: GestureResponderEvent) => ({ dx: e.nativeEvent.pageX - swipeStart.current.x, dy: e.nativeEvent.pageY - swipeStart.current.y });
  const swipeBack = () => Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
  const swipe = {
    onTouchStart: (e: GestureResponderEvent) => (swipeStart.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }),
    onMoveShouldSetResponder: (e: GestureResponderEvent) => {
      const { dx, dy } = swipeDelta(e);
      return Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy) * 2;
    },
    onResponderMove: (e: GestureResponderEvent) => swipeX.setValue(swipeDelta(e).dx * 0.4),
    onResponderRelease: (e: GestureResponderEvent) => {
      const { dx } = swipeDelta(e);
      if (dx < -60) next();
      else if (dx > 60) prev();
      swipeBack();
    },
    onResponderTerminate: swipeBack,
  };
  const doneCount = Object.keys(dictDone).length;
  const roundDone = dictation && dictPick.length > 0 && dictPick.every((k) => dictDone[k]);

  // ---- Tiến độ học ----
  const [resumed, setResumed] = useState<number | null>(null);
  const progressLoaded = useRef(false);
  const pendingSave = useRef<{ user: number; seq: number; body: { source: string } & Record<string, unknown> } | null>(null);

  useEffect(() => {
    progressLoaded.current = false;
    if (isWatch || !user || !segments.length) return;
    let alive = true;
    api<{ progress: Progress | null }>(`/progress?source=${encodeURIComponent(sourceUrl)}`)
      .then(({ progress: p }) => {
        if (!alive || !p) return;
        setServerCompleted(Boolean(p.completed));
        const done = Object.fromEntries(Object.entries(p.dictDone).filter(([k]) => Number(k) < segments.length));
        const dict = allowDictation && p.mode === "dictation";
        const pick = (p.dictPick ?? []).filter((k) => k < segments.length && hasWords(texts[k]));
        const round = pick.length || dict ? [...new Set([...pick, ...pickDictation(texts, done)])].sort((a, b) => a - b) : pick;
        let i = Math.min(p.idx, segments.length - 1);
        if (dict && round.length && !round.includes(i)) i = round.find((k) => !done[k]) ?? round[0];
        setIdx(i);
        setDictPick(round);
        if (allowDictation) setPractice(p.mode);
        if (p.dictLevel) setDictLevel(normalizeDictLevel(p.dictLevel));
        setDictDone(done);
        if (p.dictDrafts) {
          const restored: Record<number, DictDraft> = {};
          for (const [k, v] of Object.entries(p.dictDrafts)) {
            const n = Number(k);
            if (Number.isInteger(n) && n < segments.length) restored[n] = v;
          }
          setDictDrafts(restored);
          setDictEpoch((e) => e + 1);
        }
        setEarned(p.dictRoundPts ?? {});
        setSpent(p.dictRoundSpent ?? {});
        setSeen((s) => new Set([...s, ...(p.seen ?? []).filter((k) => k < segments.length)]));
        if (i > 0 || Object.keys(done).length) setResumed(i);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) progressLoaded.current = true;
      });
    return () => {
      alive = false;
    };
  }, [isWatch, user, sourceUrl, segments.length, texts, allowDictation]);

  // ---- Điểm chính tả ----
  useEffect(() => {
    if (isWatch || !earnPoints || !user) return;
    let alive = true;
    api<Points & { idx?: number[]; open?: Record<number, number>; openWords?: Record<number, number>; streak?: number }>(
      `/points?source=${encodeURIComponent(sourceUrl)}&tz=${new Date().getTimezoneOffset()}`,
    )
      .then((r) => {
        if (!alive || !r.idx) return;
        setPointsTotal(user.id, r.total);
        awardedWords.current = { ...(r.openWords ?? r.open), ...awardedWords.current };
        if (typeof r.streak === "number" && streakRef.current === 0) {
          streakRef.current = r.streak;
          setDictStreak(r.streak);
        }
        setPointIdx((s) => new Set([...s, ...r.idx!]));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isWatch, earnPoints, user, sourceUrl]);

  const dictEarn = (i: number, correct: number, total: number, input: string, revealedArr: number[]) => {
    if (isWatch) return 0;
    const prevWords = awardedWords.current[i] ?? 0;
    const newWords = correct - prevWords;
    if (newWords <= 0) return 0;
    const prevStreak = streakRef.current;
    const nextStreak = prevStreak + newWords;
    awardedWords.current[i] = correct;
    streakRef.current = nextStreak;
    setDictStreak(nextStreak);
    if (!earnPoints || pointIdx.has(i)) return 0;
    if (correct === total) setPointIdx((s) => new Set(s).add(i));
    if (!user) return 0;
    const gain = comboGain(prevStreak, newWords);
    setEarned((e) => ({ ...e, [i]: (e[i] ?? 0) + gain }));
    addPoints(user.id, gain);
    setPointsGain(gain);
    setPointsEarned((n) => n + 1);
    api<Points & { streak?: number }>("/points", {
      method: "POST",
      body: { source: sourceUrl, idx: i, input, revealed: revealedArr, level: dictLevel, streak: nextStreak, tz: new Date().getTimezoneOffset() },
    })
      .then((r) => {
        setPointsTotal(user.id, r.total);
        if (typeof r.streak === "number" && streakRef.current === nextStreak) {
          streakRef.current = r.streak;
          setDictStreak(r.streak);
        }
      })
      .catch(() => {
        awardedWords.current[i] = prevWords;
        streakRef.current = Math.max(0, streakRef.current - newWords);
        setDictStreak(streakRef.current);
        setPointIdx((s) => new Set([...s].filter((k) => k !== i)));
        setEarned((e) => ({ ...e, [i]: Math.max((e[i] ?? 0) - gain, 0) }));
        addPoints(user.id, -gain);
      });
    return gain;
  };

  const dictFinished = (i: number, correct: number, total: number) => setDictDone((d) => ({ ...d, [i]: { correct, total } }));
  const dictHint = (i: number, n: number) => {
    streakRef.current = 0;
    setDictStreak(0);
    if (!user || isWatch || !earnPoints) return;
    const cost = n * POINTS_HINT;
    setSpent((s) => ({ ...s, [i]: (s[i] ?? 0) + n }));
    addPoints(user.id, -cost);
    api<Points>("/points", { method: "POST", body: { source: sourceUrl, idx: i, hints: n, tz: new Date().getTimezoneOffset() } })
      .then((r) => setPointsTotal(user.id, r.total))
      .catch(() => {
        setSpent((s) => ({ ...s, [i]: Math.max((s[i] ?? 0) - n, 0) }));
        addPoints(user.id, cost);
      });
  };

  const flushProgress = useCallback(() => {
    const b = pendingSave.current;
    pendingSave.current = null;
    if (b)
      api<{ progress: Progress | null }>("/progress", { method: "PUT", body: b.body })
        .then((r) => progressSaved(b.user, b.body.source, b.seq, r.progress?.updatedAt ?? 0))
        .catch(() => {});
  }, []);

  useEffect(() => {
    if (isWatch || !user || !progressLoaded.current || !segments.length) return;
    const mode = dictation ? "dictation" : "shadow";
    const total = segments.length;
    const seq = noteProgress(user.id, sourceUrl, {
      source: sourceUrl,
      title,
      idx,
      total,
      mode,
      dictLevel,
      dictCount: Object.keys(dictDone).length,
      seenCount: mode === "shadow" ? new Set(seen).add(idx).size : seen.size,
      completed: serverCompleted || lessonEnded || roundDone ? 1 : 0,
      updatedAt: 0,
    });
    pendingSave.current = {
      user: user.id,
      seq,
      body: { source: sourceUrl, title, idx, total, mode, dictLevel, dictDone, seen: [...seen], dictPick, dictDrafts },
    };
    const id = setTimeout(flushProgress, 1500);
    return () => clearTimeout(id);
  }, [isWatch, user, sourceUrl, title, idx, segments.length, dictation, dictLevel, dictDone, seen, dictPick, dictDrafts, flushProgress, serverCompleted, lessonEnded, roundDone]);

  useEffect(() => flushProgress, [flushProgress]);

  useFocusEffect(
    useCallback(
      () => () => {
        pause();
        playback.pause();
        try {
          if (recorder.isRecording) {
            recorder.stop().catch(() => {});
            setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
          }
        } catch {}
        flushProgress();
      },
      [pause, playback, recorder, flushProgress],
    ),
  );

  useEffect(() => {
    if (resumed === null) return;
    const id = setTimeout(() => setResumed(null), 8000);
    return () => clearTimeout(id);
  }, [resumed]);

  const restart = () => {
    pause();
    stopAt.current = null;
    pendingSave.current = null;
    if (!isWatch && user) {
      const seq = noteProgress(user.id, sourceUrl, null);
      const doneN = Object.keys(dictDone).length;
      const finished = dictation ? dictTotal > 0 && doneN >= dictTotal : new Set(seen).add(idx).size >= segments.length;
      api<{ at?: number }>(`/progress?source=${encodeURIComponent(sourceUrl)}${finished ? "&done=1" : ""}`, { method: "DELETE" })
        .then((r) => progressSaved(user.id, sourceUrl, seq, r.at ?? 0))
        .catch(() => {});
    }
    const round = dictation ? pickDictation(texts, {}) : [];
    const target = round.length ? round[0] : 0;
    setIdx(target);
    ytRef.current?.seekTo(segments[target]?.start ?? 0, true);
    setSeen(new Set());
    setDictDone({});
    setDictPick(round);
    setDictDrafts({});
    setEarned({});
    setSpent({});
    setLessonEnded(false);
    setDictEpoch((e) => e + 1);
    setResumed(null);
  };

  /** Dịch câu i (hoặc batch 20 câu) — hoạt động cho cả khách */
  const translateFrom = useCallback(
    async (i: number, singleOnly = false) => {
      const list = (singleOnly ? segments.slice(i, i + 1) : segments.slice(i, i + 20))
        .map((s) => s.text)
        .filter((x) => !(x in tr) && !trPending.current.has(x));
      if (!list.length) return;
      list.forEach((x) => trPending.current.add(x));
      try {
        const r = await api<{ translations: string[] }>("/translate", { method: "POST", body: { sentences: list } });
        setTrError("");
        setTr((prev) => ({ ...prev, ...Object.fromEntries(list.map((x, k) => [x, r.translations[k]])) }));
      } catch (e) {
        setTrError((e as Error).message);
      } finally {
        list.forEach((x) => trPending.current.delete(x));
      }
    },
    [segments, tr],
  );
  useEffect(() => {
    if (!showTr) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void translateFrom(idx);
    });
    return () => {
      cancelled = true;
    };
  }, [showTr, idx, translateFrom]);

  const phrasesFrom = useCallback(
    async (i: number) => {
      const list = segments
        .slice(i, i + 30)
        .map((s) => s.text)
        .filter((x) => !(`${lang}|${x}` in phr) && !phrPending.current.has(`${lang}|${x}`));
      if (!list.length) return;
      list.forEach((x) => phrPending.current.add(`${lang}|${x}`));
      try {
        const r = await api<{ phrases: Phrase[][] }>("/phrases", { method: "POST", body: { sentences: list, lang } });
        setPhrError("");
        setPhr((prev) => ({ ...prev, ...Object.fromEntries(list.map((x, k) => [`${lang}|${x}`, r.phrases[k] ?? []])) }));
      } catch (e) {
        setPhrError((e as Error).message);
      } finally {
        list.forEach((x) => phrPending.current.delete(`${lang}|${x}`));
      }
    },
    [segments, phr, lang],
  );
  useEffect(() => {
    if (!showPhr) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void phrasesFrom(idx);
    });
    return () => {
      cancelled = true;
    };
  }, [showPhr, idx, phrasesFrom]);

  const resumeBanner = resumed !== null && (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 12, marginTop: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: alpha(C.accent, 0.12), borderWidth: 1, borderColor: alpha(C.accent, 0.35) }}>
      <SymbolView name="arrow.uturn.forward.circle.fill" size={18} tintColor={C.accentText} />
      <Text style={{ flex: 1, color: C.text, fontSize: 14, fontWeight: "600" }}>{t("player.resumed", { i: resumed + 1, n: segments.length })}</Text>
      <Pressable onPress={restart} hitSlop={8}>
        <Text style={{ color: C.amber, fontSize: 14, fontWeight: "800" }}>{t("player.restart")}</Text>
      </Pressable>
    </View>
  );

  const changePractice = (p: "shadow" | "dictation") => {
    if (p === practice) return;
    pause();
    setPractice(p);
    if (p !== "dictation") return starFilter && toNearestStarred();
    const i = roundStart(ensureRound());
    if (i !== undefined && i !== idx) select(i);
  };
  const practiceSwitch = allowDictation ? (
    <Segmented
      options={[
        ["shadow", t("player.shadowing")],
        ["dictation", t("player.dictation")],
      ]}
      value={practice}
      onChange={changePractice}
    />
  ) : null;

  const modeBar = (
    <View style={{ backgroundColor: C.background, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center" }}>
        {!dictation && (
          <Chip icon="repeat" on={shadowModeOn} label={t("player.shadowMode")} hint={t("player.shadowMode")} onPress={toggleShadowMode} />
        )}
        {!dictation && (
          <Chip
            icon="eye.slash"
            on={hideText}
            label={t("player.chipHide")}
            hint={t("player.hideText")}
            onPress={() => {
              setHideText((v) => !v);
              setRevealed(new Set());
            }}
          />
        )}
        {dictation && (
          <ChipGroup
            icon="lightbulb"
            hint={t("player.hintLevel")}
            options={[
              ["cloze", t("player.cloze")],
              ["easy", t("player.easy")],
              ["hard", t("player.hard")],
            ]}
            value={dictLevel}
            onChange={setDictLevel}
          />
        )}
        <Chip icon="translate" on={showTr} label={t("player.translation")} hint={t("player.translation")} onPress={toggleTranslation} />
        {!dictation && (
          <Chip icon="pause.circle" iconOn="pause.circle.fill" on={autoStop} label={t("player.chipAutoStop")} hint={t("player.autoStop")} onPress={toggleAutoStop} />
        )}
        <Chip icon="rectangle.dashed" on={hideMedia} label={t("player.hideMedia")} hint={t("player.hideMedia")} onPress={() => setHideMedia((v) => !v)} />
        {!dictation && (
          <Chip icon="slider.horizontal.3" on={repeat > 1 || gapFactor > 0 || autoNext} label={t("player.settings")} hint={t("player.settings")} onPress={() => setSettingsOpen(true)} />
        )}
        {!!user && !dictation && (
          <Chip icon="star" iconOn="star.fill" on={starredOnly} label={t("player.chipStarred")} hint={t("player.starredOnly")} onPress={toggleStarredOnly} />
        )}
      </ScrollView>
    </View>
  );

  const roundScore = dictPick.reduce((a, k) => ({ c: a.c + (dictDone[k]?.correct ?? 0), n: a.n + (dictDone[k]?.total ?? 0) }), { c: 0, n: 0 });
  const roundPoints = dictPick.reduce((p, k) => p + (earned[k] ?? 0) - (spent[k] ?? 0) * POINTS_HINT, 0);
  const left = dictTotal - doneCount;
  const roundCard = dictation && (roundDone || !dictPick.length) && (
    <View style={{ gap: 10, padding: 14, borderRadius: 16, backgroundColor: alpha(C.accent, 0.12), borderWidth: 1, borderColor: alpha(C.accent, 0.35) }}>
      {roundDone && (
        <Text style={{ color: C.text, fontSize: 16, fontWeight: "800" }}>
          {t("dict.roundDone", { n: dictPick.length, p: roundScore.n ? Math.round((roundScore.c / roundScore.n) * 100) : 0 })}
        </Text>
      )}
      {roundDone && roundPoints !== 0 && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Gem size={22} />
          <Text style={{ color: C.gem, fontSize: 15, fontWeight: "800" }}>{t("dict.roundPoints", { n: roundPoints > 0 ? `+${roundPoints}` : `−${-roundPoints}` })}</Text>
        </View>
      )}
      <Text style={{ color: C.muted, fontSize: 14 }}>{left > 0 ? t("dict.lessonLeft", { d: doneCount, n: dictTotal }) : t("dict.lessonAll", { n: dictTotal })}</Text>
      <Button title={left > 0 ? t("dict.newRound") : t("player.restart")} variant="primary" onPress={left > 0 ? newRound : restart} />
    </View>
  );

  const spokenCount = Object.keys(recordings).length;
  const shadowDoneEnough = spokenCount >= Math.ceil(segments.length / 2);
  const completionCard = !dictation && !starredOnly && lessonEnded && segments.length > 0 && (
    <View style={{ marginTop: 10, gap: 10, padding: 16, borderRadius: 16, backgroundColor: shadowDoneEnough ? C.okSoft : C.goldSoft, borderWidth: 1, borderColor: alpha(shadowDoneEnough ? C.ok : C.gold, 0.4) }}>
      <Text style={{ color: C.text, fontSize: 17, fontWeight: "800" }}>
        {shadowDoneEnough ? `🎉 ${t("player.doneTitle")}` : t("player.almostTitle")}
      </Text>
      <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20 }}>
        {shadowDoneEnough
          ? t("player.doneBody", { spoken: spokenCount, total: segments.length })
          : t("player.almostBody", { spoken: spokenCount, total: segments.length })}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {allowDictation && <Button title={t("player.goDictation")} variant="primary" onPress={() => changePractice("dictation")} style={{ flex: 1 }} />}
        {!!user && <Button title={t("player.goVocab")} onPress={() => router.push("/review")} style={{ flex: 1 }} />}
        <Button title={t("player.goBack")} onPress={() => router.back()} style={{ flex: 1 }} />
      </View>
    </View>
  );

  const controls = (
    <View style={{ width: "100%", maxWidth: CONTENT_MAX, alignSelf: "center", paddingVertical: 14, gap: 14 }}>
      {current && dictation && dictPick.length > 0 && (
        <Animated.View {...swipe} onLayout={(e) => (dictPanelY.current.block = e.nativeEvent.layout.y)} style={{ gap: 14, transform: [{ translateX: swipeX }] }}>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Label color={C.amber}>
                {queue?.includes(idx) ? t("player.roundOf", { i: queue.indexOf(idx) + 1, n: queue.length }) : t("player.sentenceOf", { i: idx + 1, n: segments.length })}
              </Label>
              <Text style={{ color: C.muted, fontSize: 12 }}>#{idx + 1}</Text>
              {pointIdx.has(idx) && (
                <View accessible accessibilityLabel={t("dict.scored")}>
                  <Gem size={16} />
                </View>
              )}
              <View style={{ flex: 1 }} />
              {earnPoints && !isWatch && points !== null && <PointsPill total={points} earned={pointsEarned} gain={pointsGain} />}
              {!!user && (
                <Pressable
                  onPress={() => toggleStar(current.text)}
                  hitSlop={10}
                  accessibilityLabel={t("player.starSentence")}
                  accessibilityState={{ checked: stars.has(current.text.toLowerCase()) }}
                >
                  <SymbolView name={stars.has(current.text.toLowerCase()) ? "star.fill" : "star"} size={18} tintColor={stars.has(current.text.toLowerCase()) ? C.amber : C.muted} />
                </Pressable>
              )}
            </View>
            {!!queue?.includes(idx) && (() => {
              const doneInQueue = queue.filter((k) => dictDone[k]).length;
              const pct = queue.length ? Math.round((doneInQueue / queue.length) * 100) : 0;
              return (
                <View style={{ gap: 4 }} accessibilityLabel={t("player.doneOf", { d: doneInQueue, n: queue.length })}>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: C.card2, overflow: "hidden" }}>
                    <View style={{ width: `${pct}%`, height: "100%", borderRadius: 3, backgroundColor: doneInQueue === queue.length ? C.ok : C.accent }} />
                  </View>
                  <Text style={{ color: C.muted, fontSize: 11, fontWeight: "700", fontVariant: ["tabular-nums"] }}>
                    {t("player.doneOf", { d: doneInQueue, n: queue.length })}
                  </Text>
                </View>
              );
            })()}
          </View>
          <View onLayout={(e) => (dictPanelY.current.panel = e.nativeEvent.layout.y)}>
            <DictationPanel
              key={`${idx}-${dictEpoch}`}
              autoFocus={kbOpen}
              text={current.text}
              level={dictLevel}
              onReplay={() => playSegment(idx)}
              onTogglePlay={togglePlay}
              onNext={() => dictNextIdx !== undefined && playSegment(dictNextIdx)}
              hasNext={dictNextIdx !== undefined}
              onDone={(correct, total) => dictFinished(idx, correct, total)}
              onEarn={!isWatch ? (correct, total, input, revealedArr) => dictEarn(idx, correct, total, input, revealedArr) : undefined}
              streak={dictStreak}
              onBreakStreak={dictBreakStreak}
              onHint={user && earnPoints && !isWatch ? (n) => dictHint(idx, n) : undefined}
              onWord={pickWord}
              translation={
                showTr ? tr[current.text] || (current.text in tr ? t("player.trFailed") : trError ? `⚠ ${trError}` : t("player.translating")) : undefined
              }
              draft={dictDrafts[idx]}
              saved={dictDone[idx]}
              onDraft={(d) =>
                setDictDrafts((prev) => {
                  const drafts = { ...prev };
                  if (d) drafts[idx] = d;
                  else delete drafts[idx];
                  return drafts;
                })
              }
            />
          </View>
        </Animated.View>
      )}
      {roundCard}
      {!split && !dictation && <Label>{t("player.transcript")}</Label>}
    </View>
  );

  const videoHeight = hideMedia ? 0 : (videoWidth * 9) / 16;
  const video = (
    <View style={{ alignSelf: "center", height: videoHeight, overflow: "hidden" }}>
      <YoutubePlayer
        ref={ytRef}
        height={(videoWidth * 9) / 16}
        width={videoWidth}
        videoId={videoId}
        play={playing}
        playbackRate={rate}
        initialPlayerParams={{ rel: false, controls: false, modestbranding: true, iv_load_policy: 3, showClosedCaptions: false, preventFullScreen: true }}
        webViewProps={{ injectedJavaScript: YT_COMMAND_SHIM }}
        onChangeState={(s: PLAYER_STATES) => {
          if (s === PLAYER_STATES.PLAYING) setPlaying(true);
          else if (s === PLAYER_STATES.PAUSED) setPlaying(false);
          else if (s === PLAYER_STATES.ENDED) onSegmentEnd();
        }}
      />
    </View>
  );

  const transcript = (
    <FlatList
      ref={listRef}
      data={dictation ? [] : segments}
      onScrollToIndexFailed={({ index, averageItemLength }) => {
        listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: false });
        setTimeout(() => listRef.current?.scrollToIndex({ index, viewPosition: 0.3, animated: true }), 100);
      }}
      keyExtractor={(_, i) => String(i)}
      ListFooterComponent={
        <>
          {starredOnly && !starredIdx.length && <Text style={{ color: C.muted, fontSize: 15, textAlign: "center", marginTop: 24 }}>{t("player.noStarred")}</Text>}
          {completionCard}
        </>
      }
      ListHeaderComponent={split ? <View style={{ paddingVertical: 16 }}><Label>{t("player.transcript")}</Label></View> : controls}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: tablet ? 20 : 16, paddingBottom: typing ? 400 : 40 }}
      renderItem={({ item, index }) => {
        const stage = dictation ? C.sun : recState.isRecording ? C.candy : recordings[idx] ? C.leaf : C.aqua;
        const hidden = hideText && !revealed.has(index);
        const starred = stars.has(item.text.toLowerCase());
        if (inQueue && !inQueue.has(index)) return null;
        const phrases = showPhr && !hidden ? (phrasesOf(item.text) ?? []) : [];
        const tokens = tokenize(item.text, phrases);
        const showSingleTr = showTr || trShown.has(index);
        const trVal = tr[item.text];
        const trFailed = (item.text in tr && !trVal) || (!!trError && !trVal);

        return (
          <Pressable
            onPress={() => playSegment(index)}
            style={{
              width: "100%",
              maxWidth: CONTENT_MAX,
              alignSelf: "center",
              marginBottom: 10,
              padding: tablet ? 16 : 14,
              borderRadius: 16,
              borderWidth: index === idx ? 1.5 : 1,
              borderColor: index === idx ? alpha(C.text, 0.55) : C.line,
              backgroundColor: index === idx ? stageBg(stage) : "transparent",
              gap: 6,
            }}
          >
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              {index === idx ? <Mascot size={30} style={{ marginVertical: -4 }} /> : <Text style={{ color: C.text, fontWeight: "800" }}>#{index + 1}</Text>}
              <Text style={{ color: C.muted, fontSize: 12 }}>{formatTime(item.start)}</Text>
              <View style={{ flex: 1 }} />
              {recordings[index] && (
                <Text onPress={() => playRecording(index)} style={{ fontSize: 18 }}>
                  🔊
                </Text>
              )}
              {!showTr && !hidden && (
                <Pressable
                  onPress={() => {
                    setTrShown((s) => new Set(s).add(index));
                    void translateFrom(index, true);
                  }}
                  hitSlop={8}
                  accessibilityLabel={t("player.translateOne")}
                >
                  <SymbolView name="translate" size={16} tintColor={showSingleTr ? C.accentText : C.muted} />
                </Pressable>
              )}
              {hideText && (
                <Pressable
                  onPress={() =>
                    setRevealed((r) => {
                      const s = new Set(r);
                      if (!s.delete(index)) s.add(index);
                      return s;
                    })
                  }
                  hitSlop={10}
                  accessibilityLabel={t("player.showText")}
                >
                  <SymbolView name={hidden ? "eye" : "eye.slash"} size={18} tintColor={C.muted} />
                </Pressable>
              )}
              {!hidden && (
                <Pressable onPress={() => toggleStar(item.text)} hitSlop={10} accessibilityLabel={t("player.starSentence")} accessibilityState={{ checked: starred }}>
                  <SymbolView name={starred ? "star.fill" : "star"} size={18} tintColor={starred ? C.amber : C.muted} />
                </Pressable>
              )}
            </View>
            {hidden ? (
              <Text style={{ color: C.muted, fontSize: fs(15), lineHeight: fs(22) }}>{mask(item.text)}</Text>
            ) : index === idx || phrases.length ? (
              <Text style={{ fontSize: fs(15), lineHeight: fs(22) }}>
                {tokens.map(({ word: w, phrase: p }, k) => {
                  const joined = p >= 0 && tokens[k + 1]?.phrase === p;
                  return (
                    <Fragment key={k}>
                      <Text
                        onPress={index === idx ? () => (p >= 0 ? pickPhrase(phrases[p], item.text) : pickWord(w)) : undefined}
                        style={
                          p >= 0
                            ? { color: C.phrase, fontWeight: "600", textDecorationLine: "underline" }
                            : { color: index === idx && saved.has(cleanWord(w).toLowerCase()) ? C.amber : C.text }
                        }
                      >
                        {joined ? `${w} ` : w}
                      </Text>
                      {!joined && " "}
                    </Fragment>
                  );
                })}
              </Text>
            ) : (
              <Text style={{ color: C.text, fontSize: fs(15), lineHeight: fs(22) }}>{item.text}</Text>
            )}
            {!hidden &&
              phrases.map((p, k) => (
                <Text key={k} onPress={() => pickPhrase(p, item.text)} style={{ color: C.muted, fontSize: fs(13), lineHeight: fs(18) }}>
                  <Text style={{ color: C.phrase, fontWeight: "700" }}>{p.base}</Text> — {p.meaning}
                </Text>
              ))}
            {!hidden && showPhr && index === idx && !phrasesOf(item.text) && (
              <Text style={{ color: C.muted, fontSize: fs(13), lineHeight: fs(18) }}>{phrError ? `⚠ ${phrError}` : t("player.phrasesFinding")}</Text>
            )}
            {showSingleTr && (trVal || index === idx || trShown.has(index)) && (
              <View style={{ gap: 4 }}>
                <Text style={{ color: C.muted, fontSize: fs(13), lineHeight: fs(18) }}>
                  {trVal || (item.text in tr ? t("player.trFailed") : trError ? `⚠ ${trError}` : t("player.translating"))}
                </Text>
                {trFailed && (
                  <Pressable onPress={() => Linking.openURL(`https://translate.google.com/?sl=de&tl=vi&text=${encodeURIComponent(item.text)}`).catch(() => {})}>
                    <Text style={{ color: C.link, fontSize: 12, fontWeight: "700" }}>{t("player.openGoogleTranslate")} ↗</Text>
                  </Pressable>
                )}
              </View>
            )}
          </Pressable>
        );
      }}
    />
  );

  const dock = (
    <View style={{ backgroundColor: C.card, borderTopColor: C.border, borderTopWidth: 1, paddingHorizontal: 12, paddingTop: tablet ? 10 : 8, paddingBottom: kbOpen && !split ? 8 : Math.max(insets.bottom, tablet ? 12 : 8) }}>
      <View style={{ width: "100%", maxWidth: 560, alignSelf: "center", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable
          onPress={() => setRate(RATES[(RATES.indexOf(rate as (typeof RATES)[number]) + 1) % RATES.length])}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t("player.a11yRate", { rate })}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: rate === 1 ? C.muted : C.amber, fontWeight: "800", fontSize: 14 }}>{rate}×</Text>
        </Pressable>
        <IconButton icon="arrow.counterclockwise" label={t("player.a11yReplay")} onPress={() => playSegment(idx)} />
        <IconButton icon="backward.end.fill" label={t("player.a11yPrev")} onPress={prev} disabled={prevIdx === undefined} />
        <Pressable
          onPress={togglePlay}
          accessibilityRole="button"
          accessibilityLabel={playing ? t("player.a11yPause") : t("player.a11yPlay")}
          style={({ pressed }) => ({ width: tablet ? 56 : 48, height: tablet ? 56 : 48, borderRadius: tablet ? 28 : 24, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? 0.92 : 1 }] })}
        >
          <SymbolView name={playing ? "pause.fill" : "play.fill"} size={tablet ? 24 : 20} tintColor="#fff" />
        </Pressable>
        <IconButton icon="forward.end.fill" label={t("player.a11yNext")} onPress={next} disabled={nextIdx === undefined} />
        {!dictation && (
          <>
            <Pressable
              onPress={() => {
                haptic.firm();
                toggleRecord();
              }}
              accessibilityRole="button"
              accessibilityLabel={recState.isRecording ? t("player.a11yStopRecord") : t("player.a11yRecord")}
              style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: recState.isRecording ? C.red : C.coral, alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? 0.92 : 1 }] })}
            >
              <SymbolView name={recState.isRecording ? "stop.fill" : "mic.fill"} size={18} tintColor={recState.isRecording ? "#fff" : "#16203a"} />
            </Pressable>
            <IconButton icon="speaker.wave.2.fill" label={t("player.a11yPlayRecording")} onPress={() => playRecording(idx)} disabled={!recordings[idx]} />
          </>
        )}
      </View>
    </View>
  );

  const pickedItem = picked ? saved.get(picked.word.toLowerCase()) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: C.background, paddingTop: headerHeight }}>
      <Stack.Screen
        options={{
          title,
          headerTitle: practiceSwitch ? () => practiceSwitch : undefined,
          headerRight: headerRight ? () => headerRight : undefined,
        }}
      />
      <KeyboardAvoidingView behavior="padding" enabled={!split} style={{ flex: 1, flexDirection: split ? "row" : "column" }}>
        <View style={split ? { width: videoWidth, borderRightWidth: 1, borderRightColor: C.border } : { flex: 1 }}>
          {topBanner}
          {video}
          {gapLeftMs > 0 && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: alpha(C.coral, 0.14), borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: C.coralText, fontSize: 13, fontWeight: "700" }}>
                {t("player.speakingGap", { s: (gapLeftMs / 1000).toFixed(1) })}
              </Text>
              <Pressable onPress={clearGap}>
                <Text style={{ color: C.muted, fontSize: 12, fontWeight: "700" }}>{t("close")}</Text>
              </Pressable>
            </View>
          )}
          {resumeBanner}
          {!typing && modeBar}
          {split ? dictation ? <View style={{ flex: 1 }} /> : null : transcript}
          {dock}
        </View>
        {split && (
          <View style={{ flex: 1 }}>
            {dictation ? (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
                {controls}
              </ScrollView>
            ) : (
              transcript
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Modal cài đặt Shadowing */}
      <Modal
        visible={settingsOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        supportedOrientations={["portrait", "portrait-upside-down", "landscape-left", "landscape-right"]}
        onRequestClose={() => setSettingsOpen(false)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable
            onPress={() => setSettingsOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t("close")}
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)" }]}
          />
          <View
            style={{
              width: "100%",
              maxWidth: 640,
              alignSelf: "center",
              backgroundColor: C.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 20,
              paddingLeft: Math.max(insets.left, 20),
              paddingRight: Math.max(insets.right, 20),
              paddingBottom: Math.max(insets.bottom, 20),
            }}
          >
            <ScrollView bounces={false} contentContainerStyle={{ gap: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ color: C.text, fontSize: 17, fontWeight: "800" }}>{t("player.settings")}</Text>
                <Pressable onPress={() => setSettingsOpen(false)} hitSlop={8} accessibilityRole="button">
                  <Text style={{ color: C.accentText, fontWeight: "700" }}>{t("close")}</Text>
                </Pressable>
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700" }}>{t("player.repeatCount")}</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {REPEATS.map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => {
                        setRepeat(r);
                        if (r > 1) {
                          setAutoStop(true);
                          if (playing && current) stopAt.current = current.end;
                        }
                      }}
                      style={{ flex: 1, paddingVertical: 10, borderRadius: R.md, alignItems: "center", backgroundColor: repeat === r ? C.accentSoft : C.card2, borderWidth: 1, borderColor: repeat === r ? C.accent : C.line }}
                    >
                      <Text style={{ color: repeat === r ? C.accentText : C.text, fontWeight: "700" }}>{r}×</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700" }}>{t("player.gapLabel")}</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {GAP_FACTORS.map((g) => (
                    <Pressable
                      key={g}
                      onPress={() => {
                        setGapFactor(g);
                        if (g > 0) {
                          setAutoStop(true);
                          if (playing && current) stopAt.current = current.end;
                        }
                      }}
                      style={{ flex: 1, paddingVertical: 10, borderRadius: R.md, alignItems: "center", backgroundColor: gapFactor === g ? C.accentSoft : C.card2, borderWidth: 1, borderColor: gapFactor === g ? C.accent : C.line }}
                    >
                      <Text style={{ color: gapFactor === g ? C.accentText : C.text, fontWeight: "700", fontSize: 12 }}>
                        {g === 0 ? t("player.gapOff") : `${g}×`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: "600" }}>{t("player.autoNext")}</Text>
                <Switch
                  value={autoNext}
                  onValueChange={(v) => {
                    setAutoNext(v);
                    if (v) {
                      setAutoStop(true);
                      if (playing && current) stopAt.current = current.end;
                    }
                  }}
                  trackColor={{ true: C.accent }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <WordSheet
        word={picked?.word ?? null}
        context={picked?.context ?? ""}
        marks={picked?.marks}
        saved={!!pickedItem}
        initialMeaning={pickedItem?.meaning}
        extraExamples={pickedItem?.examples}
        autoSave={autoSave}
        onAutoSaveChange={updateAutoSave}
        onSave={(meaning, silent) => (picked ? saveWord(picked.word, picked.context, meaning, silent) : Promise.resolve(false))}
        onRemove={() => (picked ? unsave(picked.word) : Promise.resolve())}
        onClose={() => setPicked(null)}
      />
    </View>
  );
}
