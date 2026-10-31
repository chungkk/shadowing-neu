import { Suspense } from "react";
import AuthRoute from "@/components/AuthRoute";

/** Như (.)login: bấm "Đăng ký" từ trong web → popup */
export default function Page({ searchParams }: PageProps<"/register">) {
  return (
    <Suspense>
      <AuthRoute mode="register" searchParams={searchParams} modal />
    </Suspense>
  );
}
