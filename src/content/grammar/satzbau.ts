import type { GrammarLesson } from "./types";

export const SATZBAU_LESSONS: GrammarLesson[] = [
  {
    slug: "menh-de-chinh-vi-tri-1-va-chu-ngu",
    categoryId: "satzbau",
    order: 1,
    code: "S1",
    title: "Mệnh đề chính, Vị trí 1 & Vị trí Chủ ngữ",
    germanTitle: "Hauptsatz, Position 1 & Subjekt",
    level: "A1",
    summary: "Quy luật bất di bất dịch „Động từ ở Vị trí 2“ trong Hauptsatz, mọi thứ đều có thể lên Vị trí 1 để nhấn mạnh và quy tắc chủ ngữ bám sát động từ.",
    sections: [
      {
        id: "vi-tri-1-va-2",
        heading: "1. Hauptsatz vs Nebensatz & Vị trí 1 siêu linh hoạt",
        blocks: [
          {
            type: "compare",
            leftTitle: "Mệnh đề chính (Hauptsatz — HS)",
            leftItems: [
              "Là câu hoàn chỉnh, có thể đứng độc lập một mình.",
              "**Động từ chia LUÔN đứng ở Vị trí 2 (Position 2)!**",
              "*Ich **komme** aus Vietnam.*",
            ],
            rightTitle: "Mệnh đề phụ (Nebensatz — NS)",
            rightItems: [
              "Không đủ nghĩa nếu đứng một mình, luôn ngăn cách bằng dấu phẩy.",
              "**Động từ chia LUÔN bị đẩy về CUỐI mệnh đề phụ!**",
              "*..., das ich gestern verloren **habe**.*",
            ],
          },
          {
            type: "text",
            content:
              "Khác với tiếng Anh hay tiếng Việt (chủ ngữ gần như luôn đứng đầu), tiếng Đức **đặt thông tin QUAN TRỌNG NHẤT lên Vị trí 1**, còn **Động từ chia cố định ở Vị trí 2**. Nếu Vị trí 1 không phải chủ ngữ thì **chủ ngữ lùi ngay ra sau động từ (Vị trí 3)** để bám sát động từ!",
          },
          {
            type: "table",
            caption: "Mọi thành phần đều có thể lên Vị trí 1 — miễn là Động từ chia vẫn giữ chắc Vị trí 2!",
            headers: ["Loại thành phần ở P1", "Vị trí 1", "Vị trí 2 (Động từ)", "Phần còn lại (Chủ ngữ bám sát!)"],
            rows: [
              ["Từ để hỏi", "**Was**", "machst", "{nom:du}?"],
              ["Danh từ / Đại từ", "**{nom:Das Haus}**", "ist", "alt."],
              ["Thời gian", "**Heute**", "geht", "{nom:er} in die Schule."],
              ["Nơi chốn", "**Auf dem Bett**", "liegt", "{nom:es} doch!"],
              ["Trạng từ liên kết", "**Deshalb**", "mag", "{nom:ich} Maria."],
              ["Cả một mệnh đề phụ!", "**Wenn du kommst,**", "mache", "{nom:ich} Essen."],
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Trong câu trần thuật (Hauptsatz), động từ chia LUÔN ở Vị trí 2 — không bao giờ ở vị trí 3!",
      "Thông tin muốn nhấn mạnh đặt lên Vị trí 1; khi đó chủ ngữ lập tức đứng ngay sau động từ chia (Vị trí 3).",
      "Cả một mệnh đề phụ đứng đầu câu cũng chỉ tính là ĐÚNG 1 vị trí (Vị trí 1), nên sau dấu phẩy là động từ chia của mệnh đề chính ngay lập tức!",
    ],
    quiz: [
      {
        question: "Chọn câu đúng khi đưa „Morgen“ lên đầu câu:",
        options: [
          "Morgen ich gehe zur Arbeit.",
          "Morgen gehe ich zur Arbeit.",
          "Morgen zur Arbeit gehe ich.",
        ],
        answer: 1,
        explanation: "„Morgen“ chiếm Vị trí 1 → động từ chia „gehe“ bắt buộc đứng ở Vị trí 2, chủ ngữ „ich“ đứng ngay sau ở Vị trí 3.",
      },
    ],
  },
  {
    slug: "dat-cau-hoi-trong-tieng-duc",
    categoryId: "satzbau",
    order: 2,
    code: "S2",
    title: "Đặt câu hỏi: Ja/Nein (+ doch), W-Fragen & Câu hỏi gián tiếp",
    germanTitle: "Fragen stellen (Ja/Nein, W-Fragen, Indirekte Fragen)",
    level: "A1",
    summary: "4 dạng câu hỏi tiếng Đức: câu hỏi Có/Không & cách dùng „doch“, trọn bộ 12 từ để hỏi W-Fragen, câu hỏi đi kèm giới từ và câu hỏi gián tiếp lịch sự với „ob“ / W-Wort.",
    sections: [
      {
        id: "ja-nein-doch",
        heading: "1. Câu hỏi Có/Không (Ja/Nein-Fragen) & Bí quyết dùng „doch“",
        blocks: [
          {
            type: "rule",
            title: "Trật tự câu hỏi Có/Không",
            formula: "Động từ chia (Vị trí 1)  +  Chủ ngữ (Vị trí 2)  +  Phần còn lại?",
            note: "VD: Kommst du heute zur Party? · Geht er morgen arbeiten?",
          },
          {
            type: "tip",
            variant: "warning",
            title: "Khi nào trả lời „doch“ thay vì „ja“?",
            content:
              "Với **câu hỏi có phủ định (*nicht / kein*)**, nếu bạn muốn **phản bác lại (khẳng định là CÓ)**, bạn PHẢI dùng **„Doch!“** chứ không dùng *„Ja“*!\n• *Machst du **keinen** Sport?* (Bạn không tập thể thao à?)\n  → **Nein**, nie. (Đúng rồi, không bao giờ tập.)\n  → **Doch!** Dreimal pro Woche. (**Có chứ!** 3 lần một tuần!)",
          },
        ],
      },
      {
        id: "w-fragen",
        heading: "2. Trọn bộ 12 từ để hỏi W-Fragen (Vị trí 1: W-Wort · Vị trí 2: Động từ)",
        blocks: [
          {
            type: "table",
            caption: "12 từ để hỏi cốt lõi trong tiếng Đức",
            headers: ["Từ để hỏi", "Hỏi về điều gì?", "Ví dụ & Trả lời"],
            rows: [
              ["**Wer?**", "Chủ ngữ (Người — Nom)", "*Wer bist du? — Ich bin Jan.*"],
              ["**Wen?**", "Tân ngữ trực tiếp (Người — Akk)", "*Wen hast du gesehen? — Meinen Chef.*"],
              ["**Wem?**", "Tân ngữ gián tiếp (Người — Dat)", "*Wem gehört das Auto? — Meinem Mann.*"],
              ["**Was?**", "Vật / sự việc / hành động", "*Was machst du? — Ich höre Musik.*"],
              ["**Wessen?**", "Sở hữu (Genitiv)", "*Wessen Hund ist das? — Annas Hund.*"],
              ["**Wo?**", "Vị trí tĩnh (Ở đâu)", "*Wo wohnst du? — In Dortmund.*"],
              ["**Wohin?**", "Hướng đi (Đi đâu)", "*Wohin gehst du? — Nach Hause.*"],
              ["**Woher?**", "Xuất xứ (Từ đâu)", "*Woher kommst du? — Von der Arbeit.*"],
              ["**Wann?**", "Thời điểm (Khi nào)", "*Wann fährst du? — Nächste Woche.*"],
              ["**Warum?**", "Lý do (Tại sao)", "*Warum rufst du nicht an? — Weil mein Akku leer ist.*"],
              ["**Wie?**", "Tính chất / cách thức", "*Wie geht es dir? — Gut.*"],
              ["**Welche(r/s)?**", "Lựa chọn (Cái nào)", "*Welches Auto kaufst du? — Das blaue!*"],
            ],
          },
        ],
      },
      {
        id: "cau-hoi-gian-tiep",
        heading: "3. Câu hỏi gián tiếp lịch sự (Indirekte Fragen — A2/B1)",
        blocks: [
          {
            type: "text",
            content:
              "Câu hỏi gián tiếp (lồng vào sau *Können Sie mir sagen...*, *Ich weiß nicht...*, *Weißt du...*) nghe **lịch sự và mềm mại hơn nhiều** so với hỏi thẳng. Vì câu hỏi gián tiếp là một **mệnh đề phụ (Nebensatz)**, **động từ chia bị đẩy về cuối câu**!",
          },
          {
            type: "compare",
            leftTitle: "Câu hỏi Có/Không → dùng „ob“ (liệu có... không)",
            leftItems: [
              "*Ist Herr Meier schon da?* → *Wissen Sie, **ob** Herr Meier schon da **ist**?*",
              "*Habe ich den Herd ausgemacht?* → *Ich weiß nicht, **ob** ich den Herd **ausgemacht habe**.*",
            ],
            rightTitle: "Câu hỏi W-Fragen → GIỮ NGUYÊN từ để hỏi W",
            rightItems: [
              "*Wo ist hier die Kantine?* → *Können Sie mir sagen, **wo** hier die Kantine **ist**?*",
              "*Warum müssen wir warten?* → *Weißt du, **warum** wir alle **warten müssen**?*",
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Câu hỏi Có/Không đặt động từ chia ở Vị trí 1; phản bác câu hỏi phủ định phải trả lời „Doch!“.",
      "W-Fragen đặt từ để hỏi ở Vị trí 1, động từ chia ở Vị trí 2.",
      "Câu hỏi gián tiếp là mệnh đề phụ (động từ về cuối): dạng Có/Không dùng „ob“, dạng W giữ nguyên từ W.",
    ],
    quiz: [
      {
        question: "„Trinkst du keinen Kaffee?“ — Nếu bạn CÓ uống cà phê, bạn trả lời thế nào?",
        options: ["Ja, ich trinke gern Kaffee.", "Doch, ich trinke gern Kaffee.", "Nein, ich trinke gern Kaffee."],
        answer: 1,
        explanation: "Câu hỏi có phủ định „keinen“ nên để khẳng định ngược lại (CÓ uống), bắt buộc dùng „Doch!“.",
      },
      {
        question: "Chuyển sang câu hỏi gián tiếp đúng: „Wann fährt der Zug ab?“ → „Können Sie mir sagen, ...“",
        options: [
          "..., wann fährt der Zug ab?",
          "..., ob der Zug abfährt?",
          "..., wann der Zug abfährt?",
        ],
        answer: 2,
        explanation: "Câu hỏi W gián tiếp giữ nguyên „wann“ và đẩy động từ về cuối (động từ tách „abfahren“ viết liền lại thành „abfährt“).",
      },
    ],
  },
  {
    slug: "phu-dinh-va-vi-tri-cua-nicht",
    categoryId: "satzbau",
    order: 3,
    code: "S3",
    title: "Phủ định (Nein, Kein, Nicht) & 7 quy tắc vị trí của „nicht“",
    germanTitle: "Die Verneinung & Position von „nicht“",
    level: "A2",
    summary: "Phân biệt rõ Nein vs Kein vs Nicht, cặp từ phủ định trái nghĩa (jemand↔niemand, immer↔nie...) và quy tắc đặt đúng vị trí của „nicht“ trong câu.",
    sections: [
      {
        id: "ba-cach-phu-dinh",
        heading: "1. Phân biệt „Nein“, „Kein“, „Nicht“ & Cặp từ phủ định",
        blocks: [
          {
            type: "list",
            items: [
              "**Nein:** CHỈ dùng để trả lời „Không“ cho câu hỏi (*Willst du ein Eis? — **Nein!**).",
              "**Kein:** CHỈ phủ định **Danh từ không có mạo từ** hoặc **Danh từ có mạo từ không xác định (ein/eine)** (*Ich habe **keinen** Durst. Das ist **kein** Hund.*).",
              "**Nicht:** Phủ định **TẤT CẢ những thứ còn lại** — động từ, tính từ, trạng từ, đại từ, tên riêng, cụm giới từ, danh từ có *der/die/das* hoặc *mein/dein*, và cả câu!",
            ],
          },
          {
            type: "table",
            caption: "4 cặp từ phủ định trái nghĩa (dùng trực tiếp từ đối lập thay cho „nicht“)",
            headers: ["Khẳng định", "Phủ định tương ứng", "Ví dụ"],
            rows: [
              ["**jemand** *(ai đó)*", "**niemand** *(không ai)*", "*Siehst du jemanden? — Ich sehe **niemanden**!*"],
              ["**etwas** *(cái gì đó)*", "**nichts** *(không có gì)*", "*Darfst du etwas kaufen? — Nein, **nichts**!*"],
              ["**überall / irgendwo** *(mọi nơi / đâu đó)*", "**nirgends / nirgendwo** *(không đâu cả)*", "*Ich finde mein Handy **nirgendwo**!*"],
              ["**immer** *(luôn luôn)*", "**nie / niemals** *(không bao giờ)*", "*Die Serie kommt **nie** morgens.*"],
            ],
          },
        ],
      },
      {
        id: "vi-tri-cua-nicht",
        heading: "2. Bảy quy tắc đặt vị trí của „nicht“ (Cực rõ ràng!)",
        blocks: [
          {
            type: "rule",
            title: "Nguyên tắc vàng duy nhất để nhớ cả 7 trường hợp",
            formula: "„nicht“ đứng NGAY TRƯỚC thành phần muốn phủ định!   (Chỉ đứng CUỐI CÂU khi phủ định động từ chia ở Vị trí 2 trong câu chỉ có 1 động từ!)",
          },
          {
            type: "table",
            caption: "Vị trí chính xác của „nicht“ trong từng tình huống",
            headers: ["Thành phần cần phủ định", "Vị trí của „nicht“", "Ví dụ"],
            rows: [
              ["Trạng từ", "**Trước** trạng từ", "*Ich wandere **nicht** gern.*"],
              ["Tính từ", "**Trước** tính từ", "*Ich bin **nicht** schlau.*"],
              ["Đại từ / Tên riêng", "**Trước** đại từ / tên riêng", "*Das ist **nicht** Susi. Ich habe **nicht** dich angerufen.*"],
              ["Cụm có Giới từ", "**Trước** giới từ", "*Ich komme **nicht** zu deiner Party.* · *Er kommt **nicht** vor 20 Uhr.*"],
              ["Danh từ có *der/die/das, mein...*", "**Trước** mạo từ *(hay đi với sondern)*", "*Er hat **nicht** das Auto, sondern das Fahrrad bezahlt.*"],
              ["**Cả câu (1 động từ ở P2)**", "**CUỐI CÂU** *(vì động từ P2 không rời chỗ)*", "*Ich kaufe das Auto **nicht**.* *(Khác với „Ich kaufe nicht das Auto“ = không mua chiếc xe NÀY mà mua cái khác)*"],
              ["**Cả câu (có 2 động từ / động từ tách)**", "**Ngay TRƯỚC động từ chính / tiền tố ở cuối câu**", "*Ich möchte das Auto **nicht** kaufen.* · *Ich habe das Auto **nicht** gekauft.*"],
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Nein trả lời câu hỏi; Kein phủ định danh từ không mạo từ hoặc đi với ein/eine; Nicht phủ định mọi thứ còn lại.",
      "„nicht“ luôn đứng ngay TRƯỚC thành phần cần phủ định (tính từ, trạng từ, giới từ, động từ thứ 2 ở cuối câu).",
      "„nicht“ chỉ đứng ở cuối cùng của câu khi phủ định động từ chia duy nhất ở Vị trí 2 (Ich kaufe das Auto nicht).",
    ],
    quiz: [
      {
        question: "Chọn câu phủ định tự nhiên cho „Hôm nay tôi không đến bữa tiệc của bạn đâu“:",
        options: [
          "Ich komme zu deiner Party nicht.",
          "Ich komme nicht zu deiner Party.",
          "Ich nicht komme zu deiner Party.",
        ],
        answer: 1,
        explanation: "Khi có cụm giới từ (zu deiner Party), „nicht“ đứng ngay trước giới từ → nicht zu deiner Party.",
      },
      {
        question: "Chọn câu đúng ở thì Perfekt: „Tôi đã không mua chiếc xe đó.“",
        options: [
          "Ich habe das Auto gekauft nicht.",
          "Ich habe nicht das Auto gekauft.",
          "Ich habe das Auto nicht gekauft.",
        ],
        answer: 2,
        explanation: "Trong câu có 2 động từ (Perfekt/Modalverb), „nicht“ đứng ngay trước động từ chính (Partizip 2 / Infinitiv) ở cuối câu.",
      },
    ],
  },
  {
    slug: "khung-cau-satzklammern",
    categoryId: "satzbau",
    order: 4,
    code: "S4",
    title: "Khung câu (Satzklammern) trong tiếng Đức",
    germanTitle: "Satzklammern",
    level: "A2",
    summary: "Hiểu tư duy „khung động từ“ đặc trưng nhất của tiếng Đức trong 6 cấu trúc (động từ tách, Modalverb, Perfekt, Plusquamperfekt, Futur, Passiv).",
    sections: [
      {
        id: "sau-khung-cau",
        heading: "1. Khung câu (Satzklammer) là gì? 6 trường hợp tạo khung",
        blocks: [
          {
            type: "text",
            content:
              "Khác với tiếng Việt hay tiếng Anh (2 động từ đứng sát nhau: *I **must clean** the apartment today*), tiếng Đức **tách đôi cụm động từ ra để ôm lấy toàn bộ thông tin ở giữa**: **động từ chia giữ Vị trí 2**, còn **tiền tố tách hoặc động từ thứ 2 bay thẳng về CUỐI CÂU**! Hãy nhớ: khi nghe người Đức nói, phải đợi đến **từ cuối cùng** mới biết chính xác hành động là gì!",
          },
          {
            type: "table",
            caption: "6 cấu trúc tạo Satzklammer trong Hauptsatz (với cùng 1 ví dụ: dọn căn hộ hôm nay)",
            headers: ["Cấu trúc", "Vị trí 1", "Vị trí 2 (Mở khung)", "Thông tin nằm trong khung", "Cuối câu (Đóng khung)"],
            rows: [
              ["**Động từ tách**", "Ich", "**räume**", "heute die Wohnung", "**auf**."],
              ["**Modalverb**", "Ich", "**muss**", "heute die Wohnung", "**aufräumen**."],
              ["**Perfekt**", "Ich", "**habe**", "heute die Wohnung", "**aufgeräumt**."],
              ["**Plusquamperfekt**", "Ich", "**hatte**", "heute die Wohnung", "**aufgeräumt**."],
              ["**Futur 1**", "Ich", "**werde**", "heute die Wohnung", "**aufräumen**."],
              ["**Passiv**", "Die Wohnung", "**wird**", "heute von mir", "**aufgeräumt**."],
            ],
          },
          {
            type: "tip",
            variant: "note",
            title: "Trong Mệnh đề phụ (Nebensatz) thì KHÔNG có khung câu!",
            content:
              "Vì trong mệnh đề phụ, động từ chia cũng bị đẩy ra cuối câu nên tiền tố và động từ gặp lại nhau: *Ich stehe früh **auf*** (HS: có khung) → *Ich gehe früh ins Bett, **weil** ich immer früh **aufstehe*** (NS: ghép liền lại!).",
          },
        ],
      },
    ],
    keyPoints: [
      "Mỗi khi mệnh đề chính có động từ tách hoặc từ 2 động từ trở lên (Modalverb, Perfekt, Plusquamperfekt, Futur, Passiv), tiếng Đức tạo ra khung câu (Satzklammer).",
      "Mở khung ở Vị trí 2 (động từ chia) — Đóng khung ở CUỐI CÂU (tiền tố / Infinitiv / Partizip 2).",
    ],
    quiz: [
      {
        question: "Chọn câu có khung câu (Satzklammer) đúng ở thì Perfekt:",
        options: [
          "Ich habe aufgeräumt heute mein Zimmer.",
          "Ich habe heute mein Zimmer aufgeräumt.",
          "Ich heute habe mein Zimmer aufgeräumt.",
        ],
        answer: 1,
        explanation: "Trợ động từ „habe“ ở Vị trí 2 mở khung, „aufgeräumt“ đóng khung ở cuối câu, mọi thông tin khác nằm ở giữa.",
      },
    ],
  },
  {
    slug: "menh-de-phu-nebensaetze-va-dass-ob",
    categoryId: "satzbau",
    order: 5,
    code: "S5",
    title: "Mệnh đề phụ (Nebensätze) & Mệnh đề „dass“ vs „ob“",
    germanTitle: "Nebensätze, „dass“-Sätze & „ob“",
    level: "A2",
    summary: "Quy tắc vị trí từ trong Nebensatz (HS+NS và NS+HS), ngoại lệ 2 Infinitiv (B2) và phân biệt rõ khi nào dùng „dass“ (chắc chắn) hay „ob“ (không chắc chắn).",
    sections: [
      {
        id: "quy-tac-nebensatz",
        heading: "1. Quy tắc trật tự từ của Mệnh đề phụ (HS + NS và NS + HS)",
        blocks: [
          {
            type: "table",
            caption: "Hai cách sắp xếp Mệnh đề chính (HS) và Mệnh đề phụ (NS) — LUÔN có dấu phẩy ngăn cách!",
            headers: ["Kiểu sắp xếp", "Cấu trúc", "Ví dụ"],
            rows: [
              ["**HS + NS** *(phổ biến nhất)*", "Hauptsatz **,** Liên từ + Chủ ngữ + ... + **Động từ chia**.", "Ich kaufe mir ein Auto**, wenn** ich genug Geld **habe**."],
              ["**NS + HS** *(nhấn mạnh vế phụ)*", "Liên từ + ... + **Động từ chia**, **Động từ HS** + Chủ ngữ HS + ...", "**Wenn** ich genug Geld **habe, kaufe** ich mir ein Auto.\n*(Nhớ công thức: **Động từ – Dấu phẩy – Động từ**!)*"],
            ],
          },
          {
            type: "tip",
            variant: "warning",
            title: "Ngoại lệ cực hay ra thi B2: Perfekt với Modalverb (2 Infinitiv) trong Nebensatz!",
            content:
              "Bình thường động từ chia đứng cuối cùng (*..., weil ich noch einkaufen gehen **muss***). Nhưng khi có **haben + 2 động từ nguyên thể** (Modalverb / lassen / sehen / hören ở Perfekt), **„haben“ nhảy ra ĐỨNG TRƯỚC 2 động từ nguyên thể**:\n• *..., weil ich meine Mutter vom Bahnhof **habe abholen müssen**.* (KHÔNG viết *abholen müssen habe*!)",
          },
        ],
      },
      {
        id: "dass-vs-ob",
        heading: "2. Mệnh đề bổ ngữ „dass“ vs „ob“",
        blocks: [
          {
            type: "compare",
            leftTitle: "„dass“ (rằng — KHI BIẾT / CHẮC CHẮN / NÊU Ý KIẾN)",
            leftItems: [
              "Dùng sau động từ tri thức/suy nghĩ (*wissen, glauben, denken, meinen, hoffen, sicher sein*).",
              "Dùng sau cảm xúc/đánh giá (*finden, es ist wichtig, es tut mir leid, sich freuen, Angst haben*).",
              "*Ich weiß, **dass** du mich **liebst**.* (chắc chắn)",
              "*Es ist wichtig, **dass** du jeden Tag Deutsch **lernst**.*",
            ],
            rightTitle: "„ob“ (liệu có... không — KHI KHÔNG CHẮC / PHÂN VÂN)",
            rightItems: [
              "Dùng khi **chưa rõ Có hay Không**, kiểm tra, nghi ngờ (*nicht wissen, keine Ahnung haben, fragen, überprüfen*).",
              "*Ich weiß nicht, **ob** du mich **liebst**.* (không chắc chắn)",
              "*Jan überprüft, **ob** er noch genug Geld **hat**.*",
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Mệnh đề phụ luôn cách mệnh đề chính bằng dấu phẩy và đẩy động từ chia về cuối.",
      "Khi đảo mệnh đề phụ lên đầu (NS + HS), tạo thành nhịp „Động từ NS, Động từ HS + Chủ ngữ HS“.",
      "Dùng „dass“ khi biết/chắc chắn/nêu cảm xúc; dùng „ob“ khi chưa biết chắc Có hay Không.",
    ],
    quiz: [
      {
        question: "Chọn câu đúng: „Ich bin nicht sicher, ___ das Geschäft heute geöffnet ist.“",
        options: ["dass", "ob", "weil"],
        answer: 1,
        explanation: "„nicht sicher sein“ diễn tả sự không chắc chắn (Có hay Không) → bắt buộc dùng „ob“.",
      },
      {
        question: "Đảo vế phụ lên đầu cho đúng trật tự: „Ich bleibe zu Hause, weil ich krank bin.“",
        options: [
          "Weil ich krank bin, ich bleibe zu Hause.",
          "Weil ich bin krank, bleibe ich zu Hause.",
          "Weil ich krank bin, bleibe ich zu Hause.",
        ],
        answer: 2,
        explanation: "Vế phụ giữ động từ „bin“ ở cuối; ngay sau dấu phẩy là động từ chia của vế chính „bleibe“ (Động từ, Động từ!).",
      },
    ],
  },
  {
    slug: "menh-de-nguyen-nhan-nhuong-bo-dieu-kien",
    categoryId: "satzbau",
    order: 6,
    code: "S6",
    title: "Mệnh đề Nguyên nhân (weil/da), Nhượng bộ (obwohl) & Điều kiện (wenn/falls)",
    germanTitle: "Kausal-, Konzessiv- & Konditionalsätze",
    level: "A2",
    summary: "Phân biệt sắc thái weil vs da, so sánh logic giữa Kausal (weil) và Konzessiv (obwohl), phân biệt wenn/falls/sofern và cách rút gọn bỏ „wenn“.",
    sections: [
      {
        id: "kausal-weil-da",
        heading: "1. Mệnh đề Nguyên nhân (Kausalsätze): „weil“ vs „da“",
        blocks: [
          {
            type: "text",
            content:
              "Trả lời cho câu hỏi *Warum? Wieso? Weshalb?* (Tại sao?). Về ngữ pháp, **weil** và **da** hoàn toàn đồng nghĩa và đều đẩy động từ về cuối câu. Sự khác biệt chỉ nằm ở **thói quen vị trí**:",
          },
          {
            type: "compare",
            leftTitle: "„weil“ (Thường đứng SAU mệnh đề chính)",
            leftItems: [
              "*Stefan arbeitet nicht, **weil** er krank **ist**.*",
              "Có thể đứng độc lập 1 mình khi trả lời trực tiếp câu hỏi *Warum?*: *Warum bist du zu spät? — **Weil** ich den Bus verpasst **habe**!*",
            ],
            rightTitle: "„da“ (Thường đứng ĐẦU câu — lý do đã biết)",
            rightItems: [
              "***Da** er krank **ist**, arbeitet Stefan heute nicht.*",
              "Rất tự nhiên trong văn viết & email khi nêu nguyên nhân trước rồi mới kết luận.",
            ],
          },
        ],
      },
      {
        id: "konzessiv-obwohl",
        heading: "2. Mệnh đề Nhượng bộ (Konzessivsätze): „obwohl“ (mặc dù)",
        blocks: [
          {
            type: "text",
            content:
              "Diễn tả một **kết quả trái ngược / phi logic** so với điều kiện nêu ra (đồng nghĩa: *obgleich*, ít dùng hơn). So sánh cực dễ hiểu với *weil*:",
          },
          {
            type: "examples",
            title: "So sánh Logic (weil) vs Phi logic (obwohl)",
            items: [
              { de: "Ich habe die Prüfung bestanden, **weil** ich viel gelernt **hatte**.", vi: "Tôi đã đỗ kỳ thi VÌ tôi đã học rất nhiều.", note: "Kết quả hợp logic → weil." },
              { de: "Ich habe die Prüfung nicht bestanden, **obwohl** ich viel gelernt **hatte**.", vi: "Tôi đã trượt kỳ thi MẶC DÙ tôi đã học rất nhiều.", note: "Kết quả trái mong đợi → obwohl." },
              { de: "**Obwohl** ich viel Geld **habe**, kaufe ich kein neues Auto.", vi: "Mặc dù tôi có nhiều tiền nhưng tôi không mua xe mới." },
            ],
          },
        ],
      },
      {
        id: "konditional-wenn-falls",
        heading: "3. Mệnh đề Điều kiện (Konditionalsätze): „wenn“, „falls“, „sofern“",
        blocks: [
          {
            type: "table",
            caption: "Phân biệt mức độ xác suất giữa wenn, falls và sofern",
            headers: ["Liên từ", "Sắc thái xác suất", "Ví dụ"],
            rows: [
              ["**wenn**", "Trung tính (nếu / khi)", "***Wenn** das Wetter schön **ist**, gehe ich spazieren.*"],
              ["**falls**", "Xác suất xảy ra **thấp hơn** („phòng khi / trong trường hợp“)", "***Falls** ich keine Zeit **habe**, gebe ich dir Bescheid.* (Nhiều khả năng là tôi có thời gian.)"],
              ["**sofern**", "Xác suất thấp *(trang trọng, thường kèm phủ định/điều kiện chặt)*", "***Sofern** es nicht **regnet**, findet das Fest draußen statt.*"],
            ],
          },
          {
            type: "tip",
            variant: "tip",
            title: "Rút gọn bỏ „wenn“ (Động từ lên Vị trí 1 — tạo sắc thái cảnh báo / điều kiện gọn)",
            content:
              "Khi vế điều kiện đứng đầu câu, bạn có thể **bỏ „wenn“** và đưa động từ lên Vị trí 1: ***Wenn** du zu spät **kommst**, gibt es Ärger* = ***Kommst** du zu spät, gibt es Ärger!* (Còn nếu nói về điều kiện không có thật trong quá khứ thì bắt buộc dùng **Konjunktiv 2**: *Wenn ich mehr gelernt **hätte**, **hätte** ich bestanden*).",
          },
        ],
      },
    ],
    keyPoints: [
      "„weil“ hay đứng sau HS (và trả lời trực tiếp câu hỏi Warum?); „da“ hay đứng đầu câu.",
      "„obwohl“ diễn tả kết quả ngược lại điều hợp lý (trái nghĩa với „weil“).",
      "„falls“ mang nghĩa „nếu chẳng may / phòng khi“ (xác suất thấp hơn „wenn“). Khi vế điều kiện đứng đầu, có thể bỏ „wenn“ và đưa động từ lên Vị trí 1.",
    ],
    quiz: [
      {
        question: "Chọn liên từ đúng: „Er geht heute joggen, ___ es stark regnet.“",
        options: ["weil", "obwohl", "falls"],
        answer: 1,
        explanation: "Trời mưa to mà vẫn đi chạy bộ là kết quả trái logic/mong đợi → dùng „obwohl“ (mặc dù).",
      },
    ],
  },
  {
    slug: "menh-de-muc-dich-ket-qua-phuong-thuc",
    categoryId: "satzbau",
    order: 7,
    code: "S7",
    title: "Mệnh đề Mục đích (damit / um...zu), Kết quả (sodass) & Phương thức (indem)",
    germanTitle: "Final-, Konsekutiv- & Modalsätze",
    level: "B1",
    summary: "Phân biệt chuẩn xác damit vs um...zu (và 3 Modalverb cấm dùng trong câu mục đích!), 2 dạng sodass vs so...dass, cùng indem, dadurch dass, ohne/anstatt.",
    sections: [
      {
        id: "final-damit-um-zu",
        heading: "1. Mệnh đề Mục đích (Finalsätze): „damit“ vs „um ... zu“",
        blocks: [
          {
            type: "compare",
            leftTitle: "um ... zu + Infinitiv (CHỈ khi 2 vế CÙNG CHỦ NGỮ)",
            leftItems: [
              "Gọn và tự nhiên hơn; lược bỏ chủ ngữ ở vế sau.",
              "*Ich arbeite viel, **um** mir den Urlaub leisten **zu können**.*",
              "*Man braucht ein Auto, **um** in den Urlaub fahren **zu können**.*",
            ],
            rightTitle: "damit + Nebensatz (Dùng được MỌI LÚC — BẮT BUỘC khi KHÁC CHỦ NGỮ!)",
            rightItems: [
              "*China baut einen Staudamm, **damit** **die Menschen** Strom nutzen **können**.* (Chủ ngữ 1: China ≠ Chủ ngữ 2: die Menschen → KHÔNG dùng *um...zu* được!)",
              "*Ich lerne Deutsch, **damit** ich in Deutschland arbeiten **kann**.*",
            ],
          },
          {
            type: "tip",
            variant: "warning",
            title: "Cạm bẫy thi B1: KHÔNG dùng „wollen / möchten / sollen“ trong Finalsatz!",
            content:
              "Vì *wollen, möchten, sollen* bản thân đã mang nghĩa „mục đích/ý muốn“ nên không lặp lại trong *damit / um...zu*! Hãy **bỏ đi** hoặc **thay bằng „können“**:\n*Ich will viel reisen* → *Ich spare Geld, **um** viel **zu reisen*** (hoặc ***um** viel reisen **zu können*** — KHÔNG viết *um reisen zu wollen*!).",
          },
        ],
      },
      {
        id: "konsekutiv-sodass",
        heading: "2. Mệnh đề Kết quả (Konsekutivsätze): „sodass“ vs „so ... dass“",
        blocks: [
          {
            type: "text",
            content:
              "Diễn tả **hậu quả / kết quả** (mệnh đề chính LUÔN đứng trước mệnh đề phụ!). Có 2 cách viết:",
          },
          {
            type: "examples",
            title: "Hai dạng „sodass“ và „so + Tính từ, dass“",
            items: [
              { de: "Es regnete zu wenig, **sodass** viele Menschen kein Wasser **hatten**.", vi: "Trời mưa quá ít, đến nỗi nhiều người không có nước uống.", note: "Dùng „sodass“ liền khi có từ „zu“ trước tính từ hoặc không có tính từ nhấn mạnh." },
              { de: "Ich habe **so** viel gelernt, **dass** ich die Prüfung leicht **bestanden habe**.", vi: "Tôi đã học nhiều ĐẾN NỖI tôi đã vượt qua kỳ thi dễ dàng.", note: "Khi có tính từ/trạng từ (như viel, wenig, müde...) không kèm „zu“ → tách „so ... dass“ phổ biến hơn nhiều!" },
            ],
          },
        ],
      },
      {
        id: "modal-indem",
        heading: "3. Mệnh đề Phương thức (Modalsätze): „indem“, „ohne“, „anstatt“",
        blocks: [
          {
            type: "table",
            caption: "3 nhóm Modalsätze (trả lời Wie? Wodurch? — bằng cách nào?)",
            headers: ["Liên từ / Cấu trúc", "Ý nghĩa", "Ví dụ"],
            rows: [
              ["**indem / dadurch (,) dass**", "Bằng cách... (nêu phương tiện/cách làm)", "*Man kann Millionär werden, **indem** man im Lotto **gewinnt**.*\n*Man kann **dadurch** sparen, **dass** man selbst **kocht**.*"],
              ["**ohne dass** *(khác CN)*\n**ohne ... zu** *(cùng CN)*", "Mà không... (hạn chế / phủ định)", "*Ich gehe an den Strand, **ohne** eine Badehose **zu tragen**.*\n*Meine Tochter schlief ein, **ohne dass** ich ihr ein Lied **vorsang**.*"],
              ["**(an)statt dass** *(khác CN)*\n**(an)statt ... zu** *(cùng CN)*", "Thay vì... (hành động thay thế)", "*Ich schwimme im Pool, **anstatt** im Meer **zu schwimmen**.*"],
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Mục đích: cùng chủ ngữ ưu tiên „um...zu“; khác chủ ngữ BẮT BUỘC dùng „damit“. Không dùng wollen/möchten/sollen trong Finalsatz!",
      "Kết quả: „sodass“ (hoặc „so + Tính từ, dass“ — vế nguyên nhân luôn đứng trước).",
      "Phương thức: „indem“ (bằng cách); „ohne...zu / ohne dass“ (mà không); „(an)statt...zu / anstatt dass“ (thay vì).",
    ],
    quiz: [
      {
        question: "Chọn câu đúng: „Tôi giải thích chậm lại để học sinh hiểu được.“ (2 chủ ngữ khác nhau: ich ≠ die Schüler)",
        options: [
          "Ich erkläre langsam, um die Schüler zu verstehen.",
          "Ich erkläre langsam, damit die Schüler es verstehen.",
          "Ich erkläre langsam, sodass die Schüler zu verstehen.",
        ],
        answer: 1,
        explanation: "Chủ ngữ vế chính (ich) khác chủ ngữ vế phụ (die Schüler) → bắt buộc dùng „damit“.",
      },
      {
        question: "Điền liên từ đúng: „Du kannst dein Deutsch verbessern, ___ du jeden Tag hörst und sprichst.“",
        options: ["indem", "sodass", "obwohl"],
        answer: 0,
        explanation: "Nêu cách thức/phương pháp để đạt mục tiêu („bằng cách...“) → dùng „indem“.",
      },
    ],
  },
  {
    slug: "menh-de-thoi-gian-va-als-hay-wenn",
    categoryId: "satzbau",
    order: 8,
    code: "S8",
    title: "Mệnh đề Thời gian (Temporalsätze) & Phân biệt „als“ hay „wenn“",
    germanTitle: "Temporalsätze & Als oder wenn?",
    level: "B1",
    summary: "Trọn bộ 7 liên từ thời gian (während, solange, bis, seit/seitdem, nachdem, sobald/sowie, bevor/ehe), quy tắc lệch 1 bậc thì của „nachdem/sobald“ và cách phân biệt „als“ vs „wenn“.",
    sections: [
      {
        id: "bay-lien-tu-thoi-gian",
        heading: "1. Bảy liên từ thời gian cốt lõi & Quy tắc hòa hợp thì",
        blocks: [
          {
            type: "table",
            caption: "Tổng hợp 7 liên từ Temporalsätze (đều đẩy động từ về cuối!)",
            headers: ["Liên từ", "Quan hệ thời gian", "Ví dụ"],
            rows: [
              ["**während**", "2 việc xảy ra **cùng lúc** (trong khi)", "*Ich koche, **während** du die Wohnung **aufräumst**.*"],
              ["**solange**", "2 việc cùng lúc & **bắt đầu/kết thúc trùng khớp** (chừng nào còn...)", "***Solange** du bei mir **bist**, habe ich keine Angst.*"],
              ["**bis**", "Kéo dài **cho đến mốc** cả 2 kết thúc", "*Ich warte hier, **bis** du **zurückkommst**.*"],
              ["**seit / seitdem**", "Bắt đầu trong quá khứ & **vẫn đang tiếp diễn**", "*Ich lerne Deutsch, **seitdem** ich in Deutschland **wohne**.*\n***Seitdem** ich den Unfall **hatte**, sitze ich im Rollstuhl.*"],
              ["**bevor / ehe**", "Vế chính xảy ra **TRƯỚC** vế phụ", "*Ich putze mir die Zähne, **bevor** ich schlafen **gehe**.*"],
              ["**nachdem** ★", "Vế phụ xảy ra **TRƯỚC** vế chính (sau khi — bất cứ lúc nào sau đó)", "***Nachdem** du den Müll **rausgebracht hast**, helfe ich dir.*"],
              ["**sobald / sowie** ★", "Vế chính xảy ra **NGAY LẬP TỨC** khi vế phụ vừa dứt (ngay khi)", "*Ich helfe dir, **sobald** du fertig **bist / geworden bist**.*"],
            ],
          },
          {
            type: "table",
            caption: "Quy tắc LỆCH 1 BẬC THÌ bắt buộc với „nachdem“ (và thường dùng với „sobald“)",
            headers: ["Thì của Mệnh đề chính (HS — xảy ra sau)", "Thì của Mệnh đề phụ (NS — xảy ra trước)"],
            rows: [
              ["**Präsens / Futur 1** *(Hiện tại / Tương lai)*", "**Perfekt / Präteritum** (*Ich helfe dir, nachdem du aufgeräumt **hast**.*)"],
              ["**Perfekt / Präteritum** *(Quá khứ)*", "**Plusquamperfekt** (*Ich habe dir geholfen, nachdem du aufgeräumt **hattest**.*)"],
            ],
          },
        ],
      },
      {
        id: "als-hay-wenn",
        heading: "2. Phân biệt „als“ hay „wenn“ (Cực dễ nhớ!)",
        blocks: [
          {
            type: "table",
            caption: "Quy tắc 3 dòng phân biệt „als“ vs „wenn“ không bao giờ nhầm",
            headers: ["Thời gian", "Chọn „als“ hay „wenn“?", "Ví dụ"],
            rows: [
              ["**Tương lai (Futur)**", "**LUÔN dùng „wenn“** (dù 1 lần hay nhiều lần)", "*Ich werde froh sein, **wenn** du gesund **zurückkommst**.*"],
              ["**Hiện tại (Präsens)**", "**LUÔN dùng „wenn“** (dù 1 lần hay nhiều lần)", "*(Immer) **wenn** ich nach Hause **laufe**, komme ich am Kino vorbei.*"],
              [
                "**Quá khứ (Vergangenheit)** ★",
                "• **Xảy ra ĐÚNG 1 LẦN → dùng „als“!**\n• **Xảy ra NHIỀU LẦN (lặp lại) → dùng „(immer) wenn“!**",
                "• ***Als** ich ein Kind **war**, spielte ich hier Fußball.* (chỉ làm trẻ con 1 lần!)\n• *(Immer) **wenn** ich in Berlin **war**, waren wir feiern.* (nhiều lần!)",
              ],
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Hiện tại & Tương lai luôn dùng „wenn“; Quá khứ 1 lần duy nhất dùng „als“, quá khứ lặp lại nhiều lần dùng „(immer) wenn“.",
      "„nachdem“ bắt buộc lệch 1 bậc thì: HS hiện tại/tương lai → NS Perfekt; HS quá khứ → NS Plusquamperfekt.",
      "„sobald“ nhấn mạnh việc 2 xảy ra NGAY LẬP TỨC sau việc 1 (khác „nachdem“ chỉ là sau đó).",
    ],
    quiz: [
      {
        question: "Chọn „als“ hay „wenn“: „___ ich letztes Jahr in München ankam, regnete es.“ (1 lần duy nhất trong quá khứ)",
        options: ["Wenn", "Als", "Während"],
        answer: 1,
        explanation: "Sự kiện xảy ra một lần duy nhất trong quá khứ (đến Munich năm ngoái) → bắt buộc dùng „Als“.",
      },
      {
        question: "Hoàn thành câu với „nachdem“: „Er ging ins Bett, nachdem er seine Hausaufgaben ___.“",
        options: ["gemacht hat", "macht", "gemacht hatte"],
        answer: 2,
        explanation: "Vế chính ở quá khứ (ging) → vế phụ „nachdem“ phải lùi 1 bậc thì sang Plusquamperfekt → gemacht hatte.",
      },
    ],
  },
  {
    slug: "menh-de-quan-he-lien-tu-va-infinitiv",
    categoryId: "satzbau",
    order: 9,
    code: "S9",
    title: "Mệnh đề Quan hệ, 3 loại Liên từ & Cấu trúc „Infinitiv mit zu“",
    germanTitle: "Relativsatz, Konjunktionen & Infinitivsätze",
    level: "B1",
    summary: "Mệnh đề quan hệ với der/die/das, wo, was, wo(r)+Präp; hệ thống 3 loại liên từ (Vị trí 0, đẩy động từ, 5 cặp 2 vế); toàn tập Infinitiv mit zu & Infinitivkonstruktionen.",
    sections: [
      {
        id: "relativsatz-wo-was",
        heading: "1. Mệnh đề Quan hệ (Relativsatz): der/die/das, „wo“, „was“",
        blocks: [
          {
            type: "text",
            content:
              "Mệnh đề quan hệ luôn nằm **giữa hai dấu phẩy** ngay sau từ nó bổ nghĩa và đẩy động từ về cuối. Ngoài đại từ quan hệ chuẩn (*der, die, das, welcher*), có 3 dạng đặc biệt rất hay dùng ở B1–B2:",
          },
          {
            type: "table",
            caption: "3 dạng mở rộng của Mệnh đề quan hệ",
            headers: ["Dạng", "Khi nào dùng?", "Ví dụ"],
            rows: [
              ["**wo** *(nơi mà)*", "Thay cho *Giới từ + Đại từ quan hệ* khi nói về **địa điểm** (rất phổ biến trong văn nói)", "*Gehen wir in das Restaurant, **wo** (= in dem) es Sushi **gibt**?* "],
              ["**was** *(điều mà / thứ mà)*", "Sau **Superlativ giống trung** (*das Beste*), đại từ bất định (*alles, etwas, nichts*), hoặc thay cho **cả câu phía trước**", "*Das ist das Beste, **was** ich je gemacht **habe**.*\n*Er spielt nachts Schlagzeug, **was** die Nachbarn **stört**.*"],
              ["**wo(r) + Giới từ**", "Thay cho cả câu phía trước khi động từ vế sau có **giới từ** (vì *was* không đi sau giới từ!)", "*Er hat mir geholfen, **wofür** ich ihm sehr dankbar **bin**.*"],
            ],
          },
        ],
      },
      {
        id: "ba-loai-lien-tu",
        heading: "2. Tổng hợp 3 loại Liên từ (Konjunktionen)",
        blocks: [
          {
            type: "table",
            caption: "Phân biệt rõ Vị trí từ của 3 nhóm Liên từ",
            headers: ["Loại liên từ", "Từ tiêu biểu", "Ảnh hưởng đến trật tự từ"],
            rows: [
              [
                "**1. Đẳng lập** *(Nebenordnend)*",
                "**und, oder, aber, denn, sondern, doch, außer**\n*(Nhớ: A-D-U-S-O! Phẩy trước aber, denn, doch, sondern; không cần phẩy trước und, oder)*",
                "**Vị trí 0** — KHÔNG đổi trật tự câu (*HS + HS* giữ nguyên Chủ ngữ + Động từ P2). Trừ *denn*, các từ khác có thể lược bỏ chủ ngữ/động từ trùng nhau.",
              ],
              [
                "**2. Phụ thuộc** *(Unterordnend)*",
                "**weil, da, dass, ob, wenn, als, obwohl, damit, sodass, indem, während, bevor, nachdem, bis, seit(dem), sobald, falls...**",
                "Mở đầu **Nebensatz** → đẩy **động từ chia về CUỐI câu**!",
              ],
              [
                "**3. Liên từ 2 vế** *(Mehrteilige Konjunktionen)*",
                "• **sowohl ... als auch** (vừa ... vừa)\n• **nicht nur ... sondern auch** (không chỉ ... mà còn)\n• **weder ... noch** (không ... cũng không)\n• **zwar ..., aber** (tuy ... nhưng)\n• **entweder ... oder** (hoặc ... hoặc)",
                "Thuộc nhóm đẳng lập (không đẩy động từ). Đứng trước từ cần nối; nếu đưa *Zwar / Entweder / Weder* lên **Vị trí 1** thì đảo động từ lên P2 (*Entweder **fahre** ich nach Berlin oder nach Wien*).",
              ],
            ],
          },
        ],
      },
      {
        id: "infinitiv-mit-zu",
        heading: "3. Mệnh đề nguyên thể (Infinitiv mit zu) & Các động từ KHÔNG dùng „zu“",
        blocks: [
          {
            type: "text",
            content:
              "Khi động từ mệnh đề chính tác động lên **một hành động thứ hai** ở mệnh đề phụ (và không có chủ ngữ mới ở vế phụ), tiếng Đức dùng **zu + Infinitiv** đặt ở cuối câu. Với **động từ tách được**, chữ **„zu“ chèn vào giữa tiền tố và thân**, viết liền thành 1 từ (*ab**zu**schließen, auf**zu**stehen, ein**zu**schlafen*)!",
          },
          {
            type: "compare",
            leftTitle: "DÙNG „zu + Infinitiv“",
            leftItems: [
              "**Bắt buộc dùng *zu*:** *versuchen, anfangen, beginnen, aufhören, vorhaben, sich weigern, warnen vor, vergessen, empfehlen...* (*Ich versuche, pünktlich **zu kommen**.*)",
              "**Thay cho „dass“** (khi chủ ngữ / tân ngữ khớp nhau): *Ich hoffe, bald gut Deutsch **zu sprechen**.* · *Der Kellner bittet den Mann, draußen **zu rauchen**.*",
              "**Cấu trúc *sein/finden + Tính từ* & *haben + Danh từ*:** *Ich habe Lust, ins Kino **zu gehen**.* · *Es ist leicht, das **zu lernen**.*",
              "**3 Infinitivkonstruktionen:** **um ... zu** (để), **ohne ... zu** (mà không), **(an)statt ... zu** (thay vì) — chỉ khi cùng chủ ngữ!",
            ],
            rightTitle: "TUYỆT ĐỐI KHÔNG DÙNG „zu“ (dùng khung câu trực tiếp!)",
            rightItems: [
              "**1. 6 Modalverben:** *können, müssen, dürfen, sollen, wollen, möchten* (*Ich soll Hausaufgaben **machen**.*)",
              "**2. Trợ động từ:** *werden, haben, sein* (*Ich werde morgen **kommen**.*)",
              "**3. Động từ di chuyển:** *gehen, fahren, laufen, kommen* (*Ich gehe morgen **einkaufen**.*)",
              "**4. 4 động từ đặc biệt:** **bleiben, lassen, sehen, hören** (*Ich lasse mein Auto **reparieren**.* · *Ich höre ihn **singen**.*)",
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Liên từ đẳng lập (und, oder, aber, denn, sondern) ở Vị trí 0; liên từ phụ thuộc (weil, dass, wenn...) đẩy động từ về cuối; trạng từ liên kết (deshalb, trotzdem) ở Vị trí 1.",
      "5 cặp liên từ 2 vế quan trọng ở B1–B2: sowohl...als auch, nicht nur...sondern auch, weder...noch, zwar...aber, entweder...oder.",
      "Infinitiv mit zu: chèn „zu“ vào giữa động từ tách được (aufzustehen). Tuyệt đối KHÔNG dùng „zu“ sau Modalverben, gehen/fahren/kommen, bleiben, lassen, sehen, hören!",
    ],
    quiz: [
      {
        question: "Chọn câu ĐÚNG với động từ tách được „aufstehen“ trong Infinitivsatz:",
        options: [
          "Ich schlage vor, morgen früh zu aufstehen.",
          "Ich schlage vor, morgen früh aufzustehen.",
          "Ich schlage vor, morgen früh aufstehen.",
        ],
        answer: 1,
        explanation: "Với động từ tách được, „zu“ chèn vào giữa tiền tố và thân động từ, viết liền thành một từ: aufzustehen.",
      },
      {
        question: "Câu nào sau đây KHÔNG được dùng „zu“ trước Infinitiv?",
        options: [
          "Ich vergesse oft, die Tür abzuschließen.",
          "Ich gehe morgen mit meinem Bruder einkaufen.",
          "Ich habe keine Zeit, heute zu kochen.",
        ],
        answer: 1,
        explanation: "„gehen“ là động từ chuyển động — thuộc nhóm KHÔNG dùng „zu“ trước Infinitiv (Ich gehe einkaufen).",
      },
      {
        question: "Chọn cặp liên từ 2 vế mang nghĩa „không ... cũng không ...“ (phủ định kép):",
        options: ["entweder ... oder", "sowohl ... als auch", "weder ... noch"],
        answer: 2,
        explanation: "„weder ... noch“ diễn tả phủ định kép (Max war weder in Brasilien noch in Kolumbien).",
      },
    ],
  },
];
