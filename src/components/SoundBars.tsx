/** Sóng âm như trong hình linh vật: vạch tròn đầu, bóng đỏ + vàng lệch nhau */
export function SoundMark({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`sound-mark ${className}`}>
      <i style={{ height: "45%" }} />
      <i style={{ height: "100%" }} />
      <i style={{ height: "65%" }} />
    </span>
  );
}
