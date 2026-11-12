'use client';

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { SITE } from '@/biz/lib/site';
import { useT } from '@/biz/contexts/LocaleContext';

const COPY = {
    de: {
        kindLabel: 'Was soll entstehen?',
        kinds: ['App', 'Web-Anwendung', 'Schnittstelle oder Backend', 'Noch offen'],
        nameLabel: 'Ihr Name',
        messageLabel: 'Worum geht es?',
        messageHint: 'Ziel, Nutzer und Zeitrahmen, soweit schon bekannt.',
        messageError: 'Bitte beschreiben Sie kurz Ihr Vorhaben.',
        submit: 'E-Mail-Entwurf öffnen',
        privacy: 'Es wird nichts automatisch gesendet: Der Text öffnet sich in Ihrem E-Mail-Programm.',
        opened: 'Der Entwurf sollte jetzt offen sein. Falls nicht, schreiben Sie direkt an',
        subject: 'Projektanfrage',
        greetingName: 'Name',
        greetingKind: 'Art',
    },
    en: {
        kindLabel: 'What should we build?',
        kinds: ['App', 'Web application', 'API or backend', 'Not sure yet'],
        nameLabel: 'Your name',
        messageLabel: 'What is it about?',
        messageHint: 'Goal, users and timeframe, as far as you know them.',
        messageError: 'Please describe your project briefly.',
        submit: 'Open email draft',
        privacy: 'Nothing is sent automatically: the text opens in your email app.',
        opened: 'The draft should be open now. If not, write directly to',
        subject: 'Project enquiry',
        greetingName: 'Name',
        greetingKind: 'Type',
    },
    vi: {
        kindLabel: 'Bạn cần làm gì?',
        kinds: ['App', 'Ứng dụng web', 'API hoặc backend', 'Chưa rõ'],
        nameLabel: 'Tên của bạn',
        messageLabel: 'Dự án về điều gì?',
        messageHint: 'Mục tiêu, người dùng và thời gian mong muốn, nếu đã biết.',
        messageError: 'Vui lòng mô tả ngắn dự án của bạn.',
        submit: 'Mở bản nháp email',
        privacy: 'Không có gì được gửi tự động: nội dung sẽ mở trong ứng dụng email của bạn.',
        opened: 'Bản nháp đã được mở. Nếu không thấy, hãy viết trực tiếp tới',
        subject: 'Yêu cầu dự án',
        greetingName: 'Tên',
        greetingKind: 'Loại',
    },
};

const fieldOk = 'border-[var(--ink)]/60 hover:border-[var(--ink)]';
const fieldClass =
    'mt-2 w-full border bg-white px-3 py-2.5 text-base text-[var(--ink)] placeholder:text-[var(--ink)]/60 focus:outline-2 focus:outline-offset-0 focus:outline-[var(--ink-ultra)]';

export default function ProjectForm() {
    const t = useT(COPY);
    const [kind, setKind] = useState(0);
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState(false);
    const [opened, setOpened] = useState(false);
    const messageRef = useRef<HTMLTextAreaElement>(null);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!message.trim()) {
            setError(true);
            setOpened(false);
            messageRef.current?.focus();
            return;
        }
        setError(false);
        const body = [
            `${t.greetingKind}: ${t.kinds[kind]}`,
            ...(name.trim() ? [`${t.greetingName}: ${name.trim()}`] : []),
            '',
            message.trim(),
        ].join('\n');
        window.location.href = `mailto:${SITE.contactEmail}?subject=${encodeURIComponent(t.subject)}&body=${encodeURIComponent(body)}`;
        setOpened(true);
    };

    return (
        <form onSubmit={submit} noValidate className="text-[var(--ink)]">
            <fieldset>
                <legend className="font-semibold">{t.kindLabel}</legend>
                <div className="mt-2 grid grid-cols-2 gap-px border border-[var(--ink)]/60 bg-[var(--ink)]/60">
                    {t.kinds.map((label, i) => (
                        <label
                            key={i}
                            className={`flex min-h-12 cursor-pointer items-center px-3 py-2 text-sm font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:-outline-offset-4 has-focus-visible:outline-current ${kind === i ? 'bg-[var(--ink-ultra)] text-white' : 'bg-white hover:bg-[var(--paper)]'}`}
                        >
                            <input
                                type="radio"
                                name="kind"
                                className="sr-only"
                                checked={kind === i}
                                onChange={() => setKind(i)}
                            />
                            {label}
                        </label>
                    ))}
                </div>
            </fieldset>

            <label className="mt-5 block font-semibold">
                {t.nameLabel}
                <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={`${fieldClass} ${fieldOk} font-normal`} />
            </label>

            <label className="mt-5 block font-semibold">
                {t.messageLabel}
                <textarea
                    ref={messageRef}
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => {
                        setMessage(e.target.value);
                        if (e.target.value.trim()) setError(false);
                    }}
                    aria-invalid={error}
                    aria-describedby={error ? 'project-error' : 'project-hint'}
                    className={`${fieldClass} font-normal ${error ? 'border-2 border-[var(--ink-vermilion)] focus:outline-[var(--ink-vermilion)]' : fieldOk}`}
                />
            </label>
            {error ? (
                <p id="project-error" role="alert" className="mt-2 text-sm font-semibold text-[var(--ink-vermilion)]">
                    {t.messageError}
                </p>
            ) : (
                <p id="project-hint" className="mt-2 text-sm text-[var(--ink)]/70">
                    {t.messageHint}
                </p>
            )}

            <button
                type="submit"
                className="mt-6 min-h-12 w-full bg-[var(--ink-ultra)] px-5 py-3 font-display text-lg font-bold text-white transition-colors hover:bg-[var(--ink)]"
            >
                {t.submit}
            </button>
            <p className="mt-3 text-sm text-[var(--ink)]/70" aria-live="polite">
                {opened ? (
                    <>
                        {t.opened}{' '}
                        <a href={`mailto:${SITE.contactEmail}`} className="font-semibold text-[var(--ink-ultra)] underline underline-offset-3">
                            {SITE.contactEmail}
                        </a>
                        .
                    </>
                ) : (
                    t.privacy
                )}
            </p>
        </form>
    );
}
