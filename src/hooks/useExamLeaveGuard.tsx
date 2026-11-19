"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import type { useConfirm } from "@/components/ConfirmDialog";

type Ask = ReturnType<typeof useConfirm>[0];

const KEY = "__examGuard";

/**
 * Đang làm bài thi (`active`): hỏi "Thoát bài thi?" trước khi bài bị mất vì
 *  - bấm bất kỳ link nào trong trang (nút ←, logo, menu, chân trang),
 *  - nút Back / vuốt lùi của trình duyệt,
 *  - đóng / tải lại tab (hộp mặc định của trình duyệt).
 *
 * Back của trình duyệt không chặn được trực tiếp → đẩy 1 mục lịch sử "chặn" cùng URL lên trên trang thi
 * (pushState không URL: Next.js tự chép state router vào, không điều hướng). Bấm Back = rời mục chặn → đẩy lại ngay rồi hỏi;
 * đồng ý thì lùi 2 bước về trang trước thật.
 *
 * Trang được giữ lại khi rời đi (cacheComponents / <Activity>) → effect chạy lại lúc hiện lại: đang đứng trên mục chặn
 * của chính mình thì không đẩy thêm.
 *
 * Trả về `leave(url)`: chủ động rời trang thi (vd. nộp bài xong chuyển sang trang kết quả) — thay mục chặn bằng trang mới
 * để lịch sử không còn mục thừa, và không hỏi.
 */
export function useExamLeaveGuard(active: boolean, ask: Ask, fallbackHref: string) {
  const router = useRouter();
  const [token] = useState(() => Math.random().toString(36).slice(2));
  const leaving = useRef(false);
  const onGuard = () => typeof window !== "undefined" && window.history.state?.[KEY] === token;

  const leave = (url: string) => {
    leaving.current = true;
    if (onGuard()) router.replace(url);
    else router.push(url);
  };

  const confirm = () =>
    ask({ title: "Thoát bài thi?", text: "Bài đang làm sẽ không được lưu.", ok: "Thoát", cancel: "Làm tiếp", tone: "red", icon: <LogOut className="size-5" /> });

  const onLink = useEffectEvent((e: MouseEvent) => {
    const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || leaving.current || e.defaultPrevented || a.target === "_blank" || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    // Hộp xác nhận chạy bất đồng bộ → chặn link trước, đồng ý thì tự chuyển trang
    e.preventDefault();
    e.stopPropagation();
    const url = new URL(a.href, location.href);
    void confirm().then((yes) => {
      if (!yes) return;
      if (url.origin === location.origin) leave(url.pathname + url.search + url.hash);
      else {
        leaving.current = true;
        location.assign(url.href);
      }
    });
  });

  const onPop = useEffectEvent(() => {
    // Còn đứng trên mục chặn (vd. bấm Forward quay lại) hoặc đang tự rời đi → không làm gì
    if (leaving.current || onGuard()) return;
    window.history.pushState({ [KEY]: token }, "");
    void confirm().then((yes) => {
      if (!yes) return;
      leaving.current = true;
      const here = location.href;
      window.history.go(-2); // bỏ qua mục chặn + mục trang thi → trang trước thật
      // Không có trang trước (mở thẳng ở tab mới) → về trang cha
      setTimeout(() => {
        if (location.href === here && onGuard()) router.replace(fallbackHref);
      }, 500);
    });
  });

  useEffect(() => {
    // Đã đồng ý rời bài thi rồi quay lại trang (Back về trang được giữ lại) → không chặn nữa:
    // đẩy mục chặn lúc này sẽ xoá lịch sử Forward và bắt hỏi lại bài đã bỏ
    if (!active || leaving.current) return;
    if (!onGuard()) window.history.pushState({ [KEY]: token }, "");
    const warn = (e: BeforeUnloadEvent) => {
      if (!leaving.current) e.preventDefault();
    };
    const click = (e: MouseEvent) => onLink(e);
    const pop = () => onPop();
    window.addEventListener("beforeunload", warn);
    window.addEventListener("click", click, true);
    window.addEventListener("popstate", pop);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("click", click, true);
      window.removeEventListener("popstate", pop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ theo `active`; token cố định suốt đời component
  }, [active]);

  // Hết thi mà vẫn ở trang (nộp bài, xem kết quả tại chỗ) → bỏ mục chặn, không thì Back lần đầu "không làm gì"
  const was = useRef(active);
  useEffect(() => {
    if (was.current && !active && !leaving.current && onGuard()) window.history.back();
    was.current = active;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onGuard chỉ đọc history + token cố định
  }, [active]);

  return leave;
}
