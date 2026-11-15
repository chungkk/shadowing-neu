import { OG_SIZE, renderOgImage } from "@/lib/company/ogImage";

// Ảnh chia sẻ mặc định cho mọi trang học (tiếng Việt); trang nào có opengraph-image riêng sẽ được ưu tiên
export const alt = "HalloVN – Học tiếng Đức, thi lái xe & Leben in Deutschland cho người Việt";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    eyebrow: "Tiếng Đức · Lái xe · Leben in Deutschland",
    title: "Học tiếng Đức cho người Việt",
    subtitle: "Video thật, lý thuyết lái xe và Leben in Deutschland có bản dịch tiếng Việt, game luyện từ. Miễn phí.",
    accent: "#e5484d",
  });
}
