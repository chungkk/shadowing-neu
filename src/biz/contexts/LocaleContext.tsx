'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type Locale = 'de' | 'en' | 'vi';

export const LOCALES: Locale[] = ['de', 'en', 'vi'];

const STORAGE_KEY = 'ckk-locale';

interface LocaleContextValue {
    locale: Locale;
    setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
    locale: 'de',
    setLocale: () => {},
});

function fromTag(tag: string): Locale {
    const lower = tag.toLowerCase();
    if (lower.startsWith('de')) return 'de';
    if (lower.startsWith('vi')) return 'vi';
    return 'en';
}

/**
 * Ermittelt die Sprache: ?lang=… (Links aus den Apps) → gespeicherte Wahl → Deutsch.
 * Bewusst KEINE Browsersprache: Googlebot rendert mit navigator.language = en-US und würde sonst
 * englischen Text unter deutschem Title/Description/JSON-LD sehen (gemischte Sprachsignale).
 */
function detectLocale(): Locale {
    const param = new URLSearchParams(window.location.search).get('lang');
    if (param) return fromTag(param);
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (LOCALES.includes(stored as Locale)) return stored as Locale;
    } catch {
        // localStorage blockiert (privater Modus o. Ä.)
    }
    return 'de';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('de');

    useEffect(() => {
        const detected = detectLocale();
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Sprache ist erst im Browser bekannt
        if (detected !== 'de') setLocaleState(detected);
    }, []);

    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);

    const setLocale = useCallback((next: Locale) => {
        setLocaleState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
    }, []);

    return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
    return useContext(LocaleContext);
}

/** Wählt den passenden Eintrag aus einem { de, en, vi }-Wörterbuch. */
export function useT<T>(dict: Record<Locale, T>): T {
    const { locale } = useLocale();
    return dict[locale];
}
