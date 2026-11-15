import type { Locale } from '@/biz/contexts/LocaleContext';

/** Đoạn văn hỗ trợ **đậm** và [liên kết](url). */
export type Block = string | { list: string[] } | { note: string } | { controller: true };

export interface LegalSection {
    id: string;
    title: string;
    blocks: Block[];
}

export interface Faq {
    q: string;
    a: string;
}

export type Localized<T> = Record<Locale, T>;

export interface LegalProduct {
    /** Đường dẫn gốc: /<slug>/support và /<slug>/privacy */
    slug: string;
    name: string;
    /** Một dòng mô tả hiện ở trang tổng hợp */
    summary: Localized<string>;
    /** Có mua trong app: hiện liên kết tới trang mua hàng và hoàn tiền */
    hasPurchases: boolean;
    /** Có tài khoản hoặc dữ liệu cần trang xoá dữ liệu chung */
    showDeletion: boolean;
    faq: Localized<Faq[]>;
    privacy: Localized<LegalSection[]>;
}
