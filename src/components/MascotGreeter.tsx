"use client";

import { useState } from "react";
import Mascot from "./Mascot";

const LINES = ["Hallo! Cùng nói nào!", "Wie geht's?", "Los geht's!", "Noch einmal!", "Super!"];

/** Linh vật ở đầu trang chủ: bấm vào thì nhảy lên và nói câu tiếng Đức khác */
export default function MascotGreeter() {
  const [line, setLine] = useState(0);
  const [hop, setHop] = useState(false);

  return (
    <div className="relative flex items-center justify-between gap-2 md:block md:w-72 lg:w-80">
      {/* key: đổi câu thì bong bóng bật lại */}
      <p key={line} aria-live="polite" className="bubble bubble-right bubble-pop z-10 min-w-0 bg-card px-3 py-1.5 font-display text-base font-extrabold md:absolute md:top-4 md:left-0 lg:text-lg">
        {LINES[line]}
      </p>
      <button
        type="button"
        aria-label="Bấm để linh vật nói câu tiếng Đức khác"
        className={`shrink-0 cursor-pointer rounded-full md:block md:w-full ${hop ? "mascot-hop" : ""}`}
        onClick={() => {
          setLine((n) => (n + 1) % LINES.length);
          setHop(true);
        }}
        onAnimationEnd={() => setHop(false)}
      >
        <Mascot animated className="size-28 md:size-full" />
      </button>
    </div>
  );
}
