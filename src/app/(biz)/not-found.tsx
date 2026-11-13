import type { Metadata } from 'next';
import NotFoundContent from '@/biz/components/business/NotFoundContent';

// Next tự gắn thêm một thẻ noindex cho 404, nhưng layout lại khai báo "index, follow":
// ghi đè robots ở đây để hai thẻ không mâu thuẫn nhau.
export const metadata: Metadata = {
    title: 'Seite nicht gefunden',
    description: 'Diese Seite gibt es auf hallovn.de nicht. Hier finden Sie die Produkte und den Support von CKK.',
    robots: { index: false, follow: true },
};

export default function NotFound() {
    return <NotFoundContent />;
}
