import { GOOGLE_PRIVACY, HOSTING, changes, controller, emailContact, perLocale, rights, transferNote } from './common';
import type { LegalSection, Localized } from './types';
import type { Locale } from '@/biz/contexts/LocaleContext';

const DOMAIN = 'hallovn.de';

const body: Record<Locale, LegalSection[]> = {
    de: [
        { id: 'hosting', title: 'Hosting und Server-Logdaten', blocks: [`Diese Website läuft bei ${HOSTING.de}. Beim Aufruf werden technisch notwendige Daten verarbeitet: IP-Adresse, Datum und Uhrzeit, aufgerufene Seite, Referrer, Browsertyp und Betriebssystem. Das dient der sicheren und stabilen Bereitstellung (Art. 6 Abs. 1 lit. f DSGVO). Logdaten werden in der Regel nach höchstens 30 Tagen gelöscht.`] },
        { id: 'storage', title: 'Lokaler Speicher', blocks: ['Wir speichern Ihre Sprachauswahl im lokalen Speicher Ihres Browsers. Das ist für die von Ihnen gewünschte Funktion erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Analyse-Dienste setzen wir nicht ein. Die Schriften liegen auf unserem eigenen Server. Cookies für Werbung setzt Google nur mit Ihrer Einwilligung, siehe „Werbung mit Google AdSense“.'] },
        {
            id: 'ads',
            title: 'Werbung mit Google AdSense',
            blocks: [
                'Diese Website blendet Werbung über Google AdSense ein. Anbieter ist Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland („Google“).',
                'Dabei verarbeitet Google unter anderem Ihre IP-Adresse, Angaben zu Browser und Gerät, die aufgerufene Seite und Ihre Interaktion mit Anzeigen. Mit Ihrer Einwilligung nutzt Google Cookies und ähnliche Technologien, um Anzeigen auszuliefern, zu messen und auf Ihre Interessen zuzuschneiden.',
                'Beim ersten Besuch fragt Sie die Einwilligungsplattform von Google (nach dem Standard IAB TCF), ob und wofür Sie einwilligen. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Ohne Einwilligung können eingeschränkte, nicht personalisierte Anzeigen erscheinen, für die keine Cookies gespeichert werden.',
                'Sie können Ihre Auswahl jederzeit über **Datenschutz-Einstellungen** unten auf jeder Seite ändern oder widerrufen. Personalisierte Werbung von Google können Sie außerdem unter [adssettings.google.com](https://adssettings.google.com) abschalten.',
                `Wie Google Daten aus Werbung verwendet: [policies.google.com/technologies/ads](https://policies.google.com/technologies/ads) und die [Datenschutzerklärung von Google](${GOOGLE_PRIVACY}). Eine Übermittlung in die USA ist möglich, siehe „Empfänger“.`,
            ],
        },
        { id: 'forms', title: 'Formulare', blocks: ['Das Projekt- und das Support-Formular senden nichts automatisch. Sie öffnen einen E-Mail-Entwurf in Ihrem E-Mail-Programm, den Sie selbst absenden.'] },
        { id: 'recipients', title: 'Empfänger', blocks: [{ list: [`Hosting: ${HOSTING.de}`, 'E-Mail: Google Workspace', 'Werbung: Google Ireland Limited (Google AdSense)'] }, transferNote('de')] },
    ],
    en: [
        { id: 'hosting', title: 'Hosting and server logs', blocks: [`This website runs on ${HOSTING.en}. When you visit, technically necessary data is processed: IP address, date and time, page visited, referrer, browser type and operating system. This keeps the site secure and stable (Art. 6(1)(f) GDPR). Logs are usually deleted after 30 days at most.`] },
        { id: 'storage', title: 'Local storage', blocks: ['We store your language choice in your browser\'s local storage. This is required for the function you asked for (Section 25(2) No. 2 TDDDG). We use no analytics services. Fonts are served from our own server. Google only sets advertising cookies with your consent, see “Advertising with Google AdSense”.'] },
        {
            id: 'ads',
            title: 'Advertising with Google AdSense',
            blocks: [
                'This website shows ads through Google AdSense, provided by Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland (“Google”).',
                'Google processes, among other things, your IP address, information about your browser and device, the page you visit and your interaction with ads. With your consent, Google uses cookies and similar technologies to deliver and measure ads and tailor them to your interests.',
                'On your first visit, Google’s consent platform (based on the IAB TCF standard) asks whether and for what you consent. The legal basis is your consent (Art. 6(1)(a) GDPR, Section 25(1) TDDDG). Without consent, limited, non-personalised ads may appear that do not store cookies.',
                'You can change or withdraw your choice at any time via **Privacy settings** at the bottom of every page. You can also turn off personalised ads from Google at [adssettings.google.com](https://adssettings.google.com).',
                `How Google uses data from advertising: [policies.google.com/technologies/ads](https://policies.google.com/technologies/ads) and [Google’s privacy policy](${GOOGLE_PRIVACY}). Data may be transferred to the USA, see “Recipients”.`,
            ],
        },
        { id: 'forms', title: 'Forms', blocks: ['The project and support forms send nothing automatically. They open an email draft in your email app, which you send yourself.'] },
        { id: 'recipients', title: 'Recipients', blocks: [{ list: [`Hosting: ${HOSTING.en}`, 'Email: Google Workspace', 'Advertising: Google Ireland Limited (Google AdSense)'] }, transferNote('en')] },
    ],
    vi: [
        { id: 'hosting', title: 'Lưu trữ và nhật ký máy chủ', blocks: [`Trang web này chạy trên ${HOSTING.vi}. Khi truy cập, các dữ liệu kỹ thuật cần thiết được xử lý: địa chỉ IP, ngày giờ, trang đã xem, trang giới thiệu, loại trình duyệt và hệ điều hành. Việc này giúp trang hoạt động an toàn và ổn định (Điều 6 khoản 1 điểm f GDPR). Nhật ký thường được xoá sau tối đa 30 ngày.`] },
        { id: 'storage', title: 'Bộ nhớ cục bộ', blocks: ['Chúng tôi lưu lựa chọn ngôn ngữ trong bộ nhớ cục bộ của trình duyệt. Điều này cần thiết cho chức năng bạn yêu cầu (§ 25 khoản 2 số 2 TDDDG). Chúng tôi không dùng dịch vụ phân tích. Phông chữ được tải từ máy chủ của chúng tôi. Google chỉ đặt cookie quảng cáo khi bạn đồng ý, xem mục “Quảng cáo qua Google AdSense”.'] },
        {
            id: 'ads',
            title: 'Quảng cáo qua Google AdSense',
            blocks: [
                'Trang web này hiển thị quảng cáo qua Google AdSense, do Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland (“Google”) cung cấp.',
                'Google xử lý, trong số các dữ liệu khác, địa chỉ IP, thông tin về trình duyệt và thiết bị, trang bạn xem và tương tác của bạn với quảng cáo. Khi bạn đồng ý, Google dùng cookie và công nghệ tương tự để hiển thị, đo lường quảng cáo và điều chỉnh theo sở thích của bạn.',
                'Ở lần truy cập đầu tiên, nền tảng xin đồng ý của Google (theo chuẩn IAB TCF) hỏi bạn có đồng ý không và đồng ý cho mục đích nào. Cơ sở pháp lý là sự đồng ý của bạn (Điều 6 khoản 1 điểm a GDPR, § 25 khoản 1 TDDDG). Nếu không đồng ý, có thể vẫn hiện quảng cáo giới hạn, không cá nhân hoá và không lưu cookie.',
                'Bạn có thể đổi hoặc rút lại lựa chọn bất cứ lúc nào qua **Cài đặt quyền riêng tư** ở cuối mỗi trang. Bạn cũng có thể tắt quảng cáo cá nhân hoá của Google tại [adssettings.google.com](https://adssettings.google.com).',
                `Cách Google dùng dữ liệu từ quảng cáo: [policies.google.com/technologies/ads](https://policies.google.com/technologies/ads) và [chính sách bảo mật của Google](${GOOGLE_PRIVACY}). Dữ liệu có thể được chuyển sang Mỹ, xem mục “Bên nhận dữ liệu”.`,
            ],
        },
        { id: 'forms', title: 'Biểu mẫu', blocks: ['Biểu mẫu dự án và hỗ trợ không tự gửi gì. Chúng mở bản nháp trong ứng dụng email để bạn tự gửi.'] },
        { id: 'recipients', title: 'Bên nhận dữ liệu', blocks: [{ list: [`Lưu trữ: ${HOSTING.vi}`, 'Email: Google Workspace', 'Quảng cáo: Google Ireland Limited (Google AdSense)'] }, transferNote('vi')] },
    ],
};

export const websitePrivacy: Localized<LegalSection[]> = perLocale((l) => [controller(l, DOMAIN), ...body[l], emailContact(l), rights(l), changes(l)]);
