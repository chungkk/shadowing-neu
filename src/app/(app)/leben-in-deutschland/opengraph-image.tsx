import { OG_SIZE, renderOgImage } from "@/lib/company/ogImage";

// Ảnh chia sẻ cho cả phần Leben in Deutschland trên web (các trang con dùng chung)
export const alt = "Leben in Deutschland tiếng Việt – luyện thi Einbürgerungstest";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    eyebrow: "Einbürgerungstest · BAMF 2025",
    title: "Leben in Deutschland",
    subtitle: "300 câu chung + 10 câu của bang, bản dịch tiếng Việt, thi thử 33 câu như thật.",
    accent: "#1d8048",
  });
}
