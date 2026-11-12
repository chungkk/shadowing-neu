import { ProductPrivacy } from '@/biz/components/business/ProductLegal';
import { privacyMetadata } from '@/biz/lib/legal';

export const metadata = privacyMetadata('calendar');

export default function Page() {
    return <ProductPrivacy slug="calendar" />;
}
