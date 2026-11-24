"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { ADSENSE_CLIENT } from "@/lib/site";

/**
 * Chỉ nạp quảng cáo tự động (Auto ads) trên trang có nhiều nội dung tự viết của HalloVN: ngữ pháp, trang chủ, danh mục bài theo trình độ,
 * trang tổng quan lái xe / LiD. Không nạp trên trang mỏng hoặc chủ yếu là công cụ (bộ từ thẻ lật, làm bài), trang khoá sau đăng nhập,
 * trang phát lại / liệt kê video YouTube của người khác (bài học, kênh, xem video, thuyết minh), trang cá nhân, quản trị và pháp lý —
 * AdSense đánh giá các trang đó là "nội dung giá trị thấp".
 * Script đã nạp thì vẫn còn khi chuyển trang trong app (Auto ads không quét lại), nên lọc theo trang người dùng mở đầu tiên.
 */
const AD_PAGES = [
  /^\/$/,
  /^\/tieng-duc(\/trinh-do\/[^/]+)?$/,
  /^\/ngu-phap(\/[^/]+)?$/,
  /^\/lai-xe$/,
  /^\/leben-in-deutschland(\/chu-de)?$/,
];

export default function AdsenseScript() {
  const path = usePathname();
  if (!AD_PAGES.some((re) => re.test(path))) return null;
  return (
    <Script
      strategy="lazyOnload"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
    />
  );
}
