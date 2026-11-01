import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: "Welche Daten Deutsch Shadowing erhebt, wofür wir sie nutzen und welche Rechte du hast.",
  alternates: { canonical: "/privacy/de", languages: { vi: "/privacy", de: "/privacy/de" } },
};

export default function PrivacyDePage() {
  return <LegalPage doc="privacy" lang="de" />;
}
