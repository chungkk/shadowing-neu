const SOURCES = { still: "/mascot.svg", animated: "/mascot-animated.svg", loading: "/mascot-loading.svg" };

/** Linh vật của trang (tắc kè hoa đeo tai nghe) · animated: bản có các bộ phận chuyển động · loading: dáng riêng lúc tải trang (đều sinh bởi mobile/scripts/make-mascot.mjs) */
export default function Mascot({ className = "", animated = false, loading = false }: { className?: string; animated?: boolean; loading?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={SOURCES[loading ? "loading" : animated ? "animated" : "still"]} alt="" className={`shrink-0 ${className}`} />;
}
