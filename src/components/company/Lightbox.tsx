'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import type { Screen } from '@/biz/lib/productPages';
import { useT } from '@/biz/contexts/LocaleContext';

const UI = {
    de: { close: 'Schließen', prev: 'Vorheriges Bild', next: 'Nächstes Bild', zoomIn: 'Vergrößern', zoomOut: 'Verkleinern', reset: 'Originalgröße', viewer: 'Bildbetrachter' },
    en: { close: 'Close', prev: 'Previous image', next: 'Next image', zoomIn: 'Zoom in', zoomOut: 'Zoom out', reset: 'Reset zoom', viewer: 'Image viewer' },
    vi: { close: 'Đóng', prev: 'Ảnh trước', next: 'Ảnh sau', zoomIn: 'Phóng to', zoomOut: 'Thu nhỏ', reset: 'Về kích thước gốc', viewer: 'Trình xem ảnh' },
};

const MIN = 1;
const MAX = 5;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type View = { scale: number; x: number; y: number };
const RESET: View = { scale: 1, x: 0, y: 0 };

function Svg({ d, className = 'h-5 w-5' }: { d: string; className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            <path d={d} />
        </svg>
    );
}

const btn =
    'inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-30 disabled:hover:bg-white/10';

/** Trình xem ảnh toàn màn hình: chuyển ảnh, phóng to bằng cuộn chuột / chạm hai ngón / nhấp đúp, kéo để di chuyển. */
export function Lightbox({
    screens,
    alts,
    index,
    onIndex,
    onClose,
}: {
    screens: Screen[];
    alts: string[];
    index: number;
    /** Nhận hàm cập nhật để nhiều thao tác liên tiếp không đọc nhầm chỉ số cũ */
    onIndex: (update: (i: number) => number) => void;
    onClose: () => void;
}) {
    const t = useT(UI);
    const [view, setView] = useState<View>(RESET);
    const [animate, setAnimate] = useState(true);
    const stageRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const gesture = useRef<{ startDist: number; startScale: number; startView: View; startX: number; startY: number; moved: boolean; onBg: boolean } | null>(null);
    const lastTap = useRef(0);

    const count = screens.length;
    const screen = screens[index];
    const go = useCallback((d: number) => onIndex((i) => (i + d + count) % count), [count, onIndex]);

    // Đổi ảnh thì về lại kích thước gốc
    const [shownIndex, setShownIndex] = useState(index);
    if (shownIndex !== index) {
        setShownIndex(index);
        setAnimate(false);
        setView(RESET);
    }

    /** Giới hạn vị trí để ảnh không bị kéo ra ngoài khung */
    const bound = useCallback((v: View): View => {
        const stage = stageRef.current;
        const img = imgRef.current;
        if (!stage || !img) return v;
        const maxX = Math.max(0, (img.offsetWidth * v.scale - stage.clientWidth) / 2);
        const maxY = Math.max(0, (img.offsetHeight * v.scale - stage.clientHeight) / 2);
        return { scale: v.scale, x: clamp(v.x, -maxX, maxX), y: clamp(v.y, -maxY, maxY) };
    }, []);

    /** Phóng to quanh một điểm (toạ độ màn hình), để điểm đó đứng yên */
    const zoomAt = useCallback(
        (next: number, cx?: number, cy?: number, from?: View) => {
            setView((cur) => {
                const base = from ?? cur;
                const scale = clamp(next, MIN, MAX);
                const stage = stageRef.current;
                if (!stage || scale === MIN) return RESET;
                const r = stage.getBoundingClientRect();
                const px = (cx ?? r.left + r.width / 2) - (r.left + r.width / 2);
                const py = (cy ?? r.top + r.height / 2) - (r.top + r.height / 2);
                const k = scale / base.scale;
                return bound({ scale, x: px - (px - base.x) * k, y: py - (py - base.y) * k });
            });
        },
        [bound],
    );

    // Bàn phím, khoá cuộn trang, trả lại tiêu điểm khi đóng
    useEffect(() => {
        const prevFocus = document.activeElement as HTMLElement | null;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();
        return () => {
            document.body.style.overflow = prevOverflow;
            prevFocus?.focus?.();
        };
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowLeft') go(-1);
            else if (e.key === 'ArrowRight') go(1);
            else if (e.key === '+' || e.key === '=') {
                setAnimate(true);
                zoomAt(view.scale * 1.5);
            } else if (e.key === '-') {
                setAnimate(true);
                zoomAt(view.scale / 1.5);
            } else if (e.key === '0') {
                setAnimate(true);
                setView(RESET);
            } else return;
            e.preventDefault();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [go, onClose, zoomAt, view.scale]);

    const onWheel = (e: ReactWheelEvent) => {
        setAnimate(false);
        zoomAt(view.scale * Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY);
    };

    const onPointerDown = (e: ReactPointerEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const pts = [...pointers.current.values()];
        setAnimate(false);
        gesture.current = {
            startDist: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,
            startScale: view.scale,
            startView: view,
            startX: e.clientX,
            startY: e.clientY,
            moved: gesture.current?.moved ?? false,
            onBg: e.target === stageRef.current,
        };
        if (pts.length === 1) gesture.current.moved = false;
    };

    const onPointerMove = (e: ReactPointerEvent) => {
        if (!pointers.current.has(e.pointerId) || !gesture.current) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const g = gesture.current;
        const pts = [...pointers.current.values()];
        if (pts.length === 2 && g.startDist > 0) {
            g.moved = true;
            const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            zoomAt(g.startScale * (dist / g.startDist), (pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2, g.startView);
            return;
        }
        const dx = e.clientX - g.startX;
        const dy = e.clientY - g.startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) g.moved = true;
        if (g.startView.scale > 1) {
            setView(bound({ scale: g.startView.scale, x: g.startView.x + dx, y: g.startView.y + dy }));
        } else if (pts.length === 1) {
            // Chưa phóng to: kéo ngang để xem trước chuyển ảnh
            setView({ scale: 1, x: dx, y: 0 });
        }
    };

    const onPointerUp = (e: ReactPointerEvent) => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.delete(e.pointerId);
        const g = gesture.current;
        if (pointers.current.size > 0) {
            // Còn một ngón: bắt đầu lại thao tác kéo từ vị trí hiện tại
            const [p] = [...pointers.current.values()];
            if (g) gesture.current = { ...g, startView: view, startX: p.x, startY: p.y, startDist: 0 };
            return;
        }
        gesture.current = null;
        if (!g) return;
        setAnimate(true);
        const dx = e.clientX - g.startX;
        if (g.startView.scale === 1 && view.scale === 1) {
            if (Math.abs(dx) > 60) {
                go(dx < 0 ? 1 : -1);
                return;
            }
            setView(RESET);
        }
        if (!g.moved) {
            const now = Date.now();
            if (now - lastTap.current < 300) {
                lastTap.current = 0;
                zoomAt(view.scale > 1 ? 1 : 2.5, e.clientX, e.clientY);
            } else {
                lastTap.current = now;
                // Chạm một lần ra ngoài ảnh thì đóng
                if (view.scale === 1 && g.onBg) {
                    window.setTimeout(() => {
                        if (lastTap.current === now) onClose();
                    }, 300);
                }
            }
        }
    };

    const zoomed = view.scale > 1;

    return createPortal(
        <div role="dialog" aria-modal="true" aria-label={t.viewer} className="fixed inset-0 z-[100] flex flex-col text-white backdrop-blur-xl" style={{ background: 'rgba(8, 9, 12, 0.96)', animation: 'lb-in 180ms ease-out' }}>
            <style>{`@keyframes lb-in{from{opacity:0}to{opacity:1}}`}</style>

            {/* Thanh trên */}
            <div className="relative z-10 flex items-center justify-between gap-3 px-3 py-3 sm:px-5">
                <span className="min-w-[4rem] text-sm font-semibold tabular-nums text-white/80" aria-live="polite">
                    {index + 1} / {count}
                </span>
                <div className="flex items-center gap-2">
                    <button type="button" className={btn} onClick={() => (setAnimate(true), zoomAt(view.scale / 1.5))} disabled={!zoomed} aria-label={t.zoomOut} title={t.zoomOut}>
                        <Svg d="M5 12h14" />
                    </button>
                    <button
                        type="button"
                        className="hidden h-11 min-w-[4.5rem] items-center justify-center rounded-full bg-white/10 px-3 text-sm font-semibold tabular-nums backdrop-blur transition-colors hover:bg-white/20 sm:inline-flex"
                        onClick={() => (setAnimate(true), setView(RESET))}
                        aria-label={t.reset}
                        title={t.reset}
                    >
                        {Math.round(view.scale * 100)}%
                    </button>
                    <button type="button" className={btn} onClick={() => (setAnimate(true), zoomAt(view.scale * 1.5))} disabled={view.scale >= MAX} aria-label={t.zoomIn} title={t.zoomIn}>
                        <Svg d="M12 5v14M5 12h14" />
                    </button>
                    <span className="mx-1 h-6 w-px bg-white/20" aria-hidden="true" />
                    <button ref={closeRef} type="button" className={btn} onClick={onClose} aria-label={t.close} title={`${t.close} (Esc)`}>
                        <Svg d="M6 6l12 12M18 6L6 18" />
                    </button>
                </div>
            </div>

            {/* Vùng ảnh */}
            <div
                ref={stageRef}
                className={`relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden ${zoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
                onWheel={onWheel}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    ref={imgRef}
                    key={screen.src}
                    src={screen.src}
                    alt={alts[index]}
                    width={screen.width}
                    height={screen.height}
                    draggable={false}
                    className="max-h-full max-w-[calc(100%-2rem)] object-contain shadow-2xl sm:max-w-[calc(100%-8rem)]"
                    style={{
                        transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
                        transition: animate ? 'transform 220ms cubic-bezier(.2,.8,.2,1)' : 'none',
                        willChange: 'transform',
                    }}
                />

                {count > 1 && (
                    <>
                        <button type="button" className={`${btn} absolute left-3 top-1/2 hidden -translate-y-1/2 sm:inline-flex`} onClick={() => go(-1)} aria-label={t.prev} title={t.prev}>
                            <Svg d="M15 18l-6-6 6-6" className="h-6 w-6" />
                        </button>
                        <button type="button" className={`${btn} absolute right-3 top-1/2 hidden -translate-y-1/2 sm:inline-flex`} onClick={() => go(1)} aria-label={t.next} title={t.next}>
                            <Svg d="M9 18l6-6-6-6" className="h-6 w-6" />
                        </button>
                    </>
                )}
            </div>

            {/* Dải ảnh thu nhỏ */}
            {count > 1 && (
                <div className="relative z-10 flex justify-center px-3 py-3">
                    <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                        {screens.map((s, n) => (
                            <button
                                key={s.src}
                                type="button"
                                onClick={() => onIndex(() => n)}
                                aria-label={`${n + 1} / ${count}`}
                                aria-current={n === index}
                                className={`h-14 shrink-0 overflow-hidden rounded-md ring-2 transition-opacity sm:h-16 ${n === index ? 'opacity-100 ring-white' : 'opacity-50 ring-transparent hover:opacity-90'}`}
                            >
                                <Image src={s.src} alt="" width={s.width} height={s.height} sizes="96px" draggable={false} className="h-full w-auto" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>,
        document.body,
    );
}
