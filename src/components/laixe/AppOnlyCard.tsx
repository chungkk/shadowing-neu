import { Smartphone } from "lucide-react";
import { APP_LINKS } from "@/lib/company/site";

/** Thẻ mời học tiếp trên app (iOS + APK Android). */
export default function AppOnlyCard({ title, text }: { title: string; text: string }) {
  return (
    <section className="tile flex flex-col gap-3 bg-accent/10">
      <span className="flex items-center gap-2 font-extrabold">
        <Smartphone className="size-5" /> {title}
      </span>
      <p className="text-sm text-muted">{text}</p>
      <span className="flex flex-wrap gap-2">
        <a href={APP_LINKS.fuehrerschein} target="_blank" rel="noopener" className="btn btn-sm">
          Tải trên App Store
        </a>
        <a href={APP_LINKS.fuehrerscheinAndroid} rel="nofollow" className="btn btn-sm">
          Tải APK Android
        </a>
      </span>
    </section>
  );
}
