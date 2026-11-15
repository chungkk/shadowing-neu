import ProductPageView from '@/biz/components/business/ProductPageView';
import { productJsonLd, productMetadata } from '@/biz/lib/productSeo';

export const metadata = productMetadata('lid');

export default function Page() {
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd('lid')) }} />
            <ProductPageView id="lid" />
        </>
    );
}
