import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: "Welche Daten Deutsch Shadowing erhebt, wofür wir sie nutzen und welche Rechte du hast.",
  alternates: { canonical: "/deutsch-shadowing/privacy/de", languages: { vi: "/deutsch-shadowing/privacy", de: "/deutsch-shadowing/privacy/de" } },
};

export default function PrivacyDePage() {
  return <LegalPage doc="privacy" lang="de" />;
}
