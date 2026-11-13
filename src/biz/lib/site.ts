// Cấu hình thương hiệu & liên kết dùng chung cho toàn bộ website hallovn.de

export const SITE = {
  name: 'CKK',
  fullName: 'CKK',
  domain: 'hallovn.de',
  url: 'https://hallovn.de',
  supportEmail: 'support@hallovn.de',
  contactEmail: 'support@hallovn.de',
  description:
    'CKK entwickelt Software: eigene Apps wie Führerschein Theorie, Leben in Deutschland und Deutsch Shadowing – und Apps und Web-Anwendungen für Sie.',
} as const;

/**
 * Angaben für Impressum & Datenschutz (Anbieterkennzeichnung nach § 5 DDG).
 * TODO: Bitte mit den echten Daten des Betreibers ausfüllen, bevor die Seite live geht.
 */
export const COMPANY = {
  /** Firmenname oder Name des Einzelunternehmers */
  legalName: 'CKK Apps',
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

export const APP_LINKS = {
  fuehrerschein: 'https://apps.apple.com/us/app/f%C3%BChrerschein-theorie-unlimited/id6758412382',
  lid: 'https://apps.apple.com/us/app/leben-in-deutschland-unlimited/id6758165563',
  // APK tải trực tiếp (không qua Google Play), do container nginx ckk-downloads trên VPS phục vụ
  // (xem docs/downloads.md). Bản mới ghi đè lên đúng tên file này nên link không bao giờ đổi.
  fuehrerscheinAndroid: 'https://hallovn.de/download/fuehrerschein-ckk.apk',
  lidAndroid: 'https://hallovn.de/download/lid-ckk.apk',
} as const;

export const LEGAL_UPDATED = { de: 'November 2026', en: 'November 2026', vi: 'Tháng 11/2026' } as const;
