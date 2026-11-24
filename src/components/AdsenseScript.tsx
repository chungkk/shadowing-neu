"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ADSENSE_CLIENT } from "@/lib/site";

/**
 * Chỉ nạp quảng cáo tự động (Auto ads) trên trang có nhiều nội dung tự viết của HalloVN: ngữ pháp, trang chủ, danh mục bài theo trình độ,
 * trang tổng quan lái xe / LiD. Không nạp trên trang mỏng hoặc chủ yếu là công cụ (bộ từ thẻ lật, làm bài), trang khoá sau đăng nhập,
 * trang phát lại / liệt kê video YouTube của người khác (bài học, kênh, xem video, thuyết minh), trang cá nhân, quản trị và pháp lý —
 * AdSense đánh giá các trang đó là "nội dung giá trị thấp".
 * Script đã nạp thì vẫn còn khi chuyển trang trong app (Auto ads không quét lại), nên lọc theo trang người dùng mở đầu tiên.
 * Tự chèn thẻ <script> thuần thay cho next/script: next/script gắn data-nscript, AdSense báo "head tag doesn't support data-nscript".
 */
const AD_PAGES = [
  /^\/$/,
  /^\/tieng-duc(\/trinh-do\/[^/]+)?$/,
  /^\/ngu-phap(\/[^/]+)?$/,
  /^\/lai-xe$/,
  /^\/leben-in-deutschland(\/chu-de)?$/,
];

const SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

export default function AdsenseScript() {
  const path = usePathname();
  const allowed = AD_PAGES.some((re) => re.test(path));

  useEffect(() => {
    if (!allowed || document.querySelector(`script[src="${SRC}"]`)) return;
    const add = () => {
      if (document.querySelector(`script[src="${SRC}"]`)) return;
      const el = document.createElement("script");
      el.async = true;
      el.src = SRC;
      el.crossOrigin = "anonymous";
      document.head.appendChild(el);
    };
    // Như strategy="lazyOnload": đợi trang tải xong để không giành băng thông với nội dung chính
    if (document.readyState === "complete") add();
    else window.addEventListener("load", add, { once: true });
    return () => window.removeEventListener("load", add);
  }, [allowed]);

  return null;
}
