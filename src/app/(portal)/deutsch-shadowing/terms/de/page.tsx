import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen",
  description: "Nutzungsbedingungen für die App und Website Deutsch Shadowing.",
  alternates: { canonical: "/deutsch-shadowing/terms/de", languages: { vi: "/deutsch-shadowing/terms", de: "/deutsch-shadowing/terms/de" } },
};

export default function TermsDePage() {
  return <LegalPage doc="terms" lang="de" />;
}
