import { Suspense } from "react";
import type { Metadata } from "next";
import AuthRoute from "@/components/auth/AuthRoute";

export const metadata: Metadata = {
  title: "Đăng ký tài khoản",
  robots: { index: false, follow: false },
};

export default function Page({ searchParams }: PageProps<"/register">) {
  return (
    <Suspense>
      <AuthRoute mode="register" searchParams={searchParams} />
    </Suspense>
  );
}
