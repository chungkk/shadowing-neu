import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen",
  description: "Nutzungsbedingungen für die App und Website Deutsch Shadowing.",
  alternates: { canonical: "/terms/de", languages: { vi: "/terms", de: "/terms/de" } },
};

export default function TermsDePage() {
  return <LegalPage doc="terms" lang="de" />;
}
