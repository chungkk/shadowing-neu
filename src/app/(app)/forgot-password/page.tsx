import { Suspense } from "react";
import type { Metadata } from "next";
import { ForgotForm } from "@/components/auth/PasswordForms";

export const metadata: Metadata = {
  title: "Quên mật khẩu",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense>
      <ForgotForm />
    </Suspense>
  );
}
