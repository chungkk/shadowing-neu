import type { Metadata } from 'next';
import { pageMetadata } from '@/biz/lib/seo';
import Link from 'next/link';
import LegalShell from '@/biz/components/business/LegalShell';
import { COMPANY } from '@/biz/lib/site';

export const metadata: Metadata = pageMetadata({
    title: 'Daten löschen',
    description: 'So löschen Sie Ihre Daten in den Apps Führerschein Theorie Ckk und Leben in Deutschland Ckk.',
    path: '/delete-account',
});

const mailDe = `mailto:${COMPANY.email}?subject=${encodeURIComponent('Antrag auf Datenlöschung')}&body=${encodeURIComponent('Bitte löschen Sie meine Support-Anfragen und alle zugehörigen Daten.\n\nApp: \n')}`;
const mailVi = `mailto:${COMPANY.email}?subject=${encodeURIComponent('Yêu cầu xoá dữ liệu')}&body=${encodeURIComponent('Vui lòng xoá các yêu cầu hỗ trợ của tôi và mọi dữ liệu liên quan.\n\nỨng dụng: \n')}`;
const mailEn = `mailto:${COMPANY.email}?subject=${encodeURIComponent('Data deletion request')}&body=${encodeURIComponent('Please delete my support requests and all associated data.\n\nApp: \n')}`;

const de = (
    <>
        <h2 id="no-account">1. Kein Nutzerkonto</h2>
        <p>
            Die Apps Führerschein Theorie Ckk und Leben in Deutschland Ckk funktionieren ohne Registrierung. Es gibt kein Nutzerkonto, und wir
            speichern auf unseren Servern weder Name, E-Mail-Adresse noch Lernfortschritt.
        </p>

        <h2 id="local">2. Lokale Daten in der App</h2>
        <p>
            Lernfortschritt, Markierungen und Einstellungen liegen nur auf Ihrem Gerät. Sie löschen diese, indem Sie den Lernfortschritt in
            den Einstellungen der App zurücksetzen oder die App deinstallieren.
        </p>

        <h2 id="email">3. Support-Anfragen löschen</h2>
        <p>
            Wenn Sie uns kontaktiert haben und Ihre Korrespondenz gelöscht haben möchten, schreiben Sie an{' '}
            <a href={mailDe}>{COMPANY.email}</a> mit dem Betreff „Antrag auf Datenlöschung“. Wir bestätigen die Löschung innerhalb von
            7 Tagen, soweit keine gesetzliche Aufbewahrungspflicht besteht.
        </p>

        <div className="note">
            <strong>Wichtig:</strong> Das Deinstallieren der App kündigt kein laufendes Abonnement. Kündigen Sie Abonnements über die
            Apple-Einstellungen – siehe <Link href="/refund">Käufe &amp; Erstattung</Link>. Kaufbelege werden von Apple verwaltet; wir
            speichern keine Zahlungsdaten.
        </div>

        <p>
            Weitere Informationen finden Sie in unserer <Link href="/privacy">Datenschutzerklärung</Link>.
        </p>
    </>
);

const en = (
    <>
        <h2 id="no-account">1. No user account</h2>
        <p>
            The apps Führerschein Theorie Ckk and Leben in Deutschland Ckk work without registration. There is no user account, and we do not
            store your name, email address or learning progress on our servers.
        </p>

        <h2 id="local">2. Local data in the app</h2>
        <p>
            Learning progress, bookmarks and settings are stored only on your device. Delete them by resetting your progress in the app
            settings or by uninstalling the app.
        </p>

        <h2 id="email">3. Delete support requests</h2>
        <p>
            If you have contacted us and want your correspondence deleted, email <a href={mailEn}>{COMPANY.email}</a> with the subject
            “Data deletion request”. We will confirm the deletion within 7 days unless a statutory retention obligation applies.
        </p>

        <div className="note">
            <strong>Important:</strong> Uninstalling the app does not cancel an active subscription. Cancel subscriptions in your Apple
            settings – see <Link href="/refund">Purchases &amp; refunds</Link>. Purchase receipts are managed by Apple; we do not store
            payment data.
        </div>

        <p>
            More information is available in our <Link href="/privacy">Privacy policy</Link>.
        </p>
    </>
);

const vi = (
    <>
        <h2 id="no-account">1. Không có tài khoản người dùng</h2>
        <p>
            Ứng dụng Führerschein Theorie Ckk và Leben in Deutschland Ckk hoạt động mà không cần đăng ký. Không có tài khoản người dùng, và chúng
            tôi không lưu tên, địa chỉ email hay tiến độ học của bạn trên máy chủ.
        </p>

        <h2 id="local">2. Dữ liệu trên thiết bị</h2>
        <p>
            Tiến độ học, câu đã đánh dấu và cài đặt chỉ được lưu trên thiết bị của bạn. Bạn có thể xoá bằng cách đặt lại tiến độ trong phần cài
            đặt của ứng dụng hoặc gỡ cài đặt ứng dụng.
        </p>

        <h2 id="email">3. Xoá yêu cầu hỗ trợ</h2>
        <p>
            Nếu bạn đã liên hệ với chúng tôi và muốn xoá thư từ trao đổi, hãy gửi email tới <a href={mailVi}>{COMPANY.email}</a> với tiêu đề
            „Yêu cầu xoá dữ liệu“. Chúng tôi sẽ xác nhận việc xoá trong vòng 7 ngày, trừ khi pháp luật yêu cầu phải lưu giữ.
        </p>

        <div className="note">
            <strong>Lưu ý:</strong> Gỡ cài đặt ứng dụng không huỷ gói đăng ký đang chạy. Hãy huỷ gói đăng ký trong phần cài đặt Apple – xem{' '}
            <Link href="/refund">Mua hàng &amp; hoàn tiền</Link>. Biên nhận mua hàng do Apple quản lý; chúng tôi không lưu thông tin thanh
            toán.
        </div>

        <p>
            Xem thêm thông tin trong <Link href="/privacy">Chính sách bảo mật</Link> của chúng tôi.
        </p>
    </>
);

export default function DeleteAccountPage() {
    return (
        <LegalShell
            title={{ de: 'Daten löschen', en: 'Delete your data', vi: 'Xoá dữ liệu' }}
            intro={{
                de: 'Sie behalten die volle Kontrolle über Ihre Daten. So löschen Sie alle Daten, die bei der Nutzung unserer Apps entstehen.',
                en: 'You stay in full control of your data. Here is how to delete all data created when using our apps.',
                vi: 'Bạn hoàn toàn kiểm soát dữ liệu của mình. Dưới đây là cách xoá mọi dữ liệu phát sinh khi dùng ứng dụng của chúng tôi.',
            }}
            content={{ de, en, vi }}
        />
    );
}
