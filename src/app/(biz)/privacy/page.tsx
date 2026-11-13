import type { Metadata } from 'next';
import { pageMetadata } from '@/biz/lib/seo';
import { WebsitePrivacy } from '@/biz/components/business/ProductLegal';

export const metadata: Metadata = pageMetadata({
    title: 'Datenschutzerklärung',
    description: 'Datenschutzerklärung der Website hallovn.de und Übersicht aller Produkte von CKK.',
    path: '/privacy',
});

export default function PrivacyPage() {
    return <WebsitePrivacy />;
}
