// Cấu hình thương hiệu & liên kết dùng chung cho toàn bộ website hallovn.de

export const SITE = {
  name: 'HalloVN',
  fullName: 'HalloVN',
  domain: 'hallovn.de',
  url: 'https://hallovn.de',
  supportEmail: 'support@hallovn.de',
  contactEmail: 'support@hallovn.de',
  description:
    'HalloVN ist die kostenlose Lernplattform für Vietnamesinnen und Vietnamesen in Deutschland: Deutsch lernen, Wortschatz, Führerscheintheorie, Leben in Deutschland – im Web und als App.',
} as const;

/**
 * Angaben für Impressum & Datenschutz (Anbieterkennzeichnung nach § 5 DDG, § 18 Abs. 2 MStV).
 *
 * TODO (PFLICHT, vom Betreiber auszufüllen – nichts erfinden):
 *  - owner:  vollständiger Vor- und Nachname der natürlichen Person (bei Einzelunternehmen Pflicht)
 *  - street: ladungsfähige Anschrift (Straße + Hausnummer, kein Postfach)
 *  - legalName: nur ein Firmenname, wenn er tatsächlich so geführt/eingetragen ist
 *  - vatId: nur eintragen, falls eine USt-IdNr. vorhanden ist
 * Solange owner/street leer sind, ist das Impressum unvollständig (§ 5 Abs. 1 Nr. 1 DDG).
 */
export const COMPANY = {
  /** Firmenname oder Name des Einzelunternehmers */
  legalName: 'HalloVN Apps',
  /** Vertretungsberechtigte Person / Inhaber – TODO: vollständiger Name (Pflichtangabe) */
  owner: '',
  /** TODO: Straße + Hausnummer (Pflichtangabe, ladungsfähige Anschrift) */
  street: '',
  postalCity: '06110 Halle (Saale)',
  country: 'Deutschland',
  email: 'support@hallovn.de',
  /** Optional – leer lassen, wenn nicht vorhanden */
  phone: '',
  /** Optional – USt-IdNr. nach § 27a UStG, leer lassen, wenn nicht vorhanden */
  vatId: '',
} as const;

// Fanpage Facebook (xem docs/fanpage-plan.md). Có thể override qua biến môi trường.
export const FACEBOOK_PAGE_URL =
  process.env.NEXT_PUBLIC_FACEBOOK_PAGE_URL || 'https://www.facebook.com/ckk.biz';

export const LEGAL_UPDATED = { de: 'November 2026', en: 'November 2026', vi: 'Tháng 11/2026' } as const;
