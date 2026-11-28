"use client";

import { useFormStatus } from "react-dom";
import { RefreshCw } from "lucide-react";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-sm" disabled={pending} title="Lấy lại danh sách video mới nhất từ YouTube">
      <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} aria-hidden /> {pending ? "Đang làm mới…" : "Làm mới"}
    </button>
  );
}

/** Xoá cache danh sách video của kênh rồi tải lại trang tại chỗ (giữ ?n= và ?f=) */
export default function RefreshButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <Submit />
    </form>
  );
}
