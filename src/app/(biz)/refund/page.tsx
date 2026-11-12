import type { Metadata } from 'next';
import { pageMetadata } from '@/biz/lib/seo';
import Link from 'next/link';
import LegalShell from '@/biz/components/business/LegalShell';
import { COMPANY } from '@/biz/lib/site';

export const metadata: Metadata = pageMetadata({
    title: 'Käufe & Erstattung',
    description: 'In-App-Käufe, Abonnements, Kündigung, Wiederherstellung und Erstattung für die Apps von CKK.',
    path: '/refund',
});

const de = (
    <>
        <h2 id="how">1. Wie Käufe abgewickelt werden</h2>
        <p>
            Alle In-App-Käufe und Abonnements werden ausschließlich über den <strong>Apple App Store</strong> abgewickelt. Apple ist
            Verkäufer und Zahlungsabwickler; wir erhalten keine Zahlungsdaten. Preise werden vor dem Kauf in Ihrer Landeswährung angezeigt.
        </p>

        <h2 id="restore">2. Käufe wiederherstellen</h2>
        <ol>
            <li>Öffnen Sie die App und gehen Sie zu <strong>Einstellungen</strong>.</li>
            <li>Tippen Sie auf <strong>„Käufe wiederherstellen“</strong>.</li>
            <li>Stellen Sie sicher, dass Sie mit derselben Apple-ID angemeldet sind, mit der Sie gekauft haben.</li>
        </ol>
        <p>Premium ist auf allen Geräten mit derselben Apple-ID nutzbar (sofern Familienfreigabe aktiviert ist, auch für Familienmitglieder).</p>

        <h2 id="cancel">3. Abonnement kündigen</h2>
        <ol>
            <li>iPhone/iPad: <strong>Einstellungen → [Ihr Name] → Abonnements</strong></li>
            <li>Abonnement auswählen und <strong>„Abo kündigen“</strong> tippen.</li>
        </ol>
        <p>
            Die Kündigung muss spätestens 24 Stunden vor Ende des laufenden Zeitraums erfolgen. Premium bleibt bis zum Ende des bezahlten
            Zeitraums aktiv. Das Löschen der App beendet ein Abonnement <strong>nicht</strong>.
        </p>

        <h2 id="refund">4. Erstattung</h2>
        <p>
            Da Apple die Zahlung abwickelt, können wir Erstattungen nicht selbst vornehmen. Erstattungsanträge stellen Sie direkt bei Apple:
        </p>
        <ol>
            <li>
                Öffnen Sie <a href="https://reportaproblem.apple.com" target="_blank" rel="noopener noreferrer">reportaproblem.apple.com</a>{' '}
                und melden Sie sich mit Ihrer Apple-ID an.
            </li>
            <li>Wählen Sie „Erstattung anfordern“ und den betreffenden Kauf.</li>
            <li>Geben Sie einen Grund an und senden Sie den Antrag ab.</li>
        </ol>
        <p>Apple entscheidet in der Regel innerhalb von 24–48 Stunden.</p>

        <h2 id="withdrawal">5. Widerrufsrecht für Verbraucher</h2>
        <p>
            Verbrauchern in der EU steht beim Kauf digitaler Inhalte grundsätzlich ein 14-tägiges Widerrufsrecht zu, das gegenüber Apple als
            Verkäufer ausgeübt wird. Das Widerrufsrecht kann erlöschen, wenn Sie ausdrücklich zugestimmt haben, dass die Ausführung vor
            Ablauf der Widerrufsfrist beginnt, und Ihre Kenntnis vom Verlust des Widerrufsrechts bestätigt haben. Einzelheiten regeln die{' '}
            <a href="https://www.apple.com/legal/internet-services/itunes/de/terms.html" target="_blank" rel="noopener noreferrer">
                Mediendienste-Bedingungen von Apple
            </a>
            .
        </p>

        <h2 id="help">6. Hilfe</h2>
        <p>
            Premium wird trotz Kauf nicht freigeschaltet? Schreiben Sie uns an <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>{' '}
            mit dem Namen der App und – falls vorhanden – der Bestellnummer aus Ihrer Apple-Kaufbestätigung. Weitere Antworten im{' '}
            <Link href="/support">Support-Center</Link>.
        </p>
    </>
);

const en = (
    <>
        <h2 id="how">1. How purchases are processed</h2>
        <p>
            All in-app purchases and subscriptions are processed exclusively by the <strong>Apple App Store</strong>. Apple is the seller
            and payment processor; we do not receive any payment details. Prices are shown in your local currency before purchase.
        </p>

        <h2 id="restore">2. Restore purchases</h2>
        <ol>
            <li>Open the app and go to <strong>Settings</strong>.</li>
            <li>Tap <strong>“Restore purchases”</strong>.</li>
            <li>Make sure you are signed in with the same Apple ID used for the purchase.</li>
        </ol>
        <p>Premium works on all devices using the same Apple ID (and for family members if Family Sharing is enabled).</p>

        <h2 id="cancel">3. Cancel a subscription</h2>
        <ol>
            <li>iPhone/iPad: <strong>Settings → [your name] → Subscriptions</strong></li>
            <li>Select the subscription and tap <strong>“Cancel subscription”</strong>.</li>
        </ol>
        <p>
            Cancel at least 24 hours before the end of the current period. Premium remains active until the end of the paid period.
            Deleting the app does <strong>not</strong> cancel a subscription.
        </p>

        <h2 id="refund">4. Refunds</h2>
        <p>Because Apple processes the payment, we cannot issue refunds ourselves. Please request a refund directly from Apple:</p>
        <ol>
            <li>
                Go to <a href="https://reportaproblem.apple.com" target="_blank" rel="noopener noreferrer">reportaproblem.apple.com</a> and
                sign in with your Apple ID.
            </li>
            <li>Choose “Request a refund” and select the purchase.</li>
            <li>Provide a reason and submit the request.</li>
        </ol>
        <p>Apple usually responds within 24–48 hours.</p>

        <h2 id="withdrawal">5. Right of withdrawal for consumers</h2>
        <p>
            Consumers in the EU generally have a 14-day right of withdrawal for digital content, exercised against Apple as the seller. This
            right may expire if you expressly agreed that performance begins before the withdrawal period ends and acknowledged that you
            thereby lose the right. Details are set out in{' '}
            <a href="https://www.apple.com/legal/internet-services/itunes/" target="_blank" rel="noopener noreferrer">
                Apple’s Media Services Terms
            </a>
            .
        </p>

        <h2 id="help">6. Help</h2>
        <p>
            Premium not unlocked after purchase? Email us at <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> with the app name and,
            if available, the order ID from your Apple receipt. More answers in the <Link href="/support">Support center</Link>.
        </p>
    </>
);

const vi = (
    <>
        <p className="note">Bản tiếng Việt chỉ mang tính tham khảo. Bản tiếng Đức là bản có giá trị pháp lý.</p>

        <h2 id="how">1. Cách thức mua hàng</h2>
        <p>
            Mọi giao dịch mua trong ứng dụng và gói đăng ký đều được xử lý hoàn toàn qua <strong>Apple App Store</strong>. Apple là bên bán
            và bên xử lý thanh toán; chúng tôi không nhận bất kỳ thông tin thanh toán nào. Giá được hiển thị bằng đơn vị tiền tệ của bạn trước
            khi mua.
        </p>

        <h2 id="restore">2. Khôi phục giao dịch</h2>
        <ol>
            <li>Mở ứng dụng và vào <strong>Cài đặt</strong>.</li>
            <li>Chạm vào <strong>„Khôi phục giao dịch“</strong>.</li>
            <li>Đảm bảo bạn đang đăng nhập bằng đúng Apple ID đã dùng để mua.</li>
        </ol>
        <p>Premium dùng được trên mọi thiết bị đăng nhập cùng Apple ID (và cho các thành viên gia đình nếu bật Chia sẻ trong gia đình).</p>

        <h2 id="cancel">3. Huỷ gói đăng ký</h2>
        <ol>
            <li>iPhone/iPad: <strong>Cài đặt → [Tên của bạn] → Đăng ký</strong></li>
            <li>Chọn gói đăng ký và chạm <strong>„Huỷ đăng ký“</strong>.</li>
        </ol>
        <p>
            Cần huỷ chậm nhất 24 giờ trước khi kỳ hiện tại kết thúc. Premium vẫn hoạt động đến hết kỳ đã thanh toán. Xoá ứng dụng{' '}
            <strong>không</strong> huỷ gói đăng ký.
        </p>

        <h2 id="refund">4. Hoàn tiền</h2>
        <p>Vì Apple xử lý thanh toán nên chúng tôi không thể tự hoàn tiền. Vui lòng gửi yêu cầu hoàn tiền trực tiếp cho Apple:</p>
        <ol>
            <li>
                Truy cập <a href="https://reportaproblem.apple.com" target="_blank" rel="noopener noreferrer">reportaproblem.apple.com</a> và
                đăng nhập bằng Apple ID của bạn.
            </li>
            <li>Chọn „Yêu cầu hoàn tiền“ và chọn giao dịch tương ứng.</li>
            <li>Nêu lý do và gửi yêu cầu.</li>
        </ol>
        <p>Apple thường phản hồi trong vòng 24–48 giờ.</p>

        <h2 id="withdrawal">5. Quyền rút lại hợp đồng của người tiêu dùng</h2>
        <p>
            Người tiêu dùng tại EU về nguyên tắc có quyền rút lại hợp đồng trong 14 ngày khi mua nội dung số, thực hiện với Apple là bên bán.
            Quyền này có thể mất nếu bạn đã đồng ý rõ ràng để việc cung cấp bắt đầu trước khi hết thời hạn và xác nhận rằng bạn biết mình sẽ
            mất quyền rút lại. Chi tiết được quy định trong{' '}
            <a href="https://www.apple.com/legal/internet-services/itunes/" target="_blank" rel="noopener noreferrer">
                Điều khoản Dịch vụ Truyền thông của Apple
            </a>
            .
        </p>

        <h2 id="help">6. Trợ giúp</h2>
        <p>
            Đã mua nhưng Premium chưa được mở khoá? Hãy gửi email tới <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> kèm tên ứng
            dụng và – nếu có – mã đơn hàng trong biên nhận của Apple. Xem thêm giải đáp tại{' '}
            <Link href="/support">Trung tâm hỗ trợ</Link>.
        </p>
    </>
);

export default function RefundPage() {
    return (
        <LegalShell
            title={{ de: 'Käufe & Erstattung', en: 'Purchases & refunds', vi: 'Mua hàng & hoàn tiền' }}
            intro={{
                de: 'Alles zu In-App-Käufen, Abonnements, Kündigung und Erstattungen.',
                en: 'Everything about in-app purchases, subscriptions, cancellation and refunds.',
                vi: 'Mọi thông tin về mua hàng trong ứng dụng, gói đăng ký, huỷ gói và hoàn tiền.',
            }}
            content={{ de, en, vi }}
        />
    );
}
