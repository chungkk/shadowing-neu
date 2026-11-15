import ProductPageView from '@/components/company/ProductPageView';
import { productJsonLd, productMetadata } from '@/lib/company/productSeo';

export const metadata = productMetadata('lid');

export default function Page() {
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd('lid')) }} />
            <ProductPageView id="lid" />
        </>
    );
}
