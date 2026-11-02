import { Image } from "expo-image";
import { router, Stack, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { memo, useCallback, type ComponentRef, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Animated, AppState, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fullWord } from "@shared/deck-study";
import {
  MILESTONE_GOAL,
  REEL,
  RULES,
  backspace,
  fitField,
  levelOf,
  newGame,
  nextMilestone,
  press,
  reelAt,
  scoreHit,
  snapshot,
  speechLine,
  step,
  untarget,
  type Drop,
  type Game,
  type GameWord,
  type Phase,
  type Topic,
  type Variant,
  type View as Snap,
} from "@shared/falling-words";
import { ErrorText } from "@/components/ui";
import { api, deckCover, type DeckSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { speakGerman, stopSpeaking } from "@/lib/speak";
import { C, LEVEL_COLORS } from "@/lib/theme";

/**
 * Game chữ rơi trong app (bản native của components/FallingWords trên web, chung luật chơi ở @shared/falling-words):
 * - "rain" (Mưa từ vựng): giọt hiện nghĩa tiếng Việt, gõ từ tiếng Đức trước khi chạm nước.
 * - "gold" (Đào vàng): cục vàng chỉ phát âm, chìm dần — gõ đúng chính tả để thợ mỏ quăng móc kéo lên.
 * Gõ bằng bàn phím QWERTZ trên màn hình (mặc định) hoặc bàn phím hệ thống / bàn phím rời (ô nhập ẩn).
 * Kỷ lục, tiến độ mốc, bộ từ đã chọn lưu trên máy (cùng tên khoá với localStorage của web).
 */

type DeckOption = { slug: string; title: string; level: string; wordCount: number; topicCount: number };
type DeckStats = { cleared: number; best: number };

// ---- Lưu trên máy (SecureStore: khoá chỉ gồm chữ, số, . - _) ----
const safeKey = (k: string) => k.replace(/[^\w.-]/g, "_");
const load = (k: string) => SecureStore.getItemAsync(safeKey(k)).catch(() => null);
const save = (k: string, v: string | number | boolean) => void SecureStore.setItemAsync(safeKey(k), String(v)).catch(() => {});
const num = (s: string | null) => (s && Number.isFinite(+s) ? +s : 0);

// ---- Màu, kích thước ----
const TH = {
  rain: {
    field: "linear-gradient(to bottom, #0a1622, #0c2033, #0b2a40)",
    drop: { borderColor: "rgba(34,211,238,0.5)", backgroundColor: "rgba(14,42,61,0.92)" },
    target: { borderColor: "#67e8f9", backgroundColor: "rgba(15,53,80,0.97)", boxShadow: "0 0 16px rgba(34,211,238,0.5)" },
    gone: { borderColor: "rgba(34,211,238,0.4)", backgroundColor: "rgba(14,42,61,0.9)" },
    cursor: "#a5f3fc",
    empty: "rgba(125,211,252,0.5)",
    accent: "#67e8f9",
    soft: "rgba(103,232,249,0.8)",
    bar: "#22d3ee",
    on: { borderColor: "#67e8f9", backgroundColor: "rgba(34,211,238,0.25)" },
    note: { bg: "#06b6d4", fg: "#fff" },
    overlay: "rgba(6,18,28,0.9)",
    button: { bg: "#06b6d4", fg: "#fff", shadow: "#0e7490" },
    tile: "rgba(34,211,238,0.1)",
    tileBorder: "rgba(34,211,238,0.3)",
    icon: "cloud.rain.fill" as SFSymbol,
  },
  gold: {
    field: "linear-gradient(to bottom, #0e1a26, #120a04)",
    drop: { borderColor: "rgba(250,204,21,0.6)", backgroundColor: "rgba(80,58,18,0.95)" },
    target: { borderColor: "#fde047", backgroundColor: "rgba(110,80,22,0.97)", boxShadow: "0 0 16px rgba(250,204,21,0.55)" },
    gone: { borderColor: "rgba(250,204,21,0.4)", backgroundColor: "rgba(58,42,16,0.9)" },
    cursor: "#fde68a",
    empty: "rgba(253,230,138,0.4)",
    accent: C.amber,
    soft: "rgba(250,204,21,0.8)",
    bar: C.amber,
    on: { borderColor: C.amber, backgroundColor: "rgba(250,204,21,0.25)" },
    note: { bg: C.amber, fg: "#000" },
    overlay: "rgba(18,11,4,0.9)",
    button: { bg: C.amber, fg: "#000", shadow: "#a16207" },
    tile: "rgba(250,204,21,0.1)",
    tileBorder: "rgba(250,204,21,0.3)",
    icon: "hammer.fill" as SFSymbol,
  },
};
type Theme = (typeof TH)[Variant];

/** Vùng rơi trong sân: chừa cột nút bên phải; trên = dưới HUD (gold: dưới mặt đất), dưới = mặt nước / đáy mỏ */
const INSET = { left: 8, right: 56 };
const AREA = { rain: { top: 56, bottom: 48 }, gold: { top: 128, bottom: 36 } };
const SKY = 112; // gold: mặt đất
const PULLEY_Y = 68; // gold: ròng rọc (tính từ mép trên sân)
const DROP_H = 58;
const dropWidth = (variant: Variant, w: number) => (variant === "gold" ? Math.min(176, w * 0.6) : Math.min(240, w * 0.7));

const MONO = Platform.select({ ios: "Menlo", default: "monospace" });
/** Màu theo giống — như trang bộ từ: der xanh dương · die đỏ · das xanh lá */
const GENDER: Record<string, string> = { der: C.phrase, die: C.redText, das: C.accent };
const emoji = (code: string) => ({ uri: deckCover(`/emoji/${code}.webp`) });

/** Số giả ngẫu nhiên cố định → nền không đổi giữa các lần vẽ */
const rand = (i: number, n: number) => (((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1) + 1) % 1;
const STREAKS = Array.from({ length: 36 }, (_, i) => ({ left: rand(i, 1) * 100, delay: rand(i, 2), dur: 700 + rand(i, 3) * 800, h: 12 + rand(i, 4) * 20, op: 0.12 + rand(i, 5) * 0.3 }));
const STARS = Array.from({ length: 20 }, (_, i) => ({ left: rand(i, 6) * 100, top: 4 + rand(i, 7) * 50, size: 1.5 + rand(i, 8) * 1.5, dur: 2000 + rand(i, 9) * 3000 }));
const PEBBLES = Array.from({ length: 34 }, (_, i) => ({ left: rand(i, 11) * 100, top: 10 + rand(i, 12) * 85, w: 6 + rand(i, 13) * 14, h: 4 + rand(i, 14) * 8, op: 0.15 + rand(i, 15) * 0.25 }));
const GEMS = Array.from({ length: 6 }, (_, i) => ({ left: 4 + rand(i, 16) * 88, top: 20 + rand(i, 17) * 70, code: i % 2 ? "1f48e" : "1faa8" }));

/** Giá trị chạy vòng 0 → 1 (→ 0 nếu back) mãi mãi — cho hiệu ứng nền */
function useLoop(duration: number, { back = false, delay = 0 } = {}) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const ease = back ? Easing.inOut(Easing.ease) : Easing.linear;
    const seq = back
      ? Animated.sequence([Animated.timing(v, { toValue: 1, duration: duration / 2, easing: ease, useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: duration / 2, easing: ease, useNativeDriver: true })])
      : Animated.timing(v, { toValue: 1, duration, easing: ease, useNativeDriver: true });
    const loop = Animated.loop(seq, { iterations: -1, resetBeforeIteration: !back });
    const timer = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [v, duration, back, delay]);
  return v;
}

/** Nhấp nhô (thuyền, chim, thợ mỏ) */
function Bob({ children, style, fast }: { children: ReactNode; style?: ViewStyle; fast?: boolean }) {
  const v = useLoop(fast ? 350 : 2400, { back: true });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, fast ? 3 : -4] }) },
            { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", fast ? "-8deg" : "-3deg"] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function Streak({ s, height }: { s: (typeof STREAKS)[number]; height: number }) {
  const v = useLoop(s.dur, { delay: s.delay * s.dur });
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: -40,
        left: `${s.left}%`,
        width: 1,
        height: s.h,
        opacity: s.op,
        backgroundColor: "#bae6fd",
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, height * 1.1] }) }],
      }}
    />
  );
}

function Star({ s }: { s: (typeof STARS)[number] }) {
  const v = useLoop(s.dur, { back: true, delay: s.left * 30 });
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: `${s.left}%`,
        top: `${s.top}%`,
        width: s.size,
        height: s.size,
        borderRadius: s.size,
        backgroundColor: "#fef3c7",
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }),
      }}
    />
  );
}

/** Nền "rain": mây, mưa · đáy: mặt nước, thuyền, chim cánh cụt */
const RainScenery = memo(function RainScenery({ height }: { height: number }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
      <View style={{ position: "absolute", top: -70, left: "5%", width: "45%", height: 130, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.25)" }} />
      <View style={{ position: "absolute", top: -80, right: 0, width: "50%", height: 140, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.2)" }} />
      {height > 0 && STREAKS.map((s, i) => <Streak key={i} s={s} height={height} />)}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 48,
          borderTopWidth: 2,
          borderTopColor: "rgba(103,232,249,0.8)",
          backgroundImage: "linear-gradient(to bottom, rgba(6,182,212,0.3), #05233a)",
          boxShadow: "0 -6px 24px rgba(34,211,238,0.35)",
        }}
      />
      <Bob style={{ position: "absolute", bottom: 36, left: 16 }}>
        <Image source={emoji("1f427")} style={{ width: 44, height: 44 }} />
      </Bob>
      <Bob style={{ position: "absolute", bottom: 20, left: "50%", marginLeft: -22 }}>
        <Image source={emoji("26f5")} style={{ width: 44, height: 44 }} />
      </Bob>
    </View>
  );
});

function HookSwing() {
  const v = useLoop(2600, { back: true });
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: PULLEY_Y,
        left: "50%",
        width: 20,
        marginLeft: -10,
        alignItems: "center",
        transformOrigin: "top",
        transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ["14deg", "-14deg"] }) }],
      }}
    >
      <View style={{ width: 2, height: 64, backgroundColor: "rgba(254,243,199,0.7)" }} />
      <Image source={emoji("1fa9d")} style={{ width: 20, height: 20, marginTop: -4 }} />
    </Animated.View>
  );
}

/** Nền "gold": trời sao, mặt đất có giàn ròng rọc + thợ mỏ, lòng đất sỏi đá tối dần */
const GoldScenery = memo(function GoldScenery({ reeling }: { reeling: boolean }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: SKY, backgroundImage: "linear-gradient(to bottom, #0e1a26, #2a3442)" }}>
        {STARS.map((s, i) => (
          <Star key={i} s={s} />
        ))}
      </View>
      <View style={{ position: "absolute", top: SKY, left: 0, right: 0, bottom: 0, backgroundImage: "linear-gradient(to bottom, #6b4520 0%, #4a2e14 30%, #2e1c0b 65%, #120a04 100%)" }}>
        {PEBBLES.map((p, i) => (
          <View key={i} style={{ position: "absolute", left: `${p.left}%`, top: `${p.top}%`, width: p.w, height: p.h, borderRadius: 99, backgroundColor: "#000", opacity: p.op }} />
        ))}
        {GEMS.map((g, i) => (
          <Image key={i} source={emoji(g.code)} style={{ position: "absolute", left: `${g.left}%`, top: `${g.top}%`, width: 20, height: 20, opacity: 0.4 }} />
        ))}
      </View>
      {/* Mặt đất + giàn ròng rọc ở giữa + thợ mỏ đứng cạnh */}
      <View style={{ position: "absolute", top: SKY, left: 0, right: 0, height: 6, borderTopWidth: 2, borderTopColor: "rgba(77,124,15,0.7)", backgroundColor: "#8b6a3a" }} />
      {[22, -22].map((deg) => (
        <View
          key={deg}
          style={{ position: "absolute", top: PULLEY_Y, left: "50%", marginLeft: -3, width: 6, height: 46, borderRadius: 3, backgroundColor: "#7a4e25", transformOrigin: "top", transform: [{ rotate: `${deg}deg` }] }}
        />
      ))}
      <View style={{ position: "absolute", top: PULLEY_Y - 6, left: "50%", marginLeft: -7, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "#3b2410", backgroundColor: "#fde68a" }} />
      {!reeling && <HookSwing />}
      <Bob fast={reeling} key={reeling ? "pull" : "idle"} style={{ position: "absolute", top: SKY - 46, left: "50%", marginLeft: -100 }}>
        <Image source={emoji("1f477")} style={{ width: 46, height: 46 }} />
      </Bob>
    </View>
  );
});

/** Gợi ý: chữ đầu + ô trống; giọt đang gõ thì hiện phần đã gõ đúng, hint = lộ chữ kế tiếp */
function Slots({ word, typed, hint, th }: { word: string; typed: string | null; hint: boolean; th: Theme }) {
  const n = typed?.length ?? 0;
  return (
    // Từ dài: 2 dòng rồi mới thu nhỏ chữ — không bé tới mức khó đọc
    <Text numberOfLines={word.length > 14 ? 2 : 1} adjustsFontSizeToFit style={{ fontFamily: MONO, fontSize: 16, fontWeight: "800", letterSpacing: 2.5, textAlign: "center", color: th.empty }}>
      {[...word].map((c, i) => {
        if (i < n || !/\p{L}/u.test(c))
          return (
            <Text key={i} style={{ color: "#fff" }}>
              {c}
            </Text>
          );
        if (i === 0 || (hint && i === n))
          return (
            <Text key={i} style={{ color: C.amber }}>
              {c}
            </Text>
          );
        return (
          <Text key={i} style={{ color: typed && i === n ? th.cursor : th.empty }}>
            _
          </Text>
        );
      })}
    </Text>
  );
}

function RoundBtn({ icon, label, onPress, on, th, style }: { icon: SFSymbol; label: string; onPress: () => void; on?: boolean; th: Theme; style?: ViewStyle }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: pressed ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.45)" },
        on && th.on,
        style,
      ]}
    >
      <SymbolView name={icon} size={16} tintColor="#fff" />
    </Pressable>
  );
}

function LevelTile({ level, size = 44 }: { level: string; size?: number }) {
  const c = LEVEL_COLORS[level[0]] ?? LEVEL_COLORS.A;
  return (
    <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", borderBottomWidth: 3, borderBottomColor: "rgba(0,0,0,0.35)" }}>
      <Text style={{ color: c.fg, fontSize: size * 0.4, fontWeight: "900" }}>{level || "Aa"}</Text>
    </View>
  );
}

/** Nút chính kiểu "nổi" theo màu game */
function ToneButton({ title, icon, onPress, th, disabled, style }: { title: string; icon?: SFSymbol; onPress: () => void; th: Theme; disabled?: boolean; style?: ViewStyle }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingHorizontal: 18,
          height: 48,
          borderRadius: 14,
          backgroundColor: th.button.bg,
          borderBottomWidth: pressed ? 2 : 4,
          borderBottomColor: th.button.shadow,
          transform: [{ translateY: pressed ? 2 : 0 }],
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {icon && <SymbolView name={icon} size={15} tintColor={th.button.fg} />}
      <Text style={{ color: th.button.fg, fontSize: 15, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" }}>{title}</Text>
    </Pressable>
  );
}

function PlainButton({ title, icon, onPress, disabled, style }: { title: string; icon?: SFSymbol; onPress: () => void; disabled?: boolean; style?: ViewStyle }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14, height: 48, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: pressed ? C.border : C.card2, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      {icon && <SymbolView name={icon} size={15} tintColor={C.text} />}
      <Text style={{ color: C.text, fontSize: 15, fontWeight: "700" }}>{title}</Text>
    </Pressable>
  );
}

export default function FallingWords({ variant }: { variant: Variant }) {
  const cfg = RULES[variant];
  const th = TH[variant];
  const { t } = useI18n();
  const { user } = useAuth();
  const [decks, setDecks] = useState<DeckOption[] | null>(null);
  const [deck, setDeck] = useState("");
  const [stats, setStats] = useState<Record<string, DeckStats>>({});
  const [sound, setSound] = useState(true);
  const [phase, setPhase] = useState<Phase>("menu");
  const [view, setView] = useState<Snap | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [bad, setBad] = useState<{ key: string; n: number } | null>(null); // phím vừa gõ sai (n: để rung lại mỗi lần sai)
  const [speakingId, setSpeakingId] = useState<number | null>(null); // giọt đang được đọc to
  const [area, setArea] = useState({ w: 0, h: 0 }); // cỡ vùng rơi (px)
  const [fieldH, setFieldH] = useState(0);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [shake] = useState(() => new Animated.Value(0));
  const [speech] = useState(() => speechLine());
  const game = useRef<Game | null>(null);
  const cache = useRef(new Map<string, { words: GameWord[]; topics: Topic[] }>());
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const badTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const current = decks?.find((d) => d.slug === deck) ?? decks?.[0];
  const cleared = (current && stats[current.slug]?.cleared) || 0;
  const best = (current && stats[current.slug]?.best) || 0;
  const playing = phase === "play" || phase === "pause";

  // Tải lựa chọn đã lưu + danh sách bộ từ + kỷ lục / tiến độ mốc từng bộ
  useEffect(() => {
    let alive = true;
    (async () => {
      const [d, s] = await Promise.all([load(`${cfg.store}-deck`), load(`${cfg.store}-sound`)]);
      if (!alive) return;
      if (s) setSound(s !== "false");
      let list: DeckOption[] = [];
      try {
        const r = await api<{ decks: DeckSummary[] }>("/vocab/decks");
        list = r.decks
          .filter((x) => x.wordCount > 0 && x.gameReady !== false)
          .map((x) => ({ slug: x.slug, title: x.title, level: x.level, wordCount: x.wordCount, topicCount: x.topicCount ?? 0 }));
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
      const entries = await Promise.all(
        list.map(async (x) => {
          const [m, b] = await Promise.all([load(`${cfg.store}-milestone-${x.slug}`), load(`${cfg.store}-best-${x.slug}`)]);
          return [x.slug, { cleared: num(m), best: num(b) }] as const;
        }),
      );
      if (!alive) return;
      setStats(Object.fromEntries(entries));
      setDecks(list);
      setDeck(d && list.some((x) => x.slug === d) ? d : (list[0]?.slug ?? ""));
    })();
    return () => {
      alive = false;
      clearTimeout(noteTimer.current);
      clearTimeout(badTimer.current);
      speech.clear();
      stopSpeaking();
    };
  }, [cfg.store, speech]);

  const pickDeck = (slug: string) => {
    setDeck(slug);
    save(`${cfg.store}-deck`, slug);
  };
  const putStats = (slug: string, patch: Partial<DeckStats>) => {
    setStats((s) => ({ ...s, [slug]: { ...(s[slug] ?? { cleared: 0, best: 0 }), ...patch } }));
    if (patch.cleared !== undefined) save(`${cfg.store}-milestone-${slug}`, patch.cleared);
    if (patch.best !== undefined) save(`${cfg.store}-best-${slug}`, patch.best);
  };
  const recordBest = (g: Game) => {
    if (current && g.score > g.best) putStats(current.slug, { best: g.score });
  };

  /** Đọc to từ của 1 giọt (biến thể "gold": khi xuất hiện, khi chạm vào, nút tai) — chạy qua hàng đọc */
  const saying = (d: Pick<Drop, "id" | "w">) => (done: () => void) => {
    setSpeakingId(d.id);
    speakGerman(fullWord(d.w), {
      onEnd: () => {
        setSpeakingId((id) => (id === d.id ? null : id));
        done();
      },
    }).catch(done);
  };
  const sayDrop = (d: Pick<Drop, "id" | "w">) => speech.now(saying(d));
  /** Nghe lại giọt đang gõ, chưa gõ thì giọt thấp nhất */
  const listenAgain = () => {
    const g = game.current;
    const d = g?.drops.find((d) => d.id === g.targetId) ?? g?.drops.filter((d) => d.state === "fall").sort((a, b) => b.y - a.y)[0];
    if (d) sayDrop(d);
  };
  const onSpawn = useEffectEvent((d: Drop) => cfg.listen && speech.word(saying(d), () => d.state === "fall"));
  const fit = useEffectEvent((g: Game) => fitField(g, area.w, area.h, dropWidth(variant, area.w), DROP_H));

  // Hết lượt chơi: bỏ các câu đang chờ · tạm dừng thì ngừng đọc luôn (thắng / thua: đọc nốt từ vừa gõ xong)
  useEffect(() => {
    if (phase === "play") return;
    speech.clear();
    if (phase === "pause") stopSpeaking();
  }, [phase, speech]);

  // Vòng lặp game
  useEffect(() => {
    if (phase !== "play") return;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const g = game.current!;
      fit(g);
      step(g, Math.min((now - last) / 1000, 0.1)); // máy bị treo lâu → không nhảy cóc
      last = now;
      if (g.fresh) {
        onSpawn(g.fresh);
        g.fresh = null;
      }
      setView(snapshot(g));
      if (g.lives <= 0) return setPhase("over");
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // App xuống nền → tạm dừng
    const sub = AppState.addEventListener("change", (s) => s !== "active" && setPhase("pause"));
    return () => {
      cancelAnimationFrame(raf);
      sub.remove();
    };
  }, [phase]);

  // Rời màn hình (vd. mở màn khác) → tạm dừng, ngừng đọc
  useFocusEffect(
    useCallback(
      () => () => {
        setPhase((p) => (p === "play" ? "pause" : p));
        speech.clear();
        stopSpeaking();
      },
      [speech],
    ),
  );

  // Gõ sai → giọt đang gõ rung
  useEffect(() => {
    if (!bad) return;
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: -6, duration: 75, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 150, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 75, useNativeDriver: true }),
    ]).start();
  }, [bad, shake]);

  const flash = (text: string) => {
    clearTimeout(noteTimer.current);
    setNote(text);
    noteTimer.current = setTimeout(() => setNote(null), text.includes("\n") ? 3500 : 2200);
  };

  /** Focus ô nhập ẩn để bàn phím hệ thống hiện lên */
  const focusInput = () => requestAnimationFrame(() => inputRef.current?.focus());

  /** Vào ván: từ mốc đã lưu (from) — hết mốc rồi thì chơi lại từ đầu */
  async function start(from = cleared) {
    if (!current) return;
    setError("");
    let data = cache.current.get(current.slug);
    if (!data) {
      setPhase("loading");
      try {
        data = await api<{ words: GameWord[]; topics: Topic[] }>(`/games/words?deck=${encodeURIComponent(current.slug)}`);
        cache.current.set(current.slug, data);
      } catch (e) {
        setError((e as Error).message);
        setPhase("menu");
        return;
      }
    }
    if (!data.words.length || !data.topics.length) {
      setPhase("menu");
      return;
    }
    game.current = newGame(cfg, data.words, data.topics, from < data.topics.length ? from : 0, best);
    setView(snapshot(game.current));
    setBad(null);
    setNote(null);
    setSaved(null);
    setPhase("play");
    focusInput();
  }

  const resume = () => {
    setPhase("play");
    focusInput();
    if (cfg.listen) listenAgain(); // tạm dừng đã ngắt tiếng → đọc lại cho khỏi quên từ
  };
  const pause = () => {
    inputRef.current?.blur();
    setPhase("pause");
  };
  /** Thoát: đang chơi dở mà đã gõ / trượt từ nào → hiện kết quả để còn lưu từ trượt, không thì về màn chọn bộ từ */
  const quit = () => {
    inputRef.current?.blur();
    speech.clear();
    stopSpeaking();
    const g = game.current;
    if (playing && g && (g.hits || g.missed.length)) {
      setView(snapshot(g));
      setPhase("over");
    } else setPhase("menu");
  };

  /** Lời báo lên cấp */
  const levelNote = (level: number) => {
    const more = cfg.drops(level) > cfg.drops(level - 1);
    return t(more ? (variant === "gold" ? "games.levelUpGold" : "games.levelUpRain") : variant === "gold" ? "games.fasterGold" : "games.fasterRain", { n: level });
  };

  /** Vượt mốc: sang chủ đề kế (+1 mạng); hết chủ đề → thắng */
  function clearMilestone(g: Game, level: number | null) {
    const done = g.milestone + 1;
    if (current && done > cleared) putStats(current.slug, { cleared: done });
    if (done >= g.topics.length) {
      setView(snapshot(g));
      inputRef.current?.blur();
      setPhase("win");
      return;
    }
    flash(t("games.milestoneDone", { n: done, title: g.topics[g.milestone].title }) + (level ? `\n${levelNote(level)}` : ""));
    nextMilestone(g);
  }

  /** Bắn trúng giọt vừa gõ xong */
  function hit(g: Game, d: Drop) {
    const { milestone, levelUp: level } = scoreHit(g, d);
    recordBest(g); // lưu ngay: thoát giữa ván / tắt app vẫn giữ kỷ lục
    if (sound) speech.bonus((done) => void speakGerman(fullWord(d.w), { onEnd: done }).catch(done));
    if (milestone) clearMilestone(g, level);
    else if (level) flash(levelNote(level));
  }

  /** 1 phím (bàn phím trên màn hình / hệ thống) */
  function handleKey(key: string) {
    const g = game.current;
    if (!g || phase !== "play") return;
    if (key === "Backspace") backspace(g);
    else if (key === "Enter") untarget(g); // bỏ giọt đang gõ để chọn giọt khác
    else if (key === " " && cfg.listen) listenAgain();
    else if (key.length === 1 && /\p{L}/u.test(key)) {
      const r = press(g, key.toLowerCase());
      clearTimeout(badTimer.current);
      if (r === "wrong") {
        setBad((b) => ({ key, n: (b?.n ?? 0) + 1 }));
        badTimer.current = setTimeout(() => setBad(null), 700);
      } else {
        setBad(null);
        if (r !== "ok") hit(g, r);
      }
    } else return;
    setView(snapshot(g));
  }

  async function saveMissed() {
    if (!view || !current) return;
    setSaving(true);
    try {
      const keys = [...new Set(view.missed.map((w) => w.key))];
      const r = await api<{ added: number }>(`/vocab/decks/${encodeURIComponent(current.slug)}`, { method: "POST", body: { keys } });
      setSaved(r.added ? t("games.saved", { n: r.added }) : t("games.savedNone"));
    } catch (e) {
      setSaved((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const header = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
      <Pressable onPress={playing ? quit : () => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel={playing ? t("games.changeDeck") : t("close")} style={{ padding: 4 }}>
        <SymbolView name="chevron.left" size={22} tintColor={C.amber} />
      </Pressable>
      <View style={{ width: 38, height: 38, borderRadius: 11, borderWidth: 1, borderColor: th.tileBorder, backgroundColor: th.tile, alignItems: "center", justifyContent: "center" }}>
        <SymbolView name={th.icon} size={18} tintColor={th.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: "800" }}>{t(`games.${variant}.title`)}</Text>
        <Text numberOfLines={1} style={{ color: th.soft, fontSize: 12 }}>
          {t(`games.${variant}.subtitle`)}
        </Text>
      </View>
    </View>
  );

  // ---- Màn chọn bộ từ ----
  if (phase === "menu" || phase === "loading") {
    const total = Math.max(current?.topicCount ?? 1, 1);
    const from = cleared < total ? cleared : 0;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={["top", "bottom"]}>
        <Stack.Screen options={{ headerShown: false }} />
        {header}
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 14, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: th.tileBorder, backgroundColor: th.tile }}>
            <Image source={emoji(variant === "gold" ? "1f477" : "1f327-fe0f")} style={{ width: 44, height: 44 }} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: "800" }}>{t("games.chooseDeck")}</Text>
              <Text style={{ color: th.soft, fontSize: 13, lineHeight: 18 }}>
                {t(`games.${variant}.intro`, { n: MILESTONE_GOAL })} {t("games.typing")}
              </Text>
            </View>
          </View>
          <ErrorText>{error}</ErrorText>
          {!decks && !error && <ActivityIndicator color={th.accent} style={{ marginTop: 24 }} />}
          {decks?.map((d) => {
            const sel = d.slug === current?.slug;
            const n = Math.max(d.topicCount, 1);
            const done = Math.min(stats[d.slug]?.cleared ?? 0, n);
            return (
              <Pressable
                key={d.slug}
                onPress={() => pickDeck(d.slug)}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: sel ? th.accent : C.border,
                  backgroundColor: sel ? th.tile : pressed ? C.card2 : C.card,
                })}
              >
                <LevelTile level={d.level} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: C.text, fontSize: 16, fontWeight: "800" }} numberOfLines={1}>
                    {d.title}
                  </Text>
                  <Text style={{ color: th.soft, fontSize: 13 }}>{t("games.deckInfo", { n: d.wordCount, m: n })}</Text>
                  {done > 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: C.card2 }}>
                        <View style={{ width: `${(done / n) * 100}%`, height: "100%", borderRadius: 3, backgroundColor: th.bar }} />
                      </View>
                      <Text style={{ color: C.muted, fontSize: 12, fontWeight: "700" }}>
                        {done}/{n}
                      </Text>
                    </View>
                  )}
                </View>
                {sel && <SymbolView name="checkmark.circle.fill" size={22} tintColor={th.accent} />}
              </Pressable>
            );
          })}
          {decks && !decks.length && !error && <Text style={{ color: C.muted, textAlign: "center" }}>{t("decks.empty")}</Text>}
        </ScrollView>
        {/* Thanh bắt đầu ở đáy */}
        {current && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 12, marginBottom: 8, padding: 10, borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: C.card }}>
            <LevelTile level={current.level} size={40} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: C.text, fontWeight: "800", fontSize: 15 }}>
                {current.title}
              </Text>
              <Text numberOfLines={1} style={{ color: th.soft, fontSize: 12 }}>
                {from ? t("games.continueAt", { n: current.wordCount, m: from + 1, total }) : t("games.deckInfo", { n: current.wordCount, m: total })}
                {best > 0 ? t("games.bestSuffix", { n: best }) : ""}
              </Text>
            </View>
            {from > 0 && <PlainButton title={t("games.fromStart")} onPress={() => start(0)} disabled={phase === "loading"} style={{ paddingHorizontal: 10 }} />}
            <ToneButton title={phase === "loading" ? t("loading") : t("games.start")} icon="play.fill" th={th} disabled={phase === "loading"} onPress={() => start(from)} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ---- Màn chơi ----
  const v = view!;
  const topic = v.topics[v.milestone];
  const target = v.drops.find((d) => d.id === v.targetId && d.state === "fall") ?? null;
  const missed = [...new Map(v.missed.map((w) => [w.key, w])).values()];
  const dropW = dropWidth(variant, area.w);
  // "gold": ròng rọc ở giữa SÂN (vùng rơi lệch trái: giữa sân = giữa vùng rơi + (right - left) / 2), tính theo toạ độ vùng rơi
  const pulley = { x: area.w / 2 + (INSET.right - INSET.left) / 2, y: PULLEY_Y - AREA.gold.top };
  const reels =
    variant === "gold"
      ? v.drops
          .filter((d) => d.state === "hit")
          .map((d) => {
            const from = { x: (area.w - dropW) * d.x + dropW / 2, y: d.y * (area.h - DROP_H) + DROP_H / 2 };
            return { id: d.id, ...reelAt(Math.min((v.time - d.at) / REEL, 1), from, pulley) };
          })
      : [];
  const reelOf = new Map(reels.map((r) => [r.id, r]));
  const box = AREA[variant];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {header}
        <Pressable
          onPress={() => phase === "play" && focusInput()}
          accessible={false}
          onLayout={(e) => setFieldH(e.nativeEvent.layout.height)}
          style={{ flex: 1, marginHorizontal: 8, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", backgroundImage: th.field }}
        >
          {variant === "gold" ? <GoldScenery reeling={!!reels.length} /> : <RainScenery height={fieldH} />}
          {/* Nhãn đáy: tên bộ từ, gõ sai thì hiện phím sai */}
          <View pointerEvents="none" style={{ position: "absolute", bottom: 6, left: 0, right: 0, alignItems: "center" }}>
            <Text numberOfLines={1} style={{ maxWidth: 200, overflow: "hidden", borderRadius: 99, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 10, paddingVertical: 2, fontSize: 11, fontWeight: "700", color: bad ? "#fca5a5" : "#fff" }}>
              {bad ? `✕ ${bad.key}` : current?.title}
            </Text>
          </View>

          {/* Vùng rơi */}
          <View
            onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
            style={{ position: "absolute", left: INSET.left, right: INSET.right, top: box.top, bottom: box.bottom }}
          >
            {area.w > 0 &&
              v.drops.map((d) => {
                const isTarget = d.id === target?.id;
                const reel = reelOf.get(d.id);
                const done = d.state === "hit" || d.state === "miss";
                const age = Math.min((v.time - d.at) / 0.7, 1); // 0…1 hiệu ứng nổ / mờ dần
                let scale = 1;
                let lift = 0;
                let opacity = 1;
                if (d.state === "hit" && variant === "rain") {
                  scale = age < 0.25 ? 1 + 0.6 * age : 1.15 - (0.1 * (age - 0.25)) / 0.75;
                  lift = age < 0.25 ? 0 : (-28 * (age - 0.25)) / 0.75;
                  opacity = 1 - age;
                } else if (d.state === "miss" || d.state === "gone") opacity = 1 - age * age;
                const pos = reel
                  ? { left: reel.at.x - dropW / 2, top: reel.at.y - DROP_H / 2, opacity: reel.opacity, zIndex: 1, transform: [{ scale: reel.scale }] }
                  : { left: (area.w - dropW) * d.x, top: d.y * (area.h - DROP_H), opacity, transform: [{ translateY: lift }, { scale }] };
                const look =
                  d.state === "hit"
                    ? variant === "gold"
                      ? { borderColor: "#fef08a", backgroundColor: "rgba(138,101,20,0.97)", boxShadow: "0 0 24px rgba(250,204,21,0.7)" }
                      : { borderColor: C.accent, backgroundColor: "rgba(22,163,74,0.25)" }
                    : d.state === "miss"
                      ? { borderColor: C.red, backgroundColor: "rgba(220,38,38,0.25)" }
                      : d.state === "gone"
                        ? th.gone
                        : isTarget
                          ? th.target
                          : d.y > 0.8
                            ? { ...th.drop, borderColor: "rgba(220,38,38,0.75)" }
                            : th.drop;
                return (
                  <Animated.View
                    key={d.id}
                    style={{ position: "absolute", width: dropW, height: DROP_H, ...pos, transform: isTarget ? [{ translateX: shake }, ...pos.transform] : pos.transform }}
                  >
                    <Pressable
                      disabled={!cfg.listen || d.state !== "fall"}
                      onPress={() => sayDrop(d)} // "gold": chạm vào cục vàng → nghe lại
                      accessibilityLabel={cfg.listen ? t("games.listenAgain") : d.w.meaning}
                      style={[
                        {
                          flex: 1,
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 2,
                          paddingHorizontal: 8,
                          borderWidth: 1,
                          borderRadius: variant === "gold" ? 20 : 12,
                          borderTopLeftRadius: variant === "gold" ? 14 : 12,
                          borderBottomRightRadius: variant === "gold" ? 16 : 12,
                        },
                        look,
                      ]}
                    >
                      {!cfg.listen ? (
                        <Text numberOfLines={1} style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                          {d.w.meaning}
                        </Text>
                      ) : done ? (
                        <Text numberOfLines={1} style={{ color: "rgba(254,243,199,0.8)", fontSize: 12 }}>
                          {d.w.meaning}
                        </Text>
                      ) : (
                        <View style={{ alignSelf: "stretch", height: 22, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center" }}>
                          <SymbolView name="speaker.wave.2.fill" size={14} tintColor={speakingId === d.id ? C.amber : "rgba(254,243,199,0.8)"} />
                        </View>
                      )}
                      {done ? (
                        <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 16, fontWeight: "800", color: d.state === "hit" ? (GENDER[d.w.gender] ?? C.accent) : C.redText }}>
                          {fullWord(d.w)}
                        </Text>
                      ) : (
                        <Slots word={d.w.word} typed={isTarget ? v.typed : null} hint={isTarget && v.wrong >= 2} th={th} />
                      )}
                    </Pressable>
                    {d.state === "hit" && (
                      <Text style={{ position: "absolute", top: -22, alignSelf: "center", color: "#a78bfa", fontSize: 16, fontWeight: "800" }}>+{d.points}</Text>
                    )}
                  </Animated.View>
                );
              })}
            {/* Dây móc: từ ròng rọc thả xuống cục vàng vừa gõ xong rồi kéo nó lên (móc ở mép trên cục vàng) */}
            {reels.map(({ id, tip }) => {
              const dx = tip.x - pulley.x;
              const dy = tip.y - 24 - pulley.y;
              const len = Math.hypot(dx, dy);
              return (
                <View key={`rope-${id}`} pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, zIndex: 2 }}>
                  <View
                    style={{
                      position: "absolute",
                      left: pulley.x + dx / 2 - len / 2,
                      top: pulley.y + dy / 2 - 1,
                      width: len,
                      height: 2,
                      backgroundColor: "rgba(254,243,199,0.8)",
                      transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                    }}
                  />
                  <Image source={emoji("1fa9d")} style={{ position: "absolute", left: pulley.x + dx - 12, top: pulley.y + dy - 12, width: 24, height: 24 }} />
                </View>
              );
            })}
          </View>

          {/* HUD: điểm · mốc · mạng + cột nút */}
          <View pointerEvents="box-none" style={{ position: "absolute", left: 10, right: 10, top: 10, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 99, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 10, height: 30 }}>
              <SymbolView name="trophy.fill" size={13} tintColor={C.amber} />
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14, fontVariant: ["tabular-nums"] }}>{v.score}</Text>
              {v.combo >= 3 && <Text style={{ color: C.amber, fontSize: 12, fontWeight: "700" }}>×{v.combo}</Text>}
            </View>
            <View style={{ flexShrink: 1, minWidth: 110, alignItems: "center", gap: 4, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 10, paddingVertical: 5 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <SymbolView name="flag.fill" size={12} tintColor={th.accent} />
                <Text numberOfLines={1} style={{ flexShrink: 1, color: "#fff", fontSize: 13 }}>
                  <Text style={{ fontWeight: "800" }}>{t("games.milestone", { n: v.milestone + 1, total: v.topics.length })}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.7)" }}>{` · ${t("games.level", { n: levelOf(v.hits) })} · ${topic.icon} ${topic.title}`}</Text>
                </Text>
              </View>
              <View style={{ alignSelf: "stretch", height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)" }}>
                <View style={{ width: `${Math.min(v.mHits / Math.max(v.goal, 1), 1) * 100}%`, height: "100%", borderRadius: 2, backgroundColor: th.bar }} />
              </View>
            </View>
            <View pointerEvents="box-none" style={{ alignItems: "flex-end", gap: 8 }}>
              <View accessibilityLabel={t("games.lives", { n: v.lives })} style={{ flexDirection: "row", gap: 2, borderRadius: 99, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 8, height: 30, alignItems: "center" }}>
                {Array.from({ length: cfg.lives }, (_, i) => (
                  <SymbolView key={i} name="heart.fill" size={13} tintColor={i < v.lives ? "#ef4444" : "rgba(255,255,255,0.2)"} />
                ))}
              </View>
              {cfg.listen && (
                <Pressable
                  onPress={listenAgain}
                  accessibilityRole="button"
                  accessibilityLabel={t("games.listenAgain")}
                  style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: C.amber, opacity: pressed ? 0.8 : 1, boxShadow: "0 0 14px rgba(250,204,21,0.5)" })}
                >
                  <SymbolView name="ear" size={17} tintColor="#451a03" />
                </Pressable>
              )}
              <RoundBtn th={th} icon="xmark" label={t("games.quit")} onPress={quit} />
              <RoundBtn th={th} icon={phase === "play" ? "pause.fill" : "play.fill"} label={phase === "play" ? t("games.pause") : t("games.resume")} onPress={phase === "play" ? pause : resume} />
              <RoundBtn
                th={th}
                icon={sound ? "speaker.wave.2.fill" : "speaker.slash.fill"}
                label={sound ? t("games.soundOff") : t("games.soundOn")}
                onPress={() => {
                  setSound(!sound);
                  save(`${cfg.store}-sound`, !sound);
                }}
              />
            </View>
          </View>

          {note && (
            <View pointerEvents="none" style={{ position: "absolute", top: 84, left: 0, right: 0, alignItems: "center", zIndex: 10 }}>
              <Text style={{ maxWidth: "88%", overflow: "hidden", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: th.note.bg, color: th.note.fg, fontSize: 14, fontWeight: "700", textAlign: "center" }}>{note}</Text>
            </View>
          )}

          {/* Lớp phủ: tạm dừng / thua / thắng */}
          {phase !== "play" && (
            <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 20, backgroundColor: th.overlay }}>
              <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 18, gap: 14, alignItems: "center" }}>
                {phase === "pause" ? (
                  <>
                    <Text style={{ color: C.text, fontSize: 22, fontWeight: "800" }}>{t("games.paused")}</Text>
                    <ToneButton title={t("games.resume")} icon="play.fill" th={th} onPress={resume} style={{ alignSelf: "stretch" }} />
                    <PlainButton title={t("games.quit")} onPress={quit} style={{ alignSelf: "stretch" }} />
                  </>
                ) : (
                  <>
                    <Text style={{ color: C.text, fontSize: 22, fontWeight: "800" }}>{phase === "win" ? t("games.win") : v.lives > 0 ? t("games.quitDone") : t("games.over")}</Text>
                    <Text style={{ color: "#a78bfa", fontSize: 48, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{v.score}</Text>
                    {v.score > v.best ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <SymbolView name="trophy.fill" size={18} tintColor={C.amber} />
                        <Text style={{ color: C.amber, fontWeight: "800" }}>{t("games.newBest")}</Text>
                      </View>
                    ) : (
                      <Text style={{ color: C.muted }}>{t("games.best", { n: best })}</Text>
                    )}
                    <Text style={{ color: C.muted, textAlign: "center" }}>
                      {t(cfg.listen ? "games.hitsGold" : "games.hitsRain", { n: v.hits })} ·{" "}
                      {phase === "win" ? t("games.allCleared", { n: v.topics.length }) : t("games.stoppedAt", { n: v.milestone + 1, total: v.topics.length })}
                    </Text>
                    {!!missed.length && (
                      <View style={{ alignSelf: "stretch", gap: 8 }}>
                        <Text style={{ color: C.text, fontWeight: "800", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>{t("games.missed")}</Text>
                        <View style={{ borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card }}>
                          {missed.map((w, i) => (
                            <Pressable
                              key={w.key}
                              onPress={() => speakGerman(fullWord(w)).catch(() => {})}
                              style={({ pressed }) => ({ flexDirection: "row", alignItems: "baseline", gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: C.border, opacity: pressed ? 0.7 : 1 })}
                            >
                              <Text style={{ color: C.text, fontWeight: "800", fontSize: 15 }}>
                                {!!GENDER[w.gender] && <Text style={{ color: GENDER[w.gender] }}>{w.gender} </Text>}
                                {w.word}
                              </Text>
                              <Text numberOfLines={1} style={{ flex: 1, textAlign: "right", color: C.muted, fontSize: 13 }}>
                                {w.meaning}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                        {saved ? (
                          <Text style={{ color: C.accent, fontWeight: "700", textAlign: "center" }}>{saved}</Text>
                        ) : user ? (
                          <PlainButton title={t("games.saveMissed")} icon="bookmark.fill" onPress={saveMissed} disabled={saving} />
                        ) : (
                          <Text style={{ color: C.muted, fontSize: 13, textAlign: "center" }}>{t("games.loginToSave")}</Text>
                        )}
                      </View>
                    )}
                    <View style={{ flexDirection: "row", gap: 10, alignSelf: "stretch" }}>
                      <PlainButton title={t("games.changeDeck")} onPress={quit} style={{ flex: 1 }} />
                      <ToneButton
                        title={phase === "win" ? t("games.playAgain") : t("games.replayMilestone", { n: v.milestone + 1 })}
                        icon="arrow.counterclockwise"
                        th={th}
                        onPress={() => start(phase === "win" ? 0 : v.milestone)}
                        style={{ flex: 1.3, paddingHorizontal: 8 }}
                      />
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          )}
        </Pressable>

        {/* Ô nhập ẩn: bàn phím hệ thống / bàn phím rời (luôn để trống, chữ chuyển ngay cho game) */}
        <TextInput
          ref={inputRef}
          value=""
          onChangeText={(s) => [...s].forEach(handleKey)}
          onKeyPress={(e) => e.nativeEvent.key === "Backspace" && handleKey("Backspace")}
          onSubmitEditing={() => handleKey("Enter")}
          submitBehavior="submit"
          editable={phase === "play"}
          autoCorrect={false}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          keyboardAppearance="dark"
          returnKeyType="next"
          accessibilityLabel={t("study.typeWord")}
          style={{ position: "absolute", left: 0, bottom: 0, width: 1, height: 1, opacity: 0 }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
