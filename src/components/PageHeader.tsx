import type { ReactNode } from "react";
import Mascot from "./Mascot";

/** Băng tiêu đề đầu trang: nền màu theo `pop-*`, linh vật ló lên mép trên và nói 1 câu tiếng Đức */
export default function PageHeader({ title, say, pop, children }: { title: string; say: string; pop: string; children?: ReactNode }) {
  return (
    <header className={`sticker relative mt-4 flex min-h-24 flex-col justify-center gap-1 bg-[var(--pop)] py-4 pr-28 pl-4 sm:min-h-28 sm:pr-72 sm:pl-6 ${pop}`}>
      <h1 className="text-3xl leading-tight font-extrabold md:text-4xl">{title}</h1>
      {children && <div className="max-w-xl text-sm font-semibold max-sm:hidden">{children}</div>}
      <div className="absolute right-2 -bottom-0.5 flex items-center gap-1 sm:right-4">
        <p className="bubble bubble-right mb-10 bg-card px-3 py-1 font-display font-extrabold max-sm:hidden">{say}</p>
        <Mascot animated className="size-28 sm:size-36" />
      </div>
    </header>
  );
}
