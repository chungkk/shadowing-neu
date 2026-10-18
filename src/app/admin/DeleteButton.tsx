"use client";

export default function DeleteButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Xoá bài học này?")) e.preventDefault();
      }}
    >
      <button className="btn text-red-600">Xoá</button>
    </form>
  );
}
