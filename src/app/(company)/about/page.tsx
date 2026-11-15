import type { Metadata } from 'next';
import HomeContent from '@/components/company/HomeContent';
import { SITE } from '@/lib/company/site';
import { SERVICES, productPath } from '@/lib/company/services';
import { pageMetadata } from '@/lib/company/seo';
import { ORGANIZATION_ID, serializeJsonLd } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'HalloVN – Software, Apps und Web-Anwendungen',
  description: SITE.description,
  path: '/about',
  absolute: true,
});

export default function HomePage() {
  // Organization + WebSite đã chèn ở layout (src/lib/seo.ts); ở đây chỉ liệt kê các app, tham chiếu publisher theo @id
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      ...SERVICES.map((service) => ({
        '@type': service.platform === 'iOS' ? 'MobileApplication' : 'WebApplication',
        '@id': `${SITE.url}${productPath(service)}#app`,
        name: service.name,
        url: `${SITE.url}${productPath(service)}`,
        ...(service.platform === 'iOS'
          ? { operatingSystem: service.android ? 'iOS, Android' : 'iOS', downloadUrl: service.href }
          : { operatingSystem: 'Web', sameAs: service.href }),
        applicationCategory: 'EducationalApplication',
        offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR' },
        publisher: { '@id': ORGANIZATION_ID },
      })),
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <HomeContent />
    </>
  );
}
