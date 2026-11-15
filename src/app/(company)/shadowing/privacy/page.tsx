import { ProductPrivacy } from '@/components/company/ProductLegal';
import { privacyMetadata } from '@/lib/company/legal';

export const metadata = privacyMetadata('shadowing');

export default function Page() {
    return <ProductPrivacy slug="shadowing" />;
}
