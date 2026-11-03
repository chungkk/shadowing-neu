import { useSyncExternalStore } from "react";

/**
 * Tổng điểm chính tả dùng chung cho cả app (như huy hiệu điểm trên thanh trên cùng của web): màn học cộng / trừ ngay rồi sửa theo số server trả về,
 * các tab đọc cùng một số. Kèm tài khoản của nó — đổi tài khoản không hiện điểm của người trước.
 */
let state: { user: number; total: number } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

/** Số điểm thật từ server */
export function setPointsTotal(user: number, total: number) {
  state = { user, total };
  emit();
}

/** Cộng / trừ tạm vào số đang hiện — chưa có số của tài khoản này thì bỏ qua, chờ số từ server */
export function addPoints(user: number, delta: number) {
  if (state?.user !== user) return;
  state = { user, total: state.total + delta };
  emit();
}

/** Tổng điểm của `user` — null = chưa tải được */
export const usePoints = (user: number | undefined) => useSyncExternalStore(subscribe, () => (user !== undefined && state?.user === user ? state.total : null));
