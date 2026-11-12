import type { MetadataRoute } from 'next';
import { SITE } from '@/biz/lib/site';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'CKK – Software, Apps und Web-Anwendungen',
        short_name: SITE.name,
        description: SITE.description,
        start_url: '/',
        display: 'browser',
        background_color: '#e3e6e9',
        theme_color: '#e3e6e9',
        lang: 'de',
        icons: [
            { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
            { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
        ],
    };
}
