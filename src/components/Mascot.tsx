/** Linh vật của trang (tắc kè hoa đeo tai nghe) · animated: bản có các bộ phận chuyển động (sinh bởi mobile/scripts/make-mascot.mjs) */
export default function Mascot({ className = "", animated = false }: { className?: string; animated?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={animated ? "/mascot-animated.svg" : "/mascot.svg"} alt="" className={`shrink-0 ${className}`} />;
}
