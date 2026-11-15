import { APPLE_PRIVACY, GOOGLE_PRIVACY, changes, controller, emailContact, perLocale, rights, transferNote } from './common';
import type { LegalProduct, LegalSection } from './types';
import type { Locale } from '@/biz/contexts/LocaleContext';

// Hai app không có tài khoản; dữ liệu người dùng nằm trên thiết bị.

const REDEWENDUNG = 'Deutsche Redewendungen';
const CALENDAR = 'Dienst Unlimited (Lịch Làm Việc)';

const redewendung: Record<Locale, LegalSection[]> = {
    de: [
        { id: 'overview', title: 'Überblick', blocks: ['Die App erhebt keine personenbezogenen Daten, speichert keine auf Servern und gibt keine weiter. Es gibt kein Konto, keine Werbung und keine Analyse- oder Tracking-Dienste.'] },
        { id: 'local', title: 'Daten auf Ihrem Gerät', blocks: ['Lernfortschritt und Einstellungen werden nur auf Ihrem Gerät gespeichert und mit dem Löschen der App entfernt.'] },
        { id: 'notifications', title: 'Erinnerungen', blocks: ['Optionale tägliche Erinnerungen werden lokal auf dem Gerät geplant, dabei werden keine Daten an Server übertragen. Sie können sie jederzeit in der App oder in den iOS-Einstellungen deaktivieren.'] },
    ],
    en: [
        { id: 'overview', title: 'Overview', blocks: ['The app does not collect personal data, store it on servers or share it. There is no account, no ads and no analytics or tracking.'] },
        { id: 'local', title: 'Data on your device', blocks: ['Progress and settings are stored only on your device and are removed when you delete the app.'] },
        { id: 'notifications', title: 'Reminders', blocks: ['Optional daily reminders are scheduled locally on the device, and no data is sent to any server. You can turn them off at any time in the app or in iOS Settings.'] },
    ],
    vi: [
        { id: 'overview', title: 'Tổng quan', blocks: ['App không thu thập dữ liệu cá nhân, không lưu trên máy chủ và không chia sẻ. Không có tài khoản, quảng cáo hay dịch vụ phân tích, theo dõi.'] },
        { id: 'local', title: 'Dữ liệu trên thiết bị', blocks: ['Tiến độ học và cài đặt chỉ lưu trên thiết bị của bạn và bị xoá khi bạn xoá app.'] },
        { id: 'notifications', title: 'Nhắc nhở', blocks: ['Nhắc nhở hằng ngày là tuỳ chọn, được lên lịch ngay trên thiết bị và không gửi dữ liệu tới máy chủ. Bạn có thể tắt bất cứ lúc nào trong app hoặc trong Cài đặt iOS.'] },
    ],
};

const calendar: Record<Locale, LegalSection[]> = {
    de: [
        { id: 'overview', title: 'Überblick', blocks: ['Die App hat kein Konto. Ihre Schichten bleiben auf Ihrem Gerät und werden nicht an uns übertragen. Ab Version 1.2 zeigt die kostenlose Version Werbung und bietet einen Premium-Kauf an. Wir verkaufen keine personenbezogenen Daten.'] },
        { id: 'local', title: 'Daten auf Ihrem Gerät', blocks: [{ list: ['Schichtpläne und Schichtinformationen (Datum, Uhrzeit, Art)', 'von Ihnen erstellte Schichtvorlagen', 'die gewählte Sprache'] }, 'Alle Daten werden mit dem Löschen der App entfernt. Ihr Schutz hängt von den Sicherheitseinstellungen Ihres Geräts ab (Code, Face ID, Touch ID).'] },
        { id: 'ads', title: 'Werbung (Google AdMob)', blocks: [
            `Die kostenlose Version zeigt Anzeigen über Google AdMob (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland). In der EU fragt die App vor der ersten Anzeige über ein Einwilligungsformular von Google, wie Ihre Daten für Werbung genutzt werden dürfen. Dabei können Geräteinformationen, IP-Adresse und Interaktionen mit Anzeigen verarbeitet werden (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Mehr dazu in der [Datenschutzerklärung von Google](${GOOGLE_PRIVACY}).`,
            'Ihre Auswahl können Sie in der App unter „Mehr“ ändern, sobald diese Option für Sie erforderlich ist. Mit dem Premium-Kauf entfallen alle Anzeigen.',
        ] },
        { id: 'purchases', title: 'Käufe', blocks: [`Käufe werden ausschließlich über Apple abgewickelt. Wir erhalten keine Zahlungsdaten, die App erhält nur die Bestätigung, welche Funktionen freizuschalten sind (Art. 6 Abs. 1 lit. b DSGVO). Es gilt zusätzlich die [Datenschutzrichtlinie von Apple](${APPLE_PRIVACY}).`] },
        { id: 'recipients', title: 'Empfänger', blocks: [{ list: ['Werbung: Google', 'Käufe und App-Vertrieb: Apple'] }, transferNote('de')] },
        { id: 'children', title: 'Kinder', blocks: ['Die App richtet sich nicht an Kinder unter 13 Jahren.'] },
    ],
    en: [
        { id: 'overview', title: 'Overview', blocks: ['The app has no account. Your shifts stay on your device and are not sent to us. From version 1.2, the free version shows ads and offers a Premium purchase. We do not sell personal data.'] },
        { id: 'local', title: 'Data on your device', blocks: [{ list: ['Shift schedules and shift details (date, time, type)', 'shift templates you create', 'your chosen language'] }, 'All data is removed when you delete the app. Its protection depends on your device security settings (passcode, Face ID, Touch ID).'] },
        { id: 'ads', title: 'Ads (Google AdMob)', blocks: [
            `The free version shows ads through Google AdMob (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland). In the EU, a Google consent form asks before the first ad how your data may be used for advertising. Device information, IP address and ad interactions may be processed (Art. 6(1)(a) GDPR, Section 25(1) TDDDG). See [Google's privacy policy](${GOOGLE_PRIVACY}).`,
            'You can change your choice in the app under “More” whenever this option is required for you. The Premium purchase removes all ads.',
        ] },
        { id: 'purchases', title: 'Purchases', blocks: [`Purchases are handled entirely by Apple. We receive no payment data; the app only receives confirmation of which features to unlock (Art. 6(1)(b) GDPR). [Apple's privacy policy](${APPLE_PRIVACY}) also applies.`] },
        { id: 'recipients', title: 'Recipients', blocks: [{ list: ['Ads: Google', 'Purchases and app distribution: Apple'] }, transferNote('en')] },
        { id: 'children', title: 'Children', blocks: ['The app is not directed at children under 13.'] },
    ],
    vi: [
        { id: 'overview', title: 'Tổng quan', blocks: ['App không có tài khoản. Ca làm của bạn nằm trên thiết bị và không gửi cho chúng tôi. Từ phiên bản 1.2, bản miễn phí có quảng cáo và có gói Premium. Chúng tôi không bán dữ liệu cá nhân.'] },
        { id: 'local', title: 'Dữ liệu trên thiết bị', blocks: [{ list: ['Lịch ca và thông tin ca (ngày, giờ, loại ca)', 'mẫu ca do bạn tạo', 'ngôn ngữ bạn chọn'] }, 'Toàn bộ dữ liệu bị xoá khi bạn xoá app. Mức bảo vệ phụ thuộc vào cài đặt bảo mật của thiết bị (mã khoá, Face ID, Touch ID).'] },
        { id: 'ads', title: 'Quảng cáo (Google AdMob)', blocks: [
            `Bản miễn phí hiển thị quảng cáo qua Google AdMob (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland). Tại EU, trước quảng cáo đầu tiên, biểu mẫu đồng ý của Google sẽ hỏi dữ liệu của bạn được dùng cho quảng cáo ra sao. Thông tin thiết bị, địa chỉ IP và tương tác với quảng cáo có thể được xử lý (Điều 6 khoản 1 điểm a GDPR, § 25 khoản 1 TDDDG). Xem thêm [chính sách bảo mật của Google](${GOOGLE_PRIVACY}).`,
            'Bạn có thể đổi lựa chọn trong app tại “Thêm” khi tuỳ chọn này cần thiết với bạn. Mua gói Premium sẽ gỡ toàn bộ quảng cáo.',
        ] },
        { id: 'purchases', title: 'Mua hàng', blocks: [`Việc mua hàng do Apple xử lý toàn bộ. Chúng tôi không nhận dữ liệu thanh toán, app chỉ nhận xác nhận về các tính năng cần mở khoá (Điều 6 khoản 1 điểm b GDPR). [Chính sách bảo mật của Apple](${APPLE_PRIVACY}) cũng được áp dụng.`] },
        { id: 'recipients', title: 'Bên nhận dữ liệu', blocks: [{ list: ['Quảng cáo: Google', 'Mua hàng và phát hành app: Apple'] }, transferNote('vi')] },
        { id: 'children', title: 'Trẻ em', blocks: ['App không hướng tới trẻ em dưới 13 tuổi.'] },
    ],
};

export const deutschRedewendung: LegalProduct = {
    slug: 'deutsch-redewendung',
    name: REDEWENDUNG,
    hasPurchases: false,
    showDeletion: false,
    summary: {
        de: 'Deutsche Redewendungen lernen. iOS.',
        en: 'Learn German idioms. iOS.',
        vi: 'Học thành ngữ tiếng Đức. iOS.',
    },
    faq: {
        de: [
            { q: 'Werden meine Daten auf einem Server gespeichert?', a: 'Nein. Fortschritt und Einstellungen liegen nur auf Ihrem Gerät.' },
            { q: 'Wie ändere ich die Erinnerungen?', a: 'Schalten Sie die täglichen Erinnerungen in den Einstellungen der App ein oder aus. Benachrichtigungen können Sie auch in den iOS-Einstellungen verwalten.' },
            { q: 'Gehen Daten verloren, wenn ich die App lösche?', a: 'Ja, weil alles nur lokal gespeichert wird.' },
        ],
        en: [
            { q: 'Is my data stored on a server?', a: 'No. Progress and settings stay on your device only.' },
            { q: 'How do I change the reminders?', a: 'Turn daily reminders on or off in the app settings. You can also manage notifications in iOS Settings.' },
            { q: 'Do I lose data if I delete the app?', a: 'Yes, because everything is stored locally only.' },
        ],
        vi: [
            { q: 'Dữ liệu có lưu trên máy chủ không?', a: 'Không. Tiến độ và cài đặt chỉ nằm trên thiết bị của bạn.' },
            { q: 'Đổi nhắc nhở thế nào?', a: 'Bật hoặc tắt nhắc nhở hằng ngày trong cài đặt của app. Bạn cũng có thể quản lý thông báo trong Cài đặt iOS.' },
            { q: 'Xoá app có mất dữ liệu không?', a: 'Có, vì mọi thứ chỉ được lưu trên thiết bị.' },
        ],
    },
    privacy: perLocale((l) => [controller(l, REDEWENDUNG), ...redewendung[l], emailContact(l), rights(l), changes(l)]),
};

export const workCalendar: LegalProduct = {
    slug: 'calendar',
    name: CALENDAR,
    hasPurchases: false,
    showDeletion: false,
    summary: {
        de: 'Schichtplan und Arbeitskalender. iOS.',
        en: 'Shift planner and work calendar. iOS.',
        vi: 'Lịch ca và lịch làm việc. iOS.',
    },
    faq: {
        de: [
            { q: 'Werden Daten auf einem Server gespeichert?', a: 'Nein. Schichten, Vorlagen und Einstellungen liegen nur auf Ihrem Gerät.' },
            { q: 'Gehen Daten verloren, wenn ich die App lösche?', a: 'Ja, weil alles nur lokal gespeichert wird.' },
            { q: 'Wie entferne ich die Werbung?', a: 'Mit dem Premium-Kauf in der App entfallen alle Anzeigen. Der Kauf läuft über Apple.' },
            { q: 'Welche Sprachen gibt es?', a: 'Deutsch, Vietnamesisch und Englisch. Sie ändern die Sprache unter „Mehr“ → „Sprache“.' },
            { q: 'Wie erstelle ich eine neue Schicht?', a: 'Tippen Sie auf dem Kalender auf das Stift-Symbol, wählen Sie eine Vorlage und tippen Sie auf den gewünschten Tag. Vorlagen verwalten Sie im Tab „Schichten“.' },
        ],
        en: [
            { q: 'Is data stored on a server?', a: 'No. Shifts, templates and settings stay on your device only.' },
            { q: 'Do I lose data if I delete the app?', a: 'Yes, because everything is stored locally only.' },
            { q: 'How do I remove ads?', a: 'The Premium purchase in the app removes all ads. The purchase goes through Apple.' },
            { q: 'Which languages are available?', a: 'German, Vietnamese and English. Change the language under “More” → “Language”.' },
            { q: 'How do I create a new shift?', a: 'Tap the pencil icon on the calendar, choose a template and tap the day you want. Manage templates in the “Shifts” tab.' },
        ],
        vi: [
            { q: 'Dữ liệu có lưu trên máy chủ không?', a: 'Không. Ca làm, mẫu ca và cài đặt chỉ nằm trên thiết bị của bạn.' },
            { q: 'Xoá app có mất dữ liệu không?', a: 'Có, vì mọi thứ chỉ được lưu trên thiết bị.' },
            { q: 'Gỡ quảng cáo thế nào?', a: 'Mua gói Premium trong app sẽ gỡ toàn bộ quảng cáo. Việc mua hàng qua Apple.' },
            { q: 'App có những ngôn ngữ nào?', a: 'Tiếng Đức, tiếng Việt và tiếng Anh. Đổi ngôn ngữ trong “Thêm” → “Ngôn ngữ”.' },
            { q: 'Tạo ca làm mới thế nào?', a: 'Chạm biểu tượng bút trên lịch, chọn mẫu ca rồi chạm vào ngày muốn thêm. Quản lý mẫu ca trong tab “Ca làm”.' },
        ],
    },
    privacy: perLocale((l) => [controller(l, CALENDAR), ...calendar[l], emailContact(l), rights(l), changes(l)]),
};
