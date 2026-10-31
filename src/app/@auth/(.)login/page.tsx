import { Suspense } from "react";
import AuthRoute from "@/components/AuthRoute";

/** Bấm "Đăng nhập" từ trong web → hiện popup đè lên trang đang xem (mở thẳng /login vẫn ra trang riêng) */
export default function Page({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense>
      <AuthRoute mode="login" searchParams={searchParams} modal />
    </Suspense>
  );
}
