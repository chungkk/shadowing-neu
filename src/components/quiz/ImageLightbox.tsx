"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useDialogFocus } from "@/hooks/useDialogFocus";

/**
 * Hộp phóng to hình ảnh câu hỏi (tình huống giao thông, bản đồ, quốc huy…):
 * bấm Esc, nút Đóng hoặc vùng nền tối bên ngoài để đóng.
 */
export function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useDialogFocus(panel, true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-black/85 p-3 backdrop-blur-xs sm:p-6"
      onClick={onClose}
    >
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={alt || "Xem phóng to hình ảnh"}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90dvh] max-w-5xl flex-col items-center outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng hình phóng to"
          title="Đóng (Esc)"
          className="mb-2 flex size-10 items-center justify-center self-end rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
        >
          <X className="size-5" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-[calc(90dvh-3.25rem)] w-auto max-w-full rounded-ui bg-white object-contain shadow-lg"
        />
      </div>
    </div>,
    document.body,
  );
}
