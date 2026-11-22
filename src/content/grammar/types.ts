export type GrammarLevel = "A1" | "A2" | "B1" | "B2";

export type GrammarCategoryId =
  | "nomen"
  | "artikel"
  | "pronomen"
  | "verben"
  | "zeitformen"
  | "adjektive"
  | "adverbien"
  | "praepositionen"
  | "satzbau";

export type GrammarCategory = {
  id: GrammarCategoryId;
  order: number;
  title: string;
  germanTitle: string;
  description: string;
  levelRange: string;
};

export type GrammarExample = {
  /** Câu tiếng Đức, hỗ trợ thẻ màu cách {nom:...}, {akk:...}, {dat:...}, {gen:...} và **in đậm** */
  de: string;
  /** Bản dịch tiếng Việt rõ nghĩa */
  vi: string;
  /** Ghi chú ngữ pháp ngắn (tùy chọn) */
  note?: string;
};

export type GrammarBlock =
  | {
      type: "text";
      content: string;
    }
  | {
      type: "rule";
      title: string;
      formula: string;
      note?: string;
    }
  | {
      type: "table";
      caption?: string;
      headers: string[];
      rows: string[][];
    }
  | {
      type: "examples";
      title?: string;
      items: GrammarExample[];
    }
  | {
      type: "steps";
      title?: string;
      items: {
        step: string;
        detail: string;
        example?: string;
      }[];
    }
  | {
      type: "tip";
      variant: "tip" | "warning" | "note";
      title: string;
      content: string;
    }
  | {
      type: "compare";
      leftTitle: string;
      leftItems: string[];
      rightTitle: string;
      rightItems: string[];
    }
  | {
      type: "list";
      title?: string;
      items: string[];
    };

export type GrammarSection = {
  id: string;
  heading: string;
  blocks: GrammarBlock[];
};

export type GrammarQuizItem = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

export type GrammarLesson = {
  slug: string;
  categoryId: GrammarCategoryId;
  order: number;
  code: string;
  title: string;
  germanTitle: string;
  level: GrammarLevel;
  summary: string;
  sections: GrammarSection[];
  keyPoints: string[];
  quiz: GrammarQuizItem[];
};

export const GRAMMAR_CATEGORIES: GrammarCategory[] = [
  {
    id: "nomen",
    order: 1,
    title: "Danh từ & 4 Cách",
    germanTitle: "Nomen & die 4 Fälle",
    description: "Giống der/die/das, mẹo đoán mạo từ, số nhiều, danh từ ghép, 4 cách Nominativ–Akkusativ–Dativ–Genitiv và N-Deklination.",
    levelRange: "A1 – B2",
  },
  {
    id: "artikel",
    order: 2,
    title: "Mạo từ",
    germanTitle: "Artikel",
    description: "Mạo từ xác định, không xác định, phủ định kein, trường hợp không dùng mạo từ (Nullartikel), mạo từ sở hữu và quy luật biến cách chung.",
    levelRange: "A1 – A2",
  },
  {
    id: "pronomen",
    order: 3,
    title: "Đại từ",
    germanTitle: "Pronomen",
    description: "Đại từ nhân xưng 4 cách, phản thân, sở hữu, quan hệ, chỉ định, bất định và toàn bộ cách dùng của „es“.",
    levelRange: "A1 – B2",
  },
  {
    id: "verben",
    order: 4,
    title: "Động từ",
    germanTitle: "Verben",
    description: "Sein/haben, động từ mạnh, khuyết thiếu, tách/không tách, mệnh lệnh, phản thân, werden, lassen, phân từ, Konjunktiv 1 & 2, bị động và bổ ngữ.",
    levelRange: "A1 – B2",
  },
  {
    id: "zeitformen",
    order: 5,
    title: "Các thì trong tiếng Đức",
    germanTitle: "Zeitformen",
    description: "Präsens, Futur 1, Perfekt, Präteritum, phân biệt Perfekt vs Präteritum, Plusquamperfekt và Futur 2.",
    levelRange: "A1 – B2",
  },
  {
    id: "adjektive",
    order: 6,
    title: "Tính từ",
    germanTitle: "Adjektive",
    description: "Chia đuôi tính từ (quy trình 4 bước), so sánh hơn/nhất/ngang bằng, phân từ làm tính từ, danh từ hóa và cấu tạo tính từ.",
    levelRange: "A1 – B2",
  },
  {
    id: "adverbien",
    order: 7,
    title: "Trạng từ & Tiểu từ",
    germanTitle: "Adverbien & Partikel",
    description: "Phân biệt trạng từ và tính từ, trạng từ thời gian, nơi chốn (hin & her), trạng từ liên kết và tiểu từ tình thái (Modalpartikel).",
    levelRange: "A1 – B2",
  },
  {
    id: "praepositionen",
    order: 8,
    title: "Giới từ",
    germanTitle: "Präpositionen",
    description: "Gộp giới từ với mạo từ, giới từ nơi chốn (Wo/Woher/Wohin, 9 Wechselpräpositionen) và giới từ thời gian theo 3 cách.",
    levelRange: "A1 – B1",
  },
  {
    id: "satzbau",
    order: 9,
    title: "Cấu trúc câu & Mệnh đề",
    germanTitle: "Satzbau & Nebensätze",
    description: "Trật tự từ, câu hỏi, phủ định & vị trí nicht, khung câu, toàn bộ các loại mệnh đề phụ, liên từ và cấu trúc Infinitiv mit zu.",
    levelRange: "A1 – B2",
  },
];
