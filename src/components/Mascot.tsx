/** Linh vật của trang (tắc kè hoa đeo tai nghe) */
export default function Mascot({ className = "" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/mascot.svg" alt="" className={`shrink-0 ${className}`} />;
}
