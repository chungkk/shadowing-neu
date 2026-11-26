import { Suspense } from "react";
import type { Metadata } from "next";
import AuthRoute from "@/components/auth/AuthRoute";

export const metadata: Metadata = {
  title: "Đăng nhập",
  robots: { index: false, follow: false },
};

export default function Page({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense>
      <AuthRoute searchParams={searchParams} />
    </Suspense>
  );
}
