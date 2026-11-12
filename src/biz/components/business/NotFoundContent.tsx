'use client';

import Link from 'next/link';
import { SERVICES, productPath } from '@/biz/lib/services';
import { useT } from '@/biz/contexts/LocaleContext';

const COPY = {
    de: {
        title: 'Seite nicht gefunden',
        lead: 'Diese Seite gibt es nicht (mehr). Vielleicht suchen Sie eines unserer Produkte:',
        home: 'Zur Startseite',
        support: 'Support-Center',
    },
    en: {
        title: 'Page not found',
        lead: 'This page does not exist (any more). Maybe you are looking for one of our products:',
        home: 'Go to the home page',
        support: 'Support center',
    },
    vi: {
        title: 'Không tìm thấy trang',
        lead: 'Trang này không tồn tại hoặc đã bị gỡ. Có thể bạn đang tìm một sản phẩm của chúng tôi:',
        home: 'Về trang chủ',
        support: 'Trung tâm hỗ trợ',
    },
};

export default function NotFoundContent() {
    const t = useT(COPY);
    return (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-20 md:pt-20">
            <p className="font-display text-sm font-bold tracking-[0.2em] text-[var(--ink)]/65">404</p>
            <h1 className="mt-3 font-display text-4xl md:text-6xl font-bold tracking-tight text-balance">{t.title}</h1>
            <p className="mt-4 max-w-2xl text-lg text-[var(--ink)]/75 leading-relaxed">{t.lead}</p>
            <ul className="mt-6 space-y-2 text-lg">
                {SERVICES.map((s) => (
                    <li key={s.id}>
                        <Link href={productPath(s)} className="underline underline-offset-4 hover:text-[var(--ink-ultra)]">
                            {s.name}
                        </Link>
                    </li>
                ))}
            </ul>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 font-semibold">
                <Link href="/about" className="underline underline-offset-4 hover:text-[var(--ink-ultra)]">{t.home}</Link>
                <Link href="/support" className="underline underline-offset-4 hover:text-[var(--ink-ultra)]">{t.support}</Link>
            </div>
        </section>
    );
}
