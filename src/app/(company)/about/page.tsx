import type { Metadata } from 'next';
import HomeContent from '@/components/company/HomeContent';
import { SITE } from '@/lib/company/site';
import { pageMetadata } from '@/lib/company/seo';
import { productAppNode, productJsonLdId, withFileOgImage } from '@/lib/company/productSeo';
import { ORGANIZATION_ID, WEBSITE_ID, serializeJsonLd } from '@/lib/seo';

const TITLE = 'Über HalloVN – Lernplattform für Vietnamesen in Deutschland';
const DESCRIPTION =
  'HalloVN ist die kostenlose Lernplattform für Vietnamesen in Deutschland: Deutsch mit echten Videos, Goethe-Wortschatz, Führerscheintheorie und Leben in Deutschland auf Vietnamesisch. Dazu Software nach Maß.';

// Ảnh OG: src/app/(company)/about/opengraph-image.tsx
export const metadata: Metadata = withFileOgImage(
  pageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: '/about',
    absolute: true,
  }),
);

export default function AboutPage() {
  // Organization + WebSite đã chèn ở layout (src/lib/seo.ts); ở đây là trang giới thiệu + nền tảng học, tham chiếu theo @id
  const url = `${SITE.url}/about`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': `${url}#webpage`,
        url,
        name: TITLE,
        description: DESCRIPTION,
        inLanguage: 'de',
        isPartOf: { '@id': WEBSITE_ID },
        about: { '@id': ORGANIZATION_ID },
        mainEntity: { '@id': productJsonLdId('shadowing') },
      },
      productAppNode('shadowing'),
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <HomeContent />
    </>
  );
}
