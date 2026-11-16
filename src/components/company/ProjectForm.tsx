'use client';

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { SITE } from '@/lib/company/site';
import { useT } from '@/components/company/LocaleContext';

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

// Ô nhập dùng .input của app; lỗi thì viền đỏ (--red-400 là màu chữ lỗi của app)
const fieldClass = 'input mt-1.5 w-full font-normal text-foreground';
const fieldError = 'border-red-400 focus:border-red-400 dark:border-red-400';

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
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 font-bold">{t.kindLabel}</legend>
                <div className="grid grid-cols-2 gap-2">
                    {t.kinds.map((label, i) => (
                        <label
                            key={i}
                            className={`btn has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent ${kind === i ? 'btn-primary' : ''}`}
                        >
                            <input type="radio" name="kind" className="sr-only" checked={kind === i} onChange={() => setKind(i)} />
                            {label}
                        </label>
                    ))}
                </div>
            </fieldset>

            <label className="block font-bold">
                {t.nameLabel}
                <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
            </label>

            <div>
                <label className="block font-bold">
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
                        className={`${fieldClass} ${error ? fieldError : ''}`}
                    />
                </label>
                {error ? (
                    <p id="project-error" role="alert" className="mt-1.5 text-sm font-bold text-red-400">
                        {t.messageError}
                    </p>
                ) : (
                    <p id="project-hint" className="mt-1.5 text-sm text-muted">
                        {t.messageHint}
                    </p>
                )}
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full">
                {t.submit}
            </button>
            <p className="text-sm text-muted" aria-live="polite">
                {opened ? (
                    <>
                        {t.opened}{' '}
                        <a href={`mailto:${SITE.contactEmail}`} className="font-bold text-link underline underline-offset-2">
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
