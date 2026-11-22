import { apiAdmin, fail } from "@/lib/api";
import { dubEnabled, dubJson, type DubJob } from "@/lib/dub";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await apiAdmin();
  if (admin instanceof Response) return admin;
  if (!dubEnabled()) return fail("Chưa cấu hình VIENEU_DUB_URL.", 503);

  const { id } = await params;
  if (!/^[a-f0-9]{6,32}$/i.test(id)) return fail("Mã job không hợp lệ.");

  try {
    return Response.json(await dubJson<{ job: DubJob }>(`/jobs/${id}`, { timeoutMs: 10_000 }));
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await apiAdmin();
  if (admin instanceof Response) return admin;
  if (!dubEnabled()) return fail("Chưa cấu hình VIENEU_DUB_URL.", 503);

  const { id } = await params;
  if (!/^[a-f0-9]{6,32}$/i.test(id)) return fail("Mã job không hợp lệ.");

  try {
    return Response.json(await dubJson<{ deleted: boolean }>(`/jobs/${id}`, { method: "DELETE", timeoutMs: 10_000 }));
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
