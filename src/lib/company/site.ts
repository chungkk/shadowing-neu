// Cấu hình thương hiệu & liên kết dùng chung cho toàn bộ website hallovn.de

export const SITE = {
  name: 'HalloVN',
  fullName: 'HalloVN',
  domain: 'hallovn.de',
  url: 'https://hallovn.de',
  supportEmail: 'support@hallovn.de',
  contactEmail: 'support@hallovn.de',
  description:
    'HalloVN entwickelt Software: die Lernplattform HalloVN für Deutsch, Führerscheintheorie und Leben in Deutschland – und Apps und Web-Anwendungen für Sie.',
} as const;

/**
 * Angaben für Impressum & Datenschutz (Anbieterkennzeichnung nach § 5 DDG).
 * TODO: Bitte mit den echten Daten des Betreibers ausfüllen, bevor die Seite live geht.
 */
export const COMPANY = {
  /** Firmenname oder Name des Einzelunternehmers */
  legalName: 'HalloVN Apps',
  /** Vertretungsberechtigte Person / Inhaber */
  owner: 'Ckk',
  /** Optional – leer lassen, wenn nicht vorhanden */
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
