import { ProductSupport } from '@/biz/components/business/ProductLegal';
import { supportMetadata } from '@/biz/lib/legal';

export const metadata = supportMetadata('calendar');

export default function Page() {
    return <ProductSupport slug="calendar" />;
}
