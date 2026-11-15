// Nội dung trang riêng của từng sản phẩm (/shadowing).
// Ảnh chụp nằm ở public/apps/<id>/ (ảnh chụp trang học HalloVN).
// Mọi con số ở đây phải khớp với app thật (mô tả App Store, ảnh chụp); không tự đặt ra.
import type { Locale } from '@/components/company/LocaleContext';
import type { ServiceId } from '@/lib/company/services';

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

const web = (name: string): Screen => ({ src: `/apps/shadowing/${name}.webp`, width: 1600, height: 798 });

const shadowing: ProductPage = {
    id: 'shadowing',
    shape: 'landscape',
    screens: [web('home'), web('lesson'), web('vocab'), web('games')],
    hero: [1],
    sections: [[0], [1], [2], [3]],
    seo: {
        title: 'HalloVN – Deutsch lernen mit echten Videos',
        description: 'Deutsch hören und nachsprechen, Satz für Satz, mit echten Videos von A1 bis C2, eigenen YouTube-Videos, Goethe-Wortlisten und Lernspielen. Auf hallovn.de.',
    },
    copy: {
        de: {
            intro: 'Shadowing heißt: hören, sofort nachsprechen, vergleichen. HalloVN macht das mit echten deutschen Videos, Satz für Satz, und ergänzt es um Wortlisten und Lernspiele.',
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
                'Startseite von HalloVN mit Feld für einen YouTube-Link und der Bibliothek der Lektionen',
                'Eine Lektion mit Video, aktuellem Satz, Aufnahme-Knopf und Transkript',
                'Die Wortlisten Goethe A1, A2 und B1',
                'Die Lernspiele Wortregen, Goldgräber und Wortpaare',
            ],
            galleryTitle: 'Alle Screenshots',
            faq: [
                { q: 'In welcher Sprache ist die Oberfläche?', a: 'Die Oberfläche von HalloVN und die Bedeutungen in Wortlisten und Spielen sind derzeit auf Vietnamesisch. Die Videos, Transkripte und Übungen sind auf Deutsch.' },
                { q: 'Brauche ich ein Konto?', a: 'Nein. Die freien Lektionen und eigene YouTube-Videos funktionieren ohne Anmeldung. Mit Konto wählst du zwei weitere Lektionen und speicherst Wörter im Vokabelheft.' },
                { q: 'Welche Videos kann ich nutzen?', a: 'Die Lektionen der Bibliothek oder jedes YouTube-Video mit Untertiteln, dessen Link du einfügst. Die Videos bleiben Eigentum ihrer Urheber auf YouTube.' },
                { q: 'Wo finde ich HalloVN?', a: 'Direkt hier auf hallovn.de. Mit einem Konto lernst du Deutsch, übst die Führerschein-Theorie und Leben in Deutschland.' },
            ],
        },
        en: {
            intro: 'Shadowing means: listen, repeat straight away, compare. HalloVN does this with real German videos, sentence by sentence, and adds word lists and learning games.',
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
                'HalloVN home page with a field for a YouTube link and the lesson library',
                'A lesson with video, current sentence, record button and transcript',
                'The Goethe A1, A2 and B1 word lists',
                'The games word rain, gold digger and word match',
            ],
            galleryTitle: 'All screenshots',
            faq: [
                { q: 'What language is the interface in?', a: 'The HalloVN interface and the meanings in word lists and games are currently in Vietnamese. Videos, transcripts and exercises are in German.' },
                { q: 'Do I need an account?', a: 'No. Free lessons and your own YouTube videos work without signing in. With an account you pick two more lessons and save words to your notebook.' },
                { q: 'Which videos can I use?', a: 'The library lessons, or any YouTube video with subtitles whose link you paste in. The videos remain the property of their creators on YouTube.' },
                { q: 'Where do I find HalloVN?', a: 'Right here on hallovn.de. With one account you can learn German and practise the driving theory test and Leben in Deutschland.' },
            ],
        },
        vi: {
            intro: 'Shadowing là nghe, nói lại ngay, rồi so sánh. HalloVN làm việc đó với video tiếng Đức thật, từng câu một, kèm bộ từ vựng và game học tập.',
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
                'Trang chủ HalloVN với ô dán link YouTube và thư viện bài học',
                'Một bài học với video, câu hiện tại, nút ghi âm và transcript',
                'Các bộ từ vựng Goethe A1, A2 và B1',
                'Các game Mưa từ vựng, Đào vàng và Nối từ',
            ],
            galleryTitle: 'Tất cả ảnh chụp màn hình',
            faq: [
                { q: 'Giao diện dùng ngôn ngữ gì?', a: 'Giao diện HalloVN và phần nghĩa trong bộ từ, game hiện bằng tiếng Việt. Video, transcript và bài luyện là tiếng Đức.' },
                { q: 'Có cần tài khoản không?', a: 'Không. Bài học miễn phí và video YouTube tự dán đều dùng được mà không cần đăng nhập. Có tài khoản thì chọn thêm 2 bài và lưu từ vào sổ từ vựng.' },
                { q: 'Luyện được với những video nào?', a: 'Các bài trong thư viện, hoặc bất kỳ video YouTube có phụ đề mà bạn dán link vào. Video vẫn thuộc quyền sở hữu của tác giả trên YouTube.' },
                { q: 'Học HalloVN ở đâu?', a: 'Ngay trên hallovn.de. Một tài khoản để học tiếng Đức, ôn lý thuyết lái xe và Leben in Deutschland.' },
            ],
        },
    },
};

export const PRODUCT_PAGES: Record<ServiceId, ProductPage> = { shadowing };
