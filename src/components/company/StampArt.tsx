import { useId } from 'react';
import type { ServiceId } from '@/lib/company/services';

/** Hình trên tem: mực phẳng, in chồng một màu trên nền mực của sản phẩm. */

const WAVE = [14, 30, 52, 24, 66, 90, 44, 72, 34, 58, 86, 40, 22, 62, 36, 18];

function Wave({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 200 160" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
            {WAVE.map((h, i) => (
                <rect key={i} x={6 + i * 12} y={80 - h * 0.75} width="7" height={h * 0.75} fill="currentColor" />
            ))}
            {WAVE.map((h, i) => (
                <rect key={i} x={12 + i * 12} y={84} width="7" height={h * 0.62} fill="currentColor" opacity=".42" />
            ))}
        </svg>
    );
}

export function StampArt({ className }: { id: ServiceId; className?: string }) {
    return <Wave className={className} />;
}

/** Dấu bưu điện: cho biết con tem dẫn tới đâu */
export function Postmark({ center, className }: { center: string; className?: string }) {
    const pathId = useId();
    return (
        <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
            <defs>
                <path id={pathId} d="M60 60m-43 0a43 43 0 1 1 86 0a43 43 0 1 1-86 0" />
            </defs>
            <g fill="none" stroke="#141b2d">
                <circle cx="60" cy="60" r="56" strokeWidth="3" />
                <circle cx="60" cy="60" r="34" strokeWidth="1.5" />
            </g>
            <text fontSize="11.5" fontWeight="700" letterSpacing="1.6" fill="#141b2d">
                <textPath href={`#${pathId}`}>HALLOVN.DE · HALLE (SAALE) ·</textPath>
            </text>
            <text x="60" y="66" textAnchor="middle" fontSize="17" fontWeight="800" fill="#141b2d">
                {center}
            </text>
        </svg>
    );
}
