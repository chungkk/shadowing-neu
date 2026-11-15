// Nội dung trang giới thiệu nền tảng học HalloVN (/shadowing).
// Ảnh chụp nằm ở public/apps/shadowing/ (ảnh chụp trang học HalloVN).
// Mọi con số ở đây phải khớp với dữ liệu thật, không tự đặt ra:
// - bộ từ: src/content/decks/*.json (6 bộ, 11.562 mục từ → "11.500+")
// - lái xe: src/content/fuehrerschein/questions.json (1.746 câu, 13 hạng, ~1.357 câu có giải thích; hạng B thi 30 câu / 45 phút)
// - Leben in Deutschland: src/content/lid/questions.json (300 câu chung + 16 bang × 10, danh mục BAMF 07.05.2025; thi 33 câu, 17 câu đúng là đậu, 60 phút)
// - bài video (số bài và trình độ nằm trong DB trên VPS nên không ghi số): src/lib/lesson-lock.ts (khách học bài miễn phí, có tài khoản chọn thêm 2 bài, bài khác mở bằng kim cương kiếm khi học)
import type { Locale } from '@/components/company/LocaleContext';
import type { ServiceId } from '@/lib/company/services';

export interface Screen {
    src: string;
    width: number;
    height: number;
    /** Cắt bỏ bao nhiêu px phía trên khi hiện (vd. thanh điều hướng cũ trong ảnh chụp) */
    cropTop?: number;
}

export interface PageSection {
    title: string;
    body: string;
    points: string[];
    /** Liên kết tới phần học tương ứng */
    link?: { href: string; label: string };
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
    /** Ảnh của từng mục tính năng; [] = mục chỉ có chữ */
    sections: number[][];
    seo: { title: string; description: string };
    copy: Record<Locale, PageCopy>;
}

// Ảnh chụp còn thanh điều hướng cũ ở trên cùng (~78px) → cắt đi khi hiện. Chụp lại ảnh mới thì bỏ cropTop.
const web = (name: string): Screen => ({ src: `/apps/shadowing/${name}.webp`, width: 1600, height: 798, cropTop: 80 });

const shadowing: ProductPage = {
    id: 'shadowing',
    shape: 'landscape',
    screens: [web('home'), web('lesson'), web('vocab'), web('games')],
    hero: [1],
    sections: [[0], [1], [2], [], []],
    seo: {
        title: 'HalloVN – Deutsch, Führerschein und Leben in Deutschland auf Vietnamesisch',
        description:
            'Kostenlose Lernplattform für Vietnamesen in Deutschland: Deutsch mit echten Videos, Goethe-Wortschatz, Führerscheintheorie und Leben in Deutschland mit vietnamesischer Übersetzung.',
    },
    copy: {
        de: {
            intro:
                'HalloVN ist für Vietnamesinnen und Vietnamesen, die in Deutschland leben oder bald herkommen: zum Studium, zur Ausbildung, zur Arbeit oder zur Familie. Du lernst Deutsch mit echten Videos und Wortlisten und bereitest dich auf die Führerscheinprüfung und den Test Leben in Deutschland vor, alles mit Erklärungen auf Vietnamesisch.',
            facts: [
                { value: '11.500+', label: 'Wörter und Wendungen in 6 Wortlisten' },
                { value: '1.700+', label: 'offizielle Führerschein-Fragen für 13 Klassen' },
                { value: '460', label: 'Fragen zu Leben in Deutschland, alle übersetzt' },
                { value: '0 €', label: 'kostenlos, ein Konto für alles' },
            ],
            sections: [
                {
                    title: 'Deutsch mit echten Videos',
                    body: 'Die Bibliothek sammelt Videos aus dem deutschen Alltag: Nachrichten, Reportagen und Lernvideos, jeweils mit Niveau und Anzahl der Sätze. Oder du fügst einen YouTube-Link ein und übst mit genau dem Video, das dich interessiert.',
                    points: ['Lektionen nach Niveau filtern', 'Jedes YouTube-Video mit deutschen Untertiteln wird zur Übung', 'Einige Lektionen sind ohne Anmeldung frei'],
                    link: { href: '/tieng-duc', label: 'Zu den Lektionen' },
                },
                {
                    title: 'Hören, nachsprechen, mitschreiben',
                    body: 'Beim Shadowing hält das Video nach jedem Satz an. Du sprichst nach, nimmst dich auf und vergleichst sofort mit dem Original. Im Diktat-Modus schreibst du den Satz mit, den du gerade gehört hast.',
                    points: ['Automatische Pause nach jedem Satz, Tempo und Wiederholung einstellbar', 'Aufnehmen und Anhören der eigenen Stimme', 'Vietnamesische Übersetzung pro Satz, Video oder Text ausblendbar', 'Wort antippen: Bedeutung sehen und ins Vokabelheft speichern'],
                },
                {
                    title: 'Wortschatz, der bleibt',
                    body: 'Die Wortlisten folgen den Goethe-Niveaus A1, A2 und B1, dazu Aspekte neu für B2, Nomen-Verb-Verbindungen und Wortschatz für die Pflege. Alle Wörter haben eine vietnamesische Bedeutung. Was du behalten willst, kommt ins Vokabelheft und wird zur richtigen Zeit wiederholt.',
                    points: ['Goethe A1, A2 und B1, Aspekte neu B2', 'Nomen-Verb-Verbindungen und Wortschatz Pflege', 'Vokabelheft mit Wiederholung (mit Konto)', 'Lernspiele für Wortschatz und der, die, das'],
                    link: { href: '/vocab', label: 'Zum Wortschatz' },
                },
                {
                    title: 'Führerscheintheorie auf Vietnamesisch',
                    body: 'Alle offiziellen Fragen der Theorieprüfung für 13 Führerscheinklassen, von B über A und C bis D, L und T. Jede Frage hat eine vietnamesische Übersetzung, die meisten auch eine Erklärung. Bilder und Videofragen erscheinen wie in der Prüfung.',
                    points: ['Lernen nach Themen, falsch beantwortete Fragen gezielt wiederholen', 'Prüfungssimulation mit Fehlerpunkten wie in der echten Prüfung', 'Offizielle Musterbögen für Klasse B', 'Fragen markieren, Statistik mit Konto'],
                    link: { href: '/lai-xe', label: 'Zur Führerscheintheorie' },
                },
                {
                    title: 'Leben in Deutschland',
                    body: 'Der offizielle Fragenkatalog des BAMF (Stand 7. Mai 2025): 300 allgemeine Fragen und 10 Fragen für jedes Bundesland, alle mit vietnamesischer Übersetzung. Du wählst dein Bundesland und übst genau die Fragen, die im Test vorkommen.',
                    points: ['Lernen nach Themen: Politik, Geschichte, Gesellschaft', 'Testsimulation: 33 Fragen, 60 Minuten, ab 17 richtigen bestanden', 'Falsch beantwortete Fragen wiederholen', 'Kurze Erklärungen auf Vietnamesisch bei vielen Fragen'],
                    link: { href: '/leben-in-deutschland', label: 'Zu Leben in Deutschland' },
                },
            ],
            alts: [
                'Startseite des Deutschbereichs mit Feld für einen YouTube-Link und der Bibliothek der Lektionen',
                'Eine Lektion mit Video, aktuellem Satz, Aufnahme-Knopf und Transkript',
                'Die Wortlisten Goethe A1, A2 und B1',
                'Die Lernspiele Wortregen, Goldgräber, Wortpaare und Der, die, das',
            ],
            galleryTitle: 'Screenshots',
            faq: [
                { q: 'Für wen ist HalloVN?', a: 'Für Vietnamesinnen und Vietnamesen, die in Deutschland leben oder bald hierherkommen, etwa zum Studium, zur Ausbildung, zur Arbeit oder zur Familie. Erklärungen, Bedeutungen und Übersetzungen sind auf Vietnamesisch.' },
                { q: 'Was kostet HalloVN?', a: 'Nichts. Das Konto ist kostenlos und es gibt keine Käufe. Einige Video-Lektionen sind ohne Anmeldung frei, mit Konto wählst du zwei weitere selbst. Weitere Lektionen schaltest du mit Diamanten frei, die du beim Üben sammelst.' },
                { q: 'Brauche ich ein Konto?', a: 'Zum Ausprobieren nicht. Mit einem Konto wird dein Fortschritt gespeichert, du hast ein eigenes Vokabelheft und siehst deine Statistik in allen Bereichen.' },
                { q: 'In welcher Sprache ist die Oberfläche?', a: 'Die Oberfläche, die Bedeutungen und die Übersetzungen sind auf Vietnamesisch. Videos, Transkripte und Prüfungsfragen sind auf Deutsch, so wie in der Prüfung.' },
                { q: 'Welche Videos kann ich nutzen?', a: 'Die Lektionen der Bibliothek oder jedes YouTube-Video mit deutschen Untertiteln, dessen Link du einfügst. Die Videos bleiben Eigentum ihrer Urheber auf YouTube.' },
                { q: 'Gibt es eine App?', a: 'HalloVN funktioniert direkt im Browser, auch auf dem Handy. Eine App für iOS und Android mit demselben Konto ist in Arbeit.' },
            ],
        },
        en: {
            intro:
                'HalloVN is for Vietnamese people who live in Germany or are about to move here: to study, train, work or join family. You learn German with real videos and word lists and prepare for the driving theory test and the Leben in Deutschland test, all with explanations in Vietnamese.',
            facts: [
                { value: '11,500+', label: 'words and phrases in 6 word lists' },
                { value: '1,700+', label: 'official driving theory questions for 13 classes' },
                { value: '460', label: 'Leben in Deutschland questions, all translated' },
                { value: '€0', label: 'free, one account for everything' },
            ],
            sections: [
                {
                    title: 'German with real videos',
                    body: 'The library collects videos from everyday German life: news, documentaries and learning videos, each with its level and number of sentences. Or paste a YouTube link and practise with exactly the video you care about.',
                    points: ['Filter lessons by level', 'Any YouTube video with German subtitles becomes an exercise', 'Some lessons are free without signing in'],
                    link: { href: '/tieng-duc', label: 'Go to the lessons' },
                },
                {
                    title: 'Listen, repeat, write along',
                    body: 'In shadowing mode the video pauses after every sentence. You repeat it, record yourself and compare straight away with the original. In dictation mode you write down the sentence you just heard.',
                    points: ['Automatic pause after each sentence, adjustable speed and repeats', 'Record and play back your own voice', 'Vietnamese translation per sentence, hide video or text', 'Tap a word to see its meaning and save it to your notebook'],
                },
                {
                    title: 'Vocabulary that sticks',
                    body: 'The word lists follow the Goethe levels A1, A2 and B1, plus Aspekte neu for B2, noun-verb collocations and vocabulary for nursing. Every word has a Vietnamese meaning. What you want to keep goes into your notebook and comes back for review at the right time.',
                    points: ['Goethe A1, A2 and B1, Aspekte neu B2', 'Noun-verb collocations and nursing vocabulary', 'Notebook with spaced review (with an account)', 'Games for vocabulary and der, die, das'],
                    link: { href: '/vocab', label: 'Go to vocabulary' },
                },
                {
                    title: 'Driving theory in Vietnamese',
                    body: 'All official questions of the German theory test for 13 licence classes, from B through A and C to D, L and T. Every question has a Vietnamese translation, most also an explanation. Pictures and video questions appear as in the real test.',
                    points: ['Learn by topic and repeat the questions you got wrong', 'Mock test with error points as in the real exam', 'Official sample tests (Musterbögen) for class B', 'Bookmark questions, statistics with an account'],
                    link: { href: '/lai-xe', label: 'Go to driving theory' },
                },
                {
                    title: 'Leben in Deutschland',
                    body: 'The official BAMF question catalogue (as of 7 May 2025): 300 general questions and 10 for each federal state, all translated into Vietnamese. Choose your state and practise exactly the questions that appear in the test.',
                    points: ['Learn by topic: politics, history, society', 'Mock test: 33 questions, 60 minutes, pass with 17 correct', 'Repeat the questions you got wrong', 'Short explanations in Vietnamese for many questions'],
                    link: { href: '/leben-in-deutschland', label: 'Go to Leben in Deutschland' },
                },
            ],
            alts: [
                'The German section with a field for a YouTube link and the lesson library',
                'A lesson with video, current sentence, record button and transcript',
                'The Goethe A1, A2 and B1 word lists',
                'The games word rain, gold digger, word match and der, die, das',
            ],
            galleryTitle: 'Screenshots',
            faq: [
                { q: 'Who is HalloVN for?', a: 'For Vietnamese people who live in Germany or are about to move here, for example to study, train, work or join family. Explanations, meanings and translations are in Vietnamese.' },
                { q: 'How much does HalloVN cost?', a: 'Nothing. The account is free and there are no purchases. Some video lessons are free without signing in; with an account you pick two more yourself. Further lessons are unlocked with diamonds you collect while practising.' },
                { q: 'Do I need an account?', a: 'Not to try it out. With an account your progress is saved, you get your own vocabulary notebook and you see your statistics in every section.' },
                { q: 'What language is the interface in?', a: 'The interface, meanings and translations are in Vietnamese. Videos, transcripts and exam questions are in German, just like in the exam.' },
                { q: 'Which videos can I use?', a: 'The library lessons, or any YouTube video with German subtitles whose link you paste in. The videos remain the property of their creators on YouTube.' },
                { q: 'Is there an app?', a: 'HalloVN works right in the browser, on your phone too. An app for iOS and Android using the same account is in the works.' },
            ],
        },
        vi: {
            intro:
                'HalloVN dành cho người Việt đang sống ở Đức hoặc sắp sang: du học, học nghề, đi làm hay đoàn tụ gia đình. Bạn học tiếng Đức với video thật và bộ từ vựng, ôn thi lý thuyết lái xe và bài thi Leben in Deutschland, tất cả có giải thích bằng tiếng Việt.',
            facts: [
                { value: '11.500+', label: 'từ và cụm từ trong 6 bộ từ vựng' },
                { value: '1.700+', label: 'câu lý thuyết lái xe chính thức cho 13 hạng bằng' },
                { value: '460', label: 'câu Leben in Deutschland, câu nào cũng có dịch' },
                { value: '0 €', label: 'miễn phí, một tài khoản cho tất cả' },
            ],
            sections: [
                {
                    title: 'Tiếng Đức qua video thật',
                    body: 'Thư viện gồm video đời sống ở Đức: thời sự, phóng sự và video học tiếng, mỗi bài ghi rõ trình độ và số câu. Hoặc dán link YouTube để luyện với đúng video bạn thích.',
                    points: ['Lọc bài học theo trình độ', 'Video YouTube nào có phụ đề tiếng Đức cũng thành bài luyện', 'Một số bài học miễn phí, không cần đăng nhập'],
                    link: { href: '/tieng-duc', label: 'Xem bài học' },
                },
                {
                    title: 'Nghe, nói theo, chép chính tả',
                    body: 'Ở chế độ Shadowing, video tự dừng sau mỗi câu. Bạn nói lại, ghi âm và so ngay với câu gốc. Ở chế độ Dictation, bạn gõ lại câu vừa nghe.',
                    points: ['Tự dừng sau mỗi câu, chỉnh được tốc độ và số lần lặp', 'Ghi âm và nghe lại giọng của bạn', 'Dịch tiếng Việt từng câu, ẩn video hoặc ẩn chữ', 'Chạm vào từ để xem nghĩa và lưu vào sổ từ'],
                },
                {
                    title: 'Từ vựng nhớ lâu',
                    body: 'Các bộ từ theo trình độ Goethe A1, A2, B1, thêm Aspekte neu cho B2, Nomen-Verb-Verbindungen và từ vựng điều dưỡng. Từ nào cũng có nghĩa tiếng Việt. Từ muốn nhớ thì lưu vào sổ từ và ôn đúng lúc.',
                    points: ['Goethe A1, A2 và B1, Aspekte neu B2', 'Nomen-Verb-Verbindungen và từ vựng điều dưỡng', 'Sổ từ vựng có lịch ôn (cần tài khoản)', 'Game luyện từ vựng và der, die, das'],
                    link: { href: '/vocab', label: 'Xem từ vựng' },
                },
                {
                    title: 'Lý thuyết lái xe bằng tiếng Việt',
                    body: 'Đủ bộ câu hỏi chính thức của kỳ thi lý thuyết cho 13 hạng bằng, từ B, A, C đến D, L và T. Câu nào cũng có bản dịch tiếng Việt, phần lớn có giải thích. Hình và câu hỏi video hiện như khi thi thật.',
                    points: ['Học theo chủ đề, ôn lại riêng các câu đang sai', 'Thi thử chấm điểm lỗi như thi thật', 'Đề mẫu chính thức (Musterbögen) hạng B', 'Đánh dấu câu hỏi, xem thống kê khi có tài khoản'],
                    link: { href: '/lai-xe', label: 'Ôn lý thuyết lái xe' },
                },
                {
                    title: 'Leben in Deutschland',
                    body: 'Bộ câu hỏi chính thức của BAMF (bản ngày 7/5/2025): 300 câu chung và 10 câu riêng của từng bang, câu nào cũng có dịch tiếng Việt. Chọn bang của bạn để ôn đúng những câu sẽ có trong bài thi.',
                    points: ['Học theo 3 chủ đề: chính trị, lịch sử, xã hội', 'Thi thử 33 câu trong 60 phút, đúng 17 câu là đậu', 'Ôn lại các câu hay sai', 'Nhiều câu có giải thích ngắn bằng tiếng Việt'],
                    link: { href: '/leben-in-deutschland', label: 'Ôn Leben in Deutschland' },
                },
            ],
            alts: [
                'Trang tiếng Đức với ô dán link YouTube và thư viện bài học',
                'Một bài học với video, câu hiện tại, nút ghi âm và transcript',
                'Các bộ từ vựng Goethe A1, A2 và B1',
                'Các game Mưa từ vựng, Đào vàng, Nối từ và Der Die Das',
            ],
            galleryTitle: 'Ảnh chụp màn hình',
            faq: [
                { q: 'HalloVN dành cho ai?', a: 'Cho người Việt đang sống ở Đức hoặc sắp sang, ví dụ để du học, học nghề, đi làm hay đoàn tụ gia đình. Giải thích, nghĩa từ và bản dịch đều bằng tiếng Việt.' },
                { q: 'HalloVN có mất phí không?', a: 'Không. Tài khoản miễn phí và không có mua bán gì. Một số bài video học được mà không cần đăng nhập, có tài khoản thì tự chọn thêm 2 bài. Các bài khác mở bằng kim cương bạn kiếm được khi luyện tập.' },
                { q: 'Có cần tài khoản không?', a: 'Học thử thì không cần. Có tài khoản thì tiến độ được lưu lại, bạn có sổ từ vựng riêng và xem được thống kê ở mọi phần.' },
                { q: 'Giao diện dùng ngôn ngữ gì?', a: 'Giao diện, nghĩa từ và bản dịch bằng tiếng Việt. Video, transcript và câu hỏi thi giữ nguyên tiếng Đức như khi thi thật.' },
                { q: 'Luyện được với những video nào?', a: 'Các bài trong thư viện, hoặc bất kỳ video YouTube có phụ đề tiếng Đức mà bạn dán link vào. Video vẫn thuộc quyền sở hữu của tác giả trên YouTube.' },
                { q: 'Có app cho điện thoại không?', a: 'HalloVN dùng được ngay trên trình duyệt, kể cả trên điện thoại. App cho iOS và Android dùng chung tài khoản đang được phát triển.' },
            ],
        },
    },
};

export const PRODUCT_PAGES: Record<ServiceId, ProductPage> = { shadowing };
