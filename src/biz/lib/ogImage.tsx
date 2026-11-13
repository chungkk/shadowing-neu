// Ảnh chia sẻ 1200×630 (Open Graph / Twitter), render lúc build bằng next/og.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

interface OgProps {
    eyebrow: string;
    title: string;
    subtitle: string;
    /** Màu dải nhấn (hex) */
    accent: string;
}

export async function renderOgImage({ eyebrow, title, subtitle, accent }: OgProps) {
    const mark = await readFile(path.join(process.cwd(), 'src/biz/icon.svg'));
    const markSrc = `data:image/svg+xml;base64,${mark.toString('base64')}`;

    return new ImageResponse(
        (
            <div style={{ width: '100%', height: '100%', display: 'flex', background: '#e3e6e9', color: '#17151a' }}>
                <div style={{ width: 28, height: '100%', background: accent }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={markSrc} width={72} height={72} alt="" style={{ borderRadius: 16 }} />
                        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>CKK · hallovn.de</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ fontSize: 28, textTransform: 'uppercase', letterSpacing: 3, color: accent, fontWeight: 700 }}>{eyebrow}</div>
                        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>{title}</div>
                        <div style={{ fontSize: 34, lineHeight: 1.3, color: '#3d3a42', maxWidth: 960 }}>{subtitle}</div>
                    </div>
                </div>
            </div>
        ),
        OG_SIZE,
    );
}
