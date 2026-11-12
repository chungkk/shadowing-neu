'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { SITE } from '@/biz/lib/site';
import { useT } from '@/biz/contexts/LocaleContext';
import { CheckIcon } from '@/biz/components/icons';

const COPY = {
    de: {
        name: 'Name',
        email: 'E-Mail',
        subject: 'Thema',
        message: 'Nachricht',
        hint: 'Hilfreich: App-Version, Gerät und Betriebssystem.',
        choose: 'Thema wählen',
        send: 'E-Mail-Entwurf öffnen',
        note: 'Es wird nichts automatisch gesendet: Der Text öffnet sich in Ihrem E-Mail-Programm.',
        sentTitle: 'Der Entwurf sollte jetzt offen sein.',
        sentDesc: 'Bitte senden Sie ihn dort ab. Falls nichts passiert ist, schreiben Sie direkt an',
    },
    en: {
        name: 'Name',
        email: 'Email',
        subject: 'Topic',
        message: 'Message',
        hint: 'Helpful: app version, device and operating system.',
        choose: 'Choose a topic',
        send: 'Open email draft',
        note: 'Nothing is sent automatically: the text opens in your email app.',
        sentTitle: 'The draft should be open now.',
        sentDesc: 'Please send it from there. If nothing happened, write directly to',
    },
    vi: {
        name: 'Tên',
        email: 'Email',
        subject: 'Chủ đề',
        message: 'Nội dung',
        hint: 'Nên ghi: phiên bản app, thiết bị và hệ điều hành.',
        choose: 'Chọn chủ đề',
        send: 'Mở bản nháp email',
        note: 'Không có gì được gửi tự động: nội dung sẽ mở trong ứng dụng email của bạn.',
        sentTitle: 'Bản nháp đã được mở.',
        sentDesc: 'Vui lòng gửi từ đó. Nếu không thấy gì, hãy viết trực tiếp tới',
    },
};

const fieldClass =
    'mt-1.5 w-full border border-[var(--ink)]/60 bg-white px-3 py-2.5 text-base font-normal text-[var(--ink)] hover:border-[var(--ink)] focus:outline-2 focus:outline-offset-0 focus:outline-[var(--ink-ultra)]';

interface SupportFormProps {
    /** Chủ đề cố định của một sản phẩm */
    subject?: string;
    /** Danh sách chủ đề để chọn ở trang chung */
    subjects?: string[];
}

export default function SupportForm({ subject, subjects }: SupportFormProps) {
    const t = useT(COPY);
    const [form, setForm] = useState({ name: '', topic: '', message: '' });
    const [sent, setSent] = useState(false);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const topic = subject ?? form.topic;
        const body = `${t.name}: ${form.name}\n\n${form.message}`;
        window.location.href = `mailto:${SITE.supportEmail}?subject=${encodeURIComponent(`[Support] ${topic}`)}&body=${encodeURIComponent(body)}`;
        setSent(true);
    };

    return (
        <form onSubmit={submit} className="grid gap-4 border border-[var(--ink)]/20 bg-white p-5 md:p-6">
            <label className="block text-sm font-semibold">
                {t.name}
                <input required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldClass} />
            </label>
            {subjects && (
                <label className="block text-sm font-semibold">
                    {t.subject}
                    <select required value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className={fieldClass}>
                        <option value="">{t.choose}</option>
                        {subjects.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </label>
            )}
            <label className="block text-sm font-semibold">
                {t.message}
                <textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} aria-describedby="support-hint" className={fieldClass} />
                <span id="support-hint" className="mt-1.5 block font-normal text-[var(--ink)]/80">{t.hint}</span>
            </label>
            <button type="submit" className="min-h-12 bg-[var(--ink-ultra)] px-5 py-3 font-display text-lg font-bold text-white transition-colors hover:bg-[var(--ink)]">
                {t.send}
            </button>
            <p className="!mb-0 text-sm text-[var(--ink)]/80" aria-live="polite">
                {sent ? (
                    <span className="flex items-start gap-2">
                        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                            {t.sentTitle} {t.sentDesc} <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
                        </span>
                    </span>
                ) : (
                    t.note
                )}
            </p>
        </form>
    );
}
