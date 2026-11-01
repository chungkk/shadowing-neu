"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Crown, Globe, Lock, LogOut, Mic, MicOff, PhoneCall, UserX, Users, X } from "lucide-react";
import Avatar from "./Avatar";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { SprechenCall, initialCallState, type CallState } from "@/lib/sprechen-call";
import { LEVELS, MAX_MEMBERS, MAX_TOPICS, TOPICS, type Level, type Member, type RoomView } from "@/lib/sprechen-types";

/** Câu hỏi gợi ý để bắt đầu nói — theo chủ đề của phòng, không có thì dùng câu chung */
const PROMPTS: Record<string, string[]> = {
  Alltag: ["Wie sieht dein typischer Tag aus?", "Was hast du am Wochenende gemacht?", "Was machst du gern nach der Arbeit?"],
  "Arbeit & Beruf": ["Was machst du beruflich?", "Was gefällt dir an deiner Arbeit?", "Wie sieht dein Traumjob aus?"],
  Studium: ["Was studierst du und warum?", "Wie lernst du am liebsten?", "Was ist schwierig am Deutschlernen?"],
  Reisen: ["Wohin bist du zuletzt gereist?", "Welche Stadt in Deutschland möchtest du besuchen?", "Reist du lieber allein oder mit Freunden?"],
  Essen: ["Was ist dein Lieblingsgericht?", "Kochst du gern? Was?", "Was ist typisch vietnamesisches Essen?"],
  Wohnen: ["Wie wohnst du — Wohnung, WG oder Haus?", "Beschreib dein Zimmer.", "Stadt oder Land — wo lebst du lieber?"],
  Familie: ["Erzähl von deiner Familie.", "Hast du Geschwister?", "Was macht ihr gern zusammen?"],
  Hobbys: ["Was sind deine Hobbys?", "Seit wann machst du das?", "Welches Hobby möchtest du anfangen?"],
  Musik: ["Welche Musik hörst du gern?", "Spielst du ein Instrument?", "Kennst du deutsche Bands oder Lieder?"],
  Sport: ["Treibst du Sport? Welchen?", "Wie oft gehst du ins Fitnessstudio?", "Welcher Sport ist in Vietnam beliebt?"],
  Filme: ["Welchen Film hast du zuletzt gesehen?", "Kennst du deutsche Filme oder Serien?", "Kino oder Streaming?"],
  Technik: ["Wie viele Stunden am Tag bist du am Handy?", "Welche App benutzt du am meisten?", "Hilft KI beim Deutschlernen?"],
  Gesundheit: ["Was machst du für deine Gesundheit?", "Wann warst du zuletzt beim Arzt?", "Schläfst du genug?"],
  Einkaufen: ["Kaufst du lieber online oder im Laden?", "Was hast du zuletzt gekauft?", "Spielst du die Rolle: Verkäufer und Kunde."],
  "Goethe-Prüfung": ["Teil 1: Stellt euch gegenseitig vor (Name, Herkunft, Beruf, Hobbys).", "Teil 2: Sprich 1 Minute über ein Thema, der Partner stellt eine Frage.", "Teil 3: Plant zusammen ein Treffen am Wochenende."],
  "telc-Prüfung": ["Kontaktaufnahme: Erzählt euch etwas über euch.", "Gespräch über ein Thema: Vor- und Nachteile nennen.", "Gemeinsam etwas planen: eine Party, einen Ausflug…"],
};
const DEFAULT_PROMPTS = ["Stell dich bitte kurz vor.", "Warum lernst du Deutsch?", "Was hast du heute gemacht?", "Was ist dein Ziel in diesem Jahr?"];

const chip = (on: boolean) =>
  `cursor-pointer rounded-xl border px-3 py-1.5 text-sm font-bold transition select-none ${
    on ? "border-accent bg-accent text-white shadow-[0_3px_0_var(--accent-dark)]" : "border-border bg-card-2 hover:border-accent"
  }`;

const userOf = (m: Member) => ({ id: m.userId, name: m.name, avatarAt: m.avatarAt });

export default function Sprechen({ me }: { me: { id: number; name: string } }) {
  const [s, setS] = useState<CallState>(initialCallState);
  const call = useRef<SprechenCall | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<string | null>(null);

  useEffect(() => {
    const c = new SprechenCall(setS);
    call.current = c;
    c.start();
    return () => c.stop();
  }, []);

  // Link mời vào phòng riêng: /sprechen?room=<id> (cần bấm nút để trình duyệt cho mở micro)
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("room");
    if (id) queueMicrotask(() => setInvite(id));
  }, []);

  const run = async (fn: (c: SprechenCall) => Promise<unknown>) => {
    if (!call.current) return;
    setError("");
    setBusy(true);
    try {
      await fn(call.current);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (s.room) return <Room s={s} onError={setError} error={error} call={call} />;

  return (
    <div className="flex flex-col gap-6">
      {s.notice && <Notice text={s.notice} />}
      {error && <Notice text={error} tone="red" onClose={() => setError("")} />}
      {invite && (
        <div className="card flex flex-wrap items-center gap-3 border-accent">
          <PhoneCall className="size-6 text-accent" />
          <p className="flex-1 font-bold">Bạn được mời vào một phòng luyện nói riêng.</p>
          <button
            className="btn btn-primary"
            disabled={busy || !s.connected}
            onClick={() =>
              run(async (c) => {
                await c.join(invite);
                setInvite(null);
                history.replaceState(null, "", "/sprechen");
              })
            }
          >
            Vào phòng
          </button>
          <button className="btn-icon" title="Bỏ qua" onClick={() => setInvite(null)}>
            <X className="size-5" />
          </button>
        </div>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Matcher s={s} busy={busy} run={run} />
          <p className="flex items-center justify-center gap-2 text-sm text-muted">
            <Users className="size-4" />
            <span className={`size-2 rounded-full ${s.connected ? "bg-accent" : "bg-red"}`} />
            {s.connected ? `${s.online} người đang online` : "Đang kết nối…"}
          </p>
        </div>
        <div className="flex flex-col gap-6">
          <CreateRoom busy={busy || !s.connected} run={run} me={me} />
          <RoomList rooms={s.rooms} busy={busy || !s.connected} run={run} me={me} />
        </div>
      </div>
    </div>
  );
}

type Run = (fn: (c: SprechenCall) => Promise<unknown>) => Promise<void>;

function Notice({ text, tone = "amber", onClose }: { text: string; tone?: "amber" | "red"; onClose?: () => void }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold ${
        tone === "red" ? "border-red/40 bg-red/10 text-red-300" : "border-amber/40 bg-amber/10 text-amber"
      }`}
    >
      <span className="flex-1">{text}</span>
      {onClose && (
        <button className="cursor-pointer opacity-70 hover:opacity-100" onClick={onClose} title="Đóng">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

/** Chọn trình độ + chủ đề rồi ghép ngẫu nhiên 1-1 với người cùng trình độ */
function Matcher({ s, busy, run }: { s: CallState; busy: boolean; run: Run }) {
  const [level, setLevel] = useLocalStorage<Level>("sprechen-level", "A2");
  const [topics, setTopics] = useLocalStorage<string[]>("sprechen-topics", []);
  const toggle = (t: string) =>
    setTopics(topics.includes(t) ? topics.filter((x) => x !== t) : topics.length < MAX_TOPICS ? [...topics, t] : topics);

  return (
    <section className="card flex flex-col gap-5 p-5">
      <div className="flex flex-col gap-3">
        <h2 className="label text-accent">Trình độ của bạn</h2>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button key={l} className={`${chip(l === level)} min-w-12`} onClick={() => setLevel(l)} disabled={s.waiting}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <h2 className="label text-accent">
          Chủ đề muốn nói <span className="font-bold tracking-normal text-muted normal-case">(không bắt buộc)</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <button key={t} className={chip(topics.includes(t))} onClick={() => toggle(t)} disabled={s.waiting}>
              {t}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          Đã chọn {topics.length}/{MAX_TOPICS}
        </p>
      </div>
      {s.waiting ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4 text-center">
          <span className="relative flex size-12 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-accent/40 motion-reduce:animate-none" />
            <Mic className="relative size-6 text-accent" />
          </span>
          <p className="font-bold">Đang tìm bạn luyện nói trình độ {level}…</p>
          <p className="text-xs text-muted">Giữ trang này mở. Khi có người, cuộc gọi tự bắt đầu.</p>
          <button className="btn" disabled={busy} onClick={() => run((c) => c.cancelMatch())}>
            Huỷ tìm
          </button>
        </div>
      ) : (
        <button className="btn btn-primary py-3 text-base" disabled={busy || !s.connected} onClick={() => run((c) => c.match(level, topics))}>
          <Mic className="size-5" /> Gọi ngẫu nhiên
        </button>
      )}
    </section>
  );
}

function CreateRoom({ busy, run, me }: { busy: boolean; run: Run; me: { name: string } }) {
  const [level] = useLocalStorage<Level>("sprechen-level", "A2");
  const [topics] = useLocalStorage<string[]>("sprechen-topics", []);
  const [name, setName] = useState("");
  const [max, setMax] = useState(MAX_MEMBERS);
  const [priv, setPriv] = useState(false);

  return (
    <form
      className="card flex flex-col gap-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        run((c) => c.create({ name: name.trim() || `Deutsch üben mit ${me.name}`, level, topics, max, private: priv }));
      }}
    >
      <h2 className="flex items-center gap-2 font-extrabold">
        <Users className="size-5 text-accent" /> Tạo phòng
      </h2>
      <label className="field text-sm font-bold">
        Tên phòng
        <input className="input text-foreground" value={name} maxLength={60} placeholder={`Deutsch üben mit ${me.name}`} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="flex flex-col gap-2 text-sm font-bold text-muted">
        Số người tối đa
        <div className="flex gap-2">
          {Array.from({ length: MAX_MEMBERS - 1 }, (_, i) => i + 2).map((n) => (
            <button type="button" key={n} className={`${chip(n === max)} size-10 px-0`} onClick={() => setMax(n)}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { on: !priv, icon: Globe, label: "Công khai", hint: "Ai cũng thấy", set: false },
          { on: priv, icon: Lock, label: "Riêng tư", hint: "Vào bằng link mời", set: true },
        ].map((o) => (
          <button
            type="button"
            key={o.label}
            onClick={() => setPriv(o.set)}
            className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
              o.on ? "border-accent bg-accent/10" : "border-border hover:border-accent"
            }`}
          >
            <o.icon className={`size-4 ${o.on ? "text-accent" : "text-muted"}`} />
            <span className="flex flex-col">
              <span className="text-sm font-bold">{o.label}</span>
              <span className="text-xs text-muted">{o.hint}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">
        Trình độ {level}
        {topics.length ? ` · ${topics.join(", ")}` : ""} (lấy theo lựa chọn bên cạnh)
      </p>
      <button className="btn btn-primary py-3 text-base" disabled={busy}>
        Tạo phòng
      </button>
    </form>
  );
}

function RoomList({ rooms, busy, run, me }: { rooms: RoomView[]; busy: boolean; run: Run; me: { id: number } }) {
  return (
    <section className="card flex flex-col gap-3 p-5">
      <h2 className="flex items-center gap-2 font-extrabold">
        <Users className="size-5 text-accent" /> Phòng đang mở
        <span className="ml-auto text-xs font-bold text-muted">tự cập nhật</span>
      </h2>
      {!rooms.length && <p className="py-6 text-center text-sm text-muted">Chưa có phòng nào. Tạo phòng đầu tiên nhé!</p>}
      {rooms.map((r) => {
        const full = r.members.length >= r.max;
        const mine = r.members.some((m) => m.userId === me.id);
        return (
          <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="flex flex-wrap items-center gap-2">
                <span className="truncate font-bold">{r.name}</span>
                <span className="pill bg-accent/15 text-accent">{r.level}</span>
                <span className={`text-xs font-bold ${full ? "text-red-400" : "text-muted"}`}>
                  {r.members.length}/{r.max}
                </span>
              </p>
              {!!r.topics.length && <p className="truncate text-xs text-muted">{r.topics.join(" · ")}</p>}
              <div className="flex -space-x-2">
                {r.members.map((m) => (
                  <span key={m.clientId} className="relative" title={m.name}>
                    <Avatar user={userOf(m)} className="size-7 text-xs ring-2 ring-card" />
                    {m.clientId === r.hostId && <Crown className="absolute -top-2.5 left-1.5 size-3.5 text-amber" />}
                  </span>
                ))}
              </div>
            </div>
            <button className="btn shrink-0" disabled={busy || full || mine} onClick={() => run((c) => c.join(r.id))}>
              {full ? "Đầy" : mine ? "Đang ở tab khác" : "Vào"}
            </button>
          </div>
        );
      })}
    </section>
  );
}

/** Đang trong phòng: ô từng người (vòng xanh khi đang nói), tắt micro, rời phòng, câu hỏi gợi ý */
function Room({
  s,
  error,
  onError,
  call,
}: {
  s: CallState;
  error: string;
  onError: (e: string) => void;
  call: React.RefObject<SprechenCall | null>;
}) {
  const room = s.room!;
  const self = room.members.find((m) => m.clientId === s.clientId);
  const host = room.hostId === s.clientId;
  const [copied, setCopied] = useState(false);
  const [promptIdx, setPromptIdx] = useState(0);
  const prompts = room.topics.flatMap((t) => PROMPTS[t] ?? []);
  const list = prompts.length ? prompts : DEFAULT_PROMPTS;

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${location.origin}/sprechen?room=${room.id}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const act = (fn: (c: SprechenCall) => Promise<unknown>) => call.current && fn(call.current).catch((e) => onError((e as Error).message));

  return (
    <div className="flex flex-col gap-5">
      {error && <Notice text={error} tone="red" onClose={() => onError("")} />}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="flex items-center gap-2 text-xl font-extrabold">
            {room.private ? <Lock className="size-5 text-muted" /> : <Globe className="size-5 text-muted" />}
            <span className="truncate">{room.name}</span>
            <span className="pill bg-accent/15 text-accent">{room.level}</span>
          </h2>
          <p className="text-sm text-muted">
            {room.members.length}/{room.max} người{room.topics.length ? ` · ${room.topics.join(" · ")}` : ""}
          </p>
        </div>
        {room.members.length < room.max && (
          <button className="btn" onClick={copyLink}>
            <Copy className="size-4" /> {copied ? "Đã chép link" : "Chép link mời"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {room.members.map((m) => {
          const isMe = m.clientId === s.clientId;
          const talking = s.speaking.includes(m.clientId);
          const state = isMe ? "connected" : s.peerStates[m.clientId];
          return (
            <div key={m.clientId} className="card relative flex flex-col items-center gap-2 p-4 text-center">
              <span className={`rounded-full p-1 transition ${talking ? "bg-accent shadow-[0_0_24px_var(--accent)]" : "bg-transparent"}`}>
                <Avatar user={userOf(m)} className="size-16 text-2xl sm:size-20" />
              </span>
              <p className="flex max-w-full items-center gap-1 font-bold">
                {m.clientId === room.hostId && <Crown className="size-4 shrink-0 text-amber" />}
                <span className="truncate">{isMe ? `${m.name} (bạn)` : m.name}</span>
              </p>
              <p className="flex items-center gap-1 text-xs text-muted">
                {m.muted ? <MicOff className="size-3.5 text-red-400" /> : <Mic className="size-3.5" />}
                {state === "connected" ? (m.muted ? "Tắt micro" : "Đã kết nối") : state === "failed" ? "Không kết nối được" : "Đang kết nối…"}
              </p>
              {host && !isMe && (
                <button className="btn-icon absolute top-1 right-1 size-8 text-muted" title="Mời ra khỏi phòng" onClick={() => act((c) => c.kick(m.clientId))}>
                  <UserX className="size-4" />
                </button>
              )}
            </div>
          );
        })}
        {room.members.length < 2 && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted">
            <Users className="size-6" />
            Đang chờ người vào…
          </div>
        )}
      </div>

      <section className="card flex flex-col gap-2">
        <h3 className="label text-accent">Gợi ý để bắt đầu</h3>
        <p className="text-lg font-bold">{list[promptIdx % list.length]}</p>
        <button className="btn self-start" onClick={() => setPromptIdx((i) => i + 1)}>
          Câu khác
        </button>
      </section>

      <div className="flex flex-wrap justify-center gap-3">
        <button className={`btn min-w-40 py-3 ${self?.muted ? "btn-red" : "btn-amber"}`} onClick={() => call.current?.setMuted(!self?.muted)}>
          {self?.muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          {self?.muted ? "Bật micro" : "Tắt micro"}
        </button>
        <button className="btn btn-red min-w-40 py-3" onClick={() => act((c) => c.leave())}>
          <LogOut className="size-5" /> Rời phòng
        </button>
      </div>
      <p className="text-center text-xs text-muted">Hãy lịch sự, nói tiếng Đức nhiều nhất có thể. Dùng tai nghe để tránh tiếng vọng.</p>
    </div>
  );
}
