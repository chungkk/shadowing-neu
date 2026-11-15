import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/company/seo';
import { SupportHub } from '@/components/company/ProductLegal';

export const metadata: Metadata = pageMetadata({
    title: 'Support-Center – Hilfe & Kontakt',
    description:
        'Hilfe zu HalloVN: Konto und Anmeldung, Passwort vergessen, Deutschlernen, Vokabelheft, Führerscheintheorie und Leben in Deutschland. Kontakt per Formular oder E-Mail auf Deutsch, Englisch und Vietnamesisch.',
    path: '/support',
});

export default function SupportPage() {
    return <SupportHub />;
}
