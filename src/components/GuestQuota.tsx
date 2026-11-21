"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, BarChart3, Gem, LogIn, Star } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { LoginLink } from "./auth/LoginDialog";
import Mascot from "./Mascot";

/**
 * Khách (chưa đăng nhập) chỉ được học thử 1 số câu mỗi ngày ở từng khu; hết lượt thì hiện popup mời đăng nhập / đăng ký.
 * Đếm theo câu khác nhau đã mở trong ngày (mở lại câu đã đếm không tốn thêm), lưu trong trình duyệt, sang ngày mới đếm lại.
 */
export const GUEST_LIMITS = {
  lid: { n: 10, unit: "câu hỏi", name: "Leben in Deutschland" },
  fuehrerschein: { n: 10, unit: "câu hỏi", name: "Lái xe" },
  shadow: { n: 15, unit: "câu", name: "luyện nghe" },
  deck: { n: 20, unit: "từ", name: "học từ vựng" },
} as const;
export type GuestArea = keyof typeof GUEST_LIMITS;

type Store = { day: string; ids: Partial<Record<GuestArea, string[]>> };
const KEY = "guest-quota";
const today = () => new Date().toLocaleDateString("sv"); // YYYY-MM-DD theo giờ máy

function readStore(): Store {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Store | null;
    if (s?.day === today()) return s;
  } catch {}
  return { day: today(), ids: {} };
}

export function useGuestQuota(area: GuestArea, loggedIn: boolean) {
  const limit = GUEST_LIMITS[area].n;
  const [stored, setStored] = useLocalStorage<Store | null>(KEY, null);
  const [wall, setWall] = useState(false); // câu đang mở bị chặn
  const used = stored?.day === today() ? (stored.ids[area]?.length ?? 0) : 0;

  /** Khách mở câu `id`: còn lượt (hoặc đã đếm rồi) → true và đếm câu này · hết lượt → false và hiện popup */
  const open = useCallback(
    (id: string): boolean => {
      if (loggedIn) return true;
      const s = readStore();
      const ids = s.ids[area] ?? [];
      if (ids.includes(id)) {
        setWall(false);
        return true;
      }
      if (ids.length >= limit) {
        setWall(true);
        return false;
      }
      setStored({ ...s, ids: { ...s.ids, [area]: [...ids, id] } });
      setWall(false);
      return true;
    },
    [loggedIn, area, limit, setStored],
  );

  return { limit, used, left: loggedIn ? Infinity : Math.max(0, limit - used), open, wall: !loggedIn && wall };
}

/** Đếm câu đang hiện (đổi câu → đếm câu mới); trả về true nếu câu này đang bị chặn */
export function useGuestCount(quota: ReturnType<typeof useGuestQuota>, id: string | null | undefined, active = true) {
  const { open } = quota;
  useEffect(() => {
    if (active && id) open(id);
  }, [active, id, open]);
  return quota.wall;
}

/** Dòng "Bạn đang học thử · còn N câu hôm nay" cho khách */
export function GuestTrialNote({ area, quota, extra }: { area: GuestArea; quota: ReturnType<typeof useGuestQuota>; extra?: string }) {
  const pathname = usePathname();
  const { unit } = GUEST_LIMITS[area];
  return (
    <p className="alert block font-medium">
      Bạn đang học thử — còn <b className="tabular-nums">{quota.left}/{quota.limit}</b> {unit} hôm nay.{" "}
      <LoginLink href={`/login?next=${encodeURIComponent(pathname)}`} className="font-extrabold text-accent-text underline">
        Đăng nhập
      </LoginLink>{" "}
      để học không giới hạn{extra ? `, ${extra}` : ""}.
    </p>
  );
}

/**
 * Popup hết lượt học thử: chỉ có Đăng nhập / Đăng ký hoặc quay lại (đăng nhập xong trang tự mở khoá).
 * exam: thi thử cần tài khoản (1 bài thi dài hơn số câu học thử)
 */
export function GuestWall({ area, quota, backHref, exam }: { area: GuestArea; quota: ReturnType<typeof useGuestQuota>; backHref: string; exam?: boolean }) {
  const pathname = usePathname();
  if (!quota.wall && !exam) return null;
  const { unit, name } = GUEST_LIMITS[area];
  return (
    <div className="dialog-backdrop">
      <div className="dialog max-w-sm" role="dialog" aria-modal="true" aria-label="Hết lượt học thử">
        <div className="flex items-center gap-3">
          <Mascot animated className="size-14 shrink-0" />
          <div>
            <p className="dialog-title">{exam ? "Thi thử cần tài khoản" : "Học tốt lắm!"}</p>
            <p className="text-sm text-muted">
              {exam ? "Đăng nhập để làm bài thi, xem điểm và lịch sử các lần thi." : `Bạn đã học thử ${quota.limit} ${unit} ${name} hôm nay.`}
            </p>
          </div>
        </div>
        <p className="text-sm font-semibold">Đăng ký miễn phí để học tiếp không giới hạn:</p>
        <ul className="flex flex-col gap-1.5 text-sm">
          <li className="flex items-start gap-2">
            <BarChart3 className="mt-0.5 size-4 shrink-0 text-accent-text" /> Lưu tiến độ, mở lại đúng chỗ trên mọi máy
          </li>
          <li className="flex items-start gap-2">
            <Star className="mt-0.5 size-4 shrink-0 text-accent-text" /> Đánh dấu câu khó, ôn lại câu sai
          </li>
          {/* Leben in Deutschland / Lái xe chưa tặng kim cương — không hứa điều chưa có */}
          {area !== "lid" && area !== "fuehrerschein" && (
            <li className="flex items-start gap-2">
              <Gem className="mt-0.5 size-4 shrink-0 text-gem" /> Nhận kim cương khi học, leo bảng xếp hạng
            </li>
          )}
        </ul>
        <LoginLink href={`/login?next=${encodeURIComponent(pathname)}`} className="btn btn-primary btn-lg btn-block">
          <LogIn className="size-4" /> Đăng nhập / Đăng ký
        </LoginLink>
        <Link href={backHref} className="btn btn-ghost -mt-2 text-muted">
          <ArrowLeft className="size-4" /> Quay lại
        </Link>
      </div>
    </div>
  );
}
