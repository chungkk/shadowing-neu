import { APPLE_PRIVACY, GOOGLE_PRIVACY, changes, controller, emailContact, perLocale, rights, transferNote, HOSTING } from './common';
import type { LegalProduct, LegalSection } from './types';
import type { Locale } from '@/biz/contexts/LocaleContext';

const NAME = 'Führerschein Theorie Ckk';

const body: Record<Locale, LegalSection[]> = {
    de: [
        { id: 'overview', title: 'Überblick', blocks: ['Die App hat kein Nutzerkonto. Ihr Lernfortschritt bleibt auf Ihrem Gerät. Daten entstehen nur beim Laden der Inhalte, bei Anzeigen und Käufen in der iOS-Version und wenn Sie uns schreiben. Wir verkaufen keine personenbezogenen Daten.'] },
        { id: 'local', title: 'Lernfortschritt auf Ihrem Gerät', blocks: ['Antworten, Prüfungsergebnisse, Markierungen und Einstellungen werden lokal auf Ihrem Gerät gespeichert und nicht an uns übertragen. Sie werden entfernt, wenn Sie die App löschen.'] },
        { id: 'content', title: 'Laden der Inhalte', blocks: ['Die App lädt Fragenkataloge, Übersetzungen, Bilder und Videos von unserem Server. Dabei werden IP-Adresse, App-Version und Plattform verarbeitet, um die Inhalte auszuliefern und automatisiertes Auslesen zu verhindern (Art. 6 Abs. 1 lit. f DSGVO). Diese Daten werden nicht zur Profilbildung genutzt.'] },
        { id: 'ads', title: 'Werbung in der iOS-Version (Google AdMob)', blocks: [
            `Die kostenlose iOS-Version zeigt Anzeigen über Google AdMob (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland). In der EU fragt die App vor der ersten Anzeige über ein Einwilligungsformular von Google, wie Ihre Daten für Werbung genutzt werden dürfen. Dabei können Geräteinformationen, IP-Adresse und Interaktionen mit Anzeigen verarbeitet werden. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Mehr dazu in der [Datenschutzerklärung von Google](${GOOGLE_PRIVACY}).`,
            'Die App verwendet die iOS-Abfrage „App-Tracking-Transparenz“ nicht. Mit einem Premium-Kauf entfallen alle Anzeigen.',
        ] },
        { id: 'purchases', title: 'Käufe in der iOS-Version', blocks: [`Käufe werden ausschließlich über Apple abgewickelt. Wir erhalten keine Zahlungsdaten, die App erhält nur die Bestätigung, welche Funktionen freizuschalten sind (Art. 6 Abs. 1 lit. b DSGVO). Es gilt zusätzlich die [Datenschutzrichtlinie von Apple](${APPLE_PRIVACY}).`] },
        { id: 'android', title: 'Android-Version', blocks: ['Die Android-Version wird über Google Play vertrieben. Sie zeigt derzeit keine Werbung, bietet keine Käufe an und verwendet keine Werbe-ID. Sie nutzt den Internetzugriff zum Laden der Inhalte und die Vibration als Rückmeldung bei falschen Antworten.'] },
        { id: 'crash', title: 'Absturzberichte', blocks: ['Wenn Sie auf Ihrem Gerät der Weitergabe von Diagnosedaten zugestimmt haben, stellen Apple bzw. Google uns zusammengefasste Absturz- und Stabilitätsberichte bereit. Wir nutzen sie nur zur Fehlerbehebung (Art. 6 Abs. 1 lit. f DSGVO).'] },
        { id: 'recipients', title: 'Empfänger', blocks: [{ list: [`Hosting der Inhalte: ${HOSTING.de}`, 'Werbung (nur iOS): Google', 'Käufe und App-Vertrieb: Apple und Google'] }, transferNote('de')] },
        { id: 'retention', title: 'Speicherdauer', blocks: [{ list: ['Daten auf dem Gerät: bis Sie die App löschen.', 'Server-Logdaten: in der Regel höchstens 30 Tage.', 'Support-Anfragen: bis zum Abschluss, längstens bis zum Ablauf gesetzlicher Fristen.'] }] },
    ],
    en: [
        { id: 'overview', title: 'Overview', blocks: ['The app has no user account. Your progress stays on your device. Data is only processed when content is loaded, for ads and purchases in the iOS version, and when you write to us. We do not sell personal data.'] },
        { id: 'local', title: 'Progress on your device', blocks: ['Answers, exam results, bookmarks and settings are stored locally on your device and are not sent to us. They are removed when you delete the app.'] },
        { id: 'content', title: 'Loading content', blocks: ['The app loads question catalogues, translations, images and videos from our server. IP address, app version and platform are processed to deliver the content and prevent automated scraping (Art. 6(1)(f) GDPR). This data is not used for profiling.'] },
        { id: 'ads', title: 'Ads in the iOS version (Google AdMob)', blocks: [
            `The free iOS version shows ads through Google AdMob (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland). In the EU, a Google consent form asks before the first ad how your data may be used for advertising. Device information, IP address and ad interactions may be processed. The legal basis is your consent (Art. 6(1)(a) GDPR, Section 25(1) TDDDG). See [Google's privacy policy](${GOOGLE_PRIVACY}).`,
            'The app does not use the iOS App Tracking Transparency prompt. A Premium purchase removes all ads.',
        ] },
        { id: 'purchases', title: 'Purchases in the iOS version', blocks: [`Purchases are handled entirely by Apple. We receive no payment data; the app only receives confirmation of which features to unlock (Art. 6(1)(b) GDPR). [Apple's privacy policy](${APPLE_PRIVACY}) also applies.`] },
        { id: 'android', title: 'Android version', blocks: ['The Android version is distributed through Google Play. It currently shows no ads, offers no purchases and does not use an advertising ID. It uses internet access to load content and vibration as feedback on wrong answers.'] },
        { id: 'crash', title: 'Crash reports', blocks: ['If you agreed on your device to share diagnostic data, Apple or Google provide us with aggregated crash and stability reports. We only use them to fix errors (Art. 6(1)(f) GDPR).'] },
        { id: 'recipients', title: 'Recipients', blocks: [{ list: [`Content hosting: ${HOSTING.en}`, 'Ads (iOS only): Google', 'Purchases and app distribution: Apple and Google'] }, transferNote('en')] },
        { id: 'retention', title: 'Retention', blocks: [{ list: ['Data on your device: until you delete the app.', 'Server logs: usually no longer than 30 days.', 'Support requests: until closed, at most until statutory periods end.'] }] },
    ],
    vi: [
        { id: 'overview', title: 'Tổng quan', blocks: ['App không có tài khoản người dùng. Tiến độ học nằm trên thiết bị của bạn. Dữ liệu chỉ được xử lý khi tải nội dung, khi hiển thị quảng cáo và mua hàng ở bản iOS, và khi bạn viết cho chúng tôi. Chúng tôi không bán dữ liệu cá nhân.'] },
        { id: 'local', title: 'Tiến độ học trên thiết bị', blocks: ['Câu trả lời, kết quả thi, câu đã đánh dấu và cài đặt được lưu trên thiết bị của bạn và không gửi cho chúng tôi. Chúng sẽ bị xoá khi bạn xoá app.'] },
        { id: 'content', title: 'Tải nội dung', blocks: ['App tải bộ câu hỏi, bản dịch, hình ảnh và video từ máy chủ của chúng tôi. Địa chỉ IP, phiên bản app và nền tảng được xử lý để cung cấp nội dung và ngăn việc lấy dữ liệu tự động (Điều 6 khoản 1 điểm f GDPR). Dữ liệu này không dùng để lập hồ sơ người dùng.'] },
        { id: 'ads', title: 'Quảng cáo ở bản iOS (Google AdMob)', blocks: [
            `Bản iOS miễn phí hiển thị quảng cáo qua Google AdMob (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland). Tại EU, trước quảng cáo đầu tiên, biểu mẫu đồng ý của Google sẽ hỏi dữ liệu của bạn được dùng cho quảng cáo ra sao. Thông tin thiết bị, địa chỉ IP và tương tác với quảng cáo có thể được xử lý. Cơ sở pháp lý là sự đồng ý của bạn (Điều 6 khoản 1 điểm a GDPR, § 25 khoản 1 TDDDG). Xem thêm [chính sách bảo mật của Google](${GOOGLE_PRIVACY}).`,
            'App không dùng hộp thoại App Tracking Transparency của iOS. Mua Premium sẽ gỡ toàn bộ quảng cáo.',
        ] },
        { id: 'purchases', title: 'Mua hàng ở bản iOS', blocks: [`Việc mua hàng do Apple xử lý toàn bộ. Chúng tôi không nhận dữ liệu thanh toán, app chỉ nhận xác nhận về các tính năng cần mở khoá (Điều 6 khoản 1 điểm b GDPR). [Chính sách bảo mật của Apple](${APPLE_PRIVACY}) cũng được áp dụng.`] },
        { id: 'android', title: 'Bản Android', blocks: ['Bản Android được phát hành qua Google Play. Hiện bản này không có quảng cáo, không có mua hàng và không dùng mã quảng cáo. App dùng Internet để tải nội dung và rung để báo khi trả lời sai.'] },
        { id: 'crash', title: 'Báo cáo lỗi', blocks: ['Nếu bạn đã đồng ý chia sẻ dữ liệu chẩn đoán trên thiết bị, Apple hoặc Google cung cấp cho chúng tôi báo cáo tổng hợp về lỗi và độ ổn định. Chúng tôi chỉ dùng để sửa lỗi (Điều 6 khoản 1 điểm f GDPR).'] },
        { id: 'recipients', title: 'Bên nhận dữ liệu', blocks: [{ list: [`Lưu trữ nội dung: ${HOSTING.vi}`, 'Quảng cáo (chỉ iOS): Google', 'Mua hàng và phát hành app: Apple và Google'] }, transferNote('vi')] },
        { id: 'retention', title: 'Thời gian lưu trữ', blocks: [{ list: ['Dữ liệu trên thiết bị: đến khi bạn xoá app.', 'Nhật ký máy chủ: thường không quá 30 ngày.', 'Yêu cầu hỗ trợ: đến khi xong, tối đa đến hết thời hạn theo luật.'] }] },
    ],
};

export const fuehrerschein: LegalProduct = {
    slug: 'fuehrerschein',
    name: NAME,
    hasPurchases: true,
    showDeletion: true,
    summary: {
        de: 'Theorieprüfung für 13 Führerscheinklassen. iOS und Android.',
        en: 'Driving theory test for 13 licence classes. iOS and Android.',
        vi: 'Thi lý thuyết lái xe cho 13 hạng bằng. iOS và Android.',
    },
    faq: {
        de: [
            { q: 'Wie stelle ich meinen Premium-Kauf wieder her?', a: 'Öffnen Sie in der App die Einstellungen und tippen Sie auf „Käufe wiederherstellen“. Verwenden Sie dieselbe Apple-ID wie beim Kauf.' },
            { q: 'Ich habe Premium gekauft, sehe aber noch Werbung.', a: 'Stellen Sie zuerst Ihre Käufe wieder her und starten Sie die App neu. Hilft das nicht, schreiben Sie uns mit der Bestellnummer aus Ihrer Kaufbestätigung von Apple.' },
            { q: 'Funktioniert die App offline?', a: 'Ja. Nach dem ersten Laden der Inhalte können Sie ohne Internetverbindung lernen. Für Updates des Fragenkatalogs ist eine Verbindung nötig.' },
            { q: 'Wie aktuell sind die Fragen?', a: 'Die amtlichen Fragen ändern sich in der Regel zum 1. April und 1. Oktober. Zu diesen Terminen aktualisieren wir die App.' },
            { q: 'Wird mein Lernfortschritt gespeichert?', a: 'Ja, lokal auf Ihrem Gerät. Ein Konto ist nicht nötig. Wenn Sie die App löschen, geht der Fortschritt verloren.' },
            { q: 'Gibt es Premium auch unter Android?', a: 'Noch nicht. Die Android-Version bietet derzeit keine Käufe an und zeigt keine Werbung. Die Grenzen der kostenlosen Version gelten auch dort.' },
        ],
        en: [
            { q: 'How do I restore my Premium purchase?', a: 'Open the settings in the app and tap “Restore purchases”. Use the same Apple ID as for the purchase.' },
            { q: 'I bought Premium but still see ads.', a: 'First restore your purchases and restart the app. If that does not help, write to us with the order number from your Apple receipt.' },
            { q: 'Does the app work offline?', a: 'Yes. After the content has loaded once you can study without internet. Catalogue updates need a connection.' },
            { q: 'How up to date are the questions?', a: 'The official questions usually change on 1 April and 1 October. We update the app on those dates.' },
            { q: 'Is my progress saved?', a: 'Yes, locally on your device. No account is needed. Deleting the app also deletes your progress.' },
            { q: 'Is Premium available on Android?', a: 'Not yet. The Android version currently offers no purchases and shows no ads. The limits of the free version also apply there.' },
        ],
        vi: [
            { q: 'Khôi phục gói Premium đã mua thế nào?', a: 'Mở cài đặt trong app và chạm “Khôi phục giao dịch”. Dùng đúng Apple ID đã mua.' },
            { q: 'Đã mua Premium mà vẫn thấy quảng cáo?', a: 'Hãy khôi phục giao dịch rồi khởi động lại app. Nếu vẫn không được, hãy viết cho chúng tôi kèm mã đơn trong biên nhận của Apple.' },
            { q: 'App có dùng được khi không có mạng không?', a: 'Có. Sau khi tải nội dung lần đầu, bạn có thể học không cần mạng. Cập nhật bộ câu hỏi thì cần kết nối.' },
            { q: 'Câu hỏi có được cập nhật không?', a: 'Câu hỏi chính thức thường thay đổi vào ngày 1/4 và 1/10. Chúng tôi cập nhật app vào các mốc này.' },
            { q: 'Tiến độ học có được lưu không?', a: 'Có, lưu trên thiết bị của bạn và không cần tài khoản. Xoá app thì tiến độ cũng mất.' },
            { q: 'Android có gói Premium không?', a: 'Chưa có. Bản Android hiện không có mua hàng và không có quảng cáo. Các giới hạn của bản miễn phí vẫn áp dụng.' },
        ],
    },
    privacy: perLocale((l) => [controller(l, NAME), ...body[l], emailContact(l), rights(l), changes(l)]),
};
