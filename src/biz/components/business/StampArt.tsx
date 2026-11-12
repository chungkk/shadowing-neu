import { useId } from 'react';
import type { ServiceId } from '@/biz/lib/services';

/** Hình trên tem: mực phẳng, in chồng một màu trên nền mực của sản phẩm. */

/** Đường cong dẫn về phía trước */
function Road({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 200 160" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
            <path d="M60 160C70 112 150 104 128 66 118 48 92 44 98 0h8c-4 40 30 44 42 66 26 46-44 56-38 94Z" fill="currentColor" opacity=".92" />
            <path d="M85 160c6-40 74-48 54-94-10-22-38-26-37-66" fill="none" stroke="var(--stamp-ink)" strokeWidth="3" strokeDasharray="10 9" />
        </svg>
    );
}

/** 16 ô cho 16 bang, một ô đang được chọn */
function States({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 160 160" className={className} aria-hidden="true">
            {Array.from({ length: 16 }, (_, i) => (
                <rect
                    key={i}
                    x={8 + (i % 4) * 37}
                    y={8 + Math.floor(i / 4) * 37}
                    width="33"
                    height="33"
                    fill="currentColor"
                    opacity={i === 6 ? 1 : 0.32}
                />
            ))}
        </svg>
    );
}

// Hai làn sóng lệch nhau: giọng mẫu và giọng người nói đuổi theo
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

export function StampArt({ id, className }: { id: ServiceId; className?: string }) {
    if (id === 'fuehrerschein') return <Road className={className} />;
    if (id === 'lid') return <States className={className} />;
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
                <textPath href={`#${pathId}`}>CKK · HALLE (SAALE) · CKK.BIZ ·</textPath>
            </text>
            <text x="60" y="66" textAnchor="middle" fontSize="17" fontWeight="800" fill="#141b2d">
                {center}
            </text>
        </svg>
    );
}
