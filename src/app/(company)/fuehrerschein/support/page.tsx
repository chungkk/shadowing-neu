import { ProductSupport } from '@/components/company/ProductLegal';
import { supportMetadata } from '@/lib/company/legal';

export const metadata = supportMetadata('fuehrerschein');

export default function Page() {
    return <ProductSupport slug="fuehrerschein" />;
}
