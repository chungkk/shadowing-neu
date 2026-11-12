import { connection } from 'next/server';
import { NextResponse } from 'next/server';
import { CATALOG_ALL_DIR, readManifest } from '@/biz/lib/drivingCatalog.mjs';

export async function GET() {
    await connection(); // đọc catalog lúc request (manifest đổi khi publish)
    try {
        return NextResponse.json(readManifest(CATALOG_ALL_DIR), {
            headers: { 'Cache-Control': 'no-store' },
        });
    } catch {
        return NextResponse.json({ error: 'Catalog unavailable' }, {
            status: 503, headers: { 'Cache-Control': 'no-store' },
        });
    }
}
