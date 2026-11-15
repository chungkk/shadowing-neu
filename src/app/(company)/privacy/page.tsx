import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/company/seo';
import { WebsitePrivacy } from '@/components/company/ProductLegal';

export const metadata: Metadata = pageMetadata({
    title: 'Datenschutzerklärung',
    description: 'Datenschutzerklärung der Website hallovn.de und Übersicht aller Produkte von HalloVN.',
    path: '/privacy',
});

export default function PrivacyPage() {
    return <WebsitePrivacy />;
}
