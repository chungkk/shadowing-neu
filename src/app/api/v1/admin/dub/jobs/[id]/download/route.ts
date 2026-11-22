import { apiAdmin, fail } from "@/lib/api";
import { dubEnabled, dubEndpoint, dubHeaders } from "@/lib/dub";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await apiAdmin();
  if (admin instanceof Response) return admin;
  if (!dubEnabled()) return fail("Chưa cấu hình VIENEU_DUB_URL.", 503);

  const { id } = await params;
  if (!/^[a-f0-9]{6,32}$/i.test(id)) return fail("Mã job không hợp lệ.");

  const url = new URL(req.url);
  const isSrt = url.searchParams.get("type") === "srt";
  const upstreamUrl = dubEndpoint(isSrt ? `/jobs/${id}/srt` : `/jobs/${id}/download`);
  const range = req.headers.get("range");
  const headers = dubHeaders(range ? { Range: range } : undefined);

  const upstream = await fetch(upstreamUrl, { headers, cache: "no-store" });
  if (!upstream.ok && upstream.status !== 206) {
    return fail(`Không tải được file (${upstream.status}).`, upstream.status);
  }

  const outHeaders = new Headers();
  for (const h of ["content-type", "content-length", "content-range", "accept-ranges", "content-disposition"]) {
    const v = upstream.headers.get(h);
    if (v) outHeaders.set(h, v);
  }
  outHeaders.set("Cache-Control", "private, no-store");
  if (!isSrt && url.searchParams.get("dl") !== "1") {
    // Allow inline playback in <video> unless dl=1 is explicitly requested
    outHeaders.delete("content-disposition");
  }

  return new Response(upstream.body, { status: upstream.status, headers: outHeaders });
}
