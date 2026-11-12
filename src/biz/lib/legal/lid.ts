import { APPLE_PRIVACY, GOOGLE_PRIVACY, changes, controller, emailContact, perLocale, rights, transferNote } from './common';
import type { LegalProduct, LegalSection } from './types';
import type { Locale } from '@/biz/contexts/LocaleContext';

const NAME = 'Leben in Deutschland Ckk';

const body: Record<Locale, LegalSection[]> = {
    de: [
        { id: 'overview', title: 'Überblick', blocks: ['Die App hat kein Nutzerkonto und sendet Ihren Lernfortschritt nicht an uns. Fragen und Übersetzungen sind in der App enthalten. Daten werden nur für Anzeigen und Käufe verarbeitet und wenn Sie uns schreiben. Wir verkaufen keine personenbezogenen Daten.'] },
        { id: 'local', title: 'Daten auf Ihrem Gerät', blocks: ['Antworten, Testergebnisse, markierte Fragen und Einstellungen wie das gewählte Bundesland werden nur auf Ihrem Gerät gespeichert. Das Bundesland wählen Sie selbst, die App nutzt Ihren Standort nicht. Den Fortschritt können Sie in den Einstellungen zurücksetzen, beim Löschen der App wird alles entfernt.'] },
        { id: 'ads', title: 'Werbung (Google AdMob)', blocks: [
            `Die kostenlose Version zeigt Anzeigen über Google AdMob (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland). Die App fordert nur nicht personalisierte Anzeigen an. In der EU erscheint vor der ersten Anzeige ein Einwilligungsformular von Google. Dabei können Geräteinformationen, IP-Adresse und Interaktionen mit Anzeigen verarbeitet werden (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Mehr dazu in der [Datenschutzerklärung von Google](${GOOGLE_PRIVACY}).`,
            'Ihre Auswahl können Sie in den Einstellungen der App ändern, sobald diese Option für Sie erforderlich ist. Mit dem Pro-Kauf entfallen alle Anzeigen.',
        ] },
        { id: 'purchases', title: 'Käufe', blocks: [`Käufe werden ausschließlich über Apple abgewickelt. Wir erhalten keine Zahlungsdaten, die App erhält nur die Bestätigung, welche Funktionen freizuschalten sind (Art. 6 Abs. 1 lit. b DSGVO). Es gilt zusätzlich die [Datenschutzrichtlinie von Apple](${APPLE_PRIVACY}).`] },
        { id: 'crash', title: 'Absturzberichte', blocks: ['Wenn Sie auf Ihrem Gerät der Weitergabe von Analysedaten zugestimmt haben, stellt Apple uns zusammengefasste Absturzberichte bereit. Wir nutzen sie nur zur Fehlerbehebung (Art. 6 Abs. 1 lit. f DSGVO).'] },
        { id: 'recipients', title: 'Empfänger', blocks: [{ list: ['Werbung: Google', 'Käufe und App-Vertrieb: Apple'] }, transferNote('de')] },
        { id: 'retention', title: 'Speicherdauer', blocks: [{ list: ['Daten auf dem Gerät: bis Sie sie zurücksetzen oder die App löschen.', 'Support-Anfragen: bis zum Abschluss, längstens bis zum Ablauf gesetzlicher Fristen.'] }] },
    ],
    en: [
        { id: 'overview', title: 'Overview', blocks: ['The app has no user account and does not send your progress to us. Questions and translations are built into the app. Data is only processed for ads and purchases and when you write to us. We do not sell personal data.'] },
        { id: 'local', title: 'Data on your device', blocks: ['Answers, test results, bookmarked questions and settings such as your federal state are stored only on your device. You choose the state yourself; the app does not use your location. You can reset progress in the settings, and deleting the app removes everything.'] },
        { id: 'ads', title: 'Ads (Google AdMob)', blocks: [
            `The free version shows ads through Google AdMob (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland). The app only requests non-personalised ads. In the EU, a Google consent form appears before the first ad. Device information, IP address and ad interactions may be processed (Art. 6(1)(a) GDPR, Section 25(1) TDDDG). See [Google's privacy policy](${GOOGLE_PRIVACY}).`,
            'You can change your choice in the app settings whenever this option is required for you. The Pro purchase removes all ads.',
        ] },
        { id: 'purchases', title: 'Purchases', blocks: [`Purchases are handled entirely by Apple. We receive no payment data; the app only receives confirmation of which features to unlock (Art. 6(1)(b) GDPR). [Apple's privacy policy](${APPLE_PRIVACY}) also applies.`] },
        { id: 'crash', title: 'Crash reports', blocks: ['If you agreed on your device to share analytics, Apple provides us with aggregated crash reports. We only use them to fix errors (Art. 6(1)(f) GDPR).'] },
        { id: 'recipients', title: 'Recipients', blocks: [{ list: ['Ads: Google', 'Purchases and app distribution: Apple'] }, transferNote('en')] },
        { id: 'retention', title: 'Retention', blocks: [{ list: ['Data on your device: until you reset it or delete the app.', 'Support requests: until closed, at most until statutory periods end.'] }] },
    ],
    vi: [
        { id: 'overview', title: 'Tổng quan', blocks: ['App không có tài khoản người dùng và không gửi tiến độ học cho chúng tôi. Câu hỏi và bản dịch có sẵn trong app. Dữ liệu chỉ được xử lý cho quảng cáo, mua hàng và khi bạn viết cho chúng tôi. Chúng tôi không bán dữ liệu cá nhân.'] },
        { id: 'local', title: 'Dữ liệu trên thiết bị', blocks: ['Câu trả lời, kết quả thi, câu đã đánh dấu và cài đặt như bang đã chọn chỉ lưu trên thiết bị của bạn. Bạn tự chọn bang, app không dùng vị trí của bạn. Bạn có thể xoá tiến độ trong cài đặt, và xoá app sẽ xoá toàn bộ dữ liệu.'] },
        { id: 'ads', title: 'Quảng cáo (Google AdMob)', blocks: [
            `Bản miễn phí hiển thị quảng cáo qua Google AdMob (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland). App chỉ yêu cầu quảng cáo không cá nhân hoá. Tại EU, biểu mẫu đồng ý của Google hiện ra trước quảng cáo đầu tiên. Thông tin thiết bị, địa chỉ IP và tương tác với quảng cáo có thể được xử lý (Điều 6 khoản 1 điểm a GDPR, § 25 khoản 1 TDDDG). Xem thêm [chính sách bảo mật của Google](${GOOGLE_PRIVACY}).`,
            'Bạn có thể đổi lựa chọn trong cài đặt của app khi tuỳ chọn này cần thiết với bạn. Mua gói Pro sẽ gỡ toàn bộ quảng cáo.',
        ] },
        { id: 'purchases', title: 'Mua hàng', blocks: [`Việc mua hàng do Apple xử lý toàn bộ. Chúng tôi không nhận dữ liệu thanh toán, app chỉ nhận xác nhận về các tính năng cần mở khoá (Điều 6 khoản 1 điểm b GDPR). [Chính sách bảo mật của Apple](${APPLE_PRIVACY}) cũng được áp dụng.`] },
        { id: 'crash', title: 'Báo cáo lỗi', blocks: ['Nếu bạn đã đồng ý chia sẻ dữ liệu phân tích trên thiết bị, Apple cung cấp cho chúng tôi báo cáo lỗi tổng hợp. Chúng tôi chỉ dùng để sửa lỗi (Điều 6 khoản 1 điểm f GDPR).'] },
        { id: 'recipients', title: 'Bên nhận dữ liệu', blocks: [{ list: ['Quảng cáo: Google', 'Mua hàng và phát hành app: Apple'] }, transferNote('vi')] },
        { id: 'retention', title: 'Thời gian lưu trữ', blocks: [{ list: ['Dữ liệu trên thiết bị: đến khi bạn xoá tiến độ hoặc xoá app.', 'Yêu cầu hỗ trợ: đến khi xong, tối đa đến hết thời hạn theo luật.'] }] },
    ],
};

export const lid: LegalProduct = {
    slug: 'lid',
    name: NAME,
    hasPurchases: true,
    showDeletion: true,
    summary: {
        de: 'Einbürgerungs- und Orientierungstest. iPhone und iPad.',
        en: 'Citizenship and orientation test. iPhone and iPad.',
        vi: 'Bài thi nhập tịch và định hướng. iPhone và iPad.',
    },
    faq: {
        de: [
            { q: 'Wie stelle ich meinen Pro-Kauf wieder her?', a: 'Öffnen Sie in der App die Einstellungen und wählen Sie „Käufe wiederherstellen“. Verwenden Sie dieselbe Apple-ID wie beim Kauf.' },
            { q: 'Wie wechsle ich das Bundesland?', a: 'In den Einstellungen der App können Sie Ihr Bundesland jederzeit ändern. Die 10 landesspezifischen Fragen werden automatisch angepasst.' },
            { q: 'In welche Sprachen werden die Fragen übersetzt?', a: 'Vietnamesisch, Englisch, Chinesisch, Arabisch und Russisch. Die Sprache wählen Sie in den Einstellungen.' },
            { q: 'Funktioniert die App offline?', a: 'Ja. Die Fragen sind in der App enthalten, zum Lernen brauchen Sie kein Internet.' },
            { q: 'Wie setze ich meinen Fortschritt zurück?', a: 'In den Einstellungen unter „Fortschritt zurücksetzen“. Das lässt sich nicht rückgängig machen.' },
            { q: 'Gibt es eine Android-Version?', a: 'Die App ist derzeit im App Store für iPhone und iPad verfügbar.' },
        ],
        en: [
            { q: 'How do I restore my Pro purchase?', a: 'Open the settings in the app and choose “Restore purchases”. Use the same Apple ID as for the purchase.' },
            { q: 'How do I change my federal state?', a: 'You can change it at any time in the app settings. The 10 state-specific questions adjust automatically.' },
            { q: 'Which languages are the questions translated into?', a: 'Vietnamese, English, Chinese, Arabic and Russian. Choose the language in the settings.' },
            { q: 'Does the app work offline?', a: 'Yes. The questions are built into the app, so you can study without internet.' },
            { q: 'How do I reset my progress?', a: 'In the settings under “Reset progress”. This cannot be undone.' },
            { q: 'Is there an Android version?', a: 'The app is currently available on the App Store for iPhone and iPad.' },
        ],
        vi: [
            { q: 'Khôi phục gói Pro đã mua thế nào?', a: 'Mở cài đặt trong app và chọn “Khôi phục giao dịch”. Dùng đúng Apple ID đã mua.' },
            { q: 'Đổi bang thế nào?', a: 'Bạn có thể đổi bang bất cứ lúc nào trong cài đặt. 10 câu hỏi riêng của bang sẽ tự cập nhật.' },
            { q: 'Câu hỏi được dịch sang những ngôn ngữ nào?', a: 'Tiếng Việt, Anh, Trung, Ả Rập và Nga. Bạn chọn ngôn ngữ trong cài đặt.' },
            { q: 'App có dùng được khi không có mạng không?', a: 'Có. Câu hỏi có sẵn trong app nên bạn học không cần Internet.' },
            { q: 'Xoá tiến độ học thế nào?', a: 'Vào cài đặt, chọn “Xóa tiến độ”. Thao tác này không hoàn tác được.' },
            { q: 'Có bản Android không?', a: 'Hiện app có trên App Store cho iPhone và iPad.' },
        ],
    },
    privacy: perLocale((l) => [controller(l, NAME), ...body[l], emailContact(l), rights(l), changes(l)]),
};
