import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Chính sách quyền riêng tư",
  description: "Deutsch Shadowing thu thập dữ liệu nào, dùng để làm gì và quyền của bạn đối với dữ liệu cá nhân.",
  alternates: { canonical: "/privacy", languages: { vi: "/privacy", de: "/privacy/de" } },
};

export default function PrivacyPage() {
  return <LegalPage doc="privacy" lang="vi" />;
}
