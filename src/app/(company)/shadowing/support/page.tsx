import { ProductSupport } from '@/biz/components/business/ProductLegal';
import { supportMetadata } from '@/biz/lib/legal';

export const metadata = supportMetadata('shadowing');

export default function Page() {
    return <ProductSupport slug="shadowing" />;
}
