import { connection } from 'next/server';
import { NextResponse } from 'next/server';
import { LANGUAGES, readManifest, readTranslationPack } from '@/biz/lib/drivingCatalog.mjs';

export async function GET(request: Request, { params }: { params: Promise<{ lang: string }> }) {
    await connection(); // đọc catalog lúc request (manifest đổi khi publish)
    const { lang } = await params;
    if (!LANGUAGES.includes(lang)) {
        return NextResponse.json({ error: 'Unsupported language' }, { status: 400 });
    }
    const requested = new URL(request.url).searchParams.get('version');
    if (requested && !/^t-[a-f0-9]{64}$/.test(requested)) {
        return NextResponse.json({ error: 'Invalid version' }, { status: 400 });
    }
    try {
        const version = requested || readManifest().translations[lang]?.version;
        if (!version) return NextResponse.json({ error: 'Translation unavailable' }, { status: 404 });
        const pack = readTranslationPack(lang, version);
        return NextResponse.json(requested ? pack : pack.translations, {
            headers: {
                'Cache-Control': requested ? 'public, max-age=31536000, immutable' : 'no-store',
                'X-Translation-Count': String(pack.count),
                'X-Translation-Language': lang,
            },
        });
    } catch {
        return NextResponse.json({ error: 'Translation unavailable' }, {
            status: 503, headers: { 'Cache-Control': 'no-store' },
        });
    }
}
