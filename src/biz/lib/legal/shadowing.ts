import { APPLE_PRIVACY, GOOGLE_PRIVACY, HOSTING, changes, controller, emailContact, perLocale, rights, transferNote } from './common';
import type { LegalProduct, LegalSection } from './types';
import type { Locale } from '@/biz/contexts/LocaleContext';

const NAME = 'Deutsch Shadowing';

const body: Record<Locale, LegalSection[]> = {
    de: [
        { id: 'overview', title: 'Überblick', blocks: ['Deutsch Shadowing besteht aus der Website hallovn.de und der App. Lektionen können Sie ohne Konto ansehen. Mit einem kostenlosen Konto werden Ihre Lerndaten auf unserem Server gespeichert. Es gibt keine Werbung und keine Analyse- oder Tracking-Dienste. Wir verkaufen keine Daten und nutzen sie nicht zur Profilbildung.'] },
        { id: 'account', title: 'Benutzerkonto', blocks: ['Für Wortbedeutungen, Vokabelheft, Fortschritt, Aussprachebewertung und KI-Untertitel ist ein Konto nötig. Wir speichern E-Mail-Adresse, Name, Passwort (nur als sicheren Hash) und optional ein Profilbild. Bei „Mit Apple anmelden“ oder „Mit Google anmelden“ erhalten wir die Nutzerkennung und E-Mail-Adresse des Anbieters, bei Apple ggf. eine anonyme Weiterleitungsadresse. Für Bestätigungs- und Passwort-Codes senden wir E-Mails. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.'] },
        { id: 'learning', title: 'Lerndaten', blocks: ['Gespeicherte Wörter und Notizen, Fortschritt je Lektion, Wiederholungsergebnisse und Statistiken liegen mit Ihrem Konto auf unserem Server, damit Sie geräteübergreifend weiterlernen können. Eingefügte YouTube-Links und die zugehörigen Untertitel werden zwischengespeichert. Ohne Konto bleiben Einstellungen wie die Sprache nur auf Ihrem Gerät.'] },
        { id: 'microphone', title: 'Mikrofon und Spracherkennung', blocks: [`Das Mikrofon wird nur verwendet, wenn Sie eine Sprechübung starten. Die Live-Hervorhebung in der App nutzt die Spracherkennung von Apple, Apple kann die Audiodaten dafür verarbeiten ([Datenschutzrichtlinie von Apple](${APPLE_PRIVACY})). Bei der Aussprachebewertung wird die Aufnahme eines einzelnen Satzes an unseren Server und von dort an einen Transkriptionsdienst gesendet. Wir speichern Aufnahmen nicht dauerhaft.`] },
        { id: 'recipients', title: 'Dienstleister', blocks: ['Wir geben nur die jeweils nötigen Daten weiter:', { list: [
            `Hosting: ${HOSTING.de}`,
            'KI-Dienste (z. B. OpenAI, Groq): Texte und Sprachaufnahmen für Übersetzung, Wortbedeutungen, Satzzeichen und Transkription, nicht Ihr Name oder Ihre E-Mail-Adresse',
            'Sprachausgabe (z. B. OpenAI, Microsoft Azure, ElevenLabs): nur Sätze aus den Lektionen',
            `Google: Anmeldung mit Google, E-Mail-Versand und der eingebettete YouTube-Player ([Datenschutzerklärung von Google](${GOOGLE_PRIVACY}))`,
            'Apple: Anmeldung mit Apple und Spracherkennung',
        ] }, transferNote('de')] },
        { id: 'logs', title: 'Server-Logdaten', blocks: ['Zum Schutz vor Missbrauch werden IP-Adressen kurzzeitig verarbeitet (Art. 6 Abs. 1 lit. f DSGVO).'] },
        { id: 'retention', title: 'Speicherdauer und Kontolöschung', blocks: [`Daten bleiben gespeichert, solange Ihr Konto besteht. Sie können es jederzeit in der App unter „Konto“ → „Konto löschen“ löschen. Dabei werden Profil, Profilbild, Vokabelheft und Fortschritt dauerhaft entfernt und eine Apple-Anmeldung widerrufen. Alternativ genügt eine E-Mail an [support@hallovn.de](mailto:support@hallovn.de).`] },
        { id: 'children', title: 'Kinder', blocks: ['Der Dienst richtet sich nicht an Kinder unter 13 Jahren.'] },
    ],
    en: [
        { id: 'overview', title: 'Overview', blocks: ['Deutsch Shadowing consists of the website hallovn.de and the app. You can watch lessons without an account. With a free account, your learning data is stored on our server. There are no ads and no analytics or tracking services. We do not sell data or use it for profiling.'] },
        { id: 'account', title: 'Account', blocks: ['An account is needed for word meanings, the vocabulary book, progress, pronunciation scoring and AI subtitles. We store your email address, name, password (only as a secure hash) and an optional profile picture. With Sign in with Apple or Google we receive the provider\'s user ID and email address, with Apple possibly an anonymous relay address. We send emails for verification and password codes. The legal basis is Art. 6(1)(b) GDPR.'] },
        { id: 'learning', title: 'Learning data', blocks: ['Saved words and notes, progress per lesson, review results and statistics are stored with your account on our server so you can continue on any device. YouTube links you paste and their subtitles are cached. Without an account, settings such as language stay on your device only.'] },
        { id: 'microphone', title: 'Microphone and speech recognition', blocks: [`The microphone is only used when you start a speaking exercise. Live highlighting in the app uses Apple's speech recognition, and Apple may process the audio for this ([Apple's privacy policy](${APPLE_PRIVACY})). For pronunciation scoring, the recording of a single sentence is sent to our server and from there to a transcription service. We do not store recordings permanently.`] },
        { id: 'recipients', title: 'Service providers', blocks: ['We only share the data each service needs:', { list: [
            `Hosting: ${HOSTING.en}`,
            'AI services (e.g. OpenAI, Groq): text and voice recordings for translation, word meanings, punctuation and transcription, not your name or email address',
            'Text-to-speech (e.g. OpenAI, Microsoft Azure, ElevenLabs): only sentences from lessons',
            `Google: Sign in with Google, sending email and the embedded YouTube player ([Google's privacy policy](${GOOGLE_PRIVACY}))`,
            'Apple: Sign in with Apple and speech recognition',
        ] }, transferNote('en')] },
        { id: 'logs', title: 'Server logs', blocks: ['To protect against abuse, IP addresses are processed briefly (Art. 6(1)(f) GDPR).'] },
        { id: 'retention', title: 'Retention and account deletion', blocks: ['Data is kept as long as your account exists. You can delete it at any time in the app under “Account” → “Delete account”. This permanently removes your profile, profile picture, vocabulary book and progress and revokes any Apple sign-in. Alternatively, an email to [support@hallovn.de](mailto:support@hallovn.de) is enough.'] },
        { id: 'children', title: 'Children', blocks: ['The service is not directed at children under 13.'] },
    ],
    vi: [
        { id: 'overview', title: 'Tổng quan', blocks: ['Deutsch Shadowing gồm trang web hallovn.de và ứng dụng. Bạn có thể xem bài học mà không cần tài khoản. Với tài khoản miễn phí, dữ liệu học được lưu trên máy chủ của chúng tôi. Không có quảng cáo và không có dịch vụ phân tích hay theo dõi. Chúng tôi không bán dữ liệu và không dùng để lập hồ sơ người dùng.'] },
        { id: 'account', title: 'Tài khoản', blocks: ['Cần tài khoản để xem nghĩa từ, dùng sổ từ vựng, lưu tiến độ, chấm phát âm và tạo phụ đề bằng AI. Chúng tôi lưu email, tên, mật khẩu (chỉ dạng băm an toàn) và ảnh đại diện nếu có. Khi đăng nhập bằng Apple hoặc Google, chúng tôi nhận mã người dùng và email từ nhà cung cấp, với Apple có thể là địa chỉ chuyển tiếp ẩn danh. Chúng tôi gửi email cho mã xác nhận và mã đặt lại mật khẩu. Cơ sở pháp lý là Điều 6 khoản 1 điểm b GDPR.'] },
        { id: 'learning', title: 'Dữ liệu học', blocks: ['Từ đã lưu, ghi chú, tiến độ từng bài, kết quả ôn tập và thống kê được lưu cùng tài khoản trên máy chủ để bạn học tiếp trên mọi thiết bị. Link YouTube bạn dán và phụ đề kèm theo được lưu đệm. Không có tài khoản thì cài đặt như ngôn ngữ chỉ nằm trên thiết bị của bạn.'] },
        { id: 'microphone', title: 'Micro và nhận dạng giọng nói', blocks: [`Micro chỉ được dùng khi bạn bắt đầu bài luyện nói. Tính năng tô sáng trực tiếp trong app dùng nhận dạng giọng nói của Apple, và Apple có thể xử lý âm thanh cho việc này ([chính sách bảo mật của Apple](${APPLE_PRIVACY})). Khi chấm phát âm, bản ghi của một câu được gửi tới máy chủ của chúng tôi và từ đó tới dịch vụ chuyển giọng nói thành văn bản. Chúng tôi không lưu bản ghi lâu dài.`] },
        { id: 'recipients', title: 'Nhà cung cấp dịch vụ', blocks: ['Chúng tôi chỉ chia sẻ dữ liệu mà từng dịch vụ cần:', { list: [
            `Lưu trữ: ${HOSTING.vi}`,
            'Dịch vụ AI (ví dụ OpenAI, Groq): văn bản và bản ghi âm để dịch, tra nghĩa từ, thêm dấu câu và chuyển giọng nói thành văn bản, không gồm tên hay email của bạn',
            'Giọng đọc (ví dụ OpenAI, Microsoft Azure, ElevenLabs): chỉ các câu trong bài học',
            `Google: đăng nhập bằng Google, gửi email và trình phát YouTube nhúng ([chính sách bảo mật của Google](${GOOGLE_PRIVACY}))`,
            'Apple: đăng nhập bằng Apple và nhận dạng giọng nói',
        ] }, transferNote('vi')] },
        { id: 'logs', title: 'Nhật ký máy chủ', blocks: ['Để chống lạm dụng, địa chỉ IP được xử lý trong thời gian ngắn (Điều 6 khoản 1 điểm f GDPR).'] },
        { id: 'retention', title: 'Thời gian lưu trữ và xoá tài khoản', blocks: ['Dữ liệu được lưu khi tài khoản còn tồn tại. Bạn có thể xoá bất cứ lúc nào trong app tại “Tài khoản” → “Xoá tài khoản”. Việc này xoá vĩnh viễn hồ sơ, ảnh đại diện, sổ từ vựng và tiến độ, đồng thời thu hồi đăng nhập Apple. Bạn cũng có thể gửi email tới [support@hallovn.de](mailto:support@hallovn.de).'] },
        { id: 'children', title: 'Trẻ em', blocks: ['Dịch vụ không hướng tới trẻ em dưới 13 tuổi.'] },
    ],
};

export const shadowing: LegalProduct = {
    slug: 'shadowing',
    name: NAME,
    hasPurchases: false,
    showDeletion: false,
    summary: {
        de: 'Deutsch hören, sprechen und schreiben. Website hallovn.de und App.',
        en: 'Listen to, speak and write German. Website hallovn.de and app.',
        vi: 'Luyện nghe, nói và viết tiếng Đức. Trang web hallovn.de và ứng dụng.',
    },
    faq: {
        de: [
            { q: 'Wie funktioniert Shadowing?', a: 'Hören Sie einen Satz, sprechen Sie ihn sofort nach und achten Sie auf Rhythmus und Betonung. Wiederholen Sie, bis es flüssig klingt.' },
            { q: 'Wie lerne ich mit einem YouTube-Video?', a: 'Fügen Sie den Link ein. Die deutschen Untertitel werden automatisch geladen. Hat das Video keine, erstellt die KI sie für angemeldete Nutzer. Das kann bis zu einer Minute dauern.' },
            { q: 'Wofür brauche ich ein Konto?', a: 'Lektionen können Sie ohne Konto ansehen. Wortbedeutungen, Vokabelheft, Aussprachebewertung, KI-Untertitel und die Synchronisierung des Fortschritts brauchen ein kostenloses Konto.' },
            { q: 'Die Spracherkennung funktioniert nicht.', a: 'Erlauben Sie Mikrofon und Spracherkennung unter iOS-Einstellungen → Deutsch Shadowing und sprechen Sie in einer ruhigen Umgebung.' },
            { q: 'Ich habe mein Passwort vergessen.', a: 'Tippen Sie beim Anmelden auf „Passwort vergessen“. Sie erhalten einen Code per E-Mail. Prüfen Sie auch den Spam-Ordner.' },
            { q: 'Wie lösche ich mein Konto?', a: 'In der App unter „Konto“ → „Konto löschen“. Profil, Vokabelheft und Fortschritt werden dauerhaft gelöscht.' },
        ],
        en: [
            { q: 'How does shadowing work?', a: 'Listen to a sentence, repeat it right away and copy the rhythm and intonation. Repeat until it sounds fluent.' },
            { q: 'How do I use a YouTube video?', a: 'Paste the link. The German subtitles load automatically. If there are none, AI creates them for signed-in users, which may take up to a minute.' },
            { q: 'Why do I need an account?', a: 'You can watch lessons without one. Word meanings, the vocabulary book, pronunciation scoring, AI subtitles and progress sync need a free account.' },
            { q: 'Speech recognition does not work.', a: 'Allow Microphone and Speech Recognition in iOS Settings → Deutsch Shadowing, and speak in a quiet place.' },
            { q: 'I forgot my password.', a: 'Tap “Forgot password” on the sign-in screen. You will receive a code by email. Check your spam folder too.' },
            { q: 'How do I delete my account?', a: 'In the app under “Account” → “Delete account”. Your profile, vocabulary and progress are permanently deleted.' },
        ],
        vi: [
            { q: 'Shadowing là gì?', a: 'Nghe một câu, nói lại ngay theo đúng nhịp và ngữ điệu. Lặp lại đến khi nói trôi chảy.' },
            { q: 'Học với video YouTube thế nào?', a: 'Dán link vào, phụ đề tiếng Đức sẽ tự tải. Nếu video không có sẵn, AI sẽ tạo phụ đề cho người đã đăng nhập, có thể mất tới một phút.' },
            { q: 'Vì sao cần tài khoản?', a: 'Không cần tài khoản vẫn xem được bài học. Xem nghĩa từ, sổ từ vựng, chấm phát âm, phụ đề AI và đồng bộ tiến độ cần tài khoản miễn phí.' },
            { q: 'Không nhận được giọng nói?', a: 'Bật quyền Micro và Nhận dạng giọng nói trong Cài đặt iOS → Deutsch Shadowing, và nói ở nơi yên tĩnh.' },
            { q: 'Quên mật khẩu?', a: 'Chạm “Quên mật khẩu” ở màn hình đăng nhập, mã sẽ được gửi qua email. Hãy kiểm tra cả thư rác.' },
            { q: 'Xoá tài khoản thế nào?', a: 'Trong app vào “Tài khoản” → “Xoá tài khoản”. Hồ sơ, sổ từ vựng và tiến độ sẽ bị xoá vĩnh viễn.' },
        ],
    },
    privacy: perLocale((l) => [controller(l, NAME), ...body[l], emailContact(l), rights(l), changes(l)]),
};
