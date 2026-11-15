import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/company/seo';
import { WebsitePrivacy } from '@/components/company/ProductLegal';

export const metadata: Metadata = pageMetadata({
    title: 'Datenschutzerklärung',
    description:
        'Datenschutzerklärung von HalloVN für die Website hallovn.de und die App HalloVN: Konto, Lerndaten, Mikrofon, KI-Dienste, Google AdSense, Cookies, Speicherdauer und Ihre Rechte nach der DSGVO.',
    path: '/privacy',
});

export default function PrivacyPage() {
    return <WebsitePrivacy />;
}
