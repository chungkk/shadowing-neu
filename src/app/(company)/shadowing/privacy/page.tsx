import type { Metadata } from 'next';
import { ProductPrivacy } from '@/components/company/ProductLegal';
import { privacyMetadata } from '@/lib/company/legal';

// Cùng nội dung với /privacy (một chính sách duy nhất cho website + app HalloVN) → canonical về /privacy để không trùng lặp trên Google
const base = privacyMetadata('shadowing');
export const metadata: Metadata = { ...base, alternates: { canonical: '/privacy' } };

export default function Page() {
    return <ProductPrivacy slug="shadowing" />;
}
