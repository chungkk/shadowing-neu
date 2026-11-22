import { Suspense } from "react";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { CheckCircle2, Database, FolderOpen, HardDrive, Languages, MinusCircle, Server } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { adminSystemStats, AVATAR_DIR, DB_PATH, TTS_DIR } from "@/lib/db";
import { ListSkeleton } from "@/components/Skeleton";
import AdminPageHeader from "../_components/AdminPageHeader";
import KpiCard from "../_components/KpiCard";
import SectionCard from "../_components/SectionCard";

const fmt = (n: number) => n.toLocaleString("vi-VN");

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function fileSize(p: string): number {
  try {
    return statSync(p).size;
  } catch {
    return 0;
  }
}

function dirStats(dir: string): { files: number; bytes: number } {
  try {
    if (!existsSync(dir)) return { files: 0, bytes: 0 };
    let files = 0;
    let bytes = 0;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      files++;
      bytes += fileSize(path.join(dir, entry.name));
    }
    return { files, bytes };
  } catch {
    return { files: 0, bytes: 0 };
  }
}

function hasBinary(cmd: string): boolean {
  if (cmd.includes("/")) return existsSync(cmd);
  return (process.env.PATH ?? "").split(path.delimiter).some((d) => d && existsSync(path.join(d, cmd)));
}

async function SystemContent() {
  await requireAdmin();
  const sys = adminSystemStats();
  const dbBytes = fileSize(DB_PATH) + fileSize(`${DB_PATH}-wal`) + fileSize(`${DB_PATH}-shm`);
  const tts = dirStats(TTS_DIR);
  const avatars = dirStats(AVATAR_DIR);

  const env = process.env;
  const checks: { name: string; ok: boolean; detail: string }[] = [
    { name: "Tài khoản Admin cố định", ok: Boolean(env.ADMIN_EMAIL && env.ADMIN_PASSWORD), detail: "ADMIN_EMAIL + ADMIN_PASSWORD" },
    { name: "Gửi email (SMTP)", ok: Boolean(env.SMTP_HOST && env.SMTP_USER), detail: "Xác minh email & quên mật khẩu" },
    { name: "Đăng nhập Google", ok: Boolean(env.GOOGLE_CLIENT_ID), detail: "Google OAuth 2.0" },
    { name: "Đăng nhập Apple", ok: Boolean(env.APPLE_CLIENT_ID || env.APPLE_BUNDLE_ID), detail: "Sign in with Apple" },
    { name: "Dịch / AI Whisper", ok: Boolean(env.OPENAI_API_KEY || env.GROQ_API_KEY || env.DEEPL_API_KEY), detail: "Whisper / dịch câu tự động" },
    { name: "Trình lấy video yt-dlp", ok: hasBinary(env.YTDLP_PATH || "yt-dlp"), detail: env.YTDLP_PATH ? "Đường dẫn tuỳ chỉnh" : "Trong PATH hệ thống" },
  ];

  return (
    <>
      <AdminPageHeader
        crumbs={[{ label: "Vận hành & Hệ thống" }, { label: "Hệ thống & Cache" }]}
        title="Hệ thống & Cache"
        description="Giám sát dung lượng cơ sở dữ liệu SQLite, bộ nhớ đệm phụ đề/bản dịch/TTS và trạng thái cấu hình dịch vụ."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard tone="ink" label="Cơ sở dữ liệu SQLite" icon={<Database className="size-4" aria-hidden />} value={fmtBytes(dbBytes)} sub="Bao gồm tệp chính + WAL" />
        <KpiCard tone="de" label="Cache bản dịch" icon={<Languages className="size-4" aria-hidden />} value={sys.translations.total} sub="Câu dịch lưu dùng chung" />
        <KpiCard tone="gem" label="Cache giọng đọc TTS" icon={<HardDrive className="size-4" aria-hidden />} value={fmtBytes(tts.bytes)} sub={`${fmt(tts.files)} tệp âm thanh`} />
        <KpiCard tone="laixe" label="Ảnh đại diện" icon={<FolderOpen className="size-4" aria-hidden />} value={fmtBytes(avatars.bytes)} sub={`${fmt(avatars.files)} tệp ảnh`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Số lượng bản ghi trong SQLite" description="Thống kê trực tiếp từ các bảng cốt lõi." flush>
          <ul className="divide-y divide-line text-sm">
            {sys.tables.map((t) => (
              <li key={t.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{t.label}</p>
                  <p className="font-mono text-xs text-muted">{t.name}</p>
                </div>
                <span className="font-mono text-sm font-semibold text-foreground tabular-nums">{fmt(t.count)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <div className="flex flex-col gap-4">
          <SectionCard title="Trạng thái dịch vụ & cấu hình" description="Chỉ kiểm tra trạng thái bật/tắt — không hiển thị khoá bí mật." flush>
            <ul className="divide-y divide-line text-sm">
              {checks.map((c) => (
                <li key={c.name} className="flex items-center gap-3 px-4 py-2.5">
                  {c.ok ? (
                    <CheckCircle2 className="size-4 shrink-0 text-ok-text" aria-hidden />
                  ) : (
                    <MinusCircle className="size-4 shrink-0 text-muted" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted">{c.detail}</p>
                  </div>
                  <span className={`badge ${c.ok ? "badge-ok" : "badge-muted"}`}>{c.ok ? "Đã cấu hình" : "Chưa bật"}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Phân bổ bộ nhớ đệm (Cache)" description="Chi tiết bảng translations và transcript_cache.">
            <div className="flex flex-col gap-3 text-sm">
              <div className="surface flex items-center justify-between px-3.5 py-2.5">
                <span className="inline-flex items-center gap-2 text-muted">
                  <Server className="size-4" aria-hidden /> Cache phụ đề (`transcript_cache`)
                </span>
                <span className="font-mono text-xs font-semibold tabular-nums">
                  {fmt(sys.transcriptCache.total)} mục ({fmt(sys.transcriptCache.youtube)} YT · {fmt(sys.transcriptCache.whisper)} Whisper)
                </span>
              </div>
              {sys.translations.byProvider.length > 0 && (
                <div className="surface flex flex-col gap-1.5 px-3.5 py-2.5">
                  <p className="text-xs font-semibold text-muted">Bản dịch theo nguồn (`translations`)</p>
                  <div className="flex flex-wrap gap-2">
                    {sys.translations.byProvider.map((p) => (
                      <span key={p.provider} className="badge badge-muted font-mono tabular-nums">
                        {p.provider}: {fmt(p.count)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-xs text-muted">
                Node.js <span className="font-mono text-foreground">{process.version}</span> · Môi trường{" "}
                <span className="font-mono text-foreground">{process.env.NODE_ENV}</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}

export default function AdminSystemPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <SystemContent />
    </Suspense>
  );
}
