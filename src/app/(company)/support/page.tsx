import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/company/seo';
import { SupportHub } from '@/components/company/ProductLegal';

export const metadata: Metadata = pageMetadata({
    title: 'Support-Center',
    description: 'Hilfe und Kontakt zu allen Produkten von HalloVN: Führerschein Theorie HalloVN, Leben in Deutschland HalloVN und die HalloVN-App zum Deutschlernen.',
    path: '/support',
});

export default function SupportPage() {
    return <SupportHub />;
}
