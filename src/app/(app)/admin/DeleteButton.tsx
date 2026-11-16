"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";

function SubmitButton({ onAsk }: { onAsk: () => void }) {
  const { pending } = useFormStatus();
  return (
    <button type="button" className="btn btn-red btn-sm" disabled={pending} onClick={onAsk}>
      <Trash2 className="size-3.5" aria-hidden />
      {pending ? "Đang xoá…" : "Xoá"}
    </button>
  );
}

/** Nút xoá (.btn-red) + hộp xác nhận (.dialog). Chỉ gửi form (server action) sau khi bấm "Xoá" trong hộp. */
export default function DeleteButton({
  action,
  confirmText = "Xoá bài học này?",
}: {
  action: () => Promise<void>;
  confirmText?: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [ask, dialog] = useConfirm();

  return (
    <form ref={form} action={action}>
      <SubmitButton
        onAsk={async () => {
          if (await ask({ title: "Xác nhận xoá", text: confirmText, ok: "Xoá", tone: "red", icon: <Trash2 className="size-5" /> })) form.current?.requestSubmit();
        }}
      />
      {dialog}
    </form>
  );
}
