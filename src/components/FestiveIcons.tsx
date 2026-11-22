import type { SVGProps } from "react";

export type FestiveIconProps = SVGProps<SVGSVGElement> & {
  className?: string;
  strokeWidth?: number;
};

const base = (strokeWidth = 1.85) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

/** 1. Trang chủ — Ngôi nhà mái tuyết & sao Giáng Sinh */
export function ChristmasHomeIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="M3 10.5 12 3.5l9 7" />
      <path d="M5 9.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V9.5" />
      <path d="M9.5 20.5v-5a2.5 2.5 0 0 1 5 0v5" />
      {/* Mái tuyết trắng nhẹ + sao vàng đỉnh nhà */}
      <path d="M4.5 9.6c2-.4 3.4-.2 4.5.7 1.3-.9 2.2-1 3-.7.8-.3 1.7-.2 3 .7 1.1-.9 2.5-1.1 4.5-.7" stroke="#E2E8F0" strokeWidth="1.5" />
      <path d="M12 1.2 12.6 2.5 14 3l-1.4.5-.6 1.3-.6-1.3L10 3l1.4-.5z" fill="#FBBF24" stroke="none" />
    </svg>
  );
}

/** 2. Tiếng Đức — Bong bóng ngôn ngữ đội mũ ông già Noel */
export function ChristmasDeutschIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="M4 11.5c0-3.6 3.4-6.5 7.5-6.5s7.5 2.9 7.5 6.5-3.4 6.5-7.5 6.5c-1.2 0-2.4-.2-3.4-.7L4.5 19l1-3.1C4.5 14.7 4 13.2 4 11.5z" />
      <path d="M9 13.5 11.2 9l2.2 4.5" />
      <path d="M9.7 12.2h3" />
      {/* Mũ Noel đỏ + viền trắng + cục bông */}
      <path d="M13 5.2c1.4-2.5 4.2-3.1 6.3-1.4l-1.2 3.3c-1.8-.9-3.5-1.4-5.1-1.9z" fill="#EF4444" stroke="#EF4444" strokeWidth="1.1" />
      <path d="M12.4 5.4c1.9.4 4.1 1.1 6.1 2.2" stroke="#F8FAFC" strokeWidth="2.1" />
      <circle cx="20" cy="4.4" r="1.4" fill="#F8FAFC" stroke="none" />
    </svg>
  );
}

/** 3. Lái xe — Ô tô chở cây thông Noel trên nóc */
export function ChristmasCarIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      {/* Cây thông Noel buộc trên nóc xe */}
      <path d="M6.5 7.5 11.8 4.2l.8 1.5 3.6-1.2-1.1 3.3-8.6-.3z" fill="#22C55E" stroke="#22C55E" strokeWidth="1.1" />
      <circle cx="15.8" cy="4.4" r="1" fill="#FBBF24" stroke="none" />
      {/* Thân xe */}
      <path d="M5 12.5 6.8 9h9.4l2 3.5" />
      <rect x="3" y="12.5" width="18" height="5" rx="2" />
      <circle cx="7.5" cy="18.5" r="1.6" />
      <circle cx="16.5" cy="18.5" r="1.6" />
      {/* Dây buộc đỏ */}
      <path d="M10.5 7.6v1.4M13.5 7.6v1.4" stroke="#EF4444" strokeWidth="1.5" />
    </svg>
  );
}

/** 4. Leben in Deutschland — Cổng lịch sử Đức treo vòng nguyệt quế Noel */
export function ChristmasLidIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="M3 20h18" />
      <path d="M4.5 9.5h15" />
      <path d="M3.5 9.5 12 4l8.5 5.5" />
      <path d="M6.5 9.5V20M10.2 9.5V20M13.8 9.5V20M17.5 9.5V20" />
      {/* Vòng nguyệt quế thông xanh & nơ đỏ */}
      <circle cx="12" cy="13.5" r="2.2" fill="none" stroke="#22C55E" strokeWidth="1.9" />
      <circle cx="12" cy="11.3" r="1.1" fill="#EF4444" stroke="none" />
    </svg>
  );
}

/** 5. Thông báo — Chuông Giáng Sinh có lá nhựa ruồi & nơ đỏ */
export function ChristmasBellIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="M18 10a6 6 0 0 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5" />
      <path d="M10 19.5a2.2 2.2 0 0 0 4 0" />
      {/* Nhánh lá nhựa ruồi + quả đỏ trên đỉnh chuông */}
      <path d="M12 4.5c-1.8-.4-3.1-1.3-3.6-2.4 1.6-.2 3 .4 3.6 1.6.6-1.2 2-1.8 3.6-1.6-.5 1.1-1.8 2-3.6 2.4z" fill="#22C55E" stroke="none" />
      <circle cx="12" cy="4.2" r="1.35" fill="#EF4444" stroke="none" />
    </svg>
  );
}

/** 6. Ôn tập / Sổ từ — Chồng thẻ quà tặng thắt nơ vàng */
export function ChristmasReviewIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <rect x="4" y="8" width="16" height="4.5" rx="1.2" />
      <path d="M5.5 12.5v6.5a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-6.5" />
      {/* Ruy-băng vàng & nơ quà */}
      <path d="M12 8v12.5" stroke="#FBBF24" strokeWidth="1.9" />
      <path d="M12 8c-1.2-2.6-4.2-2.8-4.2-.8 0 1.2 1.8 1.2 4.2.8 2.4.4 4.2.4 4.2-.8 0-2-3-1.8-4.2.8z" stroke="#EF4444" strokeWidth="1.6" />
    </svg>
  );
}

/** 7. Bài học video — Màn hình video có ngôi sao Giáng Sinh */
export function ChristmasVideoIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <rect x="2.5" y="4.5" width="19" height="13" rx="2.2" />
      <path d="M8.5 21h7" />
      <path d="M10.2 8.5 15 11l-4.8 2.5z" fill="currentColor" stroke="none" />
      <path d="M19.5 2 20.1 3.4 21.5 4l-1.4.6-.6 1.4-.6-1.4L17.5 4l1.4-.6z" fill="#FBBF24" stroke="none" />
    </svg>
  );
}

/** 8. Ngữ pháp — Mũ tốt nghiệp gắn quả nhựa ruồi Giáng Sinh */
export function ChristmasGrammarIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="m2.5 9.5 9.5-4.5 9.5 4.5L12 14 2.5 9.5z" />
      <path d="M6 11.2V16c0 1.6 2.7 3 6 3s6-1.4 6-3v-4.8" />
      <path d="M21 10v5" />
      {/* Quả nhựa ruồi đỏ + lá xanh trên mũ */}
      <path d="M16.2 7.2c1.2-.8 2.4-.7 3.1.2-1 .7-2.1.8-3.1-.2z" fill="#22C55E" stroke="none" />
      <circle cx="15.8" cy="7.4" r="1.3" fill="#EF4444" stroke="none" />
    </svg>
  );
}

/** 9. Kho từ vựng — Sách từ vựng có ruy-băng đỏ & sao vàng */
export function ChristmasVocabIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="M4.5 19.5A2.5 2.5 0 0 1 7 17h12.5" />
      <path d="M6.5 3h13v18H6.5A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3z" />
      {/* Ruy-băng đánh dấu đỏ + sao vàng */}
      <path d="M13.5 3v6.5l1.75-1.3L17 9.5V3z" fill="#EF4444" stroke="none" />
      <path d="M9.5 8.5 10.1 9.9 11.5 10.5l-1.4.6-.6 1.4-.6-1.4L7.5 10.5l1.4-.6z" fill="#FBBF24" stroke="none" />
    </svg>
  );
}

/** 10. Học theo chương — Sách mở tỏa sao tuyết */
export function ChristmasBookIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="M12 8.5c-1.8-1.4-4.5-2-8-2v12c3.5 0 6.2.6 8 2 1.8-1.4 4.5-2 8-2v-12c-3.5 0-6.2.6-8 2z" />
      <path d="M12 8.5v12" />
      {/* Sao tuyết vàng bay phía trên */}
      <path d="M12 1.8 12.7 3.5 14.4 4.2l-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7z" fill="#FBBF24" stroke="none" />
    </svg>
  );
}

/** 11. Bảng xếp hạng / Thành tích — Cúp ngôi sao Giáng Sinh */
export function ChristmasTrophyIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="M7 4h10v6a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4.5a2 2 0 0 0 0 4H7" />
      <path d="M17 6h2.5a2 2 0 0 1 0 4H17" />
      <path d="M12 15v4" />
      <path d="M8.5 20h7" />
      {/* Ngôi sao vàng giữa cúp */}
      <path d="M12 6.2 12.8 8l1.9.3-1.4 1.3.3 1.9L12 10.6l-1.6.9.3-1.9-1.4-1.3L11.2 8z" fill="#FBBF24" stroke="none" />
    </svg>
  );
}

/** 12. Thi thử — Cờ đích gắn ngôi sao Giáng Sinh */
export function ChristmasFlagIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="M5 21V5.5" />
      <path d="M5 5.5c2.5-1.2 5.5 1.2 8.5 0 2-.8 4 .2 5.5.8v8.2c-1.5-.6-3.5-1.6-5.5-.8-3 1.2-6-1.2-8.5 0" />
      {/* Sao vàng đỉnh cột + nơ đỏ */}
      <path d="M5 1.6 5.6 3 7 3.6 5.6 4.2 5 5.6 4.4 4.2 3 3.6 4.4 3z" fill="#FBBF24" stroke="none" />
      <circle cx="12" cy="9.5" r="1.4" fill="#EF4444" stroke="none" />
    </svg>
  );
}

/** 13. Đề mẫu — Xấp đề thi gắn bông tuyết */
export function ChristmasFileStackIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <rect x="6" y="3" width="13" height="15" rx="2" />
      <path d="M4 7v11.5A2.5 2.5 0 0 0 6.5 21H16" />
      <path d="M9.5 13.5h6" />
      {/* Bông tuyết tinh thể xanh băng trên góc đề */}
      <path d="M12.5 6.2v4.6M10.5 7.4l4 2.2M14.5 7.4l-4 2.2" stroke="#38BDF8" strokeWidth="1.4" />
    </svg>
  );
}

/** 14. Thống kê — Biểu đồ cột chạm sao Giáng Sinh */
export function ChristmasChartIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="M3.5 20h17" />
      <rect x="5" y="13" width="3.2" height="7" rx="0.8" />
      <rect x="10.4" y="9.5" width="3.2" height="10.5" rx="0.8" />
      <rect x="15.8" y="6.5" width="3.2" height="13.5" rx="0.8" />
      <path d="M17.4 1.6 18 3l1.4.6-1.4.6-.6 1.4-.6-1.4L15.4 3.6 16.8 3z" fill="#FBBF24" stroke="none" />
    </svg>
  );
}

/** 15. Cài đặt — Bánh răng bông tuyết (Snowflake Gear) */
export function ChristmasSettingsIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v6.3M12 15.2v6.3M3.8 7.2l5.4 3.2M14.8 13.6l5.4 3.2M20.2 7.2l-5.4 3.2M9.2 13.6l-5.4 3.2" />
      {/* Nhánh tinh thể tuyết nhỏ */}
      <path d="M10.3 4.3 12 5.7l1.7-1.4M10.3 19.7 12 18.3l1.7 1.4" stroke="#38BDF8" strokeWidth="1.5" />
    </svg>
  );
}

/** 16. Quản trị — Khiên ngôi sao Giáng Sinh */
export function ChristmasAdminIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6L12 3z" />
      <path d="M12 7.5 12.9 9.8l2.4.3-1.8 1.6.5 2.4-2-1.2-2 1.2.5-2.4-1.8-1.6 2.4-.3z" fill="#FBBF24" stroke="none" />
    </svg>
  );
}

/** 17. Chuỗi ngày học — Ngọn nến Giáng Sinh ấm áp (Adventskerze) */
export function ChristmasFlameIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      {/* Ngọn lửa nến vàng ấm */}
      <path d="M12 2.8c1.7 2 2.4 3.6 2.4 4.8a2.4 2.4 0 0 1-4.8 0c0-1.2.7-2.8 2.4-4.8z" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.2" />
      {/* Thân nến */}
      <rect x="8.5" y="10.5" width="7" height="10" rx="1.4" />
      <path d="M8.5 13.5c1.5 1 2.8-.6 4.2.4 1 .7 1.9.3 2.8-.4" stroke="#EF4444" strokeWidth="1.5" />
      <path d="M6.5 20.5h11" />
    </svg>
  );
}

/** 18. Ngôi sao Giáng Sinh 8 cánh */
export function ChristmasStarIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="M12 2.5 14.3 9l6.7 1-5 4.4 1.4 6.6-5.4-3.3-5.4 3.3 1.4-6.6-5-4.4 6.7-1z" />
      <circle cx="12" cy="12" r="1.7" fill="#FBBF24" stroke="none" />
    </svg>
  );
}

/** 19. Ôn câu sai — Vòng lặp kèm điểm nhựa ruồi đỏ */
export function ChristmasWrongIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9" />
      <path d="M4.5 4.5V9H9" />
      <circle cx="12" cy="12" r="2" fill="#EF4444" stroke="none" />
    </svg>
  );
}

/** 20. Nghe từng câu — Tai nghe đội mũ Noel nhỏ */
export function ChristmasHeadphonesIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="13.5" width="4" height="6.5" rx="1.5" />
      <rect x="17" y="13.5" width="4" height="6.5" rx="1.5" />
      {/* Mũ Noel nhỏ trên đỉnh tai nghe */}
      <path d="M9.5 4.6 13.5 1.8 15 5.4z" fill="#EF4444" stroke="none" />
      <circle cx="15.8" cy="2.3" r="1.1" fill="#F8FAFC" stroke="none" />
    </svg>
  );
}

/** 21. Ghi âm nói theo — Micro thắt nơ đỏ Giáng Sinh */
export function ChristmasMicIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <rect x="9" y="3" width="6" height="10" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3M9 21h6" />
      {/* Nơ đỏ nhỏ dưới micro */}
      <path d="M9.5 17.5 12 18.8l2.5-1.3v2.6L12 18.8l-2.5 1.3z" fill="#EF4444" stroke="none" />
    </svg>
  );
}

/** 22. Chép chính tả — Bút viết tỏa sao Giáng Sinh */
export function ChristmasPencilIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="M4 20h4.5L19 9.5a2.1 2.1 0 0 0-3-3L5.5 17 4 20z" />
      <path d="M14 8.5 17 11.5" />
      <path d="M7.5 4 8.1 5.4 9.5 6l-1.4.6-.6 1.4-.6-1.4L5.5 6l1.4-.6z" fill="#FBBF24" stroke="none" />
    </svg>
  );
}

/** 23. App di động — Điện thoại hiện cây thông Noel nhỏ */
export function ChristmasSmartphoneIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
      <path d="M12 7.5 9.2 12h1.6l-1.8 3h6l-1.8-3h1.6z" fill="#22C55E" stroke="none" />
      <circle cx="12" cy="6.6" r="0.9" fill="#FBBF24" stroke="none" />
    </svg>
  );
}

/** 24. Chủ đề Đời sống hằng ngày — Ly ca cao / Glühwein mùa đông */
export function ChristmasCocoaIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="M4.5 9h11.5v7.5a3.5 3.5 0 0 1-3.5 3.5H8a3.5 3.5 0 0 1-3.5-3.5V9z" />
      <path d="M16 10.5h2a2.2 2.2 0 0 1 0 4.4h-2" />
      <path d="M8 5.8c0-1 .8-1.4.8-2.3M12 5.8c0-1 .8-1.4.8-2.3" />
      {/* Que kẹo gậy đỏ trong ly */}
      <path d="M13.2 9 15 4.8a1.4 1.4 0 0 1 2.4.9" stroke="#EF4444" strokeWidth="1.8" />
    </svg>
  );
}

/** 25. Chủ đề Hội thoại — Bong bóng trò chuyện gắn lá nhựa ruồi */
export function ChristmasChatIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="M4.5 11.5a7.5 6.5 0 1 1 3 5.2L4 19l1.2-3.4c-.5-1.2-.7-2.6-.7-4.1z" />
      <path d="M9 11.5h6M9 14.2h4" />
      <circle cx="18.2" cy="5.8" r="1.4" fill="#EF4444" stroke="none" />
      <path d="M15.4 4.8c1-.8 2.2-.8 2.9 0-.8.8-2 .8-2.9 0z" fill="#22C55E" stroke="none" />
    </svg>
  );
}

/** 26. Chủ đề Công việc — Cặp công sở thắt ruy-băng đỏ */
export function ChristmasWorkIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <rect x="3.5" y="7.5" width="17" height="12.5" rx="2" />
      <path d="M8.5 7.5V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5v2" />
      <path d="M3.5 13.2h17" stroke="#EF4444" strokeWidth="1.6" />
      <circle cx="12" cy="13.2" r="1.4" fill="#FBBF24" stroke="none" />
    </svg>
  );
}

/** 27. Chủ đề Tin tức Đức — Tờ báo có bông tuyết mùa đông */
export function ChristmasNewsIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="M4.5 5.5A1.5 1.5 0 0 1 6 4h12a1.5 1.5 0 0 1 1.5 1.5v13a1.5 1.5 0 0 1-1.5 1.5H6a2 2 0 0 1-2-2V5.5z" />
      <path d="M8 14h8M8 17h5" />
      <path d="M12 7.2v4.2M10.2 8.2l3.6 2.2M13.8 8.2l-3.6 2.2" stroke="#38BDF8" strokeWidth="1.4" />
    </svg>
  );
}

/** 28. Chủ đề Văn hóa & Giải trí — Quả châu Giáng Sinh (Christbaumkugel) */
export function ChristmasOrnamentIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <circle cx="12" cy="13.5" r="7" />
      <path d="M10 6.5V4.8a2 2 0 0 1 4 0v1.7" />
      <path d="M5.5 13.5c2.2 1.4 4.3 1.4 6.5 0s4.3-1.4 6.5 0" stroke="#EF4444" strokeWidth="1.5" />
      <path d="M12 8.8 12.6 10.2 14 10.8l-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill="#FBBF24" stroke="none" />
    </svg>
  );
}

/** 29. Admin Dashboard — Lưới 4 ô có ô sao Giáng Sinh */
export function ChristmasDashboardIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      <path d="M17 3.2 18 6l2.8 1-2.8 1-1 2.8-1-2.8L13.2 7 16 6z" fill="#FBBF24" stroke="none" />
    </svg>
  );
}

/** 30. Kênh YouTube — TV phát sáng sao Giáng Sinh */
export function ChristmasChannelIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="m8.5 3.5 3.5 3.5 3.5-3.5" />
      <circle cx="15.5" cy="3.5" r="1.2" fill="#EF4444" stroke="none" />
      <path d="M10.5 11.2 14.8 13.5l-4.3 2.3z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** 31. Kho phụ đề — Khung phụ đề có sao tuyết */
export function ChristmasCaptionsIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 13h4M13 13h4M7 16h6" />
      <path d="M17 7.2 17.5 8.4 18.7 8.9l-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z" fill="#FBBF24" stroke="none" />
    </svg>
  );
}

/** 32. Kho nội dung chuẩn — Sách có dấu sao hoàn thành */
export function ChristmasCatalogIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="M12 7c-1.8-1.3-4.5-1.8-8-1.8V18c3.5 0 6.2.5 8 1.8 1.8-1.3 4.5-1.8 8-1.8V5.2c-3.5 0-6.2.5-8 1.8z" />
      <path d="M12 7v12.8" />
      <circle cx="17.8" cy="5.2" r="1.5" fill="#22C55E" stroke="none" />
    </svg>
  );
}

/** 33. Người dùng — Nhóm học viên đội mũ Noel nhỏ */
export function ChristmasUsersIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <circle cx="9.5" cy="9.5" r="3" />
      <path d="M3.5 19.5a6 6 0 0 1 12 0" />
      <path d="M16 7.5a2.5 2.5 0 0 1 0 5" />
      <path d="M17.5 19.5a4.5 4.5 0 0 0-2.2-3.9" />
      {/* Mũ Noel trên người đầu */}
      <path d="M7 6.8 10.5 3.6 12.2 6.8z" fill="#EF4444" stroke="none" />
      <circle cx="11.2" cy="3.6" r="1" fill="#F8FAFC" stroke="none" />
    </svg>
  );
}

/** 34. Khoá bài & Kim cương — Ổ khoá gắn nơ quà đỏ */
export function ChristmasLockIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15.5" r="1.4" fill="#FBBF24" stroke="none" />
      <circle cx="16.2" cy="10.5" r="1.3" fill="#EF4444" stroke="none" />
    </svg>
  );
}

/** 35. Hệ thống & Cache — Máy chủ mùa đông có đèn bông tuyết */
export function ChristmasSystemIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <rect x="3.5" y="4" width="17" height="6.5" rx="1.6" />
      <rect x="3.5" y="13.5" width="17" height="6.5" rx="1.6" />
      <circle cx="7.2" cy="7.2" r="1.1" fill="#22C55E" stroke="none" />
      <circle cx="7.2" cy="16.8" r="1.1" fill="#38BDF8" stroke="none" />
      <path d="M15.5 7.2h1.5M15.5 16.8h1.5" />
    </svg>
  );
}

/** 36. Cây thông Giáng Sinh tinh gọn (dùng cho badge / footer / điểm nhấn) */
export function ChristmasTreeIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="M12 4.5 6.5 12h2.4L5 18h14l-3.9-6h2.4z" fill="#22C55E" fillOpacity="0.16" stroke="#22C55E" />
      <path d="M12 18v3" />
      <path d="M12 1.6 12.6 3l1.4.6-1.4.6-.6 1.4-.6-1.4L10 3.6 11.4 3z" fill="#FBBF24" stroke="none" />
      <circle cx="10.5" cy="14" r="1" fill="#EF4444" stroke="none" />
      <circle cx="13.8" cy="15.8" r="1" fill="#FBBF24" stroke="none" />
    </svg>
  );
}

/** 37. Bông tuyết tinh thể 6 cánh */
export function ChristmasSnowflakeIcon({ className = "size-5", strokeWidth = 1.85, ...p }: FestiveIconProps) {
  return (
    <svg {...base(strokeWidth)} className={className} aria-hidden {...p}>
      <path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2 3.8 16.8" />
      <path d="M9.8 4.8 12 6.8l2.2-2M9.8 19.2 12 17.2l2.2 2M5 10.5 7.6 9.5 6.8 6.8M19 13.5l-2.6 1 .8 2.7" />
    </svg>
  );
}
