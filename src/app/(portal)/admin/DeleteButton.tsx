"use client";

export default function DeleteButton({
  action,
  confirmText = "Xoá bài học này?",
}: {
  action: () => Promise<void>;
  confirmText?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <button className="btn text-red-400">Xoá</button>
    </form>
  );
}
