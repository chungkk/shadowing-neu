import type { Metadata } from 'next';
import { pageMetadata } from '@/biz/lib/seo';
import { SupportHub } from '@/biz/components/business/ProductLegal';

export const metadata: Metadata = pageMetadata({
    title: 'Support-Center',
    description: 'Hilfe und Kontakt zu allen Produkten von CKK: Führerschein Theorie Ckk, Leben in Deutschland Ckk und Deutsch Shadowing.',
    path: '/support',
});

export default function SupportPage() {
    return <SupportHub />;
}
