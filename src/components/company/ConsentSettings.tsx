'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

/** Google CMP (AdSense → Privacy & messaging) gắn hàm này lên window khi đã tải xong. */
type GoogleFC = { callbackQueue?: Array<() => void>; showRevocationMessage?: () => void };

/**
 * Mở lại hộp đồng ý của Google để người dùng đổi hoặc rút lại lựa chọn
 * (Art. 7 Abs. 3 DSGVO: rút lại phải dễ như khi đồng ý).
 * Nếu CMP chưa tải (bị chặn, chưa bật trong AdSense), dẫn tới mục quảng cáo trong trang Datenschutz.
 */
export default function ConsentSettings({ label, className, icon }: { label: string; className?: string; /** icon đứng trước chữ (kiểu nút .btn của app) */ icon?: ReactNode }) {
    const router = useRouter();
    const open = () => {
        const w = window as unknown as { googlefc?: GoogleFC };
        const fc = w.googlefc;
        if (fc?.showRevocationMessage) {
            fc.callbackQueue = fc.callbackQueue || [];
            fc.callbackQueue.push(fc.showRevocationMessage);
        } else {
            router.push('/privacy#ads');
        }
    };
    return (
        <button type="button" onClick={open} className={`text-left ${className ?? ''}`}>
            {icon}
            {label}
        </button>
    );
}
