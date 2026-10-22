import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { router, Stack } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Alert, FlatList, Keyboard, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import YoutubePlayer, { PLAYER_STATES, type YoutubeIframeRef } from "react-native-youtube-iframe";
import { formatTime, mergeIntoSentences, type Segment } from "@shared/subtitles";
import { tokenize, type Phrase } from "@shared/phrase-match";
import { CrazyPanel } from "./CrazyPanel";
import { DictationPanel, type DictDraft } from "./DictationPanel";
import { WordSheet } from "./WordSheet";
import { Label, Segmented } from "./ui";
import { api, type CrazyRep, type DictResult, type Progress, type VocabItem } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { C } from "@/lib/theme";
import type { DictationLevel } from "@shared/dictation";
import { useI18n } from "@/lib/i18n";
import { CONTENT_MAX, useLayout } from "@/lib/layout";

const RATES = [0.5, 0.75, 0.85, 1, 1.25];

/**
 * react-native-youtube-iframe gửi lệnh dạng JSON {eventName, meta}, nhưng trang iframe mặc định của thư viện
 * lại so khớp chuỗi thô ("pauseVideo") → lệnh tạm dừng / đổi tốc độ bị bỏ qua. Tự nghe và gọi player.
 */
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
true;
`;

function IconButton({ icon, onPress, disabled }: { icon: SFSymbol; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.3 : pressed ? 0.5 : 1,
      })}
    >
      <SymbolView name={icon} size={20} tintColor={C.text} weight="semibold" />
    </Pressable>
  );
}
/** Nút bật/tắt dạng icon vuông (cạnh Shadowing / Chính tả) */
function ToggleIcon({ icon, on, onPress, label }: { icon: SFSymbol; on: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: on ? C.accent : C.card2,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <SymbolView name={icon} size={18} tintColor={on ? "#fff" : C.muted} weight="semibold" />
    </Pressable>
  );
}
const mask = (s: string) => s.replace(/[\p{L}\p{N}]/gu, "*");
const cleanWord = (w: string) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

/**
 * Màn hình học 1 video: phát từng câu, Shadowing (ghi âm & nghe lại), Crazy (hét to · rõ · nhanh, có chấm) hoặc nghe chép chính tả.
 * Logic giống bản web (ShadowPlayer); gộp câu + chấm chính tả dùng chung code trong ../src/lib.
 */
export default function Player({
  title,
  videoId,
  segments: rawSegments,
  sourceUrl,
  headerRight,
  allowDictation = false,
}: {
  title: string;
  videoId: string;
  segments: Segment[];
  sourceUrl: string; // /lesson/1, /watch/abc — lưu kèm từ vựng
  headerRight?: ReactNode; // nút trên thanh tiêu đề (vd. admin: thêm thành bài học)
  allowDictation?: boolean; // bài admin bật Chính tả; video tự dán chỉ Shadowing
}) {
  const { user } = useAuth();
  const { lang, t } = useI18n();
  const { width, tablet, split, fs } = useLayout();
  // iPad nằm ngang: video + điều khiển bên trái (~58%), transcript bên phải
  const videoWidth = split ? Math.round(width * 0.58) : width;
  // Header iOS trong suốt nằm đè lên nội dung → đẩy video xuống dưới header.
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const segments = useMemo(() => mergeIntoSentences(rawSegments), [rawSegments]);

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [practice, setPractice] = useState<"shadow" | "crazy" | "dictation">("shadow");
  const [dictLevel, setDictLevel] = useState<DictationLevel>("normal");
  const [dictDone, setDictDone] = useState<Record<number, DictResult>>({}); // câu chính tả đã làm: idx → 7/8 từ đúng
  const [dictEpoch, setDictEpoch] = useState(0); // "Học lại từ đầu" → dựng lại ô chính tả kể cả khi đang ở câu 1
  const [dictDrafts, setDictDrafts] = useState<Record<number, DictDraft>>({}); // chữ đã gõ / từ đã hiện của từng câu (sang câu khác rồi quay lại vẫn còn)
  const [recordings, setRecordings] = useState<Record<number, string>>({});
  const [crazyStats, setCrazyStats] = useState<Record<number, CrazyRep>>({}); // Crazy: số lượt hét / đã đạt từng câu (tài khoản: lưu vĩnh viễn trên server)
  const [saved, setSaved] = useState<Map<string, number>>(new Map()); // từ / câu đã lưu (chữ thường) → id trong sổ từ vựng
  const [trOn, setTrOn] = useState(false); // hiện bản dịch dưới mỗi câu
  const showTr = trOn && !!user; // dịch chỉ dành cho tài khoản (đăng xuất → tự tắt)
  const [autoStop, setAutoStop] = useState(true); // dừng ở cuối mỗi câu
  const [tr, setTr] = useState<Record<string, string>>({}); // câu gốc → bản dịch
  const [trError, setTrError] = useState("");
  const trPending = useRef<Set<string>>(new Set());
  const [phrOn, setPhrOn] = useState(true); // tô sáng cụm từ cố định (AI phân tích) — bật sẵn, bấm ✨ để tắt
  const showPhr = phrOn && !!user;
  const [phr, setPhr] = useState<Record<string, Phrase[]>>({}); // "<ngôn ngữ>|<câu>" → cụm từ trong câu
  const [phrError, setPhrError] = useState("");
  const phrPending = useRef<Set<string>>(new Set());
  const phrasesOf = (text: string) => phr[`${lang}|${text}`];

  const ytRef = useRef<YoutubeIframeRef | null>(null);
  const listRef = useRef<FlatList<Segment>>(null);
  const stopAt = useRef<number | null>(null);

  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, directory: "document" });
  const recState = useAudioRecorderState(recorder);
  const playback = useAudioPlayer(null);

  const current = segments[idx];
  const dictation = allowDictation && practice === "dictation";
  const crazy = practice === "crazy";
  const live = useRef({ dictation, split });
  useEffect(() => {
    live.current = { dictation, split };
  });

  const playSegment = useCallback(
    (i: number, stop = autoStop) => {
      const s = segments[i];
      if (!s) return;
      setIdx(i);
      ytRef.current?.seekTo(s.start, true);
      stopAt.current = stop ? s.end : null;
      setPlaying(true);
    },
    [segments, autoStop],
  );
  // Giữ stopAt: phát tiếp sẽ dừng đúng cuối câu đang dở
  const pause = () => setPlaying(false);
  // Đang dở câu → phát tiếp từ chỗ dừng; đã hết câu → phát lại câu hiện tại
  const togglePlay = () => {
    if (playing) pause();
    else if (stopAt.current !== null || !autoStop) setPlaying(true);
    else playSegment(idx);
  };
  const toggleTranslation = () => {
    if (user) return setTrOn((v) => !v);
    Alert.alert(t("player.trNeedAccount"), t("player.trNeedAccountBody"), [
      { text: t("later"), style: "cancel" },
      { text: t("loginOrRegister"), onPress: () => router.push("/account") },
    ]);
  };
  const togglePhrases = () => {
    if (user) return setPhrOn((v) => !v);
    Alert.alert(t("player.phrNeedAccount"), t("player.phrNeedAccountBody"), [
      { text: t("later"), style: "cancel" },
      { text: t("loginOrRegister"), onPress: () => router.push("/account") },
    ]);
  };
  const toggleAutoStop = () => {
    const on = !autoStop;
    setAutoStop(on);
    // Bật giữa chừng → dừng ở cuối câu đang phát; tắt → bỏ điểm dừng
    stopAt.current = on && playing && current ? current.end : null;
  };

  // Bàn phím (gõ chính tả): dock ▶ / chuyển câu nằm ngay trên bàn phím. Điện thoại chật (video + bàn phím gần kín màn)
  // → ẩn tạm thanh chế độ và cuộn ô nhập lên đầu danh sách để vẫn thấy chỗ gõ
  const [kbOpen, setKbOpen] = useState(false);
  const dictPanelY = useRef(0); // vị trí ô chính tả trong danh sách câu
  useEffect(() => {
    const subs = [
      Keyboard.addListener("keyboardWillShow", () => setKbOpen(true)),
      Keyboard.addListener("keyboardWillHide", () => setKbOpen(false)),
      Keyboard.addListener("keyboardDidShow", () => {
        if (live.current.dictation && !live.current.split)
          listRef.current?.scrollToOffset({ offset: dictPanelY.current, animated: true });
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);
  const typing = kbOpen && dictation && !split;

  // Câu đang phát luôn nằm trong tầm nhìn (Chính tả / Crazy thì không cuộn để khỏi che bảng luyện ở đầu danh sách —
  // trừ khi chia cột: bảng luyện nằm ở cột trái, transcript cuộn riêng)
  useEffect(() => {
    if (((dictation || crazy) && !split) || !segments.length) return;
    listRef.current?.scrollToIndex({ index: idx, viewPosition: 0.3, animated: true });
  }, [idx, dictation, crazy, split, segments.length]);

  // Theo dõi thời gian: tới cuối câu thì dừng; phát tự do (bấm thẳng vào video) thì câu hiện tại chạy theo video
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(async () => {
      const now = await ytRef.current?.getCurrentTime();
      if (now === undefined) return;
      if (stopAt.current !== null && now > stopAt.current + 1) stopAt.current = null; // tua xa trên thanh YouTube
      if (stopAt.current !== null) {
        if (now >= stopAt.current - 0.05) {
          stopAt.current = null;
          setPlaying(false);
        }
        return;
      }
      const i = segments.findIndex((s) => now >= s.start && now < s.end);
      if (i >= 0) setIdx(i);
    }, 100);
    return () => clearInterval(timer);
  }, [playing, segments]);

  // ---- Ghi âm (Shadowing) ----
  const toggleRecord = async () => {
    if (recState.isRecording) {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }); // trả âm thanh về loa ngoài
      if (recorder.uri) setRecordings((r) => ({ ...r, [idx]: recorder.uri! }));
      return;
    }
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) return Alert.alert(t("player.micDenied"), t("player.micDeniedBody"));
    pause();
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };
  const playRecording = (i: number) => {
    const uri = recordings[i];
    if (!uri) return;
    pause();
    playback.replace({ uri });
    playback.play();
  };

  // ---- Chạm vào từ: bảng giải thích + lưu từ ----
  const [picked, setPicked] = useState<{ word: string; context: string; marks?: string[] } | null>(null);
  const pickWord = (w: string) => {
    const word = cleanWord(w);
    if (!word || !current) return;
    pause(); // dừng video để xem nghĩa / nghe phát âm; bấm ▶ để phát tiếp
    setPicked({ word, context: current.text });
  };
  // Chạm vào cụm từ → bảng giải thích cho cả cụm (dạng từ điển), tô sáng các phần của cụm trong câu
  const pickPhrase = (p: Phrase, context: string) => {
    pause();
    setPicked({ word: p.base, context, marks: p.parts });
  };
  const saveWord = async (word: string, context: string, meaning: string) => {
    if (!user)
      return Alert.alert(t("player.needLogin"), t("player.needLoginBody"), [
        { text: t("later"), style: "cancel" },
        { text: t("login"), onPress: () => router.push("/account") },
      ]);
    try {
      const r = await api<{ vocab: VocabItem[] }>("/vocab", { method: "POST", body: { word, context, sourceUrl, sourceTitle: title } });
      // Điền sẵn nghĩa AI vừa giải thích nếu từ chưa có nghĩa
      const item = r.vocab.find((v) => v.word.toLowerCase() === word.toLowerCase());
      if (item) setSaved((s) => new Map(s).set(word.toLowerCase(), item.id));
      if (item && !item.meaning && meaning) await api(`/vocab/${item.id}`, { method: "PATCH", body: { meaning } }).catch(() => {});
    } catch (e) {
      Alert.alert(t("player.saveFailed"), (e as Error).message);
    }
  };
  // Sao trên mỗi câu: lưu nguyên câu (kèm bản dịch nếu có) vào sổ từ vựng; bấm lại để bỏ
  const toggleStar = (text: string) => {
    const id = saved.get(text.toLowerCase());
    if (id === undefined) return saveWord(text, "", tr[text] ?? "");
    setSaved((s) => {
      const m = new Map(s);
      m.delete(text.toLowerCase());
      return m;
    });
    api(`/vocab/${id}`, { method: "DELETE" }).catch(() => {});
  };
  // Mở bài → tải sổ từ vựng để tô màu từ đã lưu và hiện sao cho câu đã đánh dấu
  useEffect(() => {
    if (!user) return;
    let alive = true;
    api<{ vocab: VocabItem[] }>("/vocab")
      .then(({ vocab }) => alive && setSaved(new Map(vocab.map((v) => [v.word.toLowerCase(), v.id]))))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  const next = () => playSegment(Math.min(segments.length - 1, idx + 1));
  const prev = () => playSegment(Math.max(0, idx - 1));
  const doneCount = Object.keys(dictDone).length;

  // ---- Tiến độ học: lưu theo tài khoản (đồng bộ web ↔ app), mở lại bài là học tiếp ----
  const [resumed, setResumed] = useState<number | null>(null); // vừa tiếp tục từ câu này → hiện thông báo
  const progressLoaded = useRef(false);
  const pendingSave = useRef<object | null>(null);

  useEffect(() => {
    progressLoaded.current = false;
    if (!user || !segments.length) return;
    let alive = true;
    api<{ progress: Progress | null }>(`/progress?source=${encodeURIComponent(sourceUrl)}`)
      .then(({ progress: p }) => {
        if (!alive || !p) return;
        const i = Math.min(p.idx, segments.length - 1);
        const done = Object.fromEntries(Object.entries(p.dictDone).filter(([k]) => Number(k) < segments.length));
        setIdx(i);
        if (allowDictation) setPractice(p.mode);
        if (p.dictLevel === "easy" || p.dictLevel === "normal" || p.dictLevel === "hard") setDictLevel(p.dictLevel);
        setDictDone(done);
        if (i > 0 || Object.keys(done).length) setResumed(i);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) progressLoaded.current = true;
      });
    return () => {
      alive = false;
    };
  }, [user, sourceUrl, segments.length, allowDictation]);

  // Số lượt Crazy từng câu (đếm qua mọi lần học)
  useEffect(() => {
    if (!user) return;
    let alive = true;
    api<{ reps: Record<string, CrazyRep> }>(`/crazy?source=${encodeURIComponent(sourceUrl)}`)
      .then(({ reps }) => alive && setCrazyStats(Object.fromEntries(Object.entries(reps).map(([k, v]) => [Number(k), v]))))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user, sourceUrl]);
  /** Xong 1 lượt hét: +1 ngay trên máy, tài khoản thì cộng trên server rồi lấy số chuẩn về */
  const addCrazyRep = (i: number, ok: boolean) => {
    setCrazyStats((s) => ({ ...s, [i]: { reps: (s[i]?.reps ?? 0) + 1, passed: ok || !!s[i]?.passed } }));
    if (!user) return;
    api<{ rep: CrazyRep }>("/crazy", { method: "POST", body: { source: sourceUrl, idx: i, passed: ok } })
      .then(({ rep }) => setCrazyStats((s) => ({ ...s, [i]: rep })))
      .catch(() => {});
  };

  const flushProgress = useCallback(() => {
    const b = pendingSave.current;
    pendingSave.current = null;
    if (b) api("/progress", { method: "PUT", body: b }).catch(() => {});
  }, []);
  // Lưu sau 1,5 giây kể từ thay đổi cuối (đổi câu, đổi chế độ, làm xong câu chính tả)…
  useEffect(() => {
    if (!user || !progressLoaded.current || !segments.length) return;
    const mode = dictation ? "dictation" : "shadow";
    pendingSave.current = { source: sourceUrl, title, idx, total: segments.length, mode, dictLevel, dictDone };
    const id = setTimeout(flushProgress, 1500);
    return () => clearTimeout(id);
  }, [user, sourceUrl, title, idx, segments.length, dictation, dictLevel, dictDone, flushProgress]);
  // …và lưu ngay khi rời màn hình
  useEffect(() => flushProgress, [flushProgress]);
  // Thông báo "tiếp tục từ câu …" tự ẩn sau 8 giây
  useEffect(() => {
    if (resumed === null) return;
    const id = setTimeout(() => setResumed(null), 8000);
    return () => clearTimeout(id);
  }, [resumed]);

  const restart = () => {
    pause();
    pendingSave.current = null;
    api(`/progress?source=${encodeURIComponent(sourceUrl)}`, { method: "DELETE" }).catch(() => {});
    setIdx(0);
    setDictDone({});
    setDictDrafts({});
    setDictEpoch((e) => e + 1);
    setResumed(null); // số lượt Crazy giữ nguyên — đó là tổng lượt đã luyện, không phải tiến độ
  };

  /** Dịch câu i và ~20 câu kế tiếp (server có kho bản dịch dùng chung với web) */
  const translateFrom = useCallback(
    async (i: number) => {
      const texts = segments
        .slice(i, i + 20)
        .map((s) => s.text)
        .filter((x) => !(x in tr) && !trPending.current.has(x));
      if (!texts.length) return;
      texts.forEach((x) => trPending.current.add(x));
      try {
        const r = await api<{ translations: string[] }>("/translate", { method: "POST", body: { sentences: texts } });
        setTrError("");
        setTr((prev) => ({ ...prev, ...Object.fromEntries(texts.map((x, k) => [x, r.translations[k]])) }));
      } catch (e) {
        setTrError((e as Error).message);
      } finally {
        texts.forEach((x) => trPending.current.delete(x));
      }
    },
    [segments, tr],
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- gọi API; setState chỉ chạy sau khi có kết quả
    if (showTr) translateFrom(idx);
  }, [showTr, idx, translateFrom]);

  /** Tìm cụm từ cố định cho câu i và ~30 câu kế tiếp (server phân tích 1 lần mỗi câu, dùng chung mọi người) */
  const phrasesFrom = useCallback(
    async (i: number) => {
      const texts = segments
        .slice(i, i + 30)
        .map((s) => s.text)
        .filter((x) => !(`${lang}|${x}` in phr) && !phrPending.current.has(`${lang}|${x}`));
      if (!texts.length) return;
      texts.forEach((x) => phrPending.current.add(`${lang}|${x}`));
      try {
        const r = await api<{ phrases: Phrase[][] }>("/phrases", { method: "POST", body: { sentences: texts, lang } });
        setPhrError("");
        setPhr((prev) => ({ ...prev, ...Object.fromEntries(texts.map((x, k) => [`${lang}|${x}`, r.phrases[k] ?? []])) }));
      } catch (e) {
        setPhrError((e as Error).message);
      } finally {
        texts.forEach((x) => phrPending.current.delete(`${lang}|${x}`));
      }
    },
    [segments, phr, lang],
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- gọi API; setState chỉ chạy sau khi có kết quả
    if (showPhr) phrasesFrom(idx);
  }, [showPhr, idx, phrasesFrom]);

  // "Tiếp tục từ câu …" — ngay dưới video (danh sách câu đã tự cuộn tới câu đang học nên đặt ở đầu danh sách sẽ không thấy)
  const resumeBanner = resumed !== null && (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginHorizontal: 12,
        marginTop: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: "rgba(22,163,74,0.12)",
        borderWidth: 1,
        borderColor: "rgba(22,163,74,0.35)",
      }}
    >
      <SymbolView name="arrow.uturn.forward.circle.fill" size={18} tintColor={C.accent} />
      <Text style={{ flex: 1, color: C.text, fontSize: 14, fontWeight: "600" }}>
        {t("player.resumed", { i: resumed + 1, n: segments.length })}
      </Text>
      <Pressable onPress={restart} hitSlop={8}>
        <Text style={{ color: C.amber, fontSize: 14, fontWeight: "800" }}>{t("player.restart")}</Text>
      </Pressable>
    </View>
  );

  // Thanh chế độ luyện + bản dịch + tự dừng: cố định dưới video, không cuộn theo danh sách câu
  const modeBar = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        flexWrap: "wrap", // điện thoại + bài có Chính tả: 3 chế độ không vừa 1 hàng → icon xuống hàng dưới
        rowGap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: C.background,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}
    >
      <Segmented
        options={[
          ["shadow", t("player.shadowing")],
          ["crazy", t("player.crazy")],
          ...(allowDictation ? ([["dictation", t("player.dictation")]] as const) : []),
        ]}
        value={practice}
        onChange={(p) => {
          pause();
          setPractice(p);
          if (p === "crazy" && !split) listRef.current?.scrollToOffset({ offset: 0, animated: true }); // bảng Crazy ở đầu danh sách
        }}
      />
      {/* Bản dịch tiếng Việt dưới mỗi câu */}
      <ToggleIcon icon="translate" on={showTr} label={t("player.translation")} onPress={toggleTranslation} />
      {/* Tô sáng thành ngữ / cụm từ cố định trong câu */}
      <ToggleIcon icon="sparkles" on={showPhr} label={t("player.phrases")} onPress={togglePhrases} />
      {/* Tự dừng ở cuối mỗi câu; tắt → phát liên tục, câu hiện tại chạy theo video */}
      <ToggleIcon icon="pause.circle" on={autoStop} label={t("player.autoStop")} onPress={toggleAutoStop} />
    </View>
  );

  // Phần chính tả. Màn hẹp: nằm đầu danh sách câu; chia cột: nằm dưới video
  const controls = (
    <View style={{ width: "100%", maxWidth: CONTENT_MAX, alignSelf: "center", paddingVertical: 14, gap: 14 }}>
      {current && dictation && (
        <>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Label color={C.amber}>{t("player.sentenceOf", { i: idx + 1, n: segments.length })}</Label>
            <Text style={{ color: C.muted, fontSize: 12 }}>{t("player.doneOf", { d: doneCount, n: segments.length })}</Text>
          </View>
          <Segmented
            options={[
              ["easy", t("player.easy")],
              ["normal", t("player.normal")],
              ["hard", t("player.hard")],
            ]}
            value={dictLevel}
            onChange={setDictLevel}
          />
          <View onLayout={(e) => (dictPanelY.current = e.nativeEvent.layout.y)}>
            <DictationPanel
              key={`${idx}-${dictEpoch}`}
              text={current.text}
              level={dictLevel}
              onReplay={() => playSegment(idx)}
              onNext={next}
              hasNext={idx < segments.length - 1}
              onDone={(correct, total) => setDictDone((d) => ({ ...d, [idx]: { correct, total } }))}
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
        </>
      )}
      {current && crazy && (
        <>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Label color={C.amber}>{t("player.sentenceOf", { i: idx + 1, n: segments.length })}</Label>
            <Text style={{ color: C.muted, fontSize: 12 }}>
              {t("crazy.passedOf", { d: Object.values(crazyStats).filter((c) => c.passed).length, n: segments.length })}
            </Text>
          </View>
          <CrazyPanel
            text={current.text}
            duration={current.end - current.start}
            playing={playing}
            reps={crazyStats[idx]?.reps ?? 0}
            onListen={() => playSegment(idx, true)}
            onPause={pause}
            onRecorded={(uri) => setRecordings((r) => ({ ...r, [idx]: uri }))}
            onPlayback={() => playRecording(idx)}
            hasRecording={!!recordings[idx]}
            onAttempt={(ok) => addCrazyRep(idx, ok)}
            onNext={next}
            hasNext={idx < segments.length - 1}
          />
        </>
      )}
      {!split && <Label>{t("player.transcript")}</Label>}
    </View>
  );

  const video = (
    <YoutubePlayer
      ref={ytRef}
      height={(videoWidth * 9) / 16}
      width={videoWidth}
      videoId={videoId}
      play={playing}
      playbackRate={rate}
      initialPlayerParams={{ rel: false, preventFullScreen: false }}
      webViewProps={{ injectedJavaScript: YT_COMMAND_SHIM }}
      onChangeState={(s: PLAYER_STATES) => {
        if (s === PLAYER_STATES.PLAYING) setPlaying(true);
        if (s === PLAYER_STATES.PAUSED || s === PLAYER_STATES.ENDED) setPlaying(false);
      }}
    />
  );

  const transcript = (
    <FlatList
      ref={listRef}
      data={segments}
      onScrollToIndexFailed={({ index, averageItemLength }) => {
        // Câu chưa render (chiều cao không cố định) → cuộn ước lượng rồi thử lại
        listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: false });
        setTimeout(() => listRef.current?.scrollToIndex({ index, viewPosition: 0.3, animated: true }), 100);
      }}
      keyExtractor={(_, i) => String(i)}
      ListHeaderComponent={
        split ? (
          <View style={{ paddingVertical: 16 }}>
            <Label>{t("player.transcript")}</Label>
          </View>
        ) : (
          controls
        )
      }
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: tablet ? 20 : 16, paddingBottom: 40 }}
      renderItem={({ item, index }) => {
        const hidden = dictation && !dictDone[index];
        const starred = saved.has(item.text.toLowerCase());
        const phrases = showPhr && !hidden ? (phrasesOf(item.text) ?? []) : [];
        const tokens = tokenize(item.text, phrases);
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
              borderWidth: 2,
              borderColor: index === idx ? C.accent : C.border,
              backgroundColor: index === idx ? "rgba(22,163,74,0.1)" : "transparent",
              gap: 6,
            }}
          >
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Text style={{ color: C.text, fontWeight: "800" }}>#{index + 1}</Text>
              <Text style={{ color: C.muted, fontSize: 12 }}>{formatTime(item.start)}</Text>
              {crazy && crazyStats[index] && (
                <Text style={{ color: crazyStats[index].passed ? C.accent : C.amber, fontWeight: "800" }}>
                  {crazyStats[index].passed ? "✓ " : ""}🔥{crazyStats[index].reps}
                </Text>
              )}
              {dictation && dictDone[index] && (
                <Text style={{ color: C.accent, fontWeight: "800" }}>
                  ✓ {dictDone[index].correct}/{dictDone[index].total}
                </Text>
              )}
              <View style={{ flex: 1 }} />
              {recordings[index] && (
                <Text onPress={() => playRecording(index)} style={{ fontSize: 18 }}>
                  🔊
                </Text>
              )}
              {/* Đánh dấu câu → lưu vào sổ từ vựng (Chính tả: chỉ khi câu đã hiện chữ) */}
              {!hidden && (
                <Pressable
                  onPress={() => toggleStar(item.text)}
                  hitSlop={10}
                  accessibilityLabel={t("player.starSentence")}
                  accessibilityState={{ checked: starred }}
                >
                  <SymbolView name={starred ? "star.fill" : "star"} size={18} tintColor={starred ? C.amber : C.muted} />
                </Pressable>
              )}
            </View>
            {hidden ? (
              <Text style={{ color: C.muted, fontSize: fs(15), lineHeight: fs(22) }}>{mask(item.text)}</Text>
            ) : index === idx || phrases.length ? (
              // Câu đang học: chạm vào từ để lưu / tra từ điển, chạm vào cụm từ (tô xanh) để xem cả cụm
              <Text style={{ fontSize: fs(15), lineHeight: fs(22) }}>
                {tokens.map(({ word: w, phrase: p }, k) => {
                  const joined = p >= 0 && tokens[k + 1]?.phrase === p; // gạch chân liền giữa các từ cùng cụm
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
            {/* Cụm từ trong câu: dạng từ điển — nghĩa; chạm để xem giải thích, ví dụ, lưu */}
            {!hidden &&
              phrases.map((p, k) => (
                <Text key={k} onPress={() => pickPhrase(p, item.text)} style={{ color: C.muted, fontSize: fs(13), lineHeight: fs(18) }}>
                  <Text style={{ color: C.phrase, fontWeight: "700" }}>{p.base}</Text> — {p.meaning}
                </Text>
              ))}
            {!hidden && showPhr && index === idx && !phrasesOf(item.text) && (
              <Text style={{ color: C.muted, fontSize: fs(13), lineHeight: fs(18) }}>
                {phrError ? `⚠ ${phrError}` : t("player.phrasesFinding")}
              </Text>
            )}
            {!hidden && showTr && (tr[item.text] || index === idx) && (
              <Text style={{ color: C.muted, fontSize: fs(13), lineHeight: fs(18) }}>
                {tr[item.text] || (item.text in tr ? t("player.trFailed") : trError ? `⚠ ${trError}` : t("player.translating"))}
              </Text>
            )}
          </Pressable>
        );
      }}
    />
  );

  // Dock điều khiển cố định ở đáy — 1 hàng: tốc độ · lặp · ⏮ ▶ ⏭ · ghi âm · nghe lại (iPad: gom vào giữa, không trải hết bề ngang)
  const dock = (
    <View
      style={{
        backgroundColor: C.card,
        borderTopColor: C.border,
        borderTopWidth: 1,
        paddingHorizontal: 12,
        paddingTop: tablet ? 10 : 8,
        paddingBottom: kbOpen && !split ? 8 : Math.max(insets.bottom, tablet ? 12 : 8), // trên bàn phím thì bỏ khoảng an toàn đáy
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 560,
          alignSelf: "center",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={() => setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length])}
          hitSlop={6}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: rate === 1 ? C.muted : C.amber, fontWeight: "800", fontSize: 14 }}>{rate}×</Text>
        </Pressable>
        <IconButton icon="arrow.counterclockwise" onPress={() => playSegment(idx)} />
        <IconButton icon="backward.end.fill" onPress={prev} disabled={idx === 0} />
        <Pressable
          onPress={togglePlay}
          style={({ pressed }) => ({
            width: tablet ? 56 : 48,
            height: tablet ? 56 : 48,
            borderRadius: tablet ? 28 : 24,
            backgroundColor: C.accent,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: pressed ? 0.92 : 1 }],
          })}
        >
          <SymbolView name={playing ? "pause.fill" : "play.fill"} size={tablet ? 24 : 20} tintColor="#fff" />
        </Pressable>
        <IconButton icon="forward.end.fill" onPress={next} disabled={idx >= segments.length - 1} />
        {!dictation && !crazy && (
          <>
            <Pressable
              onPress={toggleRecord}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: recState.isRecording ? C.red : "rgba(220,38,38,0.15)",
                alignItems: "center",
                justifyContent: "center",
                transform: [{ scale: pressed ? 0.92 : 1 }],
              })}
            >
              <SymbolView
                name={recState.isRecording ? "stop.fill" : "mic.fill"}
                size={18}
                tintColor={recState.isRecording ? "#fff" : C.redText}
              />
            </Pressable>
            <IconButton icon="speaker.wave.2.fill" onPress={() => playRecording(idx)} disabled={!recordings[idx]} />
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.background, paddingTop: headerHeight }}>
      <Stack.Screen options={{ title, headerRight: headerRight ? () => headerRight : undefined }} />
      {/* Video luôn ở cùng chỗ trong cây → xoay iPad (đổi bố cục) không làm tải lại video */}
      {/* Điện thoại: bàn phím mở → cả cột co lại, dock nằm trên bàn phím. iPad chia cột: cột trái tự cuộn theo bàn phím */}
      <KeyboardAvoidingView behavior="padding" enabled={!split} style={{ flex: 1, flexDirection: split ? "row" : "column" }}>
        <View style={split ? { width: videoWidth, borderRightWidth: 1, borderRightColor: C.border } : { flex: 1 }}>
          {video}
          {resumeBanner}
          {!typing && modeBar}
          {split ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20 }}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
            >
              {controls}
            </ScrollView>
          ) : (
            transcript
          )}
          {dock}
        </View>
        {split && <View style={{ flex: 1 }}>{transcript}</View>}
      </KeyboardAvoidingView>

      <WordSheet
        word={picked?.word ?? null}
        context={picked?.context ?? ""}
        marks={picked?.marks}
        saved={!!picked && saved.has(picked.word.toLowerCase())}
        onSave={(meaning) => (picked ? saveWord(picked.word, picked.context, meaning) : Promise.resolve())}
        onClose={() => setPicked(null)}
      />
    </View>
  );
}
