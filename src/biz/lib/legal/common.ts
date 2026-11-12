import type { Locale } from '@/biz/contexts/LocaleContext';
import type { LegalSection } from './types';

export const GOOGLE_PRIVACY = 'https://policies.google.com/privacy';
export const APPLE_PRIVACY = 'https://www.apple.com/legal/privacy/';
export const MAIL = 'support@ckk.biz';

const CONTROLLER_TITLE = { de: 'Verantwortlicher', en: 'Controller', vi: 'Bên kiểm soát dữ liệu' };
const CONTROLLER_TEXT = {
    de: (name: string) => `Verantwortlich für die Datenverarbeitung in **${name}** im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:`,
    en: (name: string) => `The controller for data processing in **${name}** within the meaning of the General Data Protection Regulation (GDPR) is:`,
    vi: (name: string) => `Bên kiểm soát dữ liệu của **${name}** theo Quy định chung về bảo vệ dữ liệu (GDPR) là:`,
};

export function controller(locale: Locale, name: string): LegalSection {
    return { id: 'controller', title: CONTROLLER_TITLE[locale], blocks: [CONTROLLER_TEXT[locale](name), { controller: true }] };
}

const RIGHTS: Record<Locale, LegalSection> = {
    de: {
        id: 'rights',
        title: 'Ihre Rechte',
        blocks: [
            'Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit (Art. 15–18, 20 DSGVO), auf Widerspruch gegen Verarbeitungen aufgrund berechtigter Interessen (Art. 21 DSGVO) und auf Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO).',
            'Außerdem können Sie sich bei einer Datenschutz-Aufsichtsbehörde beschweren, insbesondere in dem Bundesland Ihres Wohnsitzes.',
            `Fragen und Anträge richten Sie bitte an [${MAIL}](mailto:${MAIL}).`,
        ],
    },
    en: {
        id: 'rights',
        title: 'Your rights',
        blocks: [
            'You have the right to access, rectification, erasure, restriction of processing and data portability (Art. 15–18, 20 GDPR), to object to processing based on legitimate interests (Art. 21 GDPR) and to withdraw consent with effect for the future (Art. 7(3) GDPR).',
            'You may also lodge a complaint with a data protection supervisory authority, in particular in the German federal state where you live.',
            `Please send questions and requests to [${MAIL}](mailto:${MAIL}).`,
        ],
    },
    vi: {
        id: 'rights',
        title: 'Quyền của bạn',
        blocks: [
            'Bạn có quyền truy cập, chỉnh sửa, xoá, hạn chế xử lý và chuyển dữ liệu (Điều 15–18, 20 GDPR), phản đối việc xử lý dựa trên lợi ích hợp pháp (Điều 21 GDPR) và rút lại sự đồng ý đã cấp, có hiệu lực từ thời điểm rút (Điều 7 khoản 3 GDPR).',
            'Bạn cũng có thể khiếu nại với cơ quan giám sát bảo vệ dữ liệu, đặc biệt là tại bang nơi bạn sinh sống.',
            `Vui lòng gửi câu hỏi và yêu cầu tới [${MAIL}](mailto:${MAIL}).`,
        ],
    },
};

const CHANGES: Record<Locale, LegalSection> = {
    de: { id: 'changes', title: 'Änderungen', blocks: ['Wir passen diese Datenschutzerklärung an, wenn sich der Dienst oder die Rechtslage ändert. Es gilt die jeweils auf dieser Seite veröffentlichte Fassung.'] },
    en: { id: 'changes', title: 'Changes', blocks: ['We update this privacy policy when the service or the law changes. The version published on this page applies.'] },
    vi: { id: 'changes', title: 'Thay đổi', blocks: ['Chúng tôi cập nhật chính sách này khi dịch vụ hoặc quy định pháp luật thay đổi. Phiên bản đăng trên trang này là phiên bản có hiệu lực.'] },
};

const EMAIL: Record<Locale, LegalSection> = {
    de: { id: 'email', title: 'Kontakt per E-Mail', blocks: ['Wenn Sie uns schreiben, verarbeiten wir Ihre E-Mail-Adresse, Ihren Namen und Ihre Nachricht, um die Anfrage zu bearbeiten (Art. 6 Abs. 1 lit. b bzw. f DSGVO). Unsere E-Mails laufen über Google Workspace. Die Daten werden gelöscht, sobald die Anfrage abgeschlossen ist und keine gesetzlichen Aufbewahrungspflichten bestehen.'] },
    en: { id: 'email', title: 'Contacting us by email', blocks: ['If you write to us, we process your email address, name and message to handle your request (Art. 6(1)(b) or (f) GDPR). Our email runs on Google Workspace. The data is deleted once the request is closed, unless statutory retention duties apply.'] },
    vi: { id: 'email', title: 'Liên hệ qua email', blocks: ['Khi bạn viết cho chúng tôi, chúng tôi xử lý địa chỉ email, tên và nội dung để giải quyết yêu cầu (Điều 6 khoản 1 điểm b hoặc f GDPR). Email của chúng tôi chạy trên Google Workspace. Dữ liệu được xoá khi yêu cầu đã xong và không còn nghĩa vụ lưu trữ theo luật.'] },
};

const TRANSFER = {
    de: 'Soweit Daten in die USA übermittelt werden, erfolgt dies auf Grundlage des EU-US Data Privacy Framework bzw. von EU-Standardvertragsklauseln (Art. 46 DSGVO).',
    en: 'Where data is transferred to the USA, this is based on the EU-US Data Privacy Framework or EU standard contractual clauses (Art. 46 GDPR).',
    vi: 'Khi dữ liệu được chuyển sang Mỹ, việc này dựa trên Khung bảo mật dữ liệu EU-Mỹ hoặc các điều khoản hợp đồng tiêu chuẩn của EU (Điều 46 GDPR).',
};

export const rights = (locale: Locale) => RIGHTS[locale];
export const changes = (locale: Locale) => CHANGES[locale];
export const emailContact = (locale: Locale) => EMAIL[locale];
export const transferNote = (locale: Locale) => TRANSFER[locale];

export const HOSTING = {
    de: 'Oracle Cloud Infrastructure, Rechenzentrum Frankfurt am Main',
    en: 'Oracle Cloud Infrastructure, Frankfurt am Main data centre',
    vi: 'Oracle Cloud Infrastructure, trung tâm dữ liệu Frankfurt am Main',
};

/** Tạo danh sách section cho cả 3 ngôn ngữ. */
export function perLocale<T>(build: (locale: Locale) => T): Record<Locale, T> {
    return { de: build('de'), en: build('en'), vi: build('vi') };
}
