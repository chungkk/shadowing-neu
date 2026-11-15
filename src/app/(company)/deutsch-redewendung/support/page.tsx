import { ProductSupport } from '@/components/company/ProductLegal';
import { supportMetadata } from '@/lib/company/legal';

export const metadata = supportMetadata('deutsch-redewendung');

export default function Page() {
    return <ProductSupport slug="deutsch-redewendung" />;
}
