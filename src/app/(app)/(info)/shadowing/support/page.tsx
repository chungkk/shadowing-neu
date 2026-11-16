import type { Metadata } from 'next';
import { ProductSupport } from '@/components/company/ProductLegal';
import { pageMetadata } from '@/lib/company/seo';

export const metadata: Metadata = pageMetadata({
    title: 'Häufige Fragen & Support',
    description:
        'Antworten zu HalloVN: kostenloses Konto, Anmeldung mit Google oder Apple, Passwort vergessen, Gastzugang, Vokabelheft, Diamanten, Sprache und Konto löschen. Fehler melden und Kontakt.',
    path: '/shadowing/support',
});

export default function Page() {
    return <ProductSupport slug="shadowing" />;
}
