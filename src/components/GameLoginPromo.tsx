import type { ReactNode } from "react";
import { BookOpen, Gem, LogIn, Sparkles, Trophy, Users, X } from "lucide-react";
import Mascot from "./Mascot";
import { LoginLink } from "./LoginDialog";

/** Màn mời đăng nhập của các game dùng kim cương: tranh ván đang chơi + lợi ích + nút đăng nhập nổi bật, luật để thu gọn bên dưới */

export type PromoGame = "sudoku" | "caro" | "der-die-das";

const Emoji = ({ code, className }: { code: string; className: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={`/emoji/${code}.webp`} alt="" className={`pointer-events-none absolute ${className}`} />
);

/** Nhãn nổi trên tranh, ví dụ "+150 kim cương" */
const Toast = ({ children, className }: { children: ReactNode; className: string }) => (
  <span className={`absolute flex items-center gap-1.5 rounded-full border-2 border-black bg-gold px-3 py-1 text-sm font-black text-black shadow-[0_3px_0_#000] ${className}`}>{children}</span>
);

// Một đề Sudoku đã giải (0 = ô còn trống, ô đánh dấu là ô người chơi vừa điền)
const SUDOKU_SOLVED = "534678912672195348198342567859761423426853791713924856961537284287419635345286179";
const SUDOKU_HOLES = new Set([2, 5, 10, 14, 19, 22, 28, 33, 37, 41, 46, 50, 55, 58, 63, 67, 70, 75, 78]);
const SUDOKU_FILLED = new Set([4, 12, 30, 44, 61, 73]);

const SudokuScene = () => (
  <>
    <div className="absolute top-1/2 left-4 grid -translate-y-1/2 grid-cols-9 overflow-hidden rounded-lg border-2 border-sky-300/80 bg-[#0e1b33] shadow-[0_6px_0_rgba(0,0,0,0.4)] sm:left-8">
      {Array.from(SUDOKU_SOLVED, (d, i) => {
        const r = Math.floor(i / 9);
        const c = i % 9;
        const edge = `${c % 3 === 2 && c < 8 ? "border-r-2 border-r-sky-300/60" : "border-r border-r-sky-300/15"} ${r % 3 === 2 && r < 8 ? "border-b-2 border-b-sky-300/60" : "border-b border-b-sky-300/15"}`;
        return (
          <span
            key={i}
            className={`flex size-5 items-center justify-center text-[11px] font-black sm:size-6 sm:text-xs ${edge} ${SUDOKU_FILLED.has(i) ? "bg-emerald-400/30 text-emerald-200" : "text-white"} ${i === 40 ? "animate-pulse bg-sky-400/50" : ""}`}
          >
            {SUDOKU_HOLES.has(i) ? "" : d}
          </span>
        );
      })}
    </div>
    {/* đua với bạn */}
    <div className="absolute top-5 right-4 flex w-36 flex-col gap-2 rounded-xl border border-white/20 bg-black/40 p-2.5 text-[11px] font-bold text-white sm:right-8 sm:w-44">
      <span className="flex items-center gap-1 text-cyan-200">
        <Users className="size-3.5" /> Phòng 4821
      </span>
      {[
        ["Bạn", 92, "bg-emerald-400"],
        ["Minh", 78, "bg-sky-400"],
        ["Lan", 61, "bg-rose-400"],
      ].map(([name, pct, bar]) => (
        <div key={name} className="flex items-center gap-1.5">
          <span className="w-8 shrink-0">{name}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
            <span className={`block h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
          </span>
        </div>
      ))}
    </div>
    <Toast className="bob right-6 bottom-5 sm:right-12">
      <Gem className="size-4 text-cyan-700" /> +150
    </Toast>
    <Emoji code="1f3c6" className="right-[38%] bottom-4 hidden size-12 sm:block" />
    <Emoji code="23f1-fe0f" className="top-4 right-[42%] hidden size-9 rotate-12 sm:block" />
  </>
);

// Bàn Caro 9×9: X thắng theo đường chéo (ô đánh dấu)
const CARO_BOARD = ["........O", ".X...O...", "..X.O....", "..OX.....", "...OX....", ".....X...", "....O....", ".........", "........."];
const CARO_WIN = new Set(["1,1", "2,2", "3,3", "4,4", "5,5"]);

const CaroScene = () => (
  <>
    <div className="absolute top-1/2 left-4 grid -translate-y-1/2 grid-cols-9 rounded-lg border-2 border-amber-200/70 bg-[#fdf3dc] p-1 shadow-[0_6px_0_rgba(0,0,0,0.4)] sm:left-8">
      {CARO_BOARD.flatMap((row, r) =>
        Array.from(row, (p, c) => (
          <span key={`${r},${c}`} className={`flex size-5 items-center justify-center border-r border-b border-black/10 sm:size-6 ${CARO_WIN.has(`${r},${c}`) ? "bg-amber-300/70" : ""}`}>
            {p === "X" && <X className="size-4 text-red-500" strokeWidth={3.5} />}
            {p === "O" && <span className="size-3 rounded-full border-[3px] border-sky-500 sm:size-3.5" />}
          </span>
        )),
      )}
    </div>
    <div className="absolute top-5 right-4 flex items-center gap-2 rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-xs font-extrabold text-white sm:right-8">
      <span className="text-red-400">Bạn</span> vs <span className="text-sky-300">Máy</span>
      <span className="relative size-7">
        <Emoji code="1f916" className="inset-0 size-7" />
      </span>
    </div>
    <span className="absolute right-6 bottom-16 hidden rounded-lg bg-black/50 px-2 py-1 text-xs font-black tracking-wider text-amber-200 uppercase sm:right-12 sm:block">5 quân liền — thắng!</span>
    <Toast className="bob right-6 bottom-5 sm:right-12">
      <Gem className="size-4 text-cyan-700" /> +200
    </Toast>
    <Emoji code="1f389" className="right-[36%] bottom-5 hidden size-12 sm:block" />
  </>
);

const ArtikelScene = () => (
  <>
    <div className="absolute top-1/2 left-4 flex w-52 -translate-y-1/2 flex-col items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 sm:left-8 sm:w-64">
      <span className="text-[11px] font-bold tracking-wider text-white/60 uppercase">Từ 7/10 · 4s</span>
      <span className="text-2xl font-black text-white">
        <span className="text-emerald-300">das</span> Mädchen
      </span>
      <span className="-mt-2 text-xs text-white/60">cô gái</span>
      <div className="flex gap-2 text-sm font-extrabold text-white">
        <span className="rounded-lg border border-sky-300/60 bg-sky-500/40 px-3 py-1.5">der</span>
        <span className="rounded-lg border border-rose-300/60 bg-rose-500/40 px-3 py-1.5">die</span>
        <span className="rounded-lg border-2 border-white bg-emerald-500 px-3 py-1.5 shadow-[0_0_14px_rgba(52,211,153,0.8)]">das</span>
      </div>
    </div>
    <div className="absolute top-5 right-4 flex items-center gap-1.5 rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm font-black text-white sm:right-8">
      <span className="relative size-6">
        <Emoji code="1f525" className="inset-0 size-6" />
      </span>
      Chuỗi 6 · <span className="text-amber-300">×2.5</span>
    </div>
    <Toast className="bob right-6 bottom-5 sm:right-12">
      Chốt <Gem className="size-4 text-cyan-700" /> +125
    </Toast>
    <Emoji code="1f973" className="right-[34%] bottom-5 hidden size-12 sm:block" />
  </>
);

const SCENE: Record<PromoGame, () => ReactNode> = { sudoku: SudokuScene, caro: CaroScene, "der-die-das": ArtikelScene };

const PERKS: Record<PromoGame, { icon: typeof Trophy; text: string }[]> = {
  sudoku: [
    { icon: Users, text: "Tạo phòng, đua giải cùng 1 đề với tối đa 3 người bạn" },
    { icon: Trophy, text: "Giải nhanh nhất ẵm cả hũ kim cương" },
    { icon: Sparkles, text: "Chơi một mình nhận về tới ×3 kim cương" },
  ],
  caro: [
    { icon: Users, text: "Gửi mã phòng, thách đấu bạn bè ngay" },
    { icon: Trophy, text: "Thắng máy nhân đôi kim cương đã cược" },
    { icon: Sparkles, text: "Ván nhanh, mỗi nước chỉ 60 giây" },
  ],
  "der-die-das": [
    { icon: BookOpen, text: "Nhớ mạo từ der / die / das nhanh hơn hẳn học thuộc" },
    { icon: Trophy, text: "Đúng liên tiếp, hệ số tăng tới ×5" },
    { icon: Sparkles, text: "Chốt đúng lúc để mang kim cương về" },
  ],
};

export default function GameLoginPromo({ game, next, rules, action = "chơi" }: { game: PromoGame; next: string; rules?: ReactNode; action?: string }) {
  const Scene = SCENE[game];
  return (
    <div className="sticker flex flex-col overflow-hidden">
      <div className="theme-night relative h-56 overflow-hidden border-b-2 border-ink bg-gradient-to-br from-[#0b1a33] via-[#12264a] to-[#1d1840] sm:h-60">
        <Scene />
      </div>

      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Mascot animated className="size-14 shrink-0" />
          <div>
            <p className="text-xl font-black sm:text-2xl">Đăng nhập để vào {action} ngay!</p>
            <p className="mt-1 text-sm text-muted">Tài khoản miễn phí — luyện bài để nhận kim cương, rồi mang vào game thắng thêm.</p>
          </div>
        </div>

        <ul className="grid gap-2 sm:grid-cols-3">
          {PERKS[game].map((p) => (
            <li key={p.text} className="flex items-start gap-2 rounded-xl border-2 border-ink/15 bg-card-2 p-3 text-sm font-bold">
              <p.icon className="mt-0.5 size-4 shrink-0 text-gem" />
              {p.text}
            </li>
          ))}
        </ul>

        <LoginLink href={`/login?next=${next}`} className="btn btn-amber py-3.5 text-base font-black sm:text-lg hover:brightness-105 active:translate-y-0.5">
          <LogIn className="size-5" /> Đăng nhập / Đăng ký miễn phí
        </LoginLink>
        <p className="-mt-2 text-center text-xs text-muted">Chỉ mất 30 giây · hoàn toàn miễn phí</p>

        {rules && (
          <details className="group rounded-xl border-2 border-ink/15 p-3">
            <summary className="cursor-pointer text-sm font-extrabold select-none">Xem luật chơi</summary>
            <div className="mt-2">{rules}</div>
          </details>
        )}
      </div>
    </div>
  );
}
