import { OG_SIZE, renderOgImage } from "@/lib/company/ogImage";
import { CLASS_ORDER, totalQuestions } from "@/lib/laixe";
import { fmtNum } from "@/lib/laixe/seo";

// Ảnh chia sẻ cho cả phần Lái xe trên web (các trang con dùng chung)
export const alt = "Thi lý thuyết lái xe Đức bằng tiếng Việt";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    eyebrow: "Führerschein · Theorieprüfung",
    title: "Lý thuyết lái xe Đức",
    subtitle: `${fmtNum(totalQuestions())} câu hỏi chính thức cho ${CLASS_ORDER.length} hạng, bản dịch tiếng Việt, đề mẫu và thi thử như thật.`,
    accent: "#c92f16",
  });
}
