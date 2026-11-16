import type { ReactNode } from 'react';
import { COMPANY } from '@/lib/company/site';
import type { Block, LegalSection } from '@/lib/company/legal/types';

/** Hiển thị **đậm** và [liên kết](url) trong văn bản pháp lý. */
function inline(text: string): ReactNode[] {
    return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
        const bold = part.match(/^\*\*(.+)\*\*$/);
        if (bold) return <strong key={i}>{bold[1]}</strong>;
        const link = part.match(/^\[(.+)\]\((.+)\)$/);
        if (link) {
            const external = /^https?:/.test(link[2]);
            return (
                <a key={i} href={link[2]} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                    {link[1]}
                </a>
            );
        }
        return part;
    });
}

function BlockView({ block }: { block: Block }) {
    if (typeof block === 'string') return <p>{inline(block)}</p>;
    if ('list' in block) {
        return (
            <ul>
                {block.list.map((item) => (
                    <li key={item}>{inline(item)}</li>
                ))}
            </ul>
        );
    }
    if ('note' in block) return <div className="legal-note">{inline(block.note)}</div>;
    return (
        <div className="legal-card">
            <p><strong>{COMPANY.legalName}</strong></p>
            {COMPANY.owner && <p>{COMPANY.owner}</p>}
            <p>{[COMPANY.street, COMPANY.postalCity, COMPANY.country].filter(Boolean).join(', ')}</p>
            <p><a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></p>
        </div>
    );
}

/** after: nội dung thêm ngay cuối mục có id tương ứng (vd. nút "Cài đặt quyền riêng tư" dưới mục quảng cáo) */
export default function LegalText({ sections, after }: { sections: LegalSection[]; after?: Record<string, ReactNode> }) {
    return (
        <>
            {sections.map((section, i) => (
                <section key={section.id}>
                    <h2 id={section.id}>{i + 1}. {section.title}</h2>
                    {section.blocks.map((block, j) => (
                        <BlockView key={j} block={block} />
                    ))}
                    {after?.[section.id]}
                </section>
            ))}
        </>
    );
}
