import { Suspense } from "react";
import LocalApp from "@/components/LocalApp";
import { getCurrentUser } from "@/lib/auth";

async function App() {
  // Tự tạo phụ đề bằng Whisper (tốn tiền API) chỉ dành cho người đã đăng nhập
  return <LocalApp canTranscribe={!!(await getCurrentUser())} />;
}

export default function Page() {
  return (
    <Suspense>
      <App />
    </Suspense>
  );
}
