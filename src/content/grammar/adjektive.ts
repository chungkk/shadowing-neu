import type { GrammarLesson } from "./types";

export const ADJEKTIVE_LESSONS: GrammarLesson[] = [
  {
    slug: "tinh-tu-va-chia-duoi-adjektivdeklination",
    categoryId: "adjektive",
    order: 1,
    code: "Aj1",
    title: "Tính từ & 3 Bảng chia đuôi tính từ (Adjektivdeklination)",
    germanTitle: "Adjektive & Adjektivdeklination",
    level: "A2",
    summary: "Khi nào cần chia đuôi tính từ, đủ 3 bảng biến cách (sau mạo từ xác định, không xác định/mein/kein và Nullartikel) cùng 5 ngoại lệ chính tả.",
    sections: [
      {
        id: "khi-nao-chia-duoi",
        heading: "1. Khi nào tính từ PHẢI chia đuôi?",
        blocks: [
          {
            type: "rule",
            title: "Quy tắc nhận diện cực dễ",
            formula: "Tính từ đứng TRƯỚC danh từ → PHẢI chia đuôi  |  Tính từ đứng SAU động từ (không có danh từ theo sau) → KHÔNG chia đuôi",
          },
          {
            type: "examples",
            title: "So sánh có chia đuôi và không chia đuôi",
            items: [
              { de: "Der **junge** Mann lernt Deutsch.", vi: "Chàng trai trẻ đang học tiếng Đức.", note: "Đứng trước danh từ „Mann“ → thêm đuôi -e." },
              { de: "Der Mann ist **jung**.", vi: "Người đàn ông đó còn trẻ.", note: "Không có danh từ đứng sau „jung“ → giữ nguyên!" },
            ],
          },
          {
            type: "text",
            content:
              "Đuôi tính từ phụ thuộc vào **3 yếu tố**: Giống danh từ (Genus), Cách (Fall) và **Loại mạo từ đứng trước nó** (xác định, không xác định hay không có mạo từ). Logic đằng sau cực kỳ thông minh: **cụm danh từ cần thể hiện rõ Cách** — nếu mạo từ đã thể hiện rõ rồi thì tính từ chỉ cần đuôi nhẹ (*-e* hoặc *-en*); nếu mạo từ chưa thể hiện (như *ein, mein, kein* ở 3 ô không đuôi, hoặc không có mạo từ) thì **tính từ phải gánh đuôi của der/die/das**!",
          },
        ],
      },
      {
        id: "ba-bang-chia-duoi",
        heading: "2. Ba bảng chia đuôi tính từ đầy đủ",
        blocks: [
          {
            type: "table",
            caption: "Bảng 1 — Sau Mạo từ xác định (der, die, das, dieser, jeder, welcher, solcher, alle) — CHỈ CÓ -e VÀ -en!",
            headers: ["Giống / Số", "Nominativ", "Akkusativ", "Dativ", "Genitiv"],
            rows: [
              ["Maskulin", "{nom:der} schön**e** Mann", "{akk:den} schön**en** Mann", "{dat:dem} schön**en** Mann", "{gen:des} schön**en** Mannes"],
              ["Feminin", "{nom:die} schön**e** Frau", "{akk:die} schön**e** Frau", "{dat:der} schön**en** Frau", "{gen:der} schön**en** Frau"],
              ["Neutral", "{nom:das} schön**e** Haus", "{akk:das} schön**e** Haus", "{dat:dem} schön**en** Haus", "{gen:des} schön**en** Hauses"],
              ["Plural", "{nom:die} schön**en** Männer", "{akk:die} schön**en** Männer", "{dat:den} schön**en** Männern", "{gen:der} schön**en** Männer"],
            ],
          },
          {
            type: "table",
            caption: "Bảng 2 — Sau Mạo từ không xác định (ein), Sở hữu (mein/dein...) & Phủ định (kein)",
            headers: ["Giống / Số", "Nominativ", "Akkusativ", "Dativ", "Genitiv"],
            rows: [
              ["Maskulin", "{nom:ein/mein} schön**er** Mann ★", "{akk:einen} schön**en** Mann", "{dat:einem} schön**en** Mann", "{gen:eines} schön**en** Mannes"],
              ["Feminin", "{nom:eine} schön**e** Frau", "{akk:eine} schön**e** Frau", "{dat:einer} schön**en** Frau", "{gen:einer} schön**en** Frau"],
              ["Neutral", "{nom:ein/mein} schön**es** Haus ★", "{akk:ein/mein} schön**es** Haus ★", "{dat:einem} schön**en** Haus", "{gen:eines} schön**en** Hauses"],
              ["Plural *(mein/kein)*", "{nom:meine} schön**en** Frauen", "{akk:meine} schön**en** Frauen", "{dat:meinen} schön**en** Frauen", "{gen:meiner} schön**en** Frauen"],
            ],
          },
          {
            type: "table",
            caption: "Bảng 3 — Sau Nullartikel (KHÔNG có mạo từ) & sau „viele, manche, mehrere, einige“",
            headers: ["Giống / Số", "Nominativ", "Akkusativ", "Dativ", "Genitiv"],
            rows: [
              ["Maskulin", "schön**er** Mann", "schön**en** Mann", "schön**em** Mann", "schön**en** Mannes ★"],
              ["Feminin", "schön**e** Frau", "schön**e** Frau", "schön**er** Frau", "schön**er** Frau"],
              ["Neutral", "schön**es** Haus", "schön**es** Haus", "schön**em** Haus", "schön**en** Hauses ★"],
              ["Plural", "schön**e** Frauen", "schön**e** Frauen", "schön**en** Frauen", "schön**er** Frauen"],
            ],
          },
          {
            type: "tip",
            variant: "note",
            title: "Tại sao Genitiv Đực/Trung ở Bảng 3 lại là -en chứ không phải -es?",
            content:
              "Vì cuối danh từ *Mann**es*** / *Haus**es*** đã có sẵn chữ **-s** báo hiệu Genitiv rồi, nên tính từ giữ nguyên đuôi nhẹ **-en** (*schön**en** Mannes*, *kalt**en** Wassers*).",
          },
        ],
      },
      {
        id: "ngoai-le-chinh-ta",
        heading: "3. Năm ngoại lệ chính tả khi gắn đuôi tính từ",
        blocks: [
          {
            type: "table",
            caption: "Các tính từ đặc biệt cần chú ý khi chia đuôi",
            headers: ["Trường hợp", "Quy tắc", "Ví dụ đúng"],
            rows: [
              ["Kết thúc bằng **-e**", "Không nhân đôi chữ *e*", "leise → ein leis**es** Kind *(KHÔNG viết leisees)*"],
              ["Kết thúc bằng **-el**", "Bỏ chữ *e* trong *-el*", "dunkel → ein dunk**ler** Wald · sensibel → ein sensib**les** Kind"],
              ["Kết thúc bằng **-er** *(trước nó là nguyên âm)*", "Bỏ chữ *e* trong *-er*", "teuer → ein teu**res** Auto · sauer → ein sau**rer** Apfel\n*(KHÔNG bỏ nếu trước -er là phụ âm: sauber → ein saub**eres** Zimmer)*"],
              ["Tính từ **hoch** (cao)", "Mất chữ **c** khi có đuôi", "Der Turm ist hoch. → Das ist ein **hoher** Turm."],
              ["Màu đuôi **-a** & Tính từ tên thành phố **-er**", "**KHÔNG bao giờ chia đuôi!**", "ein **rosa** Kleid · die **lila** Bluse · der **Frankfurter** Flughafen"],
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Tính từ chỉ chia đuôi khi đứng trước danh từ.",
      "Trong Dativ, Genitiv, Số nhiều (có mạo từ) và Akkusativ giống đực, đuôi tính từ LUÔN LÀ „-en“!",
      "Khi không có mạo từ (hoặc sau viele, manche, einige, mehrere), tính từ mang đuôi của der/die/das (trừ Gen đực/trung dùng -en).",
      "Nhớ 5 ngoại lệ chính tả: leises, dunkler, teures (nhưng sauberes), hoher, và không chia đuôi với rosa/lila/Berliner.",
    ],
    quiz: [
      {
        question: "Chọn câu đúng: „Das ist ein ___ Auto.“ (teuer, das Auto, Nom)",
        options: ["teueres", "teures", "teure"],
        answer: 1,
        explanation: "„ein“ không có đuôi nên tính từ nhận đuôi -es (das Auto), đồng thời „teuer“ có nguyên âm trước -er nên bỏ e → teures.",
      },
      {
        question: "Chọn câu đúng: „Das Haus steht neben dem ___ Park.“ (groß, der Park, Dativ)",
        options: ["große", "großer", "großen"],
        answer: 2,
        explanation: "Sau mạo từ ở Dativ, tính từ LUÔN mang đuôi -en → neben dem großen Park.",
      },
      {
        question: "Chọn câu đúng với tính từ „hoch“:",
        options: ["Das ist ein hocher Berg.", "Das ist ein hoher Berg.", "Das ist ein hohes Berg."],
        answer: 1,
        explanation: "Tính từ „hoch“ mất chữ „c“ khi chia đuôi; „der Berg“ (Nom đực sau ein) nhận đuôi -er → ein hoher Berg.",
      },
    ],
  },
  {
    slug: "bon-buoc-chia-duoi-tinh-tu",
    categoryId: "adjektive",
    order: 2,
    code: "Aj2",
    title: "Quy trình 4 bước chia đuôi tính từ (Chính xác 100%)",
    germanTitle: "Adjektivdeklination — Schritt-für-Schritt-Anleitung",
    level: "A2",
    summary: "Quên hết 3 bảng dài 48 ô đi! Chỉ cần thuộc đúng 4 câu hỏi ngắn này, bạn sẽ chọn chính xác đuôi tính từ trong mọi câu tiếng Đức.",
    sections: [
      {
        id: "bon-buoc-vang",
        heading: "1. Thuật toán 4 bước giải quyết mọi bài chia đuôi tính từ",
        blocks: [
          {
            type: "text",
            content:
              "Thay vì dò 3 bảng khác nhau gây rối khi đang nói hoặc làm bài thi, hãy đi lần lượt qua **4 câu hỏi Có/Không** sau — công thức này chạy đúng 100% trường hợp!",
          },
          {
            type: "steps",
            title: "Hỏi theo đúng thứ tự từ Bước 1 → Bước 4",
            items: [
              {
                step: "Bước 1: Có mạo từ đứng trước tính từ không?",
                detail: "**KHÔNG** → Gắn trực tiếp **đuôi của mạo từ xác định (der/die/das)** ở Cách tương ứng. *(Ngoại lệ duy nhất: Genitiv Đực & Trung dùng **-en**)*. Nếu **CÓ** → sang Bước 2.",
                example: "schnell**e** Autos (die Autos) · aus pur**em** Gold (dem Gold)",
              },
              {
                step: "Bước 2: Mạo từ đó có phải là „viele“, „manche“, „einige“, „mehrere“ không?",
                detail: "**CÓ** → Gắn **đuôi của mạo từ xác định (der/die/das)** giống như Bước 1. Nếu **KHÔNG** → sang Bước 3.",
                example: "viele schnell**e** Autos · mit einigen gut**en** Freunden",
              },
              {
                step: "Bước 3: Có phải là Dativ, Genitiv, Số nhiều, hoặc Akkusativ Giống đực không?",
                detail: "**CÓ** → Gắn ngay đuôi **-en**! (Xong luôn hơn 70% trường hợp!). Nếu **KHÔNG** → sang Bước 4.",
                example: "mit den schnell**en** Autos (Dat Pl) · ich sehe einen nett**en** Mann (Akk m)",
              },
              {
                step: "Bước 4: Mạo từ đứng trước CÓ đuôi chưa?",
                detail:
                  "• **CHƯA có đuôi** (*ein, mein, kein...* ở 3 ô trống) → Gắn **đuôi của mạo từ xác định** (*-er* cho đực, *-es* cho trung).\n• **ĐÃ có đuôi** (*der, die, das, eine, meine, diese...*) → Gắn đuôi **-e**!",
                example: "ein schnell**es** Auto (chưa đuôi → -es) · das schnell**e** Auto (đã đuôi → -e) · eine schön**e** Frau (đã đuôi → -e)",
              },
            ],
          },
          {
            type: "examples",
            title: "Thử áp dụng 4 bước vào 4 câu thật",
            items: [
              { de: "Ich trinke kalt**es** Bier.", vi: "Tôi uống bia lạnh.", note: "Bước 1: Không mạo từ → das Bier (Akk trung) → đuôi -es." },
              { de: "Das Haus ist in {dat:keinem} gut**en** Zustand.", vi: "Ngôi nhà không ở trong tình trạng tốt.", note: "Bước 3: Dativ → gắn ngay -en!" },
              { de: "{nom:Mein} neu**es** Auto steht in der Garage.", vi: "Chiếc xe mới của tôi đang đỗ trong gara.", note: "Bước 4: „mein“ chưa có đuôi + das Auto → gắn -es." },
              { de: "{nom:Das} rot**e** Auto gehört {dat:dem} reich**en** Mann.", vi: "Chiếc xe đỏ thuộc về người đàn ông giàu có.", note: "„Das“ đã có đuôi → rot**e**; „dem“ là Dativ → reich**en**." },
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Bước 1 & 2: Không mạo từ hoặc sau viele/manche/einige/mehrere → lấy đuôi của der/die/das (trừ Gen m/n → -en).",
      "Bước 3: Dativ, Genitiv, Plural (có mạo từ) hoặc Akk Maskulin → LUÔN LÀ -en.",
      "Bước 4: Còn lại (Nom số ít & Akk cái/trung): mạo từ chưa có đuôi → -er/-es; mạo từ đã có đuôi → -e.",
    ],
    quiz: [
      {
        question: "Áp dụng 4 bước: „Dort stehen viele ___ Häuser.“ (alt, Plural Nominativ)",
        options: ["alten", "alte", "alter"],
        answer: 1,
        explanation: "Bước 2: Sau „viele“ lấy đuôi của mạo từ xác định (die Häuser → đuôi -e) → viele alte Häuser.",
      },
      {
        question: "Áp dụng 4 bước: „Ich spreche mit meiner ___ Nachbarin.“ (freundlich, Dativ Feminin)",
        options: ["freundliche", "freundlicher", "freundlichen"],
        answer: 2,
        explanation: "Bước 3: Có mạo từ „meiner“ và là Dativ → gắn ngay -en → meiner freundlichen Nachbarin.",
      },
    ],
  },
  {
    slug: "so-sanh-tinh-tu-komparativ-superlativ",
    categoryId: "adjektive",
    order: 3,
    code: "Aj3",
    title: "So sánh tính từ (Komparativ, Superlativ & So sánh ngang bằng)",
    germanTitle: "Steigerung der Adjektive & Vergleiche",
    level: "A2",
    summary: "Cách tạo so sánh hơn (Komparativ), so sánh nhất (Superlativ), 6 tính từ bất quy tắc quan trọng, chia đuôi dạng so sánh và các mẫu so sánh không biến đổi (so... wie).",
    sections: [
      {
        id: "komparativ-superlativ",
        heading: "1. So sánh hơn (Komparativ) & So sánh nhất (Superlativ)",
        blocks: [
          {
            type: "table",
            caption: "Công thức và lưu ý chính tả của 3 bậc tính từ",
            headers: ["Bậc so sánh", "Công thức", "Ví dụ & Lưu ý đặc biệt"],
            rows: [
              ["**Positiv** (Nguyên cấp)", "Tính từ gốc", "*Das Haus ist **groß**.*"],
              [
                "**Komparativ** (So sánh hơn)",
                "**Tính từ + -er** *(thường đi với **als** = hơn)*",
                "*Kevin rennt **schneller als** Max.*\n• Đuôi **-el** bỏ *e*: *dunkel → dunk**ler***, *sensibel → sensib**ler***.\n• Đuôi **-er** (có nguyên âm trước) bỏ *e*: *teuer → teu**rer*** (nhưng *sauber → saub**erer***).\n• Tính từ 1 âm tiết thường thêm **Umlaut (ä, ö, ü)**: *alt → **ä**lter, klug → kl**ü**ger, groß → gr**ö**ßer*.",
              ],
              [
                "**Superlativ** (So sánh nhất)",
                "• **am + Tính từ + -(e)sten** *(đứng sau động từ)*\n• **der/die/das + Tính từ + -(e)ste** *(đứng trước danh từ)*",
                "*Kevin rennt **am schnellsten**.* / *Kevin ist **der schnellste** Läufer.*\n• Đuôi **-d, -t, -s, -ß, -x, -z** thêm **-est-**: *leicht → am leicht**esten***, *heiß → am heiß**esten***.\n• *Ngoại lệ:* *groß → am größ**ten*** (không có *e*!).",
              ],
            ],
          },
        ],
      },
      {
        id: "bat-quy-tac-va-chia-duoi",
        heading: "2. Sáu tính từ bất quy tắc & Chia đuôi dạng so sánh",
        blocks: [
          {
            type: "table",
            caption: "6 tính từ so sánh bất quy tắc BẮT BUỘC thuộc lòng",
            headers: ["Positiv", "Komparativ", "Superlativ", "Nghĩa"],
            rows: [
              ["**gut**", "**besser**", "**am besten**", "tốt"],
              ["**groß**", "**größer**", "**am größten**", "to, lớn"],
              ["**hoch**", "**höher** *(mất c!)*", "**am höchsten**", "cao"],
              ["**nah**", "**näher**", "**am nächsten**", "gần"],
              ["**viel**", "**mehr**", "**am meisten**", "nhiều"],
              ["**gern / lieb**", "**lieber**", "**am liebsten**", "thích"],
            ],
          },
          {
            type: "rule",
            title: "Chia đuôi khi Komparativ / Superlativ đứng trước danh từ",
            formula: "Komparativ + đuôi tính từ (VD: ein schneller**es** Auto)  |  Mạo từ + Superlativ gốc (-st) + đuôi tính từ (VD: der schnell**ste** Mann)",
          },
          {
            type: "examples",
            title: "Ví dụ dạng so sánh đứng trước danh từ",
            items: [
              { de: "Er hat {akk:ein schnelleres Auto} als ich.", vi: "Anh ấy có một chiếc ô tô nhanh hơn tôi.", note: "Komparativ „schneller“ + đuôi -es (Akk trung)." },
              { de: "Jan ist {nom:ein besserer Lehrer} als Max.", vi: "Jan là một giáo viên giỏi hơn Max.", note: "Komparativ „besser“ + đuôi -er (Nom đực)." },
              { de: "Das ist {nom:der schnellste Mann} der Welt.", vi: "Đó là người đàn ông nhanh nhất thế giới.", note: "Superlativ „schnellst“ + đuôi -e (sau der)." },
            ],
          },
        ],
      },
      {
        id: "so-sanh-ngang-bang",
        heading: "3. So sánh ngang bằng (không chia bậc — dùng „wie“)",
        blocks: [
          {
            type: "table",
            caption: "Các mẫu so sánh với tính từ nguyên cấp (nhớ: ngang bằng dùng „wie“, hơn/kém dùng „als“!)",
            headers: ["Mẫu câu", "Nghĩa", "Ví dụ"],
            rows: [
              ["**(genau)so ... wie**", "bằng y như nhau", "*Jan ist **(genau)so** schwer **wie** Marcel.*"],
              ["**halb so ... wie**", "bằng một nửa", "*Der Kuchen ist **halb so** groß **wie** der andere.*"],
              ["**doppelt so ... wie**", "gấp đôi", "*Der Kuchen ist **doppelt so** groß **wie** der andere.*"],
              ["**fast so ... wie**", "gần bằng", "*Der Kuchen ist **fast so** groß **wie** der andere.*"],
              ["**nicht so ... wie**", "không ... bằng", "*Der Kuchen ist **nicht so** groß **wie** der andere.*"],
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "So sánh hơn (Komparativ): tính từ + -er + als; So sánh ngang bằng: (genau)so + tính từ gốc + wie.",
      "So sánh nhất (Superlativ): „am ...-(e)sten“ khi đứng sau động từ, „der/die/das ...-(e)ste“ khi đứng trước danh từ.",
      "Thuộc 6 từ bất quy tắc: gut–besser–am besten, hoch–höher–am höchsten, nah–näher–am nächsten, viel–mehr–am meisten, gern–lieber–am liebsten, groß–größer–am größten.",
      "Đứng trước danh từ, Komparativ và Superlativ vẫn phải chia đuôi tính từ bình thường.",
    ],
    quiz: [
      {
        question: "Chọn câu đúng: „Mein Bruder ist größer ___ ich, aber nicht so alt ___ meine Schwester.“",
        options: ["wie / als", "als / wie", "als / als"],
        answer: 1,
        explanation: "So sánh hơn (größer) đi với „als“; so sánh ngang bằng/không bằng (so alt) đi với „wie“.",
      },
      {
        question: "Chọn dạng đúng của „gern“: „Ich trinke Kaffee gern, aber Tee trinke ich ___.“",
        options: ["gerner", "besser", "lieber"],
        answer: 2,
        explanation: "So sánh hơn bất quy tắc của „gern“ là „lieber“ (nhất là „am liebsten“).",
      },
    ],
  },
  {
    slug: "phan-tu-lam-tinh-tu-va-danh-tu-hoa",
    categoryId: "adjektive",
    order: 4,
    code: "Aj4",
    title: "Phân từ làm Tính từ & Danh từ hóa Tính từ / Phân từ",
    germanTitle: "Partizip als Adjektiv & Substantivierung",
    level: "B1",
    summary: "Cách biến động từ thành tính từ bằng Partizip 1 (đang xảy ra đồng thời) và Partizip 2 (đã hoàn thành / trạng thái) + cách danh từ hóa tính từ và phân từ.",
    sections: [
      {
        id: "partizip-lam-tinh-tu",
        heading: "1. Partizip 1 & Partizip 2 làm tính từ",
        blocks: [
          {
            type: "compare",
            leftTitle: "Partizip 1 (Infinitiv + d) — ĐỒNG THỜI & CHỦ ĐỘNG",
            leftItems: [
              "Diễn tả **2 hành động xảy ra cùng lúc** (mang nghĩa chủ động „đang...“).",
              "Công thức: **Infinitiv + d + đuôi tính từ + Danh từ**.",
              "*Das **lachende** Kind spielt im Garten.* (= Đứa trẻ vừa cười vừa chơi.)",
              "*Der **bellende** Hund steht vor der Tür.* (= Con chó đang sủa đứng trước cửa.)",
            ],
            rightTitle: "Partizip 2 (ge-...-t/-en) — ĐÃ XONG & TRẠNG THÁI",
            rightItems: [
              "Diễn tả **trạng thái kết quả** hoặc **hành động đã xảy ra trước** (thường mang nghĩa bị động „được/bị/đã...“).",
              "Công thức: **Partizip 2 + đuôi tính từ + Danh từ**.",
              "*Ich verkaufe das **gebrauchte** Auto.* (= Chiếc xe đã qua sử dụng.)",
              "*Der **heruntergefallene** Apfel liegt auf der Wiese.* (= Quả táo đã rụng trước đó, giờ đang nằm trên bãi cỏ.)",
            ],
          },
          {
            type: "tip",
            variant: "tip",
            title: "Mẹo phân biệt nhanh Partizip 1 vs Partizip 2",
            content:
              "So sánh 2 câu:\n• *Der **herunterfallende** Apfel* (Partizip 1) = Quả táo **đang rơi** (chưa chạm đất!).\n• *Der **heruntergefallene** Apfel* (Partizip 2) = Quả táo **đã rơi xuống rồi**.",
          },
        ],
      },
      {
        id: "danh-tu-hoa",
        heading: "2. Danh từ hóa Tính từ & Phân từ (Substantivierung)",
        blocks: [
          {
            type: "text",
            content:
              "Khi danh từ phía sau quá hiển nhiên (như *Mann, Frau, Mensch* hoặc khái niệm trừu tượng), tiếng Đức **lược bỏ danh từ đó** và **viết hoa chữ cái đầu của tính từ/phân từ**. Điều cực kỳ quan trọng: **dù trở thành danh từ, chúng VẪN CHIA ĐUÔI Y HỆT TÍNH TỪ (Adjektivdeklination)!**",
          },
          {
            type: "examples",
            title: "Cách rút gọn danh từ hiển nhiên",
            items: [
              { de: "Ein fremder Mann klingelt. → Ein **Fremder** klingelt.", vi: "Một người lạ đang bấm chuông.", note: "Sau „ein“ (Nom đực) → đuôi -er." },
              { de: "Sandra hat einen neuen Freund. → Sandra hat einen **Neuen**.", vi: "Sandra lại có bạn trai mới rồi.", note: "Sau „einen“ (Akk đực) → đuôi -en." },
              { de: "Der **Vermisste** konnte noch nicht gefunden werden.", vi: "Người mất tích vẫn chưa được tìm thấy.", note: "Partizip 2 „vermisst“ danh từ hóa (sau der → đuôi -e)." },
              { de: "Beim Unfall gab es keine **Verletzten**.", vi: "Trong vụ tai nạn không có người bị thương nào.", note: "Sau „keine“ (Plural) → đuôi -en." },
            ],
          },
          {
            type: "table",
            caption: "Các danh từ hóa tính từ & phân từ cực hay gặp (chú ý đổi đuôi khi đổi mạo từ!)",
            headers: ["Từ gốc", "Sau „der / die / das“", "Sau „ein / eine“", "Nghĩa"],
            rows: [
              ["deutsch", "der Deutsch**e** / die Deutsch**e**", "ein Deutsch**er** / eine Deutsch**e**", "người Đức"],
              ["bekannt", "der Bekannt**e**", "ein Bekannt**er**", "người quen"],
              ["arbeitslos", "der Arbeitslos**e**", "ein Arbeitslos**er**", "người thất nghiệp"],
              ["krank", "der Krank**e**", "ein Krank**er**", "người bệnh"],
              ["angestellt (P2)", "der Angestellt**e**", "ein Angestellt**er**", "nhân viên"],
              ["reisend (P1)", "der Reisend**e**", "ein Reisend**er**", "hành khách / du khách"],
              ["überlebend (P1)", "der Überlebend**e**", "ein Überlebend**er**", "người sống sót"],
              ["gut / böse (trừu tượng)", "**das Gute** / **das Böse**", "etwas **Gutes** *(sau etwas/nichts!)*", "điều tốt / điều xấu"],
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Partizip 1 (Infinitiv + d) làm tính từ chỉ hành động đang diễn ra đồng thời; Partizip 2 chỉ trạng thái/hành động đã hoàn tất.",
      "Cả Partizip 1 và Partizip 2 khi đứng trước danh từ đều phải chia đuôi tính từ.",
      "Tính từ & phân từ danh từ hóa viết hoa chữ cái đầu nhưng chia đuôi 100% theo quy tắc Adjektivdeklination (der Deutsche vs ein Deutscher).",
    ],
    quiz: [
      {
        question: "Chọn câu đúng: „Das ___ Kind rennt zu seiner Mutter.“ (weinen — đang khóc và chạy cùng lúc)",
        options: ["geweinte", "weinende", "weinendes"],
        answer: 1,
        explanation: "Hai hành động đồng thời → Partizip 1 (weinend); sau mạo từ xác định „Das“ (Nom trung) → đuôi -e → weinende.",
      },
      {
        question: "Chọn dạng đúng: „Ich kenne einen ___ aus Berlin.“ (bekannt — người quen nam)",
        options: ["Bekannte", "Bekannter", "Bekannten"],
        answer: 2,
        explanation: "„einen“ là Akkusativ giống đực → đuôi tính từ luôn là -en → einen Bekannten.",
      },
    ],
  },
  {
    slug: "cau-tao-tinh-tu-adjektivbildung",
    categoryId: "adjektive",
    order: 5,
    code: "Aj5",
    title: "Cấu tạo tính từ bằng Tiền tố & Hậu tố",
    germanTitle: "Adjektivbildung (Präfixe & Suffixe)",
    level: "B1",
    summary: "Cách mở rộng vốn từ cực nhanh nhờ các tiền tố phủ định (un-, in-, des-) và 6 hậu tố tạo tính từ thông dụng nhất (-bar, -isch, -lich, -los, -arm, -reich).",
    sections: [
      {
        id: "tien-to-hau-to",
        heading: "1. Tạo tính từ từ Tính từ, Động từ và Danh từ",
        blocks: [
          {
            type: "text",
            content:
              "Tiếng Đức cho phép ghép **tiền tố (Präfix)** và **hậu tố (Suffix)** để biến đổi nghĩa hoặc biến động từ/danh từ thành tính từ mới. Hiểu nghĩa của các thành phần này giúp bạn đoán nghĩa hàng trăm từ mới khi đọc báo và thi B1–B2!",
          },
          {
            type: "table",
            caption: "Các tiền tố & hậu tố tạo tính từ quan trọng nhất",
            headers: ["Tiền tố / Hậu tố", "Nghĩa cốt lõi", "Cách tạo & Ví dụ"],
            rows: [
              ["**un-, in-, des-** *(từ Tính từ)*", "Tạo nghĩa **trái ngược / phủ định**", "beliebt → **un**beliebt · kompetent → **in**kompetent · interessiert → **des**interessiert"],
              ["**-bar** *(từ Động từ, bỏ -en)*", "**Có thể làm được** (= man kann...)", "essen → ess**bar** (ăn được) · trinken → trink**bar** (uống được) · machen → mach**bar** (khả thi)"],
              ["**-isch** *(từ Danh từ)*", "**Quốc tịch / tính chất**", "der Italiener → italien**isch** · der Russe → russ**isch** *(riêng der Deutsche → deutsch)*"],
              ["**-lich** *(từ Danh từ)*", "**Tần suất định kỳ** (1 âm tiết thêm Umlaut) hoặc sở hữu", "der Tag → t**ä**g**lich** (hàng ngày) · der Monat → monat**lich** (hàng tháng) · die Eltern → elter**lich**"],
              ["**-los** *(từ Danh từ)*", "**Không có / thiếu** (= ohne ...)", "Arbeit → arbeit**s**los (thất nghiệp) · Erfolg → erfolg**los** (thất bại) · Aussicht → aussicht**s**los (vô vọng)"],
              ["**-arm** *(từ Danh từ)*", "**Ít / nghèo** chất gì đó", "Fett → fett**arm** (ít béo) · Kalorien → kalorien**arm** (ít calo) · Vitamin → vitamin**arm**"],
              ["**-reich** *(từ Danh từ)*", "**Giàu / nhiều** thứ gì đó", "Erfolg → erfolg**reich** (thành công) · Vitamin → vitamin**reich** (giàu vitamin) · Kalorien → kalorien**reich**"],
            ],
          },
          {
            type: "tip",
            variant: "note",
            title: "Chữ „s“ nối (Fugen-S)",
            content:
              "Đôi khi giữa danh từ và hậu tố *-los* có thêm chữ **-s-** để dễ đọc (như *arbeit**s**los*, *aussicht**s**los*, nhưng *erfolglos* không có). Không có quy tắc cứng cho Fugen-S — bạn sẽ dần có cảm giác ngôn ngữ qua việc đọc và nghe nhiều.",
          },
        ],
      },
    ],
    keyPoints: [
      "un-, in-, des- đảo ngược nghĩa của tính từ.",
      "Động từ (bỏ -en) + -bar = có thể làm được (trinkbar, machbar, lösbar).",
      "Danh từ + -los = không có (arbeitslos); -arm = ít (fettarm); -reich = giàu/nhiều (vitaminreich); -lich = định kỳ (täglich, monatlich).",
    ],
    quiz: [
      {
        question: "Tính từ „trinkbar“ có nghĩa là gì?",
        options: ["Không có nước uống", "Có thể uống được", "Uống hàng ngày"],
        answer: 1,
        explanation: "Hậu tố -bar gắn vào động từ (trinken → trinkbar) mang nghĩa „có thể làm được“ (= man kann es trinken).",
      },
      {
        question: "Điền hậu tố đúng: „Das Essen enthält sehr viele Vitamine. Es ist vitamin___.“",
        options: ["los", "arm", "reich"],
        answer: 2,
        explanation: "Hậu tố -reich diễn tả „giàu / chứa rất nhiều“ → vitaminreich.",
      },
    ],
  },
];
