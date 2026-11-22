import type { GrammarLesson } from "./types";

export const ARTIKEL_LESSONS: GrammarLesson[] = [
  {
    slug: "mao-tu-xac-dinh-va-khong-xac-dinh",
    categoryId: "artikel",
    order: 1,
    code: "Ar1",
    title: "Mạo từ xác định & không xác định",
    germanTitle: "Bestimmter & Unbestimmter Artikel",
    level: "A1",
    summary: "Chức năng 3 trong 1 của mạo từ tiếng Đức, khi nào dùng der/die/das hay ein/eine và bảng biến cách đầy đủ trong 4 cách.",
    sections: [
      {
        id: "chuc-nang-mao-tu",
        heading: "1. Mạo từ cho ta biết 3 thông tin cùng lúc",
        blocks: [
          {
            type: "text",
            content:
              "Khác với tiếng Việt hay tiếng Anh (chỉ có *the / a*), mạo từ đứng trước danh từ tiếng Đức đồng thời báo hiệu **3 thông tin ngữ pháp**:\n- **Giống (Genus):** đực, cái hay trung\n- **Số (Numerus):** số ít hay số nhiều\n- **Cách (Kasus):** Nominativ, Akkusativ, Dativ hay Genitiv",
          },
          {
            type: "compare",
            leftTitle: "Mạo từ xác định (der, die, das)",
            leftItems: [
              "Nói về người/vật **cụ thể**, cả người nói và người nghe đều biết rõ là cái nào.",
              "Nói về thứ **đã được nhắc tới trước đó**.",
              "Nói về thứ **duy nhất / ai cũng biết** (*der Himmel* – bầu trời, *die Sonne* – mặt trời).",
            ],
            rightTitle: "Mạo từ không xác định (ein, eine)",
            rightItems: [
              "Nói về một người/vật **bất kỳ, chưa xác định**, một trong rất nhiều cái.",
              "Lần đầu tiên nhắc tới một đối tượng mới.",
              "**Không có dạng số nhiều!** Ở số nhiều không xác định ta bỏ trống mạo từ (Nullartikel).",
            ],
          },
        ],
      },
      {
        id: "bang-bien-cach",
        heading: "2. Bảng biến cách trong cả 4 Cách",
        blocks: [
          {
            type: "table",
            caption: "Mạo từ xác định (der, die, das) trong 4 Cách — BẢNG GỐC QUAN TRỌNG NHẤT",
            headers: ["Giống", "Nominativ", "Akkusativ", "Dativ", "Genitiv"],
            rows: [
              ["Maskulin", "{nom:der} Mann", "{akk:den} Mann", "{dat:dem} Mann", "{gen:des} Mannes"],
              ["Feminin", "{nom:die} Frau", "{akk:die} Frau", "{dat:der} Frau", "{gen:der} Frau"],
              ["Neutral", "{nom:das} Kind", "{akk:das} Kind", "{dat:dem} Kind", "{gen:des} Kindes"],
              ["Plural", "{nom:die} Eltern", "{akk:die} Eltern", "{dat:den} Eltern", "{gen:der} Eltern"],
            ],
          },
          {
            type: "table",
            caption: "Mạo từ không xác định (ein, eine) trong 4 Cách",
            headers: ["Giống", "Nominativ", "Akkusativ", "Dativ", "Genitiv"],
            rows: [
              ["Maskulin", "{nom:ein} Mann", "{akk:einen} Mann", "{dat:einem} Mann", "{gen:eines} Mannes"],
              ["Feminin", "{nom:eine} Frau", "{akk:eine} Frau", "{dat:einer} Frau", "{gen:einer} Frau"],
              ["Neutral", "{nom:ein} Kind", "{akk:ein} Kind", "{dat:einem} Kind", "{gen:eines} Kindes"],
              ["Plural", "– Eltern", "– Eltern", "– Eltern", "– Eltern"],
            ],
          },
          {
            type: "examples",
            title: "So sánh trực tiếp qua ví dụ",
            items: [
              { de: "{nom:Der Hund} holt {akk:einen Stock}.", vi: "Con chó (cụ thể đó) đi nhặt một cành cây (bất kỳ)." },
              { de: "Das ist {nom:der Mann}, {akk:den} ich gestern getroffen habe.", vi: "Đó là người đàn ông mà hôm qua tôi đã gặp.", note: "Đã xác định rõ → dùng der." },
              { de: "{nom:Ein Kind} isst {akk:ein Stück} Schokolade.", vi: "Một đứa trẻ đang ăn một miếng sô-cô-la." },
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Mạo từ đứng trước danh từ và thể hiện đồng thời Giống, Số và Cách.",
      "Dùng der/die/das cho cái cụ thể, duy nhất hoặc đã nhắc tới; dùng ein/eine cho cái bất kỳ, nhắc lần đầu.",
      "Mạo từ không xác định „ein“ KHÔNG tồn tại ở số nhiều.",
    ],
    quiz: [
      {
        question: "Chọn câu đúng cho số nhiều không xác định của „ein Auto“:",
        options: ["Dort stehen eine Autos.", "Dort stehen ein Autos.", "Dort stehen Autos."],
        answer: 2,
        explanation: "Mạo từ không xác định không có dạng số nhiều, nên ta bỏ trống mạo từ: Dort stehen Autos.",
      },
      {
        question: "Điền mạo từ xác định đúng: „Der Mann geht in ___ Wald.“ (der Wald, Wohin? → Akkusativ)",
        options: ["der", "den", "dem"],
        answer: 1,
        explanation: "„der Wald“ là giống đực, ở Akkusativ đổi thành „den Wald“.",
      },
    ],
  },
  {
    slug: "mao-tu-phu-dinh-kein-va-nullartikel",
    categoryId: "artikel",
    order: 2,
    code: "Ar2",
    title: "Mạo từ phủ định „kein“ & Không dùng mạo từ (Nullartikel)",
    germanTitle: "Negativartikel „kein“ & Nullartikel",
    level: "A1",
    summary: "Khi nào phủ định bằng „kein“ (thay vì „nicht“), bảng biến cách đầy đủ của „kein“ và 7 trường hợp không dùng mạo từ trong tiếng Đức.",
    sections: [
      {
        id: "negativartikel-kein",
        heading: "1. Mạo từ phủ định „kein“",
        blocks: [
          {
            type: "rule",
            title: "Khi nào dùng „kein“?",
            formula: "kein = phủ định danh từ KHÔNG có mạo từ (Nullartikel) HOẶC danh từ có mạo từ KHÔNG xác định (ein/eine)",
            note: "„kein“ chỉ đứng trước danh từ và chia đuôi y hệt mạo từ sở hữu (nhưng CÓ dạng số nhiều „keine“).",
          },
          {
            type: "table",
            caption: "Biến cách của „kein“ trong cả 4 Cách",
            headers: ["Giống", "Nominativ", "Akkusativ", "Dativ", "Genitiv"],
            rows: [
              ["Maskulin", "{nom:kein} Mann", "{akk:keinen} Mann", "{dat:keinem} Mann", "{gen:keines} Mannes"],
              ["Feminin", "{nom:keine} Frau", "{akk:keine} Frau", "{dat:keiner} Frau", "{gen:keiner} Frau"],
              ["Neutral", "{nom:kein} Kind", "{akk:kein} Kind", "{dat:keinem} Kind", "{gen:keines} Kindes"],
              ["Plural", "{nom:keine} Sterne", "{akk:keine} Sterne", "{dat:keinen} Sternen", "{gen:keiner} Sterne"],
            ],
          },
          {
            type: "examples",
            title: "Chuyển từ khẳng định sang phủ định với „kein“",
            items: [
              { de: "Ich habe Geld. → Ich habe {akk:kein} Geld.", vi: "Tôi có tiền. → Tôi không có tiền.", note: "Danh từ không mạo từ → phủ định bằng kein." },
              { de: "Ich habe ein Auto. → Ich habe {akk:kein} Auto.", vi: "Tôi có một chiếc ô tô. → Tôi không có ô tô.", note: "Danh từ có ein → phủ định bằng kein." },
              { de: "Er hat {akk:keinen} goldenen Ring gekauft.", vi: "Anh ấy đã không mua chiếc nhẫn vàng nào." },
            ],
          },
        ],
      },
      {
        id: "nullartikel",
        heading: "2. Bảy trường hợp KHÔNG dùng mạo từ (Nullartikel)",
        blocks: [
          {
            type: "text",
            content:
              "Thông thường trước danh từ luôn có mạo từ, nhưng trong **7 trường hợp sau** tiếng Đức bỏ trống mạo từ (gọi là **Nullartikel**):",
          },
          {
            type: "table",
            caption: "7 tình huống dùng Nullartikel (không có mạo từ)",
            headers: ["Trường hợp", "Ví dụ chuẩn", "Lưu ý / Ngoại lệ"],
            rows: [
              ["1. Danh từ số nhiều không xác định", "Dort stehen **Autos**. Hast du **Stifte**?", "Số ít dùng *ein/eine*, số nhiều bỏ trống."],
              ["2. Tên người & tên công ty", "Ich arbeite mit **Max** bei **Siemens**.", "Nếu có tính từ đứng trước thì phải có mạo từ: *mit **dem** netten Max*."],
              ["3. Sau đơn vị đo lường, khối lượng, số lượng", "eine Tasse **Tee**, 100g **Käse**, 10 **Eier**", "Danh từ chỉ vật liệu/món phía sau không có mạo từ."],
              ["4. Quốc tịch & ngôn ngữ", "Sie ist **Vietnamesin**. Er lernt **Deutsch**.", "Dùng trực tiếp sau *sein, sprechen, lernen*."],
              ["5. Thành phố, châu lục & đa số quốc gia", "Er kommt aus **Berlin**. Vietnam liegt in **Asien**.", "**Ngoại lệ các nước có mạo từ:** *die Schweiz, die Türkei, die USA, die Ukraine, der Iran...* → *aus **der** Schweiz*."],
              ["6. Nghề nghiệp sau **sein, werden, als**", "Er ist **Arzt**. Sie arbeitet als **Lehrerin**.", "Nếu nói đến 1 con người cụ thể (không phải nghề) thì vẫn dùng mạo từ: ***Der Arzt** macht einen Fehler*."],
              ["7. Vật liệu & chất liệu nói chung", "Der Tisch ist aus **Holz**. **Papier** wird aus **Holz** gemacht.", "Nếu chỉ 1 vật cụ thể thì có mạo từ: ***Das Papier** im Drucker ist alle*."],
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "„kein“ dùng để phủ định danh từ không có mạo từ hoặc đi với „ein/eine“.",
      "7 trường hợp bỏ mạo từ (Nullartikel): số nhiều không xác định, tên riêng/công ty, sau đơn vị đo, quốc tịch/ngôn ngữ, thành phố/châu lục/đa số nước, nghề nghiệp (sau sein/werden/als), chất liệu chung.",
      "Nhớ các quốc gia ngoại lệ luôn đi kèm mạo từ: die Schweiz, die Türkei, die USA, die Niederlande.",
    ],
    quiz: [
      {
        question: "Chọn câu phủ định đúng cho „Ich habe Zeit.“ (die Zeit):",
        options: ["Ich habe nicht Zeit.", "Ich habe kein Zeit.", "Ich habe keine Zeit."],
        answer: 2,
        explanation: "„Zeit“ không có mạo từ → phủ định bằng „kein“, và „die Zeit“ là giống cái → keine Zeit.",
      },
      {
        question: "Chọn câu đúng nói về nghề nghiệp:",
        options: ["Jan arbeitet als ein Deutschlehrer.", "Jan arbeitet als Deutschlehrer.", "Jan arbeitet als der Deutschlehrer."],
        answer: 1,
        explanation: "Nghề nghiệp đi sau „sein, werden, als“ không dùng mạo từ (Nullartikel).",
      },
    ],
  },
  {
    slug: "mao-tu-so-huu-possessivartikel",
    categoryId: "artikel",
    order: 3,
    code: "Ar3",
    title: "Mạo từ sở hữu (Possessivartikel)",
    germanTitle: "Possessivartikel (mein, dein, sein...)",
    level: "A1",
    summary: "Cách chọn gốc sở hữu theo chủ sở hữu (mein/dein/sein/ihr/unser/euer/Ihr), chia đuôi theo danh từ đứng sau và lưu ý bỏ chữ „e“ ở „euer“.",
    sections: [
      {
        id: "chon-goc-so-huu",
        heading: "1. Bước 1: Chọn gốc sở hữu theo NGƯỜI SỞ HỮU",
        blocks: [
          {
            type: "text",
            content:
              "Mạo từ sở hữu đứng trước danh từ để chỉ vật/người đó thuộc về ai. Hãy tách biệt rõ 2 việc: **gốc từ** phụ thuộc vào *người sở hữu*, còn **đuôi từ** phụ thuộc vào *danh từ đứng ngay sau nó* (giống, số, cách của danh từ đó)!",
          },
          {
            type: "table",
            caption: "Bảng đối chiếu Người sở hữu → Gốc Possessivartikel",
            headers: ["Người sở hữu", "Gốc sở hữu", "Ví dụ (với der Opa)"],
            rows: [
              ["ich (tôi)", "**mein**", "mein Opa (ông của tôi)"],
              ["du (bạn)", "**dein**", "dein Opa (ông của bạn)"],
              ["er (anh ấy)", "**sein**", "sein Opa (ông của anh ấy)"],
              ["es (nó)", "**sein**", "sein Opa (ông của nó)"],
              ["sie (cô ấy)", "**ihr**", "ihr Opa (ông của cô ấy)"],
              ["wir (chúng tôi)", "**unser**", "unser Opa (ông của chúng tôi)"],
              ["ihr (các bạn)", "**euer**", "euer Opa (ông của các bạn)"],
              ["sie (họ) / Sie (Ngài)", "**ihr / Ihr**", "ihr Opa / **Ihr** Opa (viết hoa!)"],
            ],
          },
        ],
      },
      {
        id: "chia-duoi-so-huu",
        heading: "2. Bước 2: Chia đuôi theo DANH TỪ đứng sau",
        blocks: [
          {
            type: "table",
            caption: "Biến cách Possessivartikel (áp dụng y hệt cho mọi gốc mein, dein, sein, ihr, unser, euer)",
            headers: ["Giống của danh từ sau", "Nominativ", "Akkusativ", "Dativ", "Genitiv"],
            rows: [
              ["Maskulin", "{nom:mein} Mann", "{akk:meinen} Mann", "{dat:meinem} Mann", "{gen:meines} Mannes"],
              ["Feminin", "{nom:meine} Frau", "{akk:meine} Frau", "{dat:meiner} Frau", "{gen:meiner} Frau"],
              ["Neutral", "{nom:mein} Kind", "{akk:mein} Kind", "{dat:meinem} Kind", "{gen:meines} Kindes"],
              ["Plural", "{nom:meine} Sterne", "{akk:meine} Sterne", "{dat:meinen} Sternen", "{gen:meiner} Sterne"],
            ],
          },
          {
            type: "tip",
            variant: "warning",
            title: "Ngoại lệ chính tả với „euer“",
            content:
              "Ngay khi gắn thêm bất kỳ đuôi nào (*-e, -en, -em, -er, -es*) vào **euer**, chữ **„e“ ở giữa bị lược bỏ**: *euer Vater* (không đuôi) → ***euren** Vater*, ***eure** Mutter*, ***eurem** Ausflug*.",
          },
          {
            type: "steps",
            title: "Phân tích ví dụ: „Das ist Anna. ___ Katze spielt im Garten.“",
            items: [
              { step: "1. Ai là chủ sở hữu?", detail: "Anna (ngôi 3 số ít giống cái = *sie*) → chọn gốc **ihr**." },
              { step: "2. Danh từ đứng sau là gì?", detail: "**die Katze** → giống cái (Feminin), số ít (Singular)." },
              { step: "3. Cách của „Katze“ trong câu?", detail: "Con mèo đang chơi (chủ ngữ) → **Nominativ**." },
              { step: "4. Ghép gốc + đuôi", detail: "Nominativ + Feminin = thêm đuôi **-e** → **Ihre Katze** (*Ihre Katze spielt im Garten*)." },
            ],
          },
          {
            type: "examples",
            title: "Ví dụ giao tiếp thực tế",
            items: [
              { de: "Das ist Jens. {nom:Sein} Auto steht vor {dat:unserem} Haus.", vi: "Đây là Jens. Xe của anh ấy đỗ trước nhà chúng tôi." },
              { de: "Viel Spaß bei {dat:eurem} Ausflug!", vi: "Chúc các bạn đi dã ngoại vui vẻ!", note: "euer + -em → eurem (bỏ e ở giữa)." },
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Gốc mạo từ sở hữu chọn theo NGƯỜI SỞ HỮU (er/es → sein; sie/họ → ihr; Sie lịch sự → Ihr viết hoa).",
      "Đuôi mạo từ sở hữu chọn theo Giống, Số, Cách của DANH TỪ đứng ngay sau nó.",
      "Bảng chia đuôi giống hệt „kein“ (không có đuôi ở Nom đực, Nom trung và Akk trung).",
      "„euer“ khi thêm đuôi sẽ bỏ chữ „e“ ở giữa: eure, euren, eurem, eurer.",
    ],
    quiz: [
      {
        question: "„Das ist Maria. Ich kenne ___ Bruder sehr gut.“ (der Bruder, Akkusativ)",
        options: ["seinen", "ihren", "ihrem"],
        answer: 1,
        explanation: "Chủ sở hữu là Maria (sie → ihr). Danh từ sau là „der Bruder“ ở Akkusativ → thêm -en → ihren Bruder.",
      },
      {
        question: "Chọn dạng đúng của „euer“ + Dativ trung (das Haus):",
        options: ["euerem Haus", "eurem Haus", "euren Haus"],
        answer: 1,
        explanation: "Dativ giống trung có đuôi -em, và „euer“ bỏ chữ e ở giữa khi có đuôi → eurem Haus.",
      },
    ],
  },
  {
    slug: "he-thong-bien-cach-mot-bang-duy-nhat",
    categoryId: "artikel",
    order: 4,
    code: "Ar4",
    title: "Bí quyết biến cách: Chỉ cần thuộc 1 bảng duy nhất!",
    germanTitle: "Deklination ist voll einfach!",
    level: "A2",
    summary: "Nhìn xuyên thấu hệ thống biến cách tiếng Đức: từ duy nhất bảng der/die/das suy ra toàn bộ ein, kein, mein, đại từ sở hữu, quan hệ, chỉ định và nhân xưng.",
    sections: [
      {
        id: "tu-duy-he-thong",
        heading: "1. Đừng học vẹt hàng chục bảng — mọi đuôi đều từ một gốc!",
        blocks: [
          {
            type: "text",
            content:
              "Nhiều người học tiếng Đức cảm thấy ngợp vì thấy quá nhiều bảng biến cách. Nhưng nếu đặt chúng cạnh nhau, bạn sẽ thấy **tất cả đều dùng chung ĐÚNG MỘT BỘ ĐUÔI lấy từ mạo từ xác định (der, die, das)**!",
          },
          {
            type: "table",
            caption: "So sánh bảng gốc (der/die/das) với ein, kein và mein",
            headers: ["Cách / Giống", "Gốc (der/die/das)", "ein / kein / mein", "Điểm khác duy nhất"],
            rows: [
              ["Nom · Đực", "de**r**", "ein / kein / mein *(không đuôi)*", "★ 1 trong 3 ô không đuôi"],
              ["Nom · Cái", "di**e**", "ein**e** / kein**e** / mein**e**", "Khớp đuôi -e"],
              ["Nom · Trung", "da**s**", "ein / kein / mein *(không đuôi)*", "★ 1 trong 3 ô không đuôi"],
              ["Nom · Số nhiều", "di**e**", "– / kein**e** / mein**e**", "Khớp đuôi -e"],
              ["Akk · Đực", "de**n**", "ein**en** / kein**en** / mein**en**", "Khớp đuôi -n/-en"],
              ["Akk · Trung", "da**s**", "ein / kein / mein *(không đuôi)*", "★ 1 trong 3 ô không đuôi"],
              ["Dat · Đực / Trung", "de**m**", "ein**em** / kein**em** / mein**em**", "Khớp đuôi -m/-em"],
              ["Dat · Cái", "de**r**", "ein**er** / kein**er** / mein**er**", "Khớp đuôi -r/-er"],
              ["Dat · Số nhiều", "de**n**", "– / kein**en** / mein**en**", "Khớp đuôi -n/-en"],
              ["Gen · Đực / Trung", "de**s**", "ein**es** / kein**es** / mein**es**", "Khớp đuôi -s/-es"],
              ["Gen · Cái / Số nhiều", "de**r**", "ein**er** / kein**er** / mein**er**", "Khớp đuôi -r/-er"],
            ],
          },
          {
            type: "rule",
            title: "Quy luật 3 ô không đuôi cho nhóm ein / kein / mein",
            formula: "Chỉ có 3 ô KHÔNG có đuôi: Nominativ Đực · Nominativ Trung · Akkusativ Trung. Mọi ô khác đều gắn đuôi của der/die/das!",
          },
        ],
      },
      {
        id: "suy-ra-dai-tu",
        heading: "2. Hệ thống này cũng đúng cho toàn bộ Đại từ!",
        blocks: [
          {
            type: "table",
            caption: "Suy ra các loại Đại từ từ bảng gốc der/die/das",
            headers: ["Loại đại từ", "Quy luật suy ra từ der/die/das"],
            rows: [
              [
                "**Đại từ sở hữu** *(meiner, meine, meins...)*",
                "Gắn **100% đuôi** của *der/die/das* vào cả 16 ô (kể cả 3 ô trước kia bỏ trống: *der → mein**er***, *das → mein**(e)s***).",
              ],
              [
                "**Đại từ quan hệ & chỉ định** *(der, die, das...)*",
                "Giống hệt *der/die/das*, chỉ thêm **-en** ở 5 ô: Dativ số nhiều (*den → den**en***) và cả 4 ô Genitiv (*des → dess**en***, *der → der**en***).",
              ],
              [
                "**Đại từ nhân xưng ngôi 3** *(er, sie, es...)*",
                "Nhìn đuôi cực giống bảng gốc: *de**r** → **er***, *de**n** → ih**n***, *de**m** → ih**m***, *de**r** (Dat cái) → ih**r***, *de**n** (Dat nhiều) → ih**nen***!",
              ],
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Chỉ cần thuộc lòng bảng 16 ô của mạo từ xác định (der/die/das) — đó là chìa khóa cho toàn bộ hệ biến cách tiếng Đức.",
      "Nhóm ein / kein / mein chỉ bỏ đuôi ở 3 ô: Nominativ Đực, Nominativ Trung và Akkusativ Trung.",
      "Đại từ sở hữu, quan hệ, chỉ định và nhân xưng ngôi 3 đều lặp lại đúng hệ thống đuôi này.",
    ],
    quiz: [
      {
        question: "3 vị trí nào mà „ein / kein / mein“ KHÔNG có đuôi?",
        options: [
          "Nom Đực, Nom Cái, Akk Cái",
          "Nom Đực, Nom Trung, Akk Trung",
          "Dat Đực, Dat Trung, Gen Đực",
        ],
        answer: 1,
        explanation: "Chỉ 3 ô là Nominativ Đực (ein Mann), Nominativ Trung (ein Kind) và Akkusativ Trung (ein Kind) không có đuôi.",
      },
      {
        question: "Nhìn theo hệ thống đuôi: Dativ giống cái của „der/die/das“ là „der“, vậy dạng tương ứng của „mein“ là gì?",
        options: ["meinem", "meinen", "meiner"],
        answer: 2,
        explanation: "Đuôi của „der“ là -r → mein + -er = meiner.",
      },
    ],
  },
];
