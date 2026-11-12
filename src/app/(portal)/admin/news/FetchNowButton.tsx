"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { fetchNewsNow } from "./actions";

export default function FetchNowButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="btn" disabled={pending} onClick={() => start(async () => setMsg((await fetchNewsNow()).message))}>
        <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} /> {pending ? "Đang lấy và dịch tin…" : "Lấy tin ngay"}
      </button>
      {msg && <span className="text-sm text-muted">{msg}</span>}
    </div>
  );
}
