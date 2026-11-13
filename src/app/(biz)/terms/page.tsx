import type { Metadata } from 'next';
import { pageMetadata } from '@/biz/lib/seo';
import Link from 'next/link';
import LegalShell from '@/biz/components/business/LegalShell';
import { COMPANY, SITE } from '@/biz/lib/site';

export const metadata: Metadata = pageMetadata({
    title: 'Nutzungsbedingungen (EULA)',
    description: 'Nutzungsbedingungen und Lizenzvereinbarung für die Apps Führerschein Theorie Ckk und Leben in Deutschland Ckk.',
    path: '/terms',
});

const de = (
    <>
        <h2 id="scope">1. Geltungsbereich</h2>
        <p>
            Diese Nutzungsbedingungen (Endbenutzer-Lizenzvereinbarung, „EULA“) gelten für die Nutzung der Apps{' '}
            <strong>Führerschein Theorie Ckk</strong> und <strong>Leben in Deutschland Ckk</strong> sowie der Website {SITE.domain}, bereitgestellt
            von {COMPANY.legalName} („wir“). Ergänzend gilt die{' '}
            <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener noreferrer">
                Standard-EULA von Apple
            </a>
            . Bei Widersprüchen gehen diese Bedingungen vor, soweit zulässig.
        </p>

        <h2 id="services">2. Leistungsbeschreibung</h2>
        <p>
            Die Apps stellen Lernmaterialien zur Vorbereitung auf die theoretische Fahrerlaubnisprüfung in Deutschland bzw. auf den Test
            „Leben in Deutschland“ / Einbürgerungstest bereit. Sie sind in einer kostenlosen Version (mit Werbung) sowie mit optionalen
            Premium-Funktionen erhältlich.
        </p>

        <h2 id="license">3. Nutzungsrecht</h2>
        <p>
            Wir räumen Ihnen ein einfaches, nicht übertragbares, widerrufliches Recht ein, die Apps auf Apple-Geräten, die Ihnen gehören
            oder die Sie kontrollieren, für persönliche, nicht-kommerzielle Zwecke zu nutzen. Untersagt sind insbesondere das Kopieren,
            Dekompilieren, das automatisierte Auslesen von Inhalten (Scraping) und die Weitergabe von Inhalten an Dritte.
        </p>

        <h2 id="premium">4. Premium-Abonnements</h2>
        <h3>4.1 Optionen</h3>
        <p>Wir bieten automatisch verlängerbare Abonnements an, z. B.:</p>
        <ul>
            <li><strong>Premium 3 Monate</strong></li>
            <li><strong>Premium 6 Monate</strong></li>
            <li><strong>Premium 12 Monate</strong></li>
        </ul>
        <p>Die aktuellen Preise werden vor dem Kauf im App Store in Ihrer Landeswährung angezeigt.</p>
        <h3>4.2 Verlängerung und Abrechnung</h3>
        <ul>
            <li>Die Zahlung wird bei Kaufbestätigung Ihrem Apple-Account belastet.</li>
            <li>Das Abonnement verlängert sich automatisch, sofern es nicht mindestens 24 Stunden vor Ende des Zeitraums gekündigt wird.</li>
            <li>Die Verlängerung wird innerhalb von 24 Stunden vor Ablauf zum jeweils gültigen Preis berechnet.</li>
        </ul>
        <h3>4.3 Kündigung</h3>
        <p>
            Kündigen können Sie jederzeit unter <strong>Einstellungen → [Ihr Name] → Abonnements</strong>. Der Premium-Zugang bleibt bis
            zum Ende des bezahlten Zeitraums bestehen.
        </p>
        <h3>4.4 Testzeitraum</h3>
        <p>Wird ein kostenloser Testzeitraum angeboten, verfällt dessen ungenutzter Teil mit dem Kauf eines Abonnements.</p>
        <p>
            Hinweise zu Erstattungen und zum Widerrufsrecht finden Sie unter <Link href="/refund">Käufe &amp; Erstattung</Link>.
        </p>

        <h2 id="content">5. Inhalte und geistiges Eigentum</h2>
        <p>
            Software, Design, Übersetzungen, Erklärungen und Grafiken sind urheberrechtlich geschützt. Die Prüfungsfragen basieren auf den
            amtlichen Fragenkatalogen der TÜV | DEKRA arge tp 21 (Führerschein) bzw. des Bundesamts für Migration und Flüchtlinge
            (Leben in Deutschland) und werden zur Lernunterstützung bereitgestellt. Wir sind keine Behörde und stehen in keiner Verbindung
            zu den genannten Stellen.
        </p>

        <h2 id="liability">6. Haftung</h2>
        <ul>
            <li>Die Apps dienen ausschließlich Lernzwecken und ersetzen keine Fahrschulausbildung.</li>
            <li>Wir übernehmen keine Garantie für das Bestehen einer Prüfung.</li>
            <li>Wir aktualisieren Inhalte regelmäßig, können jedoch keine Gewähr für Vollständigkeit und Aktualität übernehmen.</li>
            <li>
                Wir haften unbeschränkt bei Vorsatz, grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper oder Gesundheit. Bei
                leichter Fahrlässigkeit haften wir nur bei Verletzung wesentlicher Vertragspflichten, begrenzt auf den vorhersehbaren,
                vertragstypischen Schaden.
            </li>
        </ul>

        <h2 id="availability">7. Verfügbarkeit</h2>
        <p>
            Wir bemühen uns um eine hohe Verfügbarkeit. Vorübergehende Einschränkungen durch Wartung, Updates oder technische Störungen
            sind möglich.
        </p>

        <h2 id="privacy">8. Datenschutz</h2>
        <p>
            Informationen zur Verarbeitung Ihrer Daten finden Sie in unserer <Link href="/privacy">Datenschutzerklärung</Link>.
        </p>

        <h2 id="changes">9. Änderungen</h2>
        <p>
            Wir können diese Bedingungen mit Wirkung für die Zukunft anpassen. Über wesentliche Änderungen informieren wir in der App.
        </p>

        <h2 id="law">10. Anwendbares Recht</h2>
        <p>
            Es gilt das Recht der Bundesrepublik Deutschland. Für Verbraucher gelten zusätzlich die zwingenden Verbraucherschutzvorschriften
            des Staates, in dem sie ihren gewöhnlichen Aufenthalt haben.
        </p>

        <h2 id="contact">11. Kontakt</h2>
        <p>
            {COMPANY.legalName} · <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> · <Link href="/impressum">Impressum</Link>
        </p>
    </>
);

const en = (
    <>
        <h2 id="scope">1. Scope</h2>
        <p>
            These terms of use (End User License Agreement, “EULA”) govern the use of the apps <strong>Führerschein Theorie Ckk</strong> and{' '}
            <strong>Leben in Deutschland Ckk</strong> and the website {SITE.domain}, provided by {COMPANY.legalName} (“we”). Apple’s{' '}
            <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener noreferrer">
                Standard EULA
            </a>{' '}
            applies in addition. In case of conflict, these terms prevail to the extent permitted.
        </p>

        <h2 id="services">2. Description of services</h2>
        <p>
            The apps provide learning materials to prepare for the German driving theory test and the “Leben in Deutschland” /
            citizenship test. They are available as a free version (with ads) and with optional premium features.
        </p>

        <h2 id="license">3. License</h2>
        <p>
            We grant you a non-exclusive, non-transferable, revocable right to use the apps on Apple devices that you own or control for
            personal, non-commercial purposes. In particular, copying, decompiling, automated extraction of content (scraping) and passing
            content on to third parties are prohibited.
        </p>

        <h2 id="premium">4. Premium subscriptions</h2>
        <h3>4.1 Options</h3>
        <p>We offer auto-renewable subscriptions, for example:</p>
        <ul>
            <li><strong>Premium 3 months</strong></li>
            <li><strong>Premium 6 months</strong></li>
            <li><strong>Premium 12 months</strong></li>
        </ul>
        <p>Current prices are shown in your local currency in the App Store before purchase.</p>
        <h3>4.2 Renewal and billing</h3>
        <ul>
            <li>Payment is charged to your Apple Account at confirmation of purchase.</li>
            <li>The subscription renews automatically unless cancelled at least 24 hours before the end of the current period.</li>
            <li>Renewal is charged within 24 hours before the end of the period at the then-current price.</li>
        </ul>
        <h3>4.3 Cancellation</h3>
        <p>
            You can cancel at any time under <strong>Settings → [your name] → Subscriptions</strong>. Premium access remains until the end
            of the paid period.
        </p>
        <h3>4.4 Free trial</h3>
        <p>If a free trial is offered, any unused portion is forfeited when you purchase a subscription.</p>
        <p>
            For refunds and the right of withdrawal, see <Link href="/refund">Purchases &amp; refunds</Link>.
        </p>

        <h2 id="content">5. Content and intellectual property</h2>
        <p>
            Software, design, translations, explanations and graphics are protected by copyright. The exam questions are based on the
            official catalogues of TÜV | DEKRA arge tp 21 (driving licence) and the Federal Office for Migration and Refugees (Leben in
            Deutschland) and are provided as a learning aid. We are not a public authority and are not affiliated with these bodies.
        </p>

        <h2 id="liability">6. Liability</h2>
        <ul>
            <li>The apps are for learning purposes only and do not replace driving school training.</li>
            <li>We do not guarantee that you will pass an exam.</li>
            <li>We update content regularly but cannot guarantee completeness or timeliness.</li>
            <li>
                We are liable without limitation for intent, gross negligence and injury to life, body or health. For slight negligence we
                are liable only for breach of essential contractual obligations, limited to foreseeable, typical damage.
            </li>
        </ul>

        <h2 id="availability">7. Availability</h2>
        <p>We strive for high availability. Temporary restrictions due to maintenance, updates or technical issues may occur.</p>

        <h2 id="privacy">8. Privacy</h2>
        <p>
            Information on how we process your data can be found in our <Link href="/privacy">Privacy policy</Link>.
        </p>

        <h2 id="changes">9. Changes</h2>
        <p>We may amend these terms with effect for the future. We will inform you about material changes in the app.</p>

        <h2 id="law">10. Governing law</h2>
        <p>
            The laws of the Federal Republic of Germany apply. Consumers additionally benefit from the mandatory consumer protection
            provisions of the country in which they habitually reside.
        </p>

        <h2 id="contact">11. Contact</h2>
        <p>
            {COMPANY.legalName} · <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> · <Link href="/impressum">Legal notice</Link>
        </p>
    </>
);

const vi = (
    <>
        <p className="note">Bản tiếng Việt chỉ mang tính tham khảo. Bản tiếng Đức là bản có giá trị pháp lý.</p>

        <h2 id="scope">1. Phạm vi áp dụng</h2>
        <p>
            Điều khoản sử dụng này (Thoả thuận cấp phép người dùng cuối, „EULA“) điều chỉnh việc sử dụng ứng dụng{' '}
            <strong>Führerschein Theorie Ckk</strong> và <strong>Leben in Deutschland Ckk</strong> cũng như trang web {SITE.domain}, do{' '}
            {COMPANY.legalName} („chúng tôi“) cung cấp. Ngoài ra,{' '}
            <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener noreferrer">
                EULA tiêu chuẩn của Apple
            </a>{' '}
            cũng được áp dụng. Khi có mâu thuẫn, điều khoản này được ưu tiên trong phạm vi pháp luật cho phép.
        </p>

        <h2 id="services">2. Mô tả dịch vụ</h2>
        <p>
            Các ứng dụng cung cấp tài liệu học tập để chuẩn bị cho kỳ thi lý thuyết lái xe tại Đức và bài thi „Leben in Deutschland“ / nhập
            quốc tịch. Ứng dụng có phiên bản miễn phí (có quảng cáo) và các tính năng Premium tuỳ chọn.
        </p>

        <h2 id="license">3. Giấy phép</h2>
        <p>
            Chúng tôi cấp cho bạn quyền không độc quyền, không thể chuyển nhượng và có thể thu hồi để sử dụng ứng dụng trên thiết bị Apple mà
            bạn sở hữu hoặc kiểm soát, cho mục đích cá nhân, phi thương mại. Đặc biệt nghiêm cấm sao chép, dịch ngược, trích xuất nội dung tự
            động (scraping) và chuyển nội dung cho bên thứ ba.
        </p>

        <h2 id="premium">4. Gói Premium</h2>
        <h3>4.1 Các lựa chọn</h3>
        <p>Chúng tôi cung cấp các gói đăng ký tự động gia hạn, ví dụ:</p>
        <ul>
            <li><strong>Premium 3 tháng</strong></li>
            <li><strong>Premium 6 tháng</strong></li>
            <li><strong>Premium 12 tháng</strong></li>
        </ul>
        <p>Giá hiện hành được hiển thị bằng đơn vị tiền tệ của bạn trong App Store trước khi mua.</p>
        <h3>4.2 Gia hạn và thanh toán</h3>
        <ul>
            <li>Khoản thanh toán được trừ vào Tài khoản Apple của bạn khi xác nhận mua.</li>
            <li>Gói đăng ký tự động gia hạn, trừ khi được huỷ ít nhất 24 giờ trước khi kỳ hiện tại kết thúc.</li>
            <li>Phí gia hạn được trừ trong vòng 24 giờ trước khi kỳ kết thúc, theo giá hiện hành tại thời điểm đó.</li>
        </ul>
        <h3>4.3 Huỷ gói</h3>
        <p>
            Bạn có thể huỷ bất cứ lúc nào tại <strong>Cài đặt → [Tên của bạn] → Đăng ký</strong>. Quyền Premium vẫn còn đến hết kỳ đã thanh
            toán.
        </p>
        <h3>4.4 Dùng thử miễn phí</h3>
        <p>Nếu có thời gian dùng thử miễn phí, phần chưa dùng sẽ mất khi bạn mua gói đăng ký.</p>
        <p>
            Về hoàn tiền và quyền rút lại hợp đồng, xem <Link href="/refund">Mua hàng &amp; hoàn tiền</Link>.
        </p>

        <h2 id="content">5. Nội dung và sở hữu trí tuệ</h2>
        <p>
            Phần mềm, thiết kế, bản dịch, lời giải thích và hình ảnh được bảo hộ bản quyền. Câu hỏi thi dựa trên bộ câu hỏi chính thức của
            TÜV | DEKRA arge tp 21 (bằng lái xe) và Văn phòng Liên bang về Di trú và Tị nạn – BAMF (Leben in Deutschland), được cung cấp như
            công cụ hỗ trợ học tập. Chúng tôi không phải cơ quan nhà nước và không liên kết với các cơ quan này.
        </p>

        <h2 id="liability">6. Trách nhiệm</h2>
        <ul>
            <li>Ứng dụng chỉ dùng cho mục đích học tập và không thay thế việc học tại trường dạy lái xe.</li>
            <li>Chúng tôi không đảm bảo bạn sẽ thi đỗ.</li>
            <li>Chúng tôi cập nhật nội dung thường xuyên nhưng không thể đảm bảo nội dung luôn đầy đủ và mới nhất.</li>
            <li>
                Chúng tôi chịu trách nhiệm không giới hạn đối với hành vi cố ý, sơ suất nghiêm trọng và thiệt hại về tính mạng, thân thể hoặc
                sức khoẻ. Với sơ suất nhẹ, chúng tôi chỉ chịu trách nhiệm khi vi phạm nghĩa vụ hợp đồng cơ bản, giới hạn ở thiệt hại điển hình
                có thể lường trước.
            </li>
        </ul>

        <h2 id="availability">7. Tính khả dụng</h2>
        <p>Chúng tôi cố gắng đảm bảo dịch vụ luôn hoạt động. Có thể có gián đoạn tạm thời do bảo trì, cập nhật hoặc sự cố kỹ thuật.</p>

        <h2 id="privacy">8. Bảo mật dữ liệu</h2>
        <p>
            Thông tin về cách chúng tôi xử lý dữ liệu của bạn có trong <Link href="/privacy">Chính sách bảo mật</Link>.
        </p>

        <h2 id="changes">9. Thay đổi</h2>
        <p>Chúng tôi có thể sửa đổi điều khoản này với hiệu lực cho tương lai. Chúng tôi sẽ thông báo các thay đổi quan trọng trong ứng dụng.</p>

        <h2 id="law">10. Luật áp dụng</h2>
        <p>
            Áp dụng pháp luật của Cộng hoà Liên bang Đức. Người tiêu dùng đồng thời được hưởng các quy định bảo vệ người tiêu dùng bắt buộc
            của quốc gia nơi họ thường trú.
        </p>

        <h2 id="contact">11. Liên hệ</h2>
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
                de: 'Endbenutzer-Lizenzvereinbarung (EULA) für unsere Apps und die Website hallovn.de.',
                en: 'End User License Agreement (EULA) for our apps and the hallovn.de website.',
                vi: 'Thoả thuận cấp phép người dùng cuối (EULA) cho các ứng dụng và trang web hallovn.de.',
            }}
            content={{ de, en, vi }}
        />
    );
}
