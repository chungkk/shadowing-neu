import { permanentRedirect } from "next/navigation";

/**
 * URL cũ (app HalloVN bản đã phát hành mở trang này trong trình duyệt nhúng, link trong form đăng ký) → chuyển hẳn (308)
 * tới trang pháp lý chung của HalloVN. Nội dung chỉ còn một nơi: /privacy?lang=de
 */
export default function PrivacyDePage() {
  permanentRedirect("/privacy?lang=de");
}
