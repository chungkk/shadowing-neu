import type { Metadata } from 'next';
import HomeContent from '@/biz/components/business/HomeContent';
import { COMPANY, FACEBOOK_PAGE_URL, SITE } from '@/biz/lib/site';
import { SERVICES, productPath } from '@/biz/lib/services';
import { pageMetadata } from '@/biz/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'CKK – Software, Apps und Web-Anwendungen',
  description: SITE.description,
  path: '/about',
  absolute: true,
});

export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE.url}/#organization`,
        name: COMPANY.legalName,
        alternateName: SITE.name,
        url: SITE.url,
        email: SITE.contactEmail,
        logo: { '@type': 'ImageObject', url: `${SITE.url}/apple-icon.png`, width: 180, height: 180 },
        address: {
          '@type': 'PostalAddress',
          postalCode: COMPANY.postalCity.split(' ')[0],
          addressLocality: COMPANY.postalCity.split(' ').slice(1).join(' '),
          addressCountry: 'DE',
        },
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: SITE.supportEmail,
          url: `${SITE.url}/support`,
          availableLanguage: ['de', 'en', 'vi'],
        },
        sameAs: [FACEBOOK_PAGE_URL],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE.url}/#website`,
        url: SITE.url,
        name: SITE.name,
        description: SITE.description,
        inLanguage: 'de',
        publisher: { '@id': `${SITE.url}/#organization` },
      },
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
        publisher: { '@id': `${SITE.url}/#organization` },
      })),
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeContent />
    </>
  );
}
