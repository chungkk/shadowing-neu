'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { SITE } from '@/lib/company/site';
import { useLocale, useT } from '@/components/company/LocaleContext';
import { CheckIcon } from '@/components/company/icons';

/** Chủ đề của form; mỗi chủ đề ứng với một loại góp ý của POST /api/v1/feedback (idea | bug | content | other) */
export type SupportTopic = 'account' | 'bug' | 'idea' | 'content' | 'privacy' | 'other';

const KIND: Record<SupportTopic, 'idea' | 'bug' | 'content' | 'other'> = {
    account: 'other',
    bug: 'bug',
    idea: 'idea',
    content: 'content',
    privacy: 'other',
    other: 'other',
};

const ALL_TOPICS: SupportTopic[] = ['account', 'bug', 'idea', 'content', 'privacy', 'other'];

const COPY = {
    de: {
        name: 'Name (optional)',
        email: 'E-Mail für die Antwort',
        subject: 'Thema',
        message: 'Nachricht',
        hint: 'Bei Fehlern hilfreich: Seite oder Lektion, Gerät und Browser bzw. App-Version.',
        choose: 'Thema wählen',
        topics: {
            account: 'Konto & Anmeldung',
            bug: 'Fehler melden',
            idea: 'Idee & Feedback',
            content: 'Lerninhalte',
            privacy: 'Daten & Datenschutz',
            other: 'Sonstiges',
        } as Record<SupportTopic, string>,
        send: 'Nachricht senden',
        sending: 'Wird gesendet…',
        note: 'Ihre Nachricht geht direkt an unser Team. Wir antworten an die angegebene E-Mail-Adresse.',
        sentTitle: 'Danke, Ihre Nachricht ist angekommen.',
        sentDesc: 'Wir melden uns per E-Mail.',
        another: 'Weitere Nachricht schreiben',
        tooMany: 'Sie haben in kurzer Zeit viele Nachrichten gesendet. Bitte versuchen Sie es später erneut.',
        failed: 'Die Nachricht konnte nicht gesendet werden.',
        fallback: 'Schreiben Sie uns gern direkt an',
    },
    en: {
        name: 'Name (optional)',
        email: 'Email for our reply',
        subject: 'Topic',
        message: 'Message',
        hint: 'For bugs it helps to include: page or lesson, device and browser or app version.',
        choose: 'Choose a topic',
        topics: {
            account: 'Account & sign-in',
            bug: 'Report a bug',
            idea: 'Ideas & feedback',
            content: 'Learning content',
            privacy: 'Data & privacy',
            other: 'Other',
        } as Record<SupportTopic, string>,
        send: 'Send message',
        sending: 'Sending…',
        note: 'Your message goes straight to our team. We reply to the email address you enter.',
        sentTitle: 'Thank you, your message has arrived.',
        sentDesc: 'We will get back to you by email.',
        another: 'Write another message',
        tooMany: 'You have sent several messages in a short time. Please try again later.',
        failed: 'The message could not be sent.',
        fallback: 'You can also write to us directly at',
    },
    vi: {
        name: 'Tên (không bắt buộc)',
        email: 'Email để nhận trả lời',
        subject: 'Chủ đề',
        message: 'Nội dung',
        hint: 'Khi báo lỗi, nên ghi: trang hoặc bài học, thiết bị và trình duyệt hoặc phiên bản app.',
        choose: 'Chọn chủ đề',
        topics: {
            account: 'Tài khoản & đăng nhập',
            bug: 'Báo lỗi',
            idea: 'Ý tưởng & góp ý',
            content: 'Nội dung bài học',
            privacy: 'Dữ liệu & bảo mật',
            other: 'Khác',
        } as Record<SupportTopic, string>,
        send: 'Gửi tin nhắn',
        sending: 'Đang gửi…',
        note: 'Tin nhắn được gửi thẳng tới đội ngũ HalloVN. Chúng tôi trả lời qua email bạn nhập.',
        sentTitle: 'Cảm ơn bạn, tin nhắn đã được gửi.',
        sentDesc: 'Chúng tôi sẽ trả lời qua email.',
        another: 'Viết tin nhắn khác',
        tooMany: 'Bạn đã gửi khá nhiều tin nhắn trong thời gian ngắn. Vui lòng thử lại sau.',
        failed: 'Chưa gửi được tin nhắn.',
        fallback: 'Bạn có thể viết trực tiếp tới',
    },
};

const fieldClass =
    'mt-1.5 w-full border border-[var(--ink)]/60 bg-white px-3 py-2.5 text-base font-normal text-[var(--ink)] hover:border-[var(--ink)] focus:outline-2 focus:outline-offset-0 focus:outline-[var(--ink-ultra)]';

interface SupportFormProps {
    /** Tên sản phẩm (ghi kèm vào tin nhắn); bỏ trống ở trang hỗ trợ chung */
    product?: string;
    /** Các chủ đề được chọn; mặc định là tất cả */
    topics?: SupportTopic[];
}

type Status = { state: 'idle' | 'sending' | 'sent' } | { state: 'error'; message: string };

const EMPTY = { name: '', email: '', topic: '' as SupportTopic | '', message: '' };

/** Form liên hệ: gửi tới POST /api/v1/feedback (lưu lại và báo email cho quản trị), lỗi thì mời viết email trực tiếp. */
export default function SupportForm({ product, topics = ALL_TOPICS }: SupportFormProps) {
    const t = useT(COPY);
    const { locale } = useLocale();
    const [form, setForm] = useState(EMPTY);
    const [status, setStatus] = useState<Status>({ state: 'idle' });

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (status.state === 'sending' || !form.topic) return;
        setStatus({ state: 'sending' });
        const topic = form.topic;
        // Nội dung trước, thông tin sau: tiêu đề email báo cho quản trị lấy từ đầu nội dung
        const meta = [
            `${COPY.vi.subject}: ${COPY.vi.topics[topic]}`,
            product && `Sản phẩm: ${product}`,
            form.name.trim() && `Tên: ${form.name.trim()}`,
            `Email: ${form.email.trim()}`,
            `Trang: ${window.location.pathname} (${locale})`,
        ].filter(Boolean);
        try {
            const res = await fetch('/api/v1/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    kind: KIND[topic],
                    message: `${form.message.trim()}\n\n—\n${meta.join('\n')}`,
                    email: form.email.trim(),
                    device: `Web · ${product ?? SITE.name}`,
                }),
            });
            if (res.ok) {
                setForm(EMPTY);
                setStatus({ state: 'sent' });
                return;
            }
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            // Lỗi từ máy chủ viết bằng tiếng Việt: chỉ hiện nguyên văn khi trang đang ở tiếng Việt
            const message = res.status === 429 ? t.tooMany : locale === 'vi' && data.error ? data.error : t.failed;
            setStatus({ state: 'error', message });
        } catch {
            setStatus({ state: 'error', message: t.failed });
        }
    };

    if (status.state === 'sent') {
        return (
            <div className="grid gap-3 border border-[var(--ink)]/20 bg-white p-5 md:p-6" role="status">
                <p className="!mb-0 flex items-start gap-2 font-semibold">
                    <CheckIcon className="mt-1 h-4 w-4 shrink-0" />
                    <span>{t.sentTitle} {t.sentDesc}</span>
                </p>
                <button type="button" onClick={() => setStatus({ state: 'idle' })} className="justify-self-start font-semibold underline underline-offset-4">
                    {t.another}
                </button>
            </div>
        );
    }

    const sending = status.state === 'sending';
    return (
        <form onSubmit={submit} className="grid gap-4 border border-[var(--ink)]/20 bg-white p-5 md:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">
                    {t.name}
                    <input autoComplete="name" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldClass} />
                </label>
                <label className="block text-sm font-semibold">
                    {t.email}
                    <input required type="email" autoComplete="email" maxLength={200} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={fieldClass} />
                </label>
            </div>
            <label className="block text-sm font-semibold">
                {t.subject}
                <select required value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value as SupportTopic | '' })} className={fieldClass}>
                    <option value="">{t.choose}</option>
                    {topics.map((key) => (
                        <option key={key} value={key}>{t.topics[key]}</option>
                    ))}
                </select>
            </label>
            <label className="block text-sm font-semibold">
                {t.message}
                <textarea
                    required
                    rows={6}
                    minLength={5}
                    maxLength={4500}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    aria-describedby="support-hint"
                    className={fieldClass}
                />
                <span id="support-hint" className="mt-1.5 block font-normal text-[var(--ink)]/80">{t.hint}</span>
            </label>
            <button
                type="submit"
                disabled={sending}
                className="min-h-12 bg-[var(--ink-ultra)] px-5 py-3 font-display text-lg font-bold text-white transition-colors hover:bg-[var(--ink)] disabled:opacity-60"
            >
                {sending ? t.sending : t.send}
            </button>
            <p className="!mb-0 text-sm text-[var(--ink)]/80" aria-live="polite">
                {status.state === 'error' ? (
                    <span className="font-semibold text-red-700">
                        {status.message} {t.fallback} <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
                    </span>
                ) : (
                    t.note
                )}
            </p>
        </form>
    );
}
