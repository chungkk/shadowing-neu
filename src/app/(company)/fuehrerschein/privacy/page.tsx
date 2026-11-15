import { ProductPrivacy } from '@/components/company/ProductLegal';
import { privacyMetadata } from '@/lib/company/legal';

export const metadata = privacyMetadata('fuehrerschein');

export default function Page() {
    return <ProductPrivacy slug="fuehrerschein" />;
}
