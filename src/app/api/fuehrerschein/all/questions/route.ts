import { connection } from 'next/server';
import { NextResponse } from 'next/server';
import { CATALOG_ALL_DIR, readManifest, readQuestionPack } from '@/biz/lib/drivingCatalog.mjs';

export async function GET(request: Request) {
    await connection(); // đọc catalog lúc request (manifest đổi khi publish)
    try {
        const requested = new URL(request.url).searchParams.get('version');
        if (requested && !/^q-[a-f0-9]{64}$/.test(requested)) {
            return NextResponse.json({ error: 'Invalid version' }, { status: 400 });
        }
        const pack = readQuestionPack(requested || readManifest(CATALOG_ALL_DIR).version, CATALOG_ALL_DIR);
        return NextResponse.json(requested ? pack : pack.questions, {
            headers: {
                'Cache-Control': requested ? 'public, max-age=31536000, immutable' : 'no-store',
            },
        });
    } catch {
        return NextResponse.json(
            { error: 'Failed to load questions' },
            { status: 503, headers: { 'Cache-Control': 'no-store' } }
        );
    }
}
