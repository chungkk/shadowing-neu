import { useEffect, useLayoutEffect, type RefObject } from "react";

/**
 * Popup đang mở: focus vào popup, Tab / Shift+Tab chỉ đi vòng bên trong; đóng thì trả focus về chỗ vừa bấm.
 * `panel` cần tabIndex={-1} để nhận focus.
 */
export function useDialogFocus(panel: RefObject<HTMLElement | null>, open: boolean) {
  useLayoutEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    panel.current?.focus({ preventScroll: true });
    return () => before?.focus({ preventScroll: true });
  }, [panel, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const box = panel.current;
      if (e.key !== "Tab" || !box) return;
      const items = box.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex='0']");
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = active !== box && box.contains(active);
      if (!inside || active === (e.shiftKey ? first : last)) {
        e.preventDefault();
        (e.shiftKey ? last : first)?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, open]);
}
