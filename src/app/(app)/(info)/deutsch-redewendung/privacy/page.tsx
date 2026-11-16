import { ProductPrivacy } from '@/components/company/ProductLegal';
import { privacyMetadata } from '@/lib/company/legal';

export const metadata = privacyMetadata('deutsch-redewendung');

export default function Page() {
    return <ProductPrivacy slug="deutsch-redewendung" />;
}
