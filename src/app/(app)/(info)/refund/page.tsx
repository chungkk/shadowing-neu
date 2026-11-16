import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/company/seo';
import Link from 'next/link';
import LegalShell from '@/components/company/LegalShell';
import { COMPANY, SITE } from '@/lib/company/site';
import { workCalendar } from '@/lib/company/legal/local-apps';

export const metadata: Metadata = pageMetadata({
    title: 'Käufe & Erstattung',
    description: `${SITE.name} ist kostenlos. Hier: In-App-Kauf „Werbung entfernen“ in ${workCalendar.name} über Apple – Wiederherstellen, Erstattung und Kontakt.`,
    path: '/refund',
});

const APP = workCalendar.name;
const APP_SUPPORT = `/${workCalendar.slug}/support`;
const REPORT_PROBLEM = 'https://reportaproblem.apple.com';
const APPLE_REFUND_HELP_DE = 'https://support.apple.com/de-de/118223';
const APPLE_REFUND_HELP_EN = 'https://support.apple.com/en-us/118223';
const APPLE_TERMS_DE = 'https://www.apple.com/legal/internet-services/itunes/de/terms.html';
const APPLE_TERMS_EN = 'https://www.apple.com/legal/internet-services/itunes/';

function Ext({ href, children }: { href: string; children: ReactNode }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
        </a>
    );
}

const Mail = () => <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>;

const de = (
    <>
        <h2 id="free">1. HalloVN ist kostenlos</h2>
        <p>
            Die Website {SITE.domain} und die App {SITE.name} sind kostenlos: Deutsch lernen, Wortschatz, Führerscheintheorie, Leben in
            Deutschland und Spiele. Es gibt dort keine kostenpflichtigen Käufe und keine Abonnements; die Website finanziert sich durch
            Werbung. Diamanten und andere Punkte in HalloVN sammeln Sie nur durch Lernen, sie können nicht mit Geld gekauft werden.
        </p>

        <h2 id="scope">2. Wofür diese Seite gilt</h2>
        <p>
            Kostenpflichtig ist derzeit nur ein einziger In-App-Kauf in der iOS-App <strong>{APP}</strong>: <strong>Premium
            („Werbung entfernen“)</strong>. Es handelt sich um einen <strong>einmaligen Kauf, kein Abonnement</strong>; es fallen keine
            wiederkehrenden Kosten an und es muss nichts gekündigt werden. Die App „Deutsche Redewendungen“ enthält keine Käufe.
        </p>

        <h2 id="how">3. Wie der Kauf abgewickelt wird</h2>
        <p>
            Der Kauf wird ausschließlich über den <strong>Apple App Store</strong> abgewickelt. Apple ist Verkäufer und Zahlungsabwickler;
            wir erhalten keine Zahlungsdaten. Den Preis sehen Sie vor dem Kauf in der App und im App Store in Ihrer Landeswährung.
        </p>

        <h2 id="restore">4. Kauf wiederherstellen</h2>
        <p>Nach einer Neuinstallation oder auf einem neuen Gerät schalten Sie Premium ohne erneute Zahlung wieder frei:</p>
        <ol>
            <li>Melden Sie sich mit derselben Apple-ID an, mit der Sie gekauft haben.</li>
            <li>Öffnen Sie {APP} und gehen Sie zum Tab <strong>„Mehr“</strong>.</li>
            <li>Tippen Sie auf <strong>„Käufe wiederherstellen“</strong>.</li>
        </ol>

        <h2 id="refund">5. Erstattung</h2>
        <p>Da Apple die Zahlung abwickelt, können wir Erstattungen nicht selbst vornehmen. Den Antrag stellen Sie direkt bei Apple:</p>
        <ol>
            <li>
                Öffnen Sie <Ext href={REPORT_PROBLEM}>reportaproblem.apple.com</Ext> und melden Sie sich mit Ihrer Apple-ID an.
            </li>
            <li>Wählen Sie „Erstattung anfordern“ und den betreffenden Kauf.</li>
            <li>Geben Sie einen Grund an und senden Sie den Antrag ab.</li>
        </ol>
        <p>
            Über den Antrag entscheidet Apple. Mehr dazu in der <Ext href={APPLE_REFUND_HELP_DE}>Hilfe von Apple</Ext>. Nach einer
            Erstattung wird Premium in der App wieder deaktiviert.
        </p>

        <h2 id="withdrawal">6. Widerrufsrecht für Verbraucher</h2>
        <p>
            Verbrauchern in der EU steht beim Kauf digitaler Inhalte grundsätzlich ein 14-tägiges Widerrufsrecht zu, das gegenüber Apple als
            Verkäufer ausgeübt wird. Es kann vorzeitig erlöschen, wenn Sie ausdrücklich zugestimmt haben, dass die Ausführung vor Ablauf der
            Widerrufsfrist beginnt, und Ihre Kenntnis vom Verlust des Widerrufsrechts bestätigt haben. Einzelheiten regeln die{' '}
            <Ext href={APPLE_TERMS_DE}>Mediendienste-Bedingungen von Apple</Ext>.
        </p>

        <h2 id="help">7. Hilfe und Kontakt</h2>
        <p>
            Premium wird trotz Kauf nicht freigeschaltet oder die Werbung erscheint weiterhin? Versuchen Sie zuerst „Käufe wiederherstellen“.
            Hilft das nicht, schreiben Sie uns an <Mail /> mit dem Namen der App und – falls vorhanden – der Bestellnummer aus Ihrer
            Apple-Kaufbestätigung. Weitere Antworten im <Link href={APP_SUPPORT}>Support von {APP}</Link> und im{' '}
            <Link href="/support">Support-Center</Link>.
        </p>
    </>
);

const en = (
    <>
        <p className="legal-note">The English version is for information only. The German version is legally binding.</p>

        <h2 id="free">1. HalloVN is free</h2>
        <p>
            The website {SITE.domain} and the {SITE.name} app are free: German lessons, vocabulary, driving theory, Leben in Deutschland and
            games. There are no paid purchases and no subscriptions; the website is funded by ads. Diamonds and other points in HalloVN are
            earned only by learning and cannot be bought with money.
        </p>

        <h2 id="scope">2. What this page covers</h2>
        <p>
            The only paid item at the moment is one in-app purchase in the iOS app <strong>{APP}</strong>: <strong>Premium (“Remove
            Ads”)</strong>. It is a <strong>one-time purchase, not a subscription</strong>; there are no recurring charges and nothing to
            cancel. The “Deutsche Redewendungen” app has no purchases.
        </p>

        <h2 id="how">3. How the purchase is processed</h2>
        <p>
            The purchase is processed exclusively by the <strong>Apple App Store</strong>. Apple is the seller and payment processor; we do
            not receive any payment details. The price is shown in your local currency in the app and in the App Store before you buy.
        </p>

        <h2 id="restore">4. Restore your purchase</h2>
        <p>After reinstalling or on a new device you can unlock Premium again without paying twice:</p>
        <ol>
            <li>Sign in with the same Apple ID you used for the purchase.</li>
            <li>Open {APP} and go to the <strong>“More”</strong> tab.</li>
            <li>Tap <strong>“Restore Purchases”</strong>.</li>
        </ol>

        <h2 id="refund">5. Refunds</h2>
        <p>Because Apple processes the payment, we cannot issue refunds ourselves. Please request a refund directly from Apple:</p>
        <ol>
            <li>
                Go to <Ext href={REPORT_PROBLEM}>reportaproblem.apple.com</Ext> and sign in with your Apple ID.
            </li>
            <li>Choose “Request a refund” and select the purchase.</li>
            <li>Provide a reason and submit the request.</li>
        </ol>
        <p>
            Apple decides on the request. See <Ext href={APPLE_REFUND_HELP_EN}>Apple Support</Ext> for details. After a refund, Premium is
            deactivated in the app again.
        </p>

        <h2 id="withdrawal">6. Right of withdrawal for consumers</h2>
        <p>
            Consumers in the EU generally have a 14-day right of withdrawal for digital content, exercised against Apple as the seller. This
            right may expire early if you expressly agreed that performance begins before the withdrawal period ends and acknowledged that
            you thereby lose the right. Details are set out in <Ext href={APPLE_TERMS_EN}>Apple’s Media Services Terms</Ext>.
        </p>

        <h2 id="help">7. Help and contact</h2>
        <p>
            Premium not unlocked after purchase, or ads still showing? Try “Restore Purchases” first. If that does not help, email us at{' '}
            <Mail /> with the app name and, if available, the order ID from your Apple receipt. More answers in the{' '}
            <Link href={APP_SUPPORT}>{APP} support</Link> and the <Link href="/support">Support center</Link>.
        </p>
    </>
);

const vi = (
    <>
        <p className="legal-note">Bản tiếng Việt chỉ mang tính tham khảo. Bản tiếng Đức là bản có giá trị pháp lý.</p>

        <h2 id="free">1. HalloVN miễn phí</h2>
        <p>
            Website {SITE.domain} và app {SITE.name} hoàn toàn miễn phí: học tiếng Đức, từ vựng, lý thuyết lái xe, Leben in Deutschland và
            game. Ở đó không có giao dịch trả tiền và không có gói đăng ký; website được duy trì nhờ quảng cáo. Kim cương và các loại điểm
            khác trong HalloVN chỉ kiếm được bằng cách học, không mua được bằng tiền.
        </p>

        <h2 id="scope">2. Trang này áp dụng cho gì</h2>
        <p>
            Hiện chỉ có một giao dịch trả tiền duy nhất, trong app iOS <strong>{APP}</strong>: <strong>Premium („Xoá quảng
            cáo“)</strong>. Đây là <strong>giao dịch mua một lần, không phải gói đăng ký</strong>; không bị trừ tiền định kỳ và không cần
            huỷ. App „Deutsche Redewendungen“ không có giao dịch mua nào.
        </p>

        <h2 id="how">3. Cách thức mua hàng</h2>
        <p>
            Giao dịch được xử lý hoàn toàn qua <strong>Apple App Store</strong>. Apple là bên bán và bên xử lý thanh toán; chúng tôi không
            nhận thông tin thanh toán nào. Giá được hiển thị bằng đơn vị tiền tệ của bạn trong app và trên App Store trước khi mua.
        </p>

        <h2 id="restore">4. Khôi phục giao dịch</h2>
        <p>Khi cài lại app hoặc đổi thiết bị, bạn mở lại Premium mà không phải trả tiền lần nữa:</p>
        <ol>
            <li>Đăng nhập bằng đúng Apple ID đã dùng để mua.</li>
            <li>Mở {APP} và vào tab <strong>„Thêm“</strong>.</li>
            <li>Chạm <strong>„Khôi phục giao dịch“</strong>.</li>
        </ol>

        <h2 id="refund">5. Hoàn tiền</h2>
        <p>Vì Apple xử lý thanh toán nên chúng tôi không thể tự hoàn tiền. Vui lòng gửi yêu cầu trực tiếp cho Apple:</p>
        <ol>
            <li>
                Truy cập <Ext href={REPORT_PROBLEM}>reportaproblem.apple.com</Ext> và đăng nhập bằng Apple ID của bạn.
            </li>
            <li>Chọn „Yêu cầu hoàn tiền“ và chọn giao dịch tương ứng.</li>
            <li>Nêu lý do và gửi yêu cầu.</li>
        </ol>
        <p>
            Apple là bên quyết định chấp nhận yêu cầu. Xem thêm tại <Ext href={APPLE_REFUND_HELP_EN}>trang hỗ trợ của Apple</Ext>. Sau khi
            được hoàn tiền, Premium trong app sẽ bị tắt.
        </p>

        <h2 id="withdrawal">6. Quyền rút lại hợp đồng của người tiêu dùng</h2>
        <p>
            Người tiêu dùng tại EU về nguyên tắc có quyền rút lại hợp đồng trong 14 ngày khi mua nội dung số, thực hiện với Apple là bên bán.
            Quyền này có thể mất sớm nếu bạn đã đồng ý rõ ràng để việc cung cấp bắt đầu trước khi hết thời hạn và xác nhận rằng bạn biết mình
            sẽ mất quyền rút lại. Chi tiết nằm trong <Ext href={APPLE_TERMS_EN}>Điều khoản Dịch vụ Truyền thông của Apple</Ext>.
        </p>

        <h2 id="help">7. Trợ giúp và liên hệ</h2>
        <p>
            Đã mua nhưng Premium chưa mở hoặc vẫn thấy quảng cáo? Hãy thử „Khôi phục giao dịch“ trước. Nếu vẫn không được, gửi email tới{' '}
            <Mail /> kèm tên app và – nếu có – mã đơn hàng trong biên nhận của Apple. Xem thêm tại{' '}
            <Link href={APP_SUPPORT}>hỗ trợ {APP}</Link> và <Link href="/support">Trung tâm hỗ trợ</Link>.
        </p>
    </>
);

export default function RefundPage() {
    return (
        <LegalShell
            title={{ de: 'Käufe & Erstattung', en: 'Purchases & refunds', vi: 'Mua hàng & hoàn tiền' }}
            intro={{
                de: `HalloVN ist kostenlos. Diese Seite betrifft nur den In-App-Kauf in ${APP}: Wiederherstellen, Erstattung und Kontakt.`,
                en: `HalloVN is free. This page only concerns the in-app purchase in ${APP}: restoring, refunds and contact.`,
                vi: `HalloVN miễn phí. Trang này chỉ dành cho giao dịch mua trong app ${APP}: khôi phục, hoàn tiền và liên hệ.`,
            }}
            content={{ de, en, vi }}
        />
    );
}
