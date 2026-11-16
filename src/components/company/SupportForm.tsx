'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { SITE } from '@/lib/company/site';
import { useLocale, useT } from '@/components/company/LocaleContext';
import { ChevronDown, CircleAlert, CircleCheck, Loader2, PenLine, Send } from 'lucide-react';

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

/** Ô nhập kiểu app (.input), chữ đen/trắng theo giao diện */
const fieldClass = 'input w-full font-normal text-foreground';

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
            <div className="alert alert-ok rise-in flex-col items-start gap-3 p-4 text-base sm:p-5" role="status">
                <p className="flex items-start gap-2.5 font-bold">
                    <span className="icon-bubble size-8 rounded-full bg-card text-accent-text">
                        <CircleCheck className="size-5" aria-hidden="true" />
                    </span>
                    <span className="pt-1">
                        {t.sentTitle} <span className="font-normal text-foreground">{t.sentDesc}</span>
                    </span>
                </p>
                <button type="button" onClick={() => setStatus({ state: 'idle' })} className="btn btn-sm">
                    <PenLine className="size-4 text-link" aria-hidden="true" /> {t.another}
                </button>
            </div>
        );
    }

    const sending = status.state === 'sending';
    return (
        <form onSubmit={submit} className="grid gap-4" aria-busy={sending}>
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="field">
                    {t.name}
                    <input autoComplete="name" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldClass} />
                </label>
                <label className="field">
                    {t.email}
                    <input required type="email" autoComplete="email" maxLength={200} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={fieldClass} />
                </label>
            </div>
            {/* Không dùng .field ở đây: .field select của app là kiểu ô chọn nhỏ, còn ô này cần cỡ .input */}
            <label className="flex flex-col gap-1.5 text-sm font-bold text-muted">
                {t.subject}
                <span className="relative">
                    <select
                        required
                        value={form.topic}
                        onChange={(e) => setForm({ ...form, topic: e.target.value as SupportTopic | '' })}
                        className={`${fieldClass} cursor-pointer appearance-none pr-11`}
                    >
                        <option value="">{t.choose}</option>
                        {topics.map((key) => (
                            <option key={key} value={key}>{t.topics[key]}</option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-link" />
                </span>
            </label>
            <label className="field">
                {t.message}
                <textarea
                    required
                    rows={6}
                    minLength={5}
                    maxLength={4500}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    aria-describedby="support-hint"
                    className={`${fieldClass} resize-y`}
                />
                <span id="support-hint" className="field-hint font-normal">{t.hint}</span>
            </label>
            {status.state === 'error' && (
                <p role="alert" className="alert alert-err">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>
                        <b>{status.message}</b> {t.fallback}{' '}
                        <a href={`mailto:${SITE.contactEmail}`} className="font-bold underline underline-offset-2">
                            {SITE.contactEmail}
                        </a>
                        .
                    </span>
                </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="submit" disabled={sending} className="btn btn-primary btn-lg max-sm:w-full">
                    {sending ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" /> : <Send className="size-5" />}
                    {sending ? t.sending : t.send}
                </button>
                <p className="text-xs text-muted">{t.note}</p>
            </div>
        </form>
    );
}
