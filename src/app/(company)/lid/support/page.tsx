import { ProductSupport } from '@/components/company/ProductLegal';
import { supportMetadata } from '@/lib/company/legal';

export const metadata = supportMetadata('lid');

export default function Page() {
    return <ProductSupport slug="lid" />;
}
