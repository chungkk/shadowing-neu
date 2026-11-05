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

const HEIGHTS = [28, 52, 38, 74, 46, 90, 60, 34, 82, 56, 100, 42, 70, 30, 64, 48, 86, 36, 58, 26];

/** Dải sóng âm lớn làm nền trang trí: nhịp lên xuống như giọng đang nói */
export function SoundWave({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`sound-wave ${className}`}>
      {HEIGHTS.map((h, i) => (
        <i key={i} style={{ height: `${h}%`, animationDelay: `${i * -170}ms` }} />
      ))}
    </div>
  );
}
