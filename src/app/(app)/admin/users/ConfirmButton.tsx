"use client";

import { useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useConfirm } from "@/components/ConfirmDialog";

function Submit({ children, className, onAsk }: { children: ReactNode; className: string; onAsk: () => void }) {
  const { pending } = useFormStatus();
  return (
    <button type="button" className={className} disabled={pending} onClick={onAsk}>
      {pending ? "Đang xử lý…" : children}
    </button>
  );
}

/** Nút gửi server action sau khi xác nhận trong .dialog (đăng xuất mọi thiết bị, xoá tiến độ…) */
export default function ConfirmButton({
  action,
  children,
  title,
  text,
  ok,
  tone = "primary",
  icon,
  className = "btn btn-sm",
}: {
  action: () => Promise<void>;
  children: ReactNode;
  title: string;
  text?: string;
  ok: string;
  tone?: "primary" | "red";
  icon?: ReactNode;
  className?: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [ask, dialog] = useConfirm();
  return (
    <form ref={form} action={action}>
      <Submit
        className={className}
        onAsk={async () => {
          if (await ask({ title, text, ok, tone, icon })) form.current?.requestSubmit();
        }}
      >
        {children}
      </Submit>
      {dialog}
    </form>
  );
}
