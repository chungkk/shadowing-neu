import { renderOgImage } from '@/lib/company/ogImage';

// Ảnh chia sẻ mặc định (tiếng Đức) cho các trang doanh nghiệp/pháp lý. Đường dẫn cố định /og/hallovn.png —
// opengraph-image.tsx trong route group bị Next gắn mã vào URL nên không dùng làm link viết tay được.
// Không gọi API động → Next tự dựng sẵn lúc build (cacheComponents không cho dùng `dynamic`).

export function GET() {
    return renderOgImage({
        eyebrow: 'HalloVN',
        title: 'Deutsch lernen und in Deutschland ankommen',
        subtitle: 'Die kostenlose Lernplattform für Vietnamesen in Deutschland – und Software nach Ihren Anforderungen.',
        accent: '#2438c9',
    });
}
