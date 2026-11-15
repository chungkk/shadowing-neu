import type { JSX } from 'react';
import type { AreaArt } from '@/lib/company/services';

/** Hình trên tem: mực phẳng, in chồng một màu trên nền mực của từng phần học. */

const WAVE = [14, 30, 52, 24, 66, 90, 44, 72, 34, 58, 86, 40, 22, 62, 36, 18];

/** Sóng âm: nghe và nói theo */
function Wave() {
    return (
        <>
            {WAVE.map((h, i) => (
                <rect key={i} x={6 + i * 12} y={80 - h * 0.75} width="7" height={h * 0.75} fill="currentColor" />
            ))}
            {WAVE.map((h, i) => (
                <rect key={`r${i}`} x={12 + i * 12} y={84} width="7" height={h * 0.62} fill="currentColor" opacity=".42" />
            ))}
        </>
    );
}

/** Chồng thẻ từ */
function Cards() {
    return (
        <>
            <rect x="58" y="22" width="96" height="62" fill="currentColor" opacity=".3" transform="rotate(-8 106 53)" />
            <rect x="50" y="40" width="96" height="62" fill="currentColor" opacity=".55" transform="rotate(4 98 71)" />
            <rect x="44" y="62" width="112" height="72" fill="currentColor" />
        </>
    );
}

/** Biển báo và làn đường */
function Road() {
    return (
        <>
            <path d="M100 14 150 100H50Z" fill="currentColor" />
            <rect x="96" y="100" width="8" height="34" fill="currentColor" />
            <rect x="20" y="140" width="160" height="6" fill="currentColor" opacity=".42" />
            {[0, 1, 2, 3, 4].map((i) => (
                <rect key={i} x={24 + i * 34} y="150" width="20" height="5" fill="currentColor" opacity=".42" />
            ))}
        </>
    );
}

/** Mặt tiền có hàng cột */
function Columns() {
    return (
        <>
            <path d="M28 52 100 16l72 36Z" fill="currentColor" />
            <rect x="28" y="58" width="144" height="8" fill="currentColor" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <rect key={i} x={36 + i * 24} y="72" width="12" height="56" fill="currentColor" opacity={i % 2 ? '.55' : '1'} />
            ))}
            <rect x="20" y="134" width="160" height="10" fill="currentColor" />
        </>
    );
}

const ART: Record<AreaArt, () => JSX.Element> = { wave: Wave, cards: Cards, road: Road, columns: Columns };

export function StampArt({ art = 'wave', className }: { art?: AreaArt; className?: string }) {
    return (
        <svg viewBox="0 0 200 160" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
            {ART[art]()}
        </svg>
    );
}
