import type { ReactNode } from 'react';
import { COMPANY } from '@/biz/lib/site';
import type { Block, LegalSection } from '@/biz/lib/legal/types';

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
    if ('note' in block) return <div className="note">{inline(block.note)}</div>;
    return (
        <div className="card">
            <p><strong>{COMPANY.legalName}</strong></p>
            <p>{COMPANY.owner}</p>
            <p>{[COMPANY.street, COMPANY.postalCity, COMPANY.country].filter(Boolean).join(', ')}</p>
            <p><a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></p>
        </div>
    );
}

export default function LegalText({ sections }: { sections: LegalSection[] }) {
    return (
        <>
            {sections.map((section, i) => (
                <section key={section.id}>
                    <h2 id={section.id}>{i + 1}. {section.title}</h2>
                    {section.blocks.map((block, j) => (
                        <BlockView key={j} block={block} />
                    ))}
                </section>
            ))}
        </>
    );
}
