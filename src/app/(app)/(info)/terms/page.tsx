import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/company/seo';
import Link from 'next/link';
import LegalShell from '@/components/company/LegalShell';
import { COMPANY, SITE } from '@/lib/company/site';

export const metadata: Metadata = pageMetadata({
    title: 'Nutzungsbedingungen',
    description:
        'Nutzungsbedingungen für die Website hallovn.de: kostenlose Lernangebote für Deutsch, Wortschatz, Führerschein-Theorie, Leben in Deutschland und Lernspiele.',
    path: '/terms',
});

const de = (
    <>
        <h2 id="scope">1. Geltungsbereich</h2>
        <p>
            Diese Nutzungsbedingungen gelten für die Nutzung der Website {SITE.domain} einschließlich aller dort angebotenen Lernbereiche
            und Funktionen (zusammen „Dienst“), bereitgestellt von {COMPANY.legalName} („wir“). Mit der Nutzung des Dienstes erklären Sie
            sich mit diesen Bedingungen einverstanden.
        </p>

        <h2 id="services">2. Leistungsbeschreibung</h2>
        <p>
            {SITE.name} stellt Lernmaterialien und Übungen bereit, insbesondere zum Deutschlernen (Lektionen, Hör- und Sprechübungen,
            Wortschatz), zur Vorbereitung auf die theoretische Fahrerlaubnisprüfung in Deutschland, zum Test „Leben in Deutschland“ /
            Einbürgerungstest sowie Lernspiele. Die Nutzung ist kostenlos. Ein Anspruch auf bestimmte Inhalte oder Funktionen besteht nicht;
            wir können das Angebot jederzeit ändern, erweitern oder einschränken.
        </p>
        <p>
            Punkte, Diamanten, Ranglisten und ähnliche Spielelemente dienen allein der Motivation. Sie haben keinen Geldwert, können nicht
            gekauft, verkauft oder ausgezahlt werden und begründen keinen Anspruch.
        </p>

        <h2 id="account">3. Nutzerkonto</h2>
        <ul>
            <li>
                Einige Funktionen (z. B. Lernfortschritt, Wortschatzheft, Ranglisten) erfordern ein kostenloses Nutzerkonto. Die
                Registrierung erfolgt per E-Mail und Passwort oder über einen Google- bzw. Apple-Login.
            </li>
            <li>Ihre Angaben müssen zutreffend sein. Profilname und Profilbild dürfen keine Rechte Dritter verletzen und nicht anstößig sein.</li>
            <li>
                Halten Sie Ihre Zugangsdaten geheim. Für Handlungen, die über Ihr Konto erfolgen, sind Sie verantwortlich, soweit Sie diese zu
                vertreten haben. Bei Verdacht auf Missbrauch informieren Sie uns bitte umgehend.
            </li>
            <li>
                Sie können Ihr Konto jederzeit unter <Link href="/settings">Einstellungen</Link> löschen. Dabei werden das Konto und die
                zugehörigen Lerndaten dauerhaft entfernt.
            </li>
            <li>
                Wir können Konten sperren oder löschen, wenn gegen diese Bedingungen verstoßen wird; berechtigte Interessen der Nutzer
                berücksichtigen wir dabei.
            </li>
        </ul>

        <h2 id="license">4. Nutzungsrecht und Verhaltensregeln</h2>
        <p>
            Wir räumen Ihnen ein einfaches, nicht übertragbares, widerrufliches Recht ein, den Dienst für persönliche, nicht-kommerzielle
            Lernzwecke zu nutzen. Untersagt sind insbesondere das Kopieren und Weiterverbreiten von Inhalten, das automatisierte Auslesen
            (Scraping), das Umgehen technischer Schutzmaßnahmen, das Manipulieren von Punkten oder Ranglisten sowie jede Nutzung, die den
            Betrieb des Dienstes beeinträchtigt.
        </p>

        <h2 id="content">5. Inhalte und geistiges Eigentum</h2>
        <p>
            Software, Design, Texte, Übersetzungen, Erklärungen, Audio- und Videoinhalte sowie Grafiken sind urheberrechtlich geschützt.
            Die Prüfungsfragen basieren auf den amtlichen Fragenkatalogen der TÜV | DEKRA arge tp 21 (Führerschein) bzw. des Bundesamts für
            Migration und Flüchtlinge (Leben in Deutschland) und werden zur Lernunterstützung bereitgestellt. Wir sind keine Behörde und
            stehen in keiner Verbindung zu den genannten Stellen. Für Inhalte verlinkter Websites Dritter sind ausschließlich deren
            Betreiber verantwortlich.
        </p>

        <h2 id="ads">6. Werbung</h2>
        <p>
            Der Dienst wird durch Werbung finanziert. Dafür nutzen wir Google AdSense. Einzelheiten, auch zu Cookies und Ihren
            Einwilligungsmöglichkeiten, finden Sie in der <Link href="/privacy">Datenschutzerklärung</Link>.
        </p>

        <h2 id="liability">7. Haftung</h2>
        <ul>
            <li>Der Dienst dient ausschließlich Lernzwecken und ersetzt weder eine Fahrschulausbildung noch einen Sprach- oder Integrationskurs.</li>
            <li>Wir übernehmen keine Garantie für das Bestehen einer Prüfung.</li>
            <li>Wir aktualisieren Inhalte regelmäßig, können jedoch keine Gewähr für Vollständigkeit, Richtigkeit und Aktualität übernehmen.</li>
            <li>
                Wir haften unbeschränkt bei Vorsatz, grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper oder Gesundheit. Bei
                leichter Fahrlässigkeit haften wir nur bei Verletzung wesentlicher Vertragspflichten, begrenzt auf den vorhersehbaren,
                vertragstypischen Schaden. Die Haftung nach dem Produkthaftungsgesetz bleibt unberührt.
            </li>
        </ul>

        <h2 id="availability">8. Verfügbarkeit</h2>
        <p>
            Wir bemühen uns um eine hohe Verfügbarkeit, schulden diese aber nicht. Vorübergehende Einschränkungen durch Wartung, Updates
            oder technische Störungen sind möglich. Ein Verlust von Lernfortschritten ist nicht vollständig auszuschließen.
        </p>

        <h2 id="privacy">9. Datenschutz</h2>
        <p>
            Informationen zur Verarbeitung Ihrer Daten finden Sie in unserer <Link href="/privacy">Datenschutzerklärung</Link>.
        </p>

        <h2 id="changes">10. Änderungen</h2>
        <p>
            Wir können diese Bedingungen mit Wirkung für die Zukunft anpassen. Über wesentliche Änderungen informieren wir auf der Website
            oder per E-Mail an registrierte Nutzer.
        </p>

        <h2 id="law">11. Anwendbares Recht</h2>
        <p>
            Es gilt das Recht der Bundesrepublik Deutschland. Für Verbraucher gelten zusätzlich die zwingenden Verbraucherschutzvorschriften
            des Staates, in dem sie ihren gewöhnlichen Aufenthalt haben.
        </p>

        <h2 id="contact">12. Kontakt</h2>
        <p>
            {COMPANY.legalName} · <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> · <Link href="/impressum">Impressum</Link>
        </p>
    </>
);

const en = (
    <>
        <h2 id="scope">1. Scope</h2>
        <p>
            These terms of use govern the use of the website {SITE.domain}, including all learning sections and features offered there
            (together the “service”), provided by {COMPANY.legalName} (“we”). By using the service you agree to these terms.
        </p>

        <h2 id="services">2. Description of services</h2>
        <p>
            {SITE.name} provides learning materials and exercises, in particular for learning German (lessons, listening and speaking
            practice, vocabulary), for preparing for the German driving theory test and the “Leben in Deutschland” / citizenship test, as
            well as learning games. Use is free of charge. There is no entitlement to specific content or features; we may change, extend or
            restrict the service at any time.
        </p>
        <p>
            Points, diamonds, leaderboards and similar game elements are for motivation only. They have no monetary value, cannot be bought,
            sold or paid out, and do not give rise to any claim.
        </p>

        <h2 id="account">3. User account</h2>
        <ul>
            <li>
                Some features (e.g. learning progress, vocabulary notebook, leaderboards) require a free user account. You can register with
                email and password or via Google or Apple sign-in.
            </li>
            <li>Your details must be accurate. Display name and profile picture must not infringe third-party rights or be offensive.</li>
            <li>
                Keep your login credentials secret. You are responsible for actions taken through your account to the extent you are at fault.
                Please notify us immediately if you suspect misuse.
            </li>
            <li>
                You can delete your account at any time under <Link href="/settings">Settings</Link>. This permanently removes the account and
                the associated learning data.
            </li>
            <li>
                We may suspend or delete accounts that violate these terms, taking the legitimate interests of users into account.
            </li>
        </ul>

        <h2 id="license">4. Right of use and rules of conduct</h2>
        <p>
            We grant you a non-exclusive, non-transferable, revocable right to use the service for personal, non-commercial learning
            purposes. In particular, copying and redistributing content, automated extraction (scraping), circumventing technical protection
            measures, manipulating points or leaderboards, and any use that impairs the operation of the service are prohibited.
        </p>

        <h2 id="content">5. Content and intellectual property</h2>
        <p>
            Software, design, texts, translations, explanations, audio and video content and graphics are protected by copyright. The exam
            questions are based on the official catalogues of TÜV | DEKRA arge tp 21 (driving licence) and the Federal Office for Migration
            and Refugees (Leben in Deutschland) and are provided as a learning aid. We are not a public authority and are not affiliated with
            these bodies. The operators of linked third-party websites are solely responsible for their content.
        </p>

        <h2 id="ads">6. Advertising</h2>
        <p>
            The service is financed by advertising, for which we use Google AdSense. Details, including on cookies and your consent options,
            can be found in our <Link href="/privacy">Privacy policy</Link>.
        </p>

        <h2 id="liability">7. Liability</h2>
        <ul>
            <li>The service is for learning purposes only and does not replace driving school training or a language or integration course.</li>
            <li>We do not guarantee that you will pass an exam.</li>
            <li>We update content regularly but cannot guarantee completeness, accuracy or timeliness.</li>
            <li>
                We are liable without limitation for intent, gross negligence and injury to life, body or health. For slight negligence we
                are liable only for breach of essential contractual obligations, limited to foreseeable, typical damage. Liability under the
                German Product Liability Act remains unaffected.
            </li>
        </ul>

        <h2 id="availability">8. Availability</h2>
        <p>
            We strive for high availability but do not guarantee it. Temporary restrictions due to maintenance, updates or technical issues
            may occur. Loss of learning progress cannot be entirely ruled out.
        </p>

        <h2 id="privacy">9. Privacy</h2>
        <p>
            Information on how we process your data can be found in our <Link href="/privacy">Privacy policy</Link>.
        </p>

        <h2 id="changes">10. Changes</h2>
        <p>
            We may amend these terms with effect for the future. We will inform you about material changes on the website or by email to
            registered users.
        </p>

        <h2 id="law">11. Governing law</h2>
        <p>
            The laws of the Federal Republic of Germany apply. Consumers additionally benefit from the mandatory consumer protection
            provisions of the country in which they habitually reside.
        </p>

        <h2 id="contact">12. Contact</h2>
        <p>
            {COMPANY.legalName} · <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> · <Link href="/impressum">Legal notice</Link>
        </p>
    </>
);

const vi = (
    <>
        <p className="legal-note">Bản tiếng Việt chỉ mang tính tham khảo. Bản tiếng Đức là bản có giá trị pháp lý.</p>

        <h2 id="scope">1. Phạm vi áp dụng</h2>
        <p>
            Điều khoản sử dụng này điều chỉnh việc sử dụng trang web {SITE.domain}, bao gồm mọi phần học và tính năng trên đó (gọi chung là
            „dịch vụ“), do {COMPANY.legalName} („chúng tôi“) cung cấp. Khi sử dụng dịch vụ, bạn đồng ý với các điều khoản này.
        </p>

        <h2 id="services">2. Mô tả dịch vụ</h2>
        <p>
            {SITE.name} cung cấp tài liệu học và bài luyện tập, đặc biệt để học tiếng Đức (bài học, luyện nghe và nói, từ vựng), ôn thi lý
            thuyết lái xe tại Đức, ôn bài thi „Leben in Deutschland“ / nhập quốc tịch, cùng các trò chơi học tập. Dịch vụ miễn phí. Bạn không
            có quyền yêu cầu một nội dung hay tính năng cụ thể; chúng tôi có thể thay đổi, mở rộng hoặc thu hẹp dịch vụ bất cứ lúc nào.
        </p>
        <p>
            Điểm, kim cương, bảng xếp hạng và các yếu tố trò chơi tương tự chỉ nhằm tạo động lực. Chúng không có giá trị tiền tệ, không thể
            mua, bán hay quy đổi thành tiền và không làm phát sinh bất kỳ quyền yêu cầu nào.
        </p>

        <h2 id="account">3. Tài khoản người dùng</h2>
        <ul>
            <li>
                Một số tính năng (ví dụ tiến độ học, sổ từ vựng, bảng xếp hạng) cần tài khoản miễn phí. Bạn có thể đăng ký bằng email và mật
                khẩu hoặc đăng nhập bằng Google / Apple.
            </li>
            <li>Thông tin bạn cung cấp phải chính xác. Tên hiển thị và ảnh đại diện không được xâm phạm quyền của người khác hoặc phản cảm.</li>
            <li>
                Hãy giữ bí mật thông tin đăng nhập. Bạn chịu trách nhiệm về các hành động thực hiện qua tài khoản của mình trong phạm vi lỗi
                thuộc về bạn. Nếu nghi ngờ bị lạm dụng, vui lòng báo ngay cho chúng tôi.
            </li>
            <li>
                Bạn có thể xoá tài khoản bất cứ lúc nào trong <Link href="/settings">Cài đặt</Link>. Khi đó tài khoản và dữ liệu học tập liên
                quan sẽ bị xoá vĩnh viễn.
            </li>
            <li>
                Chúng tôi có thể khoá hoặc xoá tài khoản vi phạm điều khoản này, có cân nhắc lợi ích chính đáng của người dùng.
            </li>
        </ul>

        <h2 id="license">4. Quyền sử dụng và quy tắc ứng xử</h2>
        <p>
            Chúng tôi cấp cho bạn quyền không độc quyền, không thể chuyển nhượng và có thể thu hồi để sử dụng dịch vụ cho mục đích học tập cá
            nhân, phi thương mại. Đặc biệt nghiêm cấm sao chép và phát tán nội dung, trích xuất tự động (scraping), vượt qua các biện pháp bảo
            vệ kỹ thuật, gian lận điểm hoặc bảng xếp hạng, cũng như mọi hành vi gây ảnh hưởng đến hoạt động của dịch vụ.
        </p>

        <h2 id="content">5. Nội dung và sở hữu trí tuệ</h2>
        <p>
            Phần mềm, thiết kế, văn bản, bản dịch, lời giải thích, nội dung âm thanh, video và hình ảnh được bảo hộ bản quyền. Câu hỏi thi dựa
            trên bộ câu hỏi chính thức của TÜV | DEKRA arge tp 21 (bằng lái xe) và Văn phòng Liên bang về Di trú và Tị nạn – BAMF (Leben in
            Deutschland), được cung cấp như công cụ hỗ trợ học tập. Chúng tôi không phải cơ quan nhà nước và không liên kết với các cơ quan
            này. Nội dung của các trang web bên thứ ba được liên kết thuộc trách nhiệm của chính chủ trang đó.
        </p>

        <h2 id="ads">6. Quảng cáo</h2>
        <p>
            Dịch vụ được duy trì nhờ quảng cáo qua Google AdSense. Chi tiết, kể cả về cookie và các lựa chọn đồng ý của bạn, có trong{' '}
            <Link href="/privacy">Chính sách bảo mật</Link>.
        </p>

        <h2 id="liability">7. Trách nhiệm</h2>
        <ul>
            <li>Dịch vụ chỉ dùng cho mục đích học tập, không thay thế việc học tại trường dạy lái xe hay khoá học tiếng / hội nhập.</li>
            <li>Chúng tôi không đảm bảo bạn sẽ thi đỗ.</li>
            <li>Chúng tôi cập nhật nội dung thường xuyên nhưng không thể đảm bảo nội dung luôn đầy đủ, chính xác và mới nhất.</li>
            <li>
                Chúng tôi chịu trách nhiệm không giới hạn đối với hành vi cố ý, sơ suất nghiêm trọng và thiệt hại về tính mạng, thân thể hoặc
                sức khoẻ. Với sơ suất nhẹ, chúng tôi chỉ chịu trách nhiệm khi vi phạm nghĩa vụ hợp đồng cơ bản, giới hạn ở thiệt hại điển hình
                có thể lường trước. Trách nhiệm theo Luật trách nhiệm sản phẩm của Đức không bị ảnh hưởng.
            </li>
        </ul>

        <h2 id="availability">8. Tính khả dụng</h2>
        <p>
            Chúng tôi cố gắng để dịch vụ luôn hoạt động nhưng không cam kết điều đó. Có thể có gián đoạn tạm thời do bảo trì, cập nhật hoặc sự
            cố kỹ thuật. Không thể loại trừ hoàn toàn khả năng mất tiến độ học.
        </p>

        <h2 id="privacy">9. Bảo mật dữ liệu</h2>
        <p>
            Thông tin về cách chúng tôi xử lý dữ liệu của bạn có trong <Link href="/privacy">Chính sách bảo mật</Link>.
        </p>

        <h2 id="changes">10. Thay đổi</h2>
        <p>
            Chúng tôi có thể sửa đổi điều khoản này với hiệu lực cho tương lai. Các thay đổi quan trọng sẽ được thông báo trên trang web hoặc
            qua email tới người dùng đã đăng ký.
        </p>

        <h2 id="law">11. Luật áp dụng</h2>
        <p>
            Áp dụng pháp luật của Cộng hoà Liên bang Đức. Người tiêu dùng đồng thời được hưởng các quy định bảo vệ người tiêu dùng bắt buộc
            của quốc gia nơi họ thường trú.
        </p>

        <h2 id="contact">12. Liên hệ</h2>
        <p>
            {COMPANY.legalName} · <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> · <Link href="/impressum">Thông tin pháp lý</Link>
        </p>
    </>
);

export default function TermsPage() {
    return (
        <LegalShell
            title={{ de: 'Nutzungsbedingungen', en: 'Terms of use', vi: 'Điều khoản sử dụng' }}
            intro={{
                de: 'Nutzungsbedingungen für die Website hallovn.de und ihre kostenlosen Lernangebote.',
                en: 'Terms of use for the hallovn.de website and its free learning services.',
                vi: 'Điều khoản sử dụng trang web hallovn.de và các nội dung học miễn phí trên đó.',
            }}
            content={{ de, en, vi }}
        />
    );
}
