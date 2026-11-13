// Nội dung trang riêng của từng sản phẩm (/fuehrerschein, /lid, /shadowing).
// Ảnh chụp nằm ở public/apps/<id>/: ảnh App Store của app iOS, ảnh chụp trang học (trước đây ckk.pro) cho Deutsch Shadowing.
// Mọi con số ở đây phải khớp với app thật (mô tả App Store, ảnh chụp); không tự đặt ra.
import catalog from '@/../content/laixe/catalog_all/manifest.json';
import type { Locale } from '@/biz/contexts/LocaleContext';
import type { ServiceId } from '@/biz/lib/services';

export interface Screen {
    src: string;
    width: number;
    height: number;
}

export interface PageSection {
    title: string;
    body: string;
    points: string[];
}

export interface PageCopy {
    /** Một câu dẫn dài hơn tagline, dưới tiêu đề trang */
    intro: string;
    facts: { value: string; label: string }[];
    /** Song song với ProductPage.sections */
    sections: PageSection[];
    /** Mô tả từng ảnh, song song với ProductPage.screens */
    alts: string[];
    galleryTitle: string;
    plans?: {
        title: string;
        intro: string;
        columns: { title: string; items: string[] }[];
        note: string;
    };
    faq: { q: string; a: string }[];
}

export interface ProductPage {
    id: ServiceId;
    /** Ảnh dọc của app điện thoại hay ảnh ngang của trang web */
    shape: 'portrait' | 'landscape';
    screens: Screen[];
    /** Ảnh trong dải đầu trang (chỉ số trong screens) */
    hero: number[];
    /** Ảnh của từng mục tính năng */
    sections: number[][];
    seo: { title: string; description: string };
    copy: Record<Locale, PageCopy>;
}

const phone = (id: string, n: number): Screen => ({ src: `/apps/${id}/${n}.webp`, width: 828, height: 1791 });
const web = (name: string): Screen => ({ src: `/apps/shadowing/${name}.webp`, width: 1600, height: 798 });
const count = (locale: string) => catalog.questionCount.toLocaleString(locale);

const fuehrerschein: ProductPage = {
    id: 'fuehrerschein',
    shape: 'portrait',
    // Thứ tự ảnh trên App Store
    screens: Array.from({ length: 10 }, (_, i) => phone('fuehrerschein', i + 1)),
    hero: [0, 1],
    sections: [[0], [1, 6], [2, 4], [8, 5], [7], [9]],
    seo: {
        title: 'Führerschein Theorie Ckk – Theorieprüfung für 13 Klassen',
        description: `Alle ${count('de-DE')} amtlichen Fragen der Führerschein-Theorieprüfung für 13 Klassen – mit Prüfungssimulation und Übersetzung in 5 Sprachen, auch Vietnamesisch.`,
    },
    copy: {
        de: {
            intro: 'Die App für die Theorieprüfung in Deutschland: alle amtlichen Fragen, jede Frage auch in deiner Sprache, und eine Prüfungssimulation, die sich anfühlt wie beim TÜV oder bei der DEKRA.',
            facts: [
                { value: count('de-DE'), label: 'amtliche Fragen im Katalog ab 01.04.2025' },
                { value: '13', label: 'Führerscheinklassen von AM bis D' },
                { value: '5', label: 'Übersetzungen: VI, EN, AR, ZH, RU' },
                { value: '2', label: 'Prüfungssimulationen pro Tag kostenlos' },
            ],
            sections: [
                {
                    title: 'Deine Klasse, deine Prüfung',
                    body: 'Wähle deine Führerscheinklasse und die App zeigt dir genau die Fragen und den Prüfungsaufbau, die für dich gelten. Auf der Startseite siehst du sofort, wie viele Fragen du schon gelernt hast.',
                    points: [
                        'PKW: B',
                        'Motorrad: A, A2, A1, AM, Mofa',
                        'LKW: C, CE, C1 · Bus: D, D1',
                        'Land- und Forstwirtschaft: L, T',
                    ],
                },
                {
                    title: 'Jede Frage in deiner Sprache',
                    body: 'Unter jeder deutschen Frage und Antwort steht die Übersetzung. So verstehst du, was gefragt ist, und lernst gleichzeitig die deutschen Begriffe, die in der Prüfung vorkommen.',
                    points: [
                        'Vietnamesisch, Englisch, Arabisch, Chinesisch und Russisch',
                        'Jederzeit zwischen Original und Übersetzung wechseln',
                        'Sprachpakete einmal laden, dann offline lernen',
                    ],
                },
                {
                    title: 'Bilder und Videos wie in der Prüfung',
                    body: 'Situationsfragen mit Fotos und Videos laufen direkt in der App, genau wie am Prüfungsrechner. Du siehst die Szene, liest die Frage zweisprachig und kreuzt an.',
                    points: ['Videofragen mit Wiedergabe in der App', 'Verkehrszeichen und Bildfragen in voller Größe', 'Videos mit Premium auch offline'],
                },
                {
                    title: 'Prüfungssimulation mit Fehlerpunkten',
                    body: 'Zufällige Fragen, Zeitlimit und Fehlerpunkte wie in der echten Prüfung. Am Ende siehst du sofort: bestanden oder nicht bestanden. Dazu kommen die offiziellen Musterbögen zum Üben.',
                    points: ['Klasse B: 30 Fragen, 45 Minuten, höchstens 10 Fehlerpunkte', 'Sofortige Auswertung nach der Prüfung', 'Offizielle Musterbögen, Bogen für Bogen'],
                },
                {
                    title: 'Nach Themen lernen',
                    body: 'Der ganze Katalog ist nach Kapiteln geordnet, vom Grundstoff bis zum Zusatzstoff deiner Klasse. Pro Kapitel siehst du, wie viele Fragen du richtig, falsch oder noch gar nicht beantwortet hast.',
                    points: ['Zwei Lernmodi: Lesen oder Üben mit sofortiger Kontrolle', 'Falsch beantwortete Fragen gezielt wiederholen', 'Schwierige Fragen markieren'],
                },
                {
                    title: 'Sehen, wann du bereit bist',
                    body: 'Die Statistik zeigt deinen Fortschritt im Grundstoff und im Zusatzstoff, deine Erfolgsquote und den Verlauf deiner Prüfungssimulationen.',
                    points: ['Richtig, falsch und markiert auf einen Blick', 'Erfolgsquote über alle Fragen', 'Neue Fragen kommen per Update, dein Fortschritt bleibt'],
                },
            ],
            alts: [
                'Startseite der App mit Klasse B, Sprachauswahl, Lernen nach Themen und Prüfung',
                'Eine Frage zur Müdigkeit beim Fahren mit vietnamesischer Übersetzung',
                'Eine Videofrage mit vietnamesischer Übersetzung',
                'Einstellungen mit der Auswahl der Übersetzungssprache',
                'Prüfungssimulation mit einer Videofrage',
                'Die offiziellen Musterbögen',
                'Eine Frage zur Vorfahrt mit englischer Übersetzung',
                'Lernen nach Themen mit allen Kapiteln des Grundstoffs',
                'Prüfungsmodus der Klasse B mit 30 Fragen, 45 Minuten und 10 Fehlerpunkten',
                'Statistik mit Lernfortschritt und Erfolgsquote',
            ],
            galleryTitle: 'Alle Screenshots',
            plans: {
                title: 'Kostenlos lernen, Premium wenn du willst',
                intro: 'Alle Fragen sind ohne Kauf zugänglich. Premium nimmt die Grenzen weg.',
                columns: [
                    { title: 'Kostenlos', items: ['Alle Fragen aller Klassen lernen', 'Alle Übersetzungen', '2 Prüfungssimulationen pro Tag'] },
                    { title: 'Premium', items: ['Unbegrenzte Prüfungssimulationen', 'Keine Werbung', 'Videos herunterladen und offline ansehen'] },
                ],
                note: 'Premium gibt es als Abo für 3, 6 oder 12 Monate oder als Einmalkauf. Die Zahlung läuft über deine Apple-ID; Abos verwaltest und kündigst du in den Einstellungen deiner Apple-ID.',
            },
            faq: [
                { q: 'Ist der Fragenkatalog aktuell?', a: 'Ja. Die App nutzt den amtlichen Fragenkatalog, gültig ab 01.04.2025. Neue Fragen kommen per Update in die App, dein Lernfortschritt bleibt dabei erhalten.' },
                { q: 'Kann ich ohne Internet lernen?', a: 'Ja. Lade das Sprachpaket einmal, dann funktionieren Fragen und Übersetzungen offline. Videos offline anzusehen ist Teil von Premium.' },
                { q: 'Gibt es die App für Android?', a: 'Ja, als APK-Datei direkt von hallovn.de. Lade die Datei auf deinem Android-Gerät und erlaube die Installation aus unbekannten Quellen. Im Google Play Store ist die App nicht.' },
                { q: 'Brauche ich ein Konto?', a: 'Nein. Die App funktioniert ohne Anmeldung.' },
            ],
        },
        en: {
            intro: 'The app for the German driving theory test: every official question, each one also in your language, and an exam simulation that feels like the real thing at TÜV or DEKRA.',
            facts: [
                { value: count('en-US'), label: 'official questions, catalogue valid from 1 April 2025' },
                { value: '13', label: 'licence classes from AM to D' },
                { value: '5', label: 'translations: VI, EN, AR, ZH, RU' },
                { value: '2', label: 'free exam simulations per day' },
            ],
            sections: [
                {
                    title: 'Your class, your exam',
                    body: 'Choose your licence class and the app shows exactly the questions and exam format that apply to you. The home screen tells you at a glance how many questions you have already studied.',
                    points: ['Car: B', 'Motorcycle: A, A2, A1, AM, Mofa', 'Truck: C, CE, C1 · Bus: D, D1', 'Agriculture and forestry: L, T'],
                },
                {
                    title: 'Every question in your language',
                    body: 'Each German question and answer has its translation right below. You understand what is being asked and pick up the German terms you will see in the exam.',
                    points: ['Vietnamese, English, Arabic, Chinese and Russian', 'Switch between original and translation at any time', 'Download a language pack once, then study offline'],
                },
                {
                    title: 'Images and videos as in the exam',
                    body: 'Situation questions with photos and videos play right in the app, just like on the exam computer. Watch the scene, read the question in two languages and tick your answer.',
                    points: ['Video questions play inside the app', 'Traffic signs and image questions at full size', 'Videos offline with Premium'],
                },
                {
                    title: 'Exam simulation with penalty points',
                    body: 'Random questions, a time limit and penalty points as in the real test. When you finish you see straight away whether you passed. The official sample exams are included too.',
                    points: ['Class B: 30 questions, 45 minutes, at most 10 penalty points', 'Instant result after each exam', 'Official sample exams, one sheet at a time'],
                },
                {
                    title: 'Study by topic',
                    body: 'The whole catalogue is sorted into chapters, from the basic material to the additional material for your class. Each chapter shows how many questions you got right, wrong or have not tried yet.',
                    points: ['Two modes: read, or practise with instant checking', 'Repeat the questions you got wrong', 'Bookmark difficult questions'],
                },
                {
                    title: 'See when you are ready',
                    body: 'Statistics show your progress in the basic and additional material, your success rate and the history of your exam simulations.',
                    points: ['Correct, wrong and bookmarked at a glance', 'Success rate across all questions', 'New questions arrive by update and your progress stays'],
                },
            ],
            alts: [
                'App home screen with class B, language choice, study by topic and exam',
                'A question about tiredness while driving with Vietnamese translation',
                'A video question with Vietnamese translation',
                'Settings with the translation language list',
                'Exam simulation with a video question',
                'The official sample exams',
                'A right-of-way question with English translation',
                'Study by topic with all chapters of the basic material',
                'Class B exam mode with 30 questions, 45 minutes and 10 penalty points',
                'Statistics with learning progress and success rate',
            ],
            galleryTitle: 'All screenshots',
            plans: {
                title: 'Study for free, go Premium if you want',
                intro: 'Every question is available without buying anything. Premium removes the limits.',
                columns: [
                    { title: 'Free', items: ['Study every question for every class', 'All translations', '2 exam simulations per day'] },
                    { title: 'Premium', items: ['Unlimited exam simulations', 'No ads', 'Download videos and watch offline'] },
                ],
                note: 'Premium is available as a 3, 6 or 12 month subscription or as a one-time purchase. Payment goes through your Apple ID; manage or cancel subscriptions in your Apple ID settings.',
            },
            faq: [
                { q: 'Is the question catalogue up to date?', a: 'Yes. The app uses the official catalogue valid from 1 April 2025. New questions arrive in the app by update and your progress is kept.' },
                { q: 'Can I study without internet?', a: 'Yes. Download the language pack once and questions and translations work offline. Watching videos offline is part of Premium.' },
                { q: 'Is there an Android version?', a: 'Yes, as an APK file straight from hallovn.de. Download it on your Android device and allow installs from unknown sources. The app is not on Google Play.' },
                { q: 'Do I need an account?', a: 'No. The app works without signing in.' },
            ],
        },
        vi: {
            intro: 'App ôn thi lý thuyết lái xe tại Đức: đủ toàn bộ câu hỏi chính thức, câu nào cũng có bản dịch sang ngôn ngữ của bạn, và chế độ thi thử giống hệt khi thi ở TÜV hay DEKRA.',
            facts: [
                { value: count('vi-VN'), label: 'câu hỏi chính thức, bộ đề áp dụng từ 01.04.2025' },
                { value: '13', label: 'hạng bằng lái, từ AM đến D' },
                { value: '5', label: 'bản dịch: Việt, Anh, Ả Rập, Trung, Nga' },
                { value: '2', label: 'lượt thi thử miễn phí mỗi ngày' },
            ],
            sections: [
                {
                    title: 'Đúng hạng bằng, đúng đề thi',
                    body: 'Chọn hạng bằng của bạn, app chỉ hiện đúng các câu hỏi và cấu trúc đề thi áp dụng cho hạng đó. Ngay màn hình đầu bạn thấy mình đã học được bao nhiêu câu.',
                    points: ['Ô tô: B', 'Xe máy: A, A2, A1, AM, Mofa', 'Xe tải: C, CE, C1 · Xe buýt: D, D1', 'Nông lâm nghiệp: L, T'],
                },
                {
                    title: 'Câu nào cũng có tiếng Việt',
                    body: 'Dưới mỗi câu hỏi và đáp án tiếng Đức là bản dịch. Bạn hiểu đề hỏi gì, đồng thời quen dần với từ ngữ tiếng Đức sẽ gặp trong phòng thi.',
                    points: ['Tiếng Việt, Anh, Ả Rập, Trung và Nga', 'Chuyển giữa bản gốc và bản dịch bất cứ lúc nào', 'Tải gói ngôn ngữ một lần, sau đó học offline'],
                },
                {
                    title: 'Câu hỏi hình ảnh và video như khi thi thật',
                    body: 'Câu hỏi tình huống có ảnh và video chạy ngay trong app, giống máy tính ở phòng thi. Bạn xem tình huống, đọc câu hỏi song ngữ rồi chọn đáp án.',
                    points: ['Video phát ngay trong app', 'Biển báo và câu hỏi hình ảnh hiển thị lớn, rõ', 'Xem video offline với Premium'],
                },
                {
                    title: 'Thi thử có tính điểm lỗi',
                    body: 'Câu hỏi ngẫu nhiên, giới hạn thời gian và điểm lỗi như khi thi thật. Làm xong là biết ngay đậu hay trượt. Kèm theo đó là các bộ đề mẫu chính thức để luyện.',
                    points: ['Hạng B: 30 câu, 45 phút, tối đa 10 điểm lỗi', 'Có kết quả ngay sau khi nộp bài', 'Luyện lần lượt từng bộ đề mẫu chính thức'],
                },
                {
                    title: 'Học theo chủ đề',
                    body: 'Toàn bộ bộ đề được chia theo chương, từ phần kiến thức chung đến phần riêng của hạng bằng. Mỗi chương cho thấy bạn đã làm đúng, sai hay chưa làm bao nhiêu câu.',
                    points: ['Hai chế độ: đọc, hoặc luyện có chấm ngay', 'Ôn lại riêng những câu đã làm sai', 'Đánh dấu câu khó'],
                },
                {
                    title: 'Biết khi nào đã sẵn sàng',
                    body: 'Phần thống kê cho thấy tiến độ ở phần chung và phần riêng, tỉ lệ làm đúng và lịch sử các lần thi thử.',
                    points: ['Số câu đúng, sai, đã đánh dấu trong một màn hình', 'Tỉ lệ đúng trên toàn bộ câu hỏi', 'Câu hỏi mới được cập nhật, tiến độ học vẫn giữ nguyên'],
                },
            ],
            alts: [
                'Màn hình chính của app với hạng B, chọn ngôn ngữ, học theo chủ đề và thi thử',
                'Câu hỏi về dấu hiệu mệt mỏi khi lái xe, có bản dịch tiếng Việt',
                'Câu hỏi video có bản dịch tiếng Việt',
                'Cài đặt với danh sách ngôn ngữ dịch',
                'Thi thử với một câu hỏi video',
                'Các bộ đề mẫu chính thức',
                'Câu hỏi về quyền ưu tiên, có bản dịch tiếng Anh',
                'Học theo chủ đề với các chương của phần kiến thức chung',
                'Chế độ thi hạng B: 30 câu, 45 phút, 10 điểm lỗi',
                'Thống kê tiến độ học và tỉ lệ làm đúng',
            ],
            galleryTitle: 'Tất cả ảnh chụp màn hình',
            plans: {
                title: 'Học miễn phí, nâng cấp khi bạn cần',
                intro: 'Mọi câu hỏi đều học được mà không cần mua. Premium bỏ đi các giới hạn.',
                columns: [
                    { title: 'Miễn phí', items: ['Học mọi câu hỏi của mọi hạng bằng', 'Đầy đủ bản dịch', '2 lượt thi thử mỗi ngày'] },
                    { title: 'Premium', items: ['Thi thử không giới hạn', 'Không quảng cáo', 'Tải video về xem offline'] },
                ],
                note: 'Premium có dạng gói thuê bao 3, 6 hoặc 12 tháng, hoặc mua một lần dùng mãi. Thanh toán qua Apple ID; bạn quản lý và huỷ gói trong phần cài đặt Apple ID.',
            },
            faq: [
                { q: 'Bộ câu hỏi có cập nhật không?', a: 'Có. App dùng bộ đề chính thức áp dụng từ 01.04.2025. Câu hỏi mới được cập nhật trong app và tiến độ học của bạn vẫn được giữ.' },
                { q: 'Có học được khi không có mạng không?', a: 'Được. Tải gói ngôn ngữ một lần là câu hỏi và bản dịch chạy offline. Xem video offline thuộc gói Premium.' },
                { q: 'Có bản cho Android không?', a: 'Có, dạng file APK tải trực tiếp từ hallovn.de. Tải file về máy Android rồi cho phép cài ứng dụng từ nguồn không xác định. App không có trên Google Play.' },
                { q: 'Có cần tạo tài khoản không?', a: 'Không. App dùng được ngay, không cần đăng nhập.' },
            ],
        },
    },
};

const lid: ProductPage = {
    id: 'lid',
    shape: 'portrait',
    screens: Array.from({ length: 7 }, (_, i) => phone('lid', i + 1)),
    hero: [5, 2],
    sections: [[5, 0], [2, 1], [4], [3, 6]],
    seo: {
        title: 'Leben in Deutschland Ckk – Einbürgerungstest üben',
        description: 'Alle 310 Fragen des Einbürgerungstests „Leben in Deutschland“, die 10 Fragen deines Bundeslands, Testsimulation mit 33 Fragen und Übersetzung zu jeder Frage.',
    },
    copy: {
        de: {
            intro: 'Für den Einbürgerungstest und den Orientierungskurs: alle offiziellen Fragen, die Fragen deines Bundeslands und zu jeder Frage und Antwort eine Übersetzung.',
            facts: [
                { value: '310', label: 'offizielle Fragen: 300 allgemeine und 10 je Bundesland' },
                { value: '16', label: 'Bundesländer zur Auswahl' },
                { value: '33', label: 'Fragen in der Testsimulation' },
                { value: '17', label: 'richtige Antworten reichen zum Bestehen' },
            ],
            sections: [
                {
                    title: 'Alle Fragen, dein Bundesland',
                    body: 'Lerne die 300 allgemeinen Fragen und dazu die 10 Fragen des Bundeslands, in dem du lebst. Dein Bundesland wählst du einmal aus, die App stellt die Fragen passend zusammen.',
                    points: ['Alle 16 Bundesländer mit Wappen', 'Lernen, Testen, Markierte und Einstellungen auf einer Startseite', 'Bundesland jederzeit wechseln'],
                },
                {
                    title: 'Zweisprachig lernen',
                    body: 'Unter jeder Frage und jeder Antwortmöglichkeit steht die Übersetzung. Die Sprache der App und die Übersetzungssprache wählst du getrennt.',
                    points: ['App-Sprache: Deutsch, Vietnamesisch oder Englisch', 'Übersetzung: Vietnamesisch, Englisch, Chinesisch, Arabisch, Russisch', 'Gerade bei Geschichte und Politik hilft die eigene Sprache'],
                },
                {
                    title: 'Den Test simulieren',
                    body: 'Die Testsimulation läuft wie der echte Test: 33 Fragen, davon 30 allgemeine und 3 zu deinem Bundesland, mit 60 Minuten Zeit.',
                    points: ['Bestanden ab 17 von 33 richtigen Antworten', 'Auswertung direkt nach dem Test', 'Falsche Fragen nach dem Test noch einmal ansehen'],
                },
                {
                    title: 'Schwierige Fragen gezielt wiederholen',
                    body: 'Falsch beantwortete Fragen werden automatisch markiert. Du kannst auch selbst Fragen markieren und sie später gesammelt üben.',
                    points: ['Automatisch markieren bei falscher Antwort', 'Eigene Lesezeichen setzen und entfernen', 'Alle markierten Fragen in einer Liste'],
                },
            ],
            alts: [
                'Auswahl des Bundeslands mit den Wappen aller 16 Länder',
                'Begrüßung mit Auswahl von App-Sprache und Übersetzungssprache',
                'Fragenliste mit vietnamesischer Übersetzung unter jeder Frage',
                'Markierte Fragen',
                'Start der Testsimulation mit 33 Fragen und 60 Minuten',
                'Startseite mit Lernen, Test, Markierten und Einstellungen',
                'Einstellungen mit der Liste der Übersetzungssprachen',
            ],
            galleryTitle: 'Alle Screenshots',
            faq: [
                { q: 'Sind das die offiziellen Fragen?', a: 'Ja. Die App enthält alle 310 Fragen des offiziellen Fragenkatalogs: 300 allgemeine Fragen und 10 Fragen für jedes Bundesland.' },
                { q: 'Wie läuft der echte Test ab?', a: 'Im Test bekommst du 33 Fragen, 30 allgemeine und 3 zu deinem Bundesland, und hast 60 Minuten Zeit. Mit 17 richtigen Antworten hast du bestanden. Die Simulation in der App folgt genau diesem Ablauf.' },
                { q: 'Gibt es die App für Android?', a: 'Ja, als APK-Datei direkt von hallovn.de. Lade die Datei auf deinem Android-Gerät und erlaube die Installation aus unbekannten Quellen.' },
                { q: 'Brauche ich ein Konto?', a: 'Nein. Die App funktioniert ohne Anmeldung.' },
            ],
        },
        en: {
            intro: 'For the German citizenship test and the orientation course: every official question, the questions for your federal state and a translation for every question and answer.',
            facts: [
                { value: '310', label: 'official questions: 300 general and 10 per state' },
                { value: '16', label: 'federal states to choose from' },
                { value: '33', label: 'questions in the test simulation' },
                { value: '17', label: 'correct answers are enough to pass' },
            ],
            sections: [
                {
                    title: 'Every question, your state',
                    body: 'Study the 300 general questions plus the 10 questions for the state you live in. Choose your state once and the app puts the right questions together.',
                    points: ['All 16 federal states with their coats of arms', 'Study, test, bookmarks and settings on one home screen', 'Change your state at any time'],
                },
                {
                    title: 'Learn in two languages',
                    body: 'Every question and every answer option has its translation right below. You choose the app language and the translation language separately.',
                    points: ['App language: German, Vietnamese or English', 'Translation: Vietnamese, English, Chinese, Arabic, Russian', 'Your own language helps most with history and politics'],
                },
                {
                    title: 'Simulate the test',
                    body: 'The simulation works like the real test: 33 questions, 30 general and 3 about your state, with 60 minutes on the clock.',
                    points: ['Pass with 17 out of 33 correct answers', 'Result straight after the test', 'Review the questions you got wrong'],
                },
                {
                    title: 'Repeat difficult questions',
                    body: 'Questions you answer wrongly are bookmarked automatically. You can bookmark questions yourself too and practise them together later.',
                    points: ['Automatic bookmark on a wrong answer', 'Add and remove your own bookmarks', 'All bookmarked questions in one list'],
                },
            ],
            alts: [
                'Choosing a federal state, with the coats of arms of all 16 states',
                'Welcome screen with app language and translation language',
                'Question list with a Vietnamese translation under each question',
                'Bookmarked questions',
                'Start of the test simulation with 33 questions and 60 minutes',
                'Home screen with study, test, bookmarks and settings',
                'Settings with the list of translation languages',
            ],
            galleryTitle: 'All screenshots',
            faq: [
                { q: 'Are these the official questions?', a: 'Yes. The app contains all 310 questions of the official catalogue: 300 general questions and 10 for each federal state.' },
                { q: 'How does the real test work?', a: 'You get 33 questions, 30 general and 3 about your state, and have 60 minutes. 17 correct answers are a pass. The simulation in the app follows exactly this format.' },
                { q: 'Is there an Android version?', a: 'Yes, as an APK file straight from hallovn.de. Download it on your Android device and allow installs from unknown sources.' },
                { q: 'Do I need an account?', a: 'No. The app works without signing in.' },
            ],
        },
        vi: {
            intro: 'Ôn bài thi nhập tịch và bài thi cuối khoá định hướng: đủ toàn bộ câu hỏi chính thức, các câu riêng của bang bạn đang sống, và câu hỏi, đáp án nào cũng có bản dịch.',
            facts: [
                { value: '310', label: 'câu hỏi chính thức: 300 câu chung và 10 câu mỗi bang' },
                { value: '16', label: 'bang để chọn' },
                { value: '33', label: 'câu trong bài thi thử' },
                { value: '17', label: 'câu đúng là đậu' },
            ],
            sections: [
                {
                    title: 'Đủ câu hỏi, đúng bang của bạn',
                    body: 'Học 300 câu chung cùng 10 câu riêng của bang bạn đang sống. Chỉ cần chọn bang một lần, app tự ghép đúng bộ câu hỏi.',
                    points: ['Đủ 16 bang, kèm huy hiệu từng bang', 'Học, thi thử, câu đã đánh dấu và cài đặt ngay trên màn hình chính', 'Đổi bang bất cứ lúc nào'],
                },
                {
                    title: 'Học song ngữ',
                    body: 'Dưới mỗi câu hỏi và từng phương án trả lời là bản dịch. Ngôn ngữ giao diện và ngôn ngữ dịch được chọn riêng.',
                    points: ['Giao diện: tiếng Đức, Việt hoặc Anh', 'Bản dịch: tiếng Việt, Anh, Trung, Ả Rập, Nga', 'Phần lịch sử và chính trị dễ hiểu hơn hẳn khi đọc bằng tiếng mẹ đẻ'],
                },
                {
                    title: 'Thi thử như thi thật',
                    body: 'Bài thi thử giống hệt bài thi thật: 33 câu, gồm 30 câu chung và 3 câu về bang của bạn, làm trong 60 phút.',
                    points: ['Đậu khi đúng từ 17 trên 33 câu', 'Có kết quả ngay sau khi làm xong', 'Xem lại các câu đã làm sai'],
                },
                {
                    title: 'Ôn lại câu khó',
                    body: 'Câu trả lời sai được tự động đánh dấu. Bạn cũng có thể tự đánh dấu câu hỏi để sau này ôn lại cùng lúc.',
                    points: ['Tự đánh dấu khi trả lời sai', 'Tự thêm hoặc bỏ đánh dấu', 'Mọi câu đã đánh dấu nằm trong một danh sách'],
                },
            ],
            alts: [
                'Chọn bang, có huy hiệu của cả 16 bang',
                'Màn hình chào với lựa chọn ngôn ngữ giao diện và ngôn ngữ dịch',
                'Danh sách câu hỏi, dưới mỗi câu có bản dịch tiếng Việt',
                'Các câu hỏi đã đánh dấu',
                'Bắt đầu bài thi thử 33 câu trong 60 phút',
                'Màn hình chính với học, thi thử, câu đã đánh dấu và cài đặt',
                'Cài đặt với danh sách ngôn ngữ dịch',
            ],
            galleryTitle: 'Tất cả ảnh chụp màn hình',
            faq: [
                { q: 'Đây có phải câu hỏi chính thức không?', a: 'Đúng. App có đủ 310 câu của bộ đề chính thức: 300 câu chung và 10 câu cho mỗi bang.' },
                { q: 'Bài thi thật diễn ra thế nào?', a: 'Bạn làm 33 câu, gồm 30 câu chung và 3 câu về bang của mình, trong 60 phút. Đúng 17 câu là đậu. Bài thi thử trong app theo đúng cấu trúc này.' },
                { q: 'Có bản cho Android không?', a: 'Có, dạng file APK tải trực tiếp từ hallovn.de. Tải file về máy Android rồi cho phép cài ứng dụng từ nguồn không xác định.' },
                { q: 'Có cần tạo tài khoản không?', a: 'Không. App dùng được ngay, không cần đăng nhập.' },
            ],
        },
    },
};

const shadowing: ProductPage = {
    id: 'shadowing',
    shape: 'landscape',
    screens: [web('home'), web('lesson'), web('vocab'), web('games')],
    hero: [1],
    sections: [[0], [1], [2], [3]],
    seo: {
        title: 'Deutsch Shadowing – Deutsch lernen mit echten Videos',
        description: 'Deutsch hören und nachsprechen, Satz für Satz, mit echten Videos von A1 bis C2, eigenen YouTube-Videos, Goethe-Wortlisten und Lernspielen. Auf hallovn.de.',
    },
    copy: {
        de: {
            intro: 'Shadowing heißt: hören, sofort nachsprechen, vergleichen. Deutsch Shadowing macht das mit echten deutschen Videos, Satz für Satz, und ergänzt es um Wortlisten und Lernspiele.',
            facts: [
                { value: 'A1–C2', label: 'Video-Lektionen nach Niveau' },
                { value: 'YouTube', label: 'jedes Video mit Untertiteln wird zur Übung' },
                { value: '3', label: 'Goethe-Wortlisten: A1, A2, B1' },
                { value: '4', label: 'Lernspiele für Wortschatz und Artikel' },
            ],
            sections: [
                {
                    title: 'Lektionen mit echten Videos',
                    body: 'Die Bibliothek sammelt Videos aus dem deutschen Alltag: Nachrichten, Reportagen, Märchen und Lernvideos, jeweils mit Niveau und Anzahl der Sätze. Du filterst nach A1 bis C2 und fängst an.',
                    points: ['Einige Lektionen sind ohne Anmeldung frei', 'Mit Konto wählst du zwei weitere Lektionen selbst', 'Oder: YouTube-Link einfügen und mit jedem Video üben'],
                },
                {
                    title: 'Satz für Satz nachsprechen',
                    body: 'Das Video hält nach jedem Satz an. Du sprichst nach, nimmst dich auf und hörst dich direkt danach mit dem Original im Ohr. Das Transkript läuft daneben mit.',
                    points: ['Automatische Pause nach jedem Satz', 'Aufnehmen und Anhören deiner Stimme', 'Übersetzung pro Satz, Video oder Text ausblendbar', 'Zusätzlich ein Diktat-Modus zum Mitschreiben'],
                },
                {
                    title: 'Wortschatz nach Niveau',
                    body: 'Die Wortlisten folgen den Goethe-Niveaus A1, A2 und B1, dazu kommt ein Lehrwerk für B2. Wörter, die du behalten willst, speicherst du in deinem Vokabelheft und wiederholst sie zur richtigen Zeit.',
                    points: ['Goethe A1, A2 und B1', 'Aspekte für B2', 'Eigenes Vokabelheft mit Wiederholung (mit Konto)'],
                },
                {
                    title: 'Lernspiele',
                    body: 'Zwischendurch geht Wortschatz auch spielerisch: Wörter abfangen, bevor sie ins Wasser fallen, Gold mit der richtigen Schreibweise heben, Paare finden, der, die oder das wählen.',
                    points: ['Wortregen', 'Goldgräber: hören und richtig schreiben', 'Wortpaare', 'Der, die, das'],
                },
            ],
            alts: [
                'Startseite von Deutsch Shadowing mit Feld für einen YouTube-Link und der Bibliothek der Lektionen',
                'Eine Lektion mit Video, aktuellem Satz, Aufnahme-Knopf und Transkript',
                'Die Wortlisten Goethe A1, A2 und B1',
                'Die Lernspiele Wortregen, Goldgräber und Wortpaare',
            ],
            galleryTitle: 'Alle Screenshots',
            faq: [
                { q: 'In welcher Sprache ist die Oberfläche?', a: 'Die Oberfläche von Deutsch Shadowing und die Bedeutungen in Wortlisten und Spielen sind derzeit auf Vietnamesisch. Die Videos, Transkripte und Übungen sind auf Deutsch.' },
                { q: 'Brauche ich ein Konto?', a: 'Nein. Die freien Lektionen und eigene YouTube-Videos funktionieren ohne Anmeldung. Mit Konto wählst du zwei weitere Lektionen und speicherst Wörter im Vokabelheft.' },
                { q: 'Welche Videos kann ich nutzen?', a: 'Die Lektionen der Bibliothek oder jedes YouTube-Video mit Untertiteln, dessen Link du einfügst. Die Videos bleiben Eigentum ihrer Urheber auf YouTube.' },
                { q: 'Wo finde ich Deutsch Shadowing?', a: 'Direkt hier auf hallovn.de (früher ckk.biz). Mit einem Konto lernst du Deutsch, übst die Führerschein-Theorie und Leben in Deutschland.' },
            ],
        },
        en: {
            intro: 'Shadowing means: listen, repeat straight away, compare. Deutsch Shadowing does this with real German videos, sentence by sentence, and adds word lists and learning games.',
            facts: [
                { value: 'A1–C2', label: 'video lessons by level' },
                { value: 'YouTube', label: 'any video with subtitles becomes an exercise' },
                { value: '3', label: 'Goethe word lists: A1, A2, B1' },
                { value: '4', label: 'games for vocabulary and articles' },
            ],
            sections: [
                {
                    title: 'Lessons with real videos',
                    body: 'The library collects videos from everyday German life: news, documentaries, fairy tales and learning videos, each with its level and number of sentences. Filter from A1 to C2 and start.',
                    points: ['Some lessons are free without signing in', 'With an account you pick two more lessons yourself', 'Or paste a YouTube link and practise with any video'],
                },
                {
                    title: 'Repeat sentence by sentence',
                    body: 'The video pauses after every sentence. You repeat it, record yourself and listen back with the original still in your ear. The transcript runs alongside.',
                    points: ['Automatic pause after each sentence', 'Record and play back your voice', 'Translation per sentence, hide video or text', 'Plus a dictation mode to write along'],
                },
                {
                    title: 'Vocabulary by level',
                    body: 'Word lists follow the Goethe levels A1, A2 and B1, plus a course book for B2. Save the words you want to keep in your notebook and review them at the right time.',
                    points: ['Goethe A1, A2 and B1', 'Aspekte for B2', 'Your own notebook with review (with an account)'],
                },
                {
                    title: 'Learning games',
                    body: 'Vocabulary can be a game too: catch words before they hit the water, dig up gold by spelling correctly, match pairs, choose der, die or das.',
                    points: ['Word rain', 'Gold digger: listen and spell', 'Word match', 'Der, die, das'],
                },
            ],
            alts: [
                'Deutsch Shadowing home page with a field for a YouTube link and the lesson library',
                'A lesson with video, current sentence, record button and transcript',
                'The Goethe A1, A2 and B1 word lists',
                'The games word rain, gold digger and word match',
            ],
            galleryTitle: 'All screenshots',
            faq: [
                { q: 'What language is the interface in?', a: 'The Deutsch Shadowing interface and the meanings in word lists and games are currently in Vietnamese. Videos, transcripts and exercises are in German.' },
                { q: 'Do I need an account?', a: 'No. Free lessons and your own YouTube videos work without signing in. With an account you pick two more lessons and save words to your notebook.' },
                { q: 'Which videos can I use?', a: 'The library lessons, or any YouTube video with subtitles whose link you paste in. The videos remain the property of their creators on YouTube.' },
                { q: 'Where do I find Deutsch Shadowing?', a: 'Right here on hallovn.de (formerly ckk.biz). With one account you can learn German and practise the driving theory test and Leben in Deutschland.' },
            ],
        },
        vi: {
            intro: 'Shadowing là nghe, nói lại ngay, rồi so sánh. Deutsch Shadowing làm việc đó với video tiếng Đức thật, từng câu một, kèm bộ từ vựng và game học tập.',
            facts: [
                { value: 'A1–C2', label: 'bài học video theo trình độ' },
                { value: 'YouTube', label: 'video nào có phụ đề cũng thành bài luyện' },
                { value: '3', label: 'bộ từ vựng Goethe: A1, A2, B1' },
                { value: '4', label: 'game luyện từ vựng và mạo từ' },
            ],
            sections: [
                {
                    title: 'Bài học từ video thật',
                    body: 'Thư viện gồm video đời sống ở Đức: thời sự, phóng sự, truyện cổ tích và video học tiếng, mỗi bài ghi rõ trình độ và số câu. Lọc từ A1 đến C2 rồi bắt đầu.',
                    points: ['Một số bài học miễn phí, không cần đăng nhập', 'Có tài khoản thì tự chọn thêm 2 bài', 'Hoặc dán link YouTube để luyện với bất kỳ video nào'],
                },
                {
                    title: 'Nói theo từng câu',
                    body: 'Video tự dừng sau mỗi câu. Bạn nói lại, ghi âm và nghe lại giọng mình ngay khi câu gốc còn trong tai. Transcript chạy song song bên cạnh.',
                    points: ['Tự dừng sau mỗi câu', 'Ghi âm và nghe lại giọng của bạn', 'Dịch từng câu, ẩn video hoặc ẩn chữ', 'Thêm chế độ Dictation để chép chính tả'],
                },
                {
                    title: 'Từ vựng theo trình độ',
                    body: 'Các bộ từ theo trình độ Goethe A1, A2, B1, thêm giáo trình cho B2. Từ nào muốn nhớ thì lưu vào sổ từ vựng và ôn đúng lúc.',
                    points: ['Goethe A1, A2 và B1', 'Aspekte cho B2', 'Sổ từ vựng riêng có lịch ôn (cần tài khoản)'],
                },
                {
                    title: 'Game học tập',
                    body: 'Từ vựng cũng có thể học bằng game: bắn từ trước khi rơi xuống nước, kéo vàng lên bằng cách gõ đúng chính tả, nối cặp từ, chọn der, die hay das.',
                    points: ['Mưa từ vựng', 'Đào vàng: nghe và gõ đúng chính tả', 'Nối từ', 'Der, die, das'],
                },
            ],
            alts: [
                'Trang chủ Deutsch Shadowing với ô dán link YouTube và thư viện bài học',
                'Một bài học với video, câu hiện tại, nút ghi âm và transcript',
                'Các bộ từ vựng Goethe A1, A2 và B1',
                'Các game Mưa từ vựng, Đào vàng và Nối từ',
            ],
            galleryTitle: 'Tất cả ảnh chụp màn hình',
            faq: [
                { q: 'Giao diện dùng ngôn ngữ gì?', a: 'Giao diện Deutsch Shadowing và phần nghĩa trong bộ từ, game hiện bằng tiếng Việt. Video, transcript và bài luyện là tiếng Đức.' },
                { q: 'Có cần tài khoản không?', a: 'Không. Bài học miễn phí và video YouTube tự dán đều dùng được mà không cần đăng nhập. Có tài khoản thì chọn thêm 2 bài và lưu từ vào sổ từ vựng.' },
                { q: 'Luyện được với những video nào?', a: 'Các bài trong thư viện, hoặc bất kỳ video YouTube có phụ đề mà bạn dán link vào. Video vẫn thuộc quyền sở hữu của tác giả trên YouTube.' },
                { q: 'Học Deutsch Shadowing ở đâu?', a: 'Ngay trên hallovn.de (trước đây là ckk.biz). Một tài khoản để học tiếng Đức, ôn lý thuyết lái xe và Leben in Deutschland.' },
            ],
        },
    },
};

export const PRODUCT_PAGES: Record<ServiceId, ProductPage> = { fuehrerschein, lid, shadowing };
