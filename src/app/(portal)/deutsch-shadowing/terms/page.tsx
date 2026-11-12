import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng",
  description: "Điều khoản sử dụng ứng dụng và trang web Deutsch Shadowing.",
  alternates: { canonical: "/deutsch-shadowing/terms", languages: { vi: "/deutsch-shadowing/terms", de: "/deutsch-shadowing/terms/de" } },
};

export default function TermsPage() {
  return <LegalPage doc="terms" lang="vi" />;
}
