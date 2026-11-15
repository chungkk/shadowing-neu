import { ProductPrivacy } from '@/biz/components/business/ProductLegal';
import { privacyMetadata } from '@/biz/lib/legal';

export const metadata = privacyMetadata('deutsch-redewendung');

export default function Page() {
    return <ProductPrivacy slug="deutsch-redewendung" />;
}
