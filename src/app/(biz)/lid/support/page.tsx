import { ProductSupport } from '@/biz/components/business/ProductLegal';
import { supportMetadata } from '@/biz/lib/legal';

export const metadata = supportMetadata('lid');

export default function Page() {
    return <ProductSupport slug="lid" />;
}
