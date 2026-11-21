import type { MetadataRoute } from 'next';

// Một manifest chung cho cả site. start_url "/" là trang học tiếng Việt (nhóm (app)) nên tên / mô tả / màu
// theo nhóm này; các trang doanh nghiệp tiếng Đức (/about, /impressum…) cũng dùng chung icon HalloVN.
export default function manifest(): MetadataRoute.Manifest {
    return {
        id: '/',
        name: 'HalloVN – Học tiếng Đức, lái xe & Leben in Deutschland',
        short_name: 'HalloVN',
        description:
            'Học tiếng Đức qua video thật, ôn lý thuyết lái xe Đức và Leben in Deutschland có bản dịch tiếng Việt. Miễn phí cho người Việt tại Đức.',
        start_url: '/',
        scope: '/',
        display: 'browser',
        background_color: '#fbfaf7',
        theme_color: '#fbfaf7',
        lang: 'vi',
        dir: 'ltr',
        categories: ['education'],
        icons: [
            { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
            { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
        ],
    };
}
