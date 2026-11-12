import { useSyncExternalStore } from "react";

/** Số mục trong sổ đến hạn ôn — badge của tab Từ vựng (tab layout tải lúc mở app, tab Từ vựng cập nhật mỗi lần tải) */
let due = 0;
const subs = new Set<() => void>();

export function setDueCount(n: number) {
  if (n === due) return;
  due = n;
  subs.forEach((f) => f());
}

const subscribe = (cb: () => void) => {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
};

export const useDueCount = () => useSyncExternalStore(subscribe, () => due);
