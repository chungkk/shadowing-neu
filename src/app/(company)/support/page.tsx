import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/company/seo';
import { SupportHub } from '@/components/company/ProductLegal';

export const metadata: Metadata = pageMetadata({
    title: 'Support-Center',
    description: 'Hilfe und Kontakt zu den Produkten von HalloVN: die Lernplattform HalloVN zum Deutschlernen, für Führerscheintheorie und Leben in Deutschland.',
    path: '/support',
});

export default function SupportPage() {
    return <SupportHub />;
}
