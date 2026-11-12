"use client";

import { useEffect, useState } from "react";

/**
 * Chiều cao phần màn bị bàn phím ảo che (px) — dùng để ghim nút ngay trên bàn phím.
 * iOS Safari không thu nhỏ layout viewport khi mở bàn phím, nên phải đọc visualViewport:
 * phần che = innerHeight − (chiều cao + offsetTop của visualViewport). Android (resizes-content) ra ≈ 0.
 */
export function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return;
    const update = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);
  return active ? inset : 0;
}

/** Màn cảm ứng cỡ điện thoại (dưới md) — nơi bàn phím ảo chiếm nửa màn */
export function useIsTouchPhone(): boolean {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse) and (max-width: 767px)");
    const update = () => setTouch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return touch;
}
