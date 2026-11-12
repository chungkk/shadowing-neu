import type { Metadata } from 'next';
import { pageMetadata } from '@/biz/lib/seo';
import LegalShell from '@/biz/components/business/LegalShell';
import { COMPANY, SITE } from '@/biz/lib/site';
import type { Locale } from '@/biz/contexts/LocaleContext';

export const metadata: Metadata = pageMetadata({
    title: 'Impressum',
    description: `Impressum und Anbieterkennzeichnung von ${COMPANY.legalName} (${SITE.domain}).`,
    path: '/impressum',
});

function Address() {
    return (
        <div className="card">
            <p><strong>{COMPANY.legalName}</strong></p>
            <p>{COMPANY.owner}</p>
            {COMPANY.street && <p>{COMPANY.street}</p>}
            <p>{COMPANY.postalCity}</p>
            <p>{COMPANY.country}</p>
        </div>
    );
}

const CONTACT_LABELS: Record<Locale, { email: string; phone: string }> = {
    de: { email: 'E-Mail', phone: 'Telefon' },
    en: { email: 'Email', phone: 'Phone' },
    vi: { email: 'Email', phone: 'Điện thoại' },
};

function Contact({ locale = 'de' }: { locale?: Locale }) {
    const l = CONTACT_LABELS[locale];
    return (
        <div className="card">
            <p>{l.email}: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></p>
            {COMPANY.phone && <p>{l.phone}: {COMPANY.phone}</p>}
            <p>Website: <a href={SITE.url}>{SITE.domain}</a></p>
        </div>
    );
}

const de = (
    <>
        <h2>Angaben gemäß § 5 DDG</h2>
        <Address />

        <h2>Kontakt</h2>
        <Contact />

        {COMPANY.vatId && (
            <>
                <h2>Umsatzsteuer-ID</h2>
                <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz: {COMPANY.vatId}</p>
            </>
        )}

        <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <p>{COMPANY.owner}, Anschrift wie oben.</p>

        <h2>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
        <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>

        <h2>Haftung für Inhalte</h2>
        <p>
            Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Wir sind jedoch nicht
            verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
            rechtswidrige Tätigkeit hinweisen. Bei Bekanntwerden entsprechender Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
        </p>

        <h2>Haftung für Links</h2>
        <p>
            Unser Angebot enthält Links zu externen Websites Dritter (z. B. Apple App Store), auf deren Inhalte wir keinen Einfluss haben. Für
            die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich. Bei Bekanntwerden von
            Rechtsverletzungen werden wir derartige Links umgehend entfernen.
        </p>

        <h2>Urheberrecht</h2>
        <p>
            Die durch uns erstellten Inhalte und Werke auf diesen Seiten und in unseren Apps unterliegen dem deutschen Urheberrecht. Die
            amtlichen Prüfungsfragen sind Eigentum der jeweiligen Rechteinhaber (TÜV | DEKRA arge tp 21 bzw. Bundesamt für Migration und
            Flüchtlinge). App Store und Apple sind Marken der Apple Inc.
        </p>
    </>
);

const en = (
    <>
        <h2>Information pursuant to § 5 DDG (German Digital Services Act)</h2>
        <Address />

        <h2>Contact</h2>
        <Contact locale="en" />

        {COMPANY.vatId && (
            <>
                <h2>VAT ID</h2>
                <p>VAT identification number pursuant to § 27a of the German VAT Act: {COMPANY.vatId}</p>
            </>
        )}

        <h2>Responsible for content pursuant to § 18 (2) MStV</h2>
        <p>{COMPANY.owner}, address as above.</p>

        <h2>Consumer dispute resolution</h2>
        <p>We are neither willing nor obliged to participate in dispute resolution proceedings before a consumer arbitration board.</p>

        <h2>Liability for content</h2>
        <p>
            As a service provider we are responsible for our own content on these pages in accordance with general law. We are not obliged to
            monitor transmitted or stored third-party information. Upon becoming aware of any legal violation, we will remove such content
            immediately.
        </p>

        <h2>Liability for links</h2>
        <p>
            Our website contains links to external third-party websites (e.g. Apple App Store) over whose content we have no control. The
            respective provider is always responsible for the content of linked pages.
        </p>

        <h2>Copyright</h2>
        <p>
            Content and works created by us on this website and in our apps are subject to German copyright law. The official exam questions
            are the property of their respective rights holders (TÜV | DEKRA arge tp 21 and the Federal Office for Migration and Refugees).
            App Store and Apple are trademarks of Apple Inc.
        </p>
    </>
);

const vi = (
    <>
        <p className="note">Bản tiếng Việt chỉ mang tính tham khảo. Bản tiếng Đức là bản có giá trị pháp lý.</p>

        <h2>Thông tin theo § 5 DDG (Luật Dịch vụ số của Đức)</h2>
        <Address />

        <h2>Liên hệ</h2>
        <Contact locale="vi" />

        {COMPANY.vatId && (
            <>
                <h2>Mã số thuế VAT</h2>
                <p>Mã số thuế giá trị gia tăng theo § 27a Luật Thuế VAT của Đức: {COMPANY.vatId}</p>
            </>
        )}

        <h2>Chịu trách nhiệm nội dung theo § 18 khoản 2 MStV</h2>
        <p>{COMPANY.owner}, địa chỉ như trên.</p>

        <h2>Giải quyết tranh chấp người tiêu dùng</h2>
        <p>Chúng tôi không sẵn sàng và cũng không có nghĩa vụ tham gia thủ tục giải quyết tranh chấp trước cơ quan hoà giải người tiêu dùng.</p>

        <h2>Trách nhiệm đối với nội dung</h2>
        <p>
            Là nhà cung cấp dịch vụ, chúng tôi chịu trách nhiệm về nội dung của chính mình trên các trang này theo quy định pháp luật chung.
            Chúng tôi không có nghĩa vụ giám sát thông tin của bên thứ ba được truyền tải hoặc lưu trữ. Khi biết có vi phạm pháp luật, chúng tôi
            sẽ gỡ bỏ nội dung đó ngay lập tức.
        </p>

        <h2>Trách nhiệm đối với liên kết</h2>
        <p>
            Trang web của chúng tôi có liên kết tới trang web bên ngoài của bên thứ ba (ví dụ Apple App Store), mà chúng tôi không thể kiểm soát
            nội dung. Nhà cung cấp hoặc đơn vị vận hành của trang được liên kết luôn chịu trách nhiệm về nội dung của trang đó.
        </p>

        <h2>Bản quyền</h2>
        <p>
            Nội dung và tác phẩm do chúng tôi tạo ra trên trang web này và trong các ứng dụng của chúng tôi chịu sự điều chỉnh của luật bản
            quyền Đức. Các câu hỏi thi chính thức thuộc quyền sở hữu của chủ sở hữu tương ứng (TÜV | DEKRA arge tp 21 và Văn phòng Liên bang
            về Di trú và Tị nạn – BAMF). App Store và Apple là thương hiệu của Apple Inc.
        </p>
    </>
);

export default function ImpressumPage() {
    return (
        <LegalShell
            title={{ de: 'Impressum', en: 'Legal notice (Impressum)', vi: 'Thông tin pháp lý (Impressum)' }}
            content={{ de, en, vi }}
        />
    );
}
