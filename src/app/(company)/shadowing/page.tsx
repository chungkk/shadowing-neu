import ProductPageView from '@/components/company/ProductPageView';
import { productJsonLd, productMetadata } from '@/lib/company/productSeo';
import { serializeJsonLd } from '@/lib/seo';

export const metadata = productMetadata('shadowing');

export default function Page() {
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd('shadowing')) }} />
            <ProductPageView id="shadowing" />
        </>
    );
}
