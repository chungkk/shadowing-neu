import type { GrammarLesson } from "./types";

export const PRONOMEN_LESSONS: GrammarLesson[] = [
  {
    slug: "dai-tu-nhan-xung-personalpronomen",
    categoryId: "pronomen",
    order: 1,
    code: "Pr1",
    title: "Đại từ nhân xưng trong cả 4 Cách",
    germanTitle: "Personalpronomen in allen Fällen",
    level: "A1",
    summary: "Cách dùng đại từ nhân xưng (ich, du, er, sie, es, wir, ihr, sie, Sie), phân biệt lịch sự vs thân mật và bảng biến cách đầy đủ 4 cách.",
    sections: [
      {
        id: "khai-niem-va-ngoi",
        heading: "1. Khái niệm & Phân biệt du/ihr với Sie",
        blocks: [
          {
            type: "text",
            content:
              "Đại từ (Pronomen) thay thế cho danh từ đã nhắc tới nhằm tránh lặp từ (*Da ist mein Mann. **Er** kommt zu spät!*). **Đại từ nhân xưng (Personalpronomen)** mang thông tin về **Ngôi** (1, 2, 3), **Số** (ít/nhiều) và **Cách** (Nom/Akk/Dat/Gen).",
          },
          {
            type: "compare",
            leftTitle: "Thân mật: du (số ít) / ihr (số nhiều)",
            leftItems: [
              "Dùng với bạn bè, người thân, trẻ em, đồng nghiệp thân thiết hoặc sinh viên cùng lứa.",
              "*Du wirst heute dein Zimmer aufräumen.*",
              "*Habt ihr eure Hausaufgaben schon gemacht?*",
            ],
            rightTitle: "Lịch sự: Sie (cả số ít & số nhiều)",
            rightItems: [
              "Dùng với người lạ, sếp, thầy cô, cơ quan nhà nước (Ausländerbehörde, Bürgeramt...).",
              "**Luôn viết hoa chữ S** (*Sie, Ihnen, Ihr*) dù đứng giữa câu.",
              "Động từ chia giống ngôi 3 số nhiều (*sie*): *Sprechen Sie Deutsch?*",
            ],
          },
          {
            type: "tip",
            variant: "note",
            title: "Tránh gây hiểu nhầm khi có 2 danh từ cùng giống",
            content:
              "VD: *Frau Meier hat eine Katze. Ich mag **sie** sehr.* (Cả „Frau Meier“ và „Katze“ đều giống cái nên không rõ thích ai!). Lúc này nên lặp lại danh từ rõ ràng thay vì dùng đại từ.",
          },
        ],
      },
      {
        id: "bang-personalpronomen",
        heading: "2. Bảng biến cách Đại từ nhân xưng (4 Cách)",
        blocks: [
          {
            type: "table",
            caption: "Bảng đại từ nhân xưng đầy đủ — hãy thuộc thật kỹ cột Nom, Akk và Dat!",
            headers: ["Ngôi", "Nominativ", "Akkusativ", "Dativ", "Genitiv *(rất hiếm)*"],
            rows: [
              ["1. Số ít (tôi)", "{nom:ich}", "{akk:mich}", "{dat:mir}", "{gen:meiner}"],
              ["2. Số ít (bạn)", "{nom:du}", "{akk:dich}", "{dat:dir}", "{gen:deiner}"],
              ["3. Đực (anh ấy / nó)", "{nom:er}", "{akk:ihn}", "{dat:ihm}", "{gen:seiner}"],
              ["3. Cái (cô ấy / nó)", "{nom:sie}", "{akk:sie}", "{dat:ihr}", "{gen:ihrer}"],
              ["3. Trung (nó)", "{nom:es}", "{akk:es}", "{dat:ihm}", "{gen:seiner}"],
              ["1. Số nhiều (chúng tôi)", "{nom:wir}", "{akk:uns}", "{dat:uns}", "{gen:unser}"],
              ["2. Số nhiều (các bạn)", "{nom:ihr}", "{akk:euch}", "{dat:euch}", "{gen:euer}"],
              ["3. Số nhiều (họ)", "{nom:sie}", "{akk:sie}", "{dat:ihnen}", "{gen:ihrer}"],
              ["Lịch sự (Ngài / Quý vị)", "{nom:Sie}", "{akk:Sie}", "{dat:Ihnen}", "{gen:Ihrer}"],
            ],
          },
          {
            type: "examples",
            title: "Ví dụ thực tế",
            items: [
              { de: "Das ist Max. {nom:Er} spielt gern Fußball.", vi: "Đây là Max. Cậu ấy thích chơi bóng đá.", note: "Chủ ngữ → Nominativ (er)." },
              { de: "{nom:Ich} mag {akk:ihn} sehr.", vi: "Tôi rất quý cậu ấy.", note: "Tân ngữ trực tiếp → Akkusativ (ihn)." },
              { de: "{nom:Ich} schenke {dat:ihm} einen Ball.", vi: "Tôi tặng cho cậu ấy một quả bóng.", note: "Người nhận → Dativ (ihm)." },
              { de: "Kann {nom:ich} {dat:Ihnen} helfen?", vi: "Tôi có thể giúp gì cho Ngài ạ?", note: "„helfen“ + Dativ lịch sự → Ihnen." },
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Đại từ nhân xưng thay thế cho người/vật đã nhắc tới và phải biến đổi theo Cách.",
      "„du/ihr“ dùng thân mật; „Sie“ dùng lịch sự (luôn viết hoa cả ở Sie, Ihnen, Ihr).",
      "Ngôi wir/ihr có dạng Akk và Dat giống nhau (uns/uns, euch/euch); chỉ ich, du và ngôi 3 khác nhau.",
    ],
    quiz: [
      {
        question: "Chọn đại từ đúng với „helfen“ (Dativ): „Kannst du ___ bitte helfen?“ (tôi)",
        options: ["mich", "mir", "ich"],
        answer: 1,
        explanation: "„helfen“ yêu cầu Dativ; dạng Dativ của „ich“ là „mir“.",
      },
      {
        question: "Điền đại từ đúng: „Wo ist der Schlüssel? Ich finde ___ nicht.“ (der Schlüssel, Akk)",
        options: ["er", "ihm", "ihn"],
        answer: 2,
        explanation: "„der Schlüssel“ giống đực → đại từ ngôi 3 số ít giống đực ở Akkusativ là „ihn“.",
      },
    ],
  },
  {
    slug: "dai-tu-phan-than-reflexivpronomen",
    categoryId: "pronomen",
    order: 2,
    code: "Pr2",
    title: "Đại từ phản thân (Reflexivpronomen)",
    germanTitle: "Reflexivpronomen (mich/mir, sich...)",
    level: "A2",
    summary: "Bảng đại từ phản thân Akkusativ & Dativ, quy tắc phân biệt nhanh khi nào dùng Akk hay Dat và động từ tương hỗ (reziproke Verben).",
    sections: [
      {
        id: "bang-reflexiv",
        heading: "1. Bảng Đại từ phản thân (chỉ khác nhau ở ngôi ich & du!)",
        blocks: [
          {
            type: "text",
            content:
              "Đại từ phản thân luôn **chỉ ngược lại chính chủ ngữ** trong câu (tự làm cho chính mình). Nó chỉ tồn tại ở **Akkusativ** và **Dativ**, và tin vui là chỉ khác nhau ở ngôi **ich** (*mich/mir*) và **du** (*dich/dir*) — mọi ngôi còn lại giống hệt nhau!",
          },
          {
            type: "table",
            caption: "Bảng Đại từ phản thân theo chủ ngữ",
            headers: ["Chủ ngữ", "Akkusativ", "Dativ"],
            rows: [
              ["ich ★", "{akk:mich}", "{dat:mir}"],
              ["du ★", "{akk:dich}", "{dat:dir}"],
              ["er / sie / es", "**sich**", "**sich**"],
              ["wir", "**uns**", "**uns**"],
              ["ihr", "**euch**", "**euch**"],
              ["sie / Sie", "**sich**", "**sich**"],
            ],
          },
        ],
      },
      {
        id: "akk-hay-dat",
        heading: "2. Khi nào dùng Akkusativ, khi nào dùng Dativ?",
        blocks: [
          {
            type: "rule",
            title: "Quy tắc vàng phân biệt Akk vs Dat ở đại từ phản thân",
            formula: "Chỉ có 1 tân ngữ (chính đại từ phản thân) → AKKUSATIV  |  Có THÊM 1 tân ngữ Akkusativ khác (bộ phận cơ thể, đồ vật...) → DATIV",
            note: "Ngoài ra, nếu động từ vốn yêu cầu Dativ (như helfen) thì dùng Dativ.",
          },
          {
            type: "examples",
            title: "So sánh trực tiếp Akkusativ và Dativ",
            items: [
              { de: "Ich wasche {akk:mich}.", vi: "Tôi tự tắm rửa.", note: "Không có tân ngữ khác → mich (Akk)." },
              { de: "Ich wasche {dat:mir} {akk:die Hände}.", vi: "Tôi rửa tay (cho mình).", note: "Đã có tân ngữ Akk „die Hände“ → mir (Dat)!" },
              { de: "Ich kaufe {dat:mir} {akk:ein neues Handy}.", vi: "Tôi mua cho mình một chiếc điện thoại mới.", note: "Có tân ngữ Akk „ein neues Handy“ → mir (Dat)." },
              { de: "Ich putze {dat:mir} {akk:die Zähne}.", vi: "Tôi đánh răng.", note: "Có „die Zähne“ (Akk) → mir (Dat)." },
            ],
          },
          {
            type: "tip",
            variant: "note",
            title: "Động từ tương hỗ (Reziproke Verben — „lẫn nhau“)",
            content:
              "Khi chủ ngữ ở số nhiều và hành động tác động qua lại giữa các bên, **sich / uns / euch** mang nghĩa **lẫn nhau** (= *einander / miteinander*): *Die zwei Frauen sehen **sich*** (Hai người phụ nữ nhìn thấy nhau) · *Sie streiten **sich*** (Họ cãi nhau). Hay gặp: *sich kennen, sich lieben, sich treffen, sich einigen, sich küssen*.",
          },
        ],
      },
    ],
    keyPoints: [
      "Đại từ phản thân chỉ có 2 cách (Akk & Dat) và chỉ khác nhau ở ich (mich/mir) và du (dich/dir).",
      "Mặc định dùng Akkusativ; chuyển sang Dativ khi trong câu có thêm một tân ngữ Akkusativ khác (như die Hände, die Zähne, ein Auto).",
      "Với chủ ngữ số nhiều, sich/uns/euch còn có nghĩa tương hỗ „lẫn nhau“.",
    ],
    quiz: [
      {
        question: "Chọn câu đúng: „Ich kämme ___ die Haare.“ (Tôi chải tóc cho mình)",
        options: ["mich", "mir", "sich"],
        answer: 1,
        explanation: "Trong câu đã có tân ngữ Akkusativ „die Haare“ nên đại từ phản thân chuyển sang Dativ → mir.",
      },
      {
        question: "Chọn câu đúng: „Du freust ___ auf den Urlaub.“ (sich freuen auf)",
        options: ["dir", "dich", "sich"],
        answer: 1,
        explanation: "„auf den Urlaub“ là cụm giới từ, không phải tân ngữ Akkusativ độc lập → đại từ phản thân ở Akkusativ: dich.",
      },
    ],
  },
  {
    slug: "dai-tu-so-huu-possessivpronomen",
    categoryId: "pronomen",
    order: 3,
    code: "Pr3",
    title: "Đại từ sở hữu (Possessivpronomen)",
    germanTitle: "Possessivpronomen (meiner, meine, meins)",
    level: "A2",
    summary: "Phân biệt Possessivartikel (đi trước danh từ) với Possessivpronomen (đứng một mình thay danh từ) và bảng biến cách đầy đủ.",
    sections: [
      {
        id: "phan-biet-artikel-pronomen",
        heading: "1. Phân biệt Possessivartikel vs Possessivpronomen",
        blocks: [
          {
            type: "compare",
            leftTitle: "Possessivartikel (CÓ danh từ đứng sau)",
            leftItems: [
              "Đóng vai trò mạo từ đi kèm danh từ.",
              "*Wem gehört der Ball? — Das ist **mein** Ball.*",
              "3 ô không có đuôi: Nom Đực (*mein*), Nom Trung (*mein*), Akk Trung (*mein*).",
            ],
            rightTitle: "Possessivpronomen (KHÔNG có danh từ đứng sau)",
            rightItems: [
              "Đứng một mình thay thế luôn cho danh từ đã nhắc trước đó (= „cái của tôi“).",
              "*Wem gehört der Ball? — Das ist **meiner**.*",
              "**LUÔN có đuôi giống mạo từ xác định** ở cả 3 ô kia: *mein**er*** (der), *mein**(e)s*** (das)!",
            ],
          },
        ],
      },
      {
        id: "bang-possessivpronomen",
        heading: "2. Bảng biến cách Possessivpronomen (16 ô đủ đuôi)",
        blocks: [
          {
            type: "table",
            caption: "Biến cách Đại từ sở hữu (áp dụng cho mein-, dein-, sein-, ihr-, unser-, eur-)",
            headers: ["Giống / Số của danh từ bị thay thế", "Nominativ", "Akkusativ", "Dativ", "Genitiv"],
            rows: [
              ["Maskulin (der Ball)", "{nom:meiner} ★", "{akk:meinen}", "{dat:meinem}", "{gen:meines}"],
              ["Neutral (das Auto)", "{nom:mein(e)s} ★", "{akk:mein(e)s} ★", "{dat:meinem}", "{gen:meines}"],
              ["Feminin (die Katze)", "{nom:meine}", "{akk:meine}", "{dat:meiner}", "{gen:meiner}"],
              ["Plural (die Schuhe)", "{nom:meine}", "{akk:meine}", "{dat:meinen}", "{gen:meiner}"],
            ],
          },
          {
            type: "examples",
            title: "Ví dụ đối thoại tự nhiên",
            items: [
              { de: "Ist das dein Koffer? — Ja, das ist {nom:meiner}!", vi: "Đó có phải vali của bạn không? — Đúng rồi, cái của tôi đấy!", note: "der Koffer (Nom đực) → meiner." },
              { de: "Wem gehört das Auto? — Das ist {nom:meins}!", vi: "Chiếc ô tô này của ai? — Của tôi đấy!", note: "das Auto (Nom trung) → meins (khẩu ngữ) hoặc meines." },
              { de: "Ich habe meinen Stift vergessen. Kannst du mir {akk:deinen} leihen?", vi: "Tôi quên bút rồi. Bạn cho tôi mượn cây của bạn được không?", note: "der Stift (Akk đực) → deinen." },
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Có danh từ phía sau → Possessivartikel (mein Ball). Đứng một mình thay danh từ → Possessivpronomen (meiner).",
      "Possessivpronomen chỉ khác Possessivartikel ở 3 ô: Nom Đực (+er: meiner), Nom Trung (+s/es: meins), Akk Trung (+s/es: meins).",
    ],
    quiz: [
      {
        question: "„Wem gehört das Fahrrad?“ — „Das ist ___.“ (của anh ấy)",
        options: ["sein", "seiner", "seins"],
        answer: 2,
        explanation: "„das Fahrrad“ giống trung, đứng một mình làm Possessivpronomen ở Nominativ → seins (hoặc seines).",
      },
      {
        question: "„Ist das dein Schlüssel?“ — „Nein, das ist ___.“ (của cô ấy)",
        options: ["ihrer", "ihr", "ihre"],
        answer: 0,
        explanation: "„der Schlüssel“ giống đực, Nominativ không có danh từ sau → ihrer.",
      },
    ],
  },
  {
    slug: "dai-tu-quan-he-relativpronomen",
    categoryId: "pronomen",
    order: 4,
    code: "Pr4",
    title: "Đại từ quan hệ (Relativpronomen)",
    germanTitle: "Relativpronomen (der, die, das, welcher)",
    level: "B1",
    summary: "Bảng biến cách đại từ quan hệ, quy trình 4 bước chọn đúng đại từ quan hệ, mẹo điền ngược danh từ gốc để tìm Cách và đại từ quan hệ đi kèm giới từ.",
    sections: [
      {
        id: "bang-relativpronomen",
        heading: "1. Bảng biến cách Đại từ quan hệ (der, die, das / welcher)",
        blocks: [
          {
            type: "text",
            content:
              "Đại từ quan hệ mở đầu cho một **mệnh đề quan hệ (Relativsatz)** để giải thích thêm cho danh từ đứng ngay trước nó. Vì là mệnh đề phụ, **động từ chia trong mệnh đề quan hệ bị đẩy về cuối câu**.",
          },
          {
            type: "table",
            caption: "Biến cách đại từ quan hệ — giống hệt mạo từ xác định, CHỈ khác 5 ô in đậm!",
            headers: ["Giống / Số", "Nominativ", "Akkusativ", "Dativ", "Genitiv"],
            rows: [
              ["Maskulin", "{nom:der}", "{akk:den}", "{dat:dem}", "{gen:dessen} ★"],
              ["Neutral", "{nom:das}", "{akk:das}", "{dat:dem}", "{gen:dessen} ★"],
              ["Feminin", "{nom:die}", "{akk:die}", "{dat:der}", "{gen:deren} ★"],
              ["Plural", "{nom:die}", "{akk:die}", "{dat:denen} ★", "{gen:deren} ★"],
            ],
          },
          {
            type: "tip",
            variant: "note",
            title: "Thay thế bằng „welcher, welche, welches“",
            content:
              "Ở Nominativ, Akkusativ và Dativ, bạn có thể thay *der/die/das* bằng *welcher/welche/welches* (chia 100% đuôi như *der/die/das*) để tránh lặp từ (*die Frau, **welche** die Blumen kauft*). **Lưu ý:** *welch-* KHÔNG dùng được ở Genitiv!",
          },
        ],
      },
      {
        id: "bon-buoc-va-meo",
        heading: "2. Quy tắc vàng & Mẹo điền ngược danh từ gốc tìm Cách",
        blocks: [
          {
            type: "rule",
            title: "Quy tắc 2 nguồn của Đại từ quan hệ",
            formula: "GIỐNG & SỐ lấy từ danh từ gốc ở mệnh đề chính  ·  CÁCH (Nom/Akk/Dat/Gen) quyết định bởi động từ/giới từ TRONG mệnh đề quan hệ!",
          },
          {
            type: "tip",
            variant: "tip",
            title: "Mẹo thần thánh để tìm đúng Cách: Thế danh từ gốc vào mệnh đề phụ!",
            content:
              "Hãy tách mệnh đề phụ ra thành 1 câu độc lập và điền lại danh từ gốc (*der Mann*) vào chỗ trống:\n• *Der Mann hat einen Ferrari* → **Nominativ** → **der**\n• *Wir haben **den Mann** gesehen* → **Akkusativ** → **den**\n• *Der Ferrari gehört **dem Mann*** → **Dativ** → **dem**\n• *Das Auto **des Mannes** ist kaputt* → **Genitiv** → **dessen**",
          },
          {
            type: "table",
            caption: "Cùng một danh từ gốc „der Mann“, đổi Cách theo vai trò trong mệnh đề quan hệ",
            headers: ["Mệnh đề chính", "Đại từ quan hệ", "Phần còn lại của mệnh đề phụ", "Cách"],
            rows: [
              ["Das ist der Mann,", "{nom:der}", "einen Ferrari hat.", "Nominativ"],
              ["Das ist der Mann,", "{akk:den}", "wir gestern gesehen haben.", "Akkusativ"],
              ["Das ist der Mann,", "{dat:dem}", "der Ferrari gehört.", "Dativ"],
              ["Das ist der Mann,", "{gen:dessen}", "Ferrari kaputt ist.", "Genitiv"],
            ],
          },
        ],
      },
      {
        id: "voi-gioi-tu",
        heading: "3. Đại từ quan hệ đi kèm Giới từ",
        blocks: [
          {
            type: "text",
            content:
              "Nếu động từ trong mệnh đề phụ cần một **giới từ** (như *warten auf*, *gehen in*, *sprechen mit*), ta phải đặt **giới từ đó ngay trước đại từ quan hệ** — và giới từ đó quyết định Cách của đại từ quan hệ!",
          },
          {
            type: "examples",
            title: "Ví dụ đại từ quan hệ có giới từ",
            items: [
              {
                de: "Da kommt der Bus, **auf** {akk:den} wir schon so lange warten.",
                vi: "Kia là chiếc xe buýt mà chúng ta đã đợi rất lâu rồi.",
                note: "Tách câu: Wir warten auf den Bus → „auf + Akk“ + der Bus (đực) → auf den.",
              },
              {
                de: "Dort ist die Schule, **in** {akk:die} ich früher gegangen bin.",
                vi: "Kia là ngôi trường mà trước đây tôi từng học.",
                note: "Tách câu: Ich bin in diese Schule gegangen → in + Akk + die Schule → in die.",
              },
              {
                de: "Das sind die Freunde, **mit** {dat:denen} ich in Urlaub fahre.",
                vi: "Đó là những người bạn mà tôi sẽ đi du lịch cùng.",
                note: "mit + Dativ số nhiều → mit denen (không phải mit den!).",
              },
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Đại từ quan hệ giống mạo từ xác định, chỉ thêm -en ở Dativ số nhiều (denen) và Genitiv (dessen, deren).",
      "Giống & Số lấy từ danh từ đứng trước; Cách lấy theo chức năng trong mệnh đề quan hệ.",
      "Mẹo cực dễ: đặt danh từ gốc vào trong mệnh đề phụ để xem nó đứng ở Cách nào.",
      "Nếu động từ trong mệnh đề phụ đi với giới từ, đặt giới từ đó ngay trước đại từ quan hệ.",
    ],
    quiz: [
      {
        question: "Chọn đại từ quan hệ đúng: „Das sind die Kollegen, mit ___ ich arbeite.“",
        options: ["den", "denen", "deren"],
        answer: 1,
        explanation: "„die Kollegen“ là số nhiều; giới từ „mit“ đòi hỏi Dativ → Dativ số nhiều của đại từ quan hệ là „denen“.",
      },
      {
        question: "Chọn đại từ quan hệ đúng: „Das ist die Frau, ___ Auto vor der Tür steht.“",
        options: ["die", "der", "deren"],
        answer: 2,
        explanation: "Chiếc xe CỦA người phụ nữ (sở hữu → Genitiv), danh từ gốc „die Frau“ là giống cái → deren.",
      },
    ],
  },
  {
    slug: "dai-tu-chi-dinh-demonstrativpronomen",
    categoryId: "pronomen",
    order: 5,
    code: "Pr5",
    title: "Đại từ chỉ định (Demonstrativpronomen)",
    germanTitle: "Demonstrativpronomen (der/die/das, dieser, jener)",
    level: "A2",
    summary: "Cách dùng der/die/das nhấn mạnh ở vị trí 1, các chức năng đặc biệt của „das“ và cách phân biệt „dieser“ (cái này) với „jener“ / „der da“ (cái kia).",
    sections: [
      {
        id: "der-die-das-nhan-manh",
        heading: "1. „der, die, das“ làm đại từ chỉ định nhấn mạnh",
        blocks: [
          {
            type: "text",
            content:
              "Khi muốn **nhấn mạnh** một người/vật vừa được nhắc đến (tương đương „người đó / cái đó“ trong tiếng Việt), tiếng Đức dùng đại từ chỉ định **der, die, das**. Biến cách của chúng **giống hệt đại từ quan hệ** (*Dat Pl: denen; Gen: dessen, deren/derer*).",
          },
          {
            type: "tip",
            variant: "tip",
            title: "Vị trí câu: Thường đứng ở Vị trí 1!",
            content:
              "Vì mang sắc thái nhấn mạnh, đại từ chỉ định gần như luôn đứng ở **Position 1**: *Wer ist der Mann dort? — **Den** kenne ich nicht!* (Ai kia nhỉ? — **Ông đó** tôi không quen đâu!). Đặt ở vị trí 3–4 nghe rất gượng với người bản xứ.",
          },
          {
            type: "examples",
            title: "Ví dụ với đại từ chỉ định der/die/das và „das“",
            items: [
              { de: "{akk:Den} gibt der Mann der Frau.", vi: "Chính lá thư ĐÓ người đàn ông đưa cho người phụ nữ.", note: "Đưa „den“ lên Vị trí 1 để nhấn mạnh." },
              { de: "Papa, was ist **das da**? — **Das** ist ein Hammer.", vi: "Bố ơi, cái kia là gì thế? — Đó là cái búa.", note: "„das“ + sein chỉ vào vật/người (thường đi kèm hier, da, dort)." },
              { de: "Wem gehören die Schuhe dort? — **Das** sind meine!", vi: "Đôi giày kia của ai? — Đó là giày của tôi!", note: "„das“ dùng chung cho cả số nhiều với động từ „sein“ (sind)." },
              { de: "Der Fernseher ist kaputt! — **Das** wusste ich schon!", vi: "Tivi hỏng rồi! — Chuyện đó tôi biết rồi!", note: "„das“ thay thế cho CẢ MỘT MỆNH ĐỀ / TÌNH HUỐNG (không có giống → luôn dùng das)." },
            ],
          },
        ],
      },
      {
        id: "dieser-jener",
        heading: "2. „dieser“ (cái này — gần) và „jener“ (cái kia — xa)",
        blocks: [
          {
            type: "table",
            caption: "Biến cách „dieser“ và „jener“ (100% đuôi giống mạo từ xác định der/die/das)",
            headers: ["Giống / Số", "Nominativ", "Akkusativ", "Dativ", "Genitiv"],
            rows: [
              ["Maskulin", "{nom:dieser}", "{akk:diesen}", "{dat:diesem}", "{gen:dieses}"],
              ["Neutral", "{nom:dieses}", "{akk:dieses}", "{dat:diesem}", "{gen:dieses}"],
              ["Feminin", "{nom:diese}", "{akk:diese}", "{dat:dieser}", "{gen:dieser}"],
              ["Plural", "{nom:diese}", "{akk:diese}", "{dat:diesen}", "{gen:dieser}"],
            ],
          },
          {
            type: "tip",
            variant: "note",
            title: "Trong khẩu ngữ hàng ngày ở Đức",
            content:
              "Người Đức rất ít nói *jener/jenes* trong giao tiếp đời thường vì nghe hơi văn chương. Họ thường thay bằng **der / die / das + da / dort**: *Gefallen dir die Schuhe? — Nein, **diese** nicht, aber **die dort**!* (Không, đôi này không thích, nhưng đôi đằng kia thì thích!).",
          },
        ],
      },
    ],
    keyPoints: [
      "Đại từ chỉ định „der, die, das“ chia giống hệt đại từ quan hệ và thường đứng ở Position 1 để nhấn mạnh.",
      "„das“ dùng để chỉ tay vào đồ vật/người (với sein) hoặc thay thế cho cả một câu/tình huống.",
      "„dieser“ chỉ vật gần người nói, „jener“ chỉ vật xa hơn (khẩu ngữ hay dùng der/die/das + da/dort).",
    ],
    quiz: [
      {
        question: "„Anna hat die Prüfung bestanden!“ — „___ ist ja super!“",
        options: ["Sie", "Die", "Das"],
        answer: 2,
        explanation: "Khi thay thế cho cả một tình huống/câu nói trước đó (không có giống ngữ pháp), ta luôn dùng „Das“.",
      },
      {
        question: "Chọn câu đúng với „dieser“: „Ich nehme ___ Pullover hier.“ (der Pullover, Akk)",
        options: ["dieser", "diesen", "diesem"],
        answer: 1,
        explanation: "„nehmen“ + Akkusativ, „der Pullover“ là giống đực → diesen.",
      },
    ],
  },
  {
    slug: "dai-tu-bat-dinh-va-es",
    categoryId: "pronomen",
    order: 6,
    code: "Pr6",
    title: "Đại từ bất định (Indefinitpronomen) & Toàn tập cách dùng „es“",
    germanTitle: "Indefinitpronomen & Das Pronomen „es“",
    level: "B1",
    summary: "3 nhóm đại từ bất định (man/jemand/niemand; etwas/alles/nichts; jeder/alle/einige/ein-/kein-) và 4 vai trò cốt lõi của đại từ „es“.",
    sections: [
      {
        id: "ba-nhom-indefinit",
        heading: "1. Ba nhóm Đại từ bất định (Indefinitpronomen)",
        blocks: [
          {
            type: "text",
            content:
              "Đại từ bất định thay thế cho người hoặc vật **chung chung, không xác định cụ thể** (như *ai đó, người ta, cái gì đó, không có gì, tất cả*).",
          },
          {
            type: "table",
            caption: "Nhóm 1 — Chỉ dành cho NGƯỜI (luôn chia động từ ngôi 3 số ít!)",
            headers: ["Đại từ", "Nominativ", "Akkusativ", "Dativ", "Lưu ý & Ví dụ"],
            rows: [
              ["**man** (người ta)", "{nom:man}", "{akk:einen}", "{dat:einem}", "Vô nhân xưng: *Hier muss **man** **einem** alles dreimal erklären!*"],
              ["**jemand** (ai đó)", "{nom:jemand}", "{akk:jemand(en)}", "{dat:jemand(em)}", "Đuôi -en/-em là tùy chọn. Có thể thêm *irgend-* → *irgendjemand*."],
              ["**niemand** (không ai)", "{nom:niemand}", "{akk:niemand(en)}", "{dat:niemand(em)}", "Phủ định của *jemand*: *Schade, **niemand** spricht hier Deutsch.*"],
            ],
          },
          {
            type: "table",
            caption: "Nhóm 2 — Chỉ dành cho VẬT / SỰ VIỆC (KHÔNG biến cách!)",
            headers: ["Đại từ", "Nghĩa & Cách dùng", "Ví dụ"],
            rows: [
              ["**etwas** *(khẩu ngữ: was)*", "Cái gì đó (có thể thêm *irgendetwas*). **Nghĩa 2:** „một chút“ (*etwas mehr Geld*).", "*Hörst du **etwas**? — Ja, da ist **irgendetwas**!*"],
              ["**alles**", "Tất cả mọi thứ (dùng cho vật/tình huống chung, không giống).", "*Ich mache am liebsten **alles** allein.*"],
              ["**nichts**", "Không có gì (phủ định của *etwas* & *alles*). Đừng nhầm với *nicht*!", "*Hast du etwas gehört? — Nein, ich habe **nichts** gehört.*"],
            ],
          },
          {
            type: "table",
            caption: "Nhóm 3 — Dùng cho CẢ NGƯỜI VÀ VẬT",
            headers: ["Đại từ", "Quy tắc chia & Số", "Ví dụ"],
            rows: [
              ["**jede(r/s)** (mỗi / mọi người)", "Chia đuôi như *der/die/das*, **luôn số ít**.", "***Jeder** will ein iPhone.* · *Ich bin mit **jedem** zufrieden.*"],
              ["**all-** (tất cả)", "Chia đuôi như *der/die/das*, **luôn số nhiều**.", "***Alle** wollen ein iPhone.* · *Ich bin mit **allen** zufrieden.*"],
              ["**einige / manche** (một vài)", "Số ít chỉ vật (*einiges/manches*), số nhiều chia như *die* (*einige/einigen/einiger*).", "***Einige** müssen den Test wiederholen.* · *Ich würde **manches** ändern.*"],
              [
                "**ein- / kein- / welch-**",
                "Chia đủ đuôi (m: *einer/einen/einem*; n: *eins/eins/einem*; f: *eine/eine/einer*). **Số nhiều & danh từ không đếm được của „ein-“ dùng „welche(s)“!**",
                "*Hast du ein Auto? — Ja, ich habe **eins** / Nein, **keins**.*\n*Hast du noch Äpfel? — Ja, hier hast du **welche**.*\n*Hast du noch Salz? — Ja, ich habe noch **welches**.*",
              ],
            ],
          },
        ],
      },
      {
        id: "dai-tu-es",
        heading: "2. Toàn tập 4 vai trò của đại từ „es“",
        blocks: [
          {
            type: "text",
            content:
              "Trong tiếng Đức, **mọi động từ chia đều BẮT BUỘC phải có chủ ngữ** (trừ mệnh lệnh và bị động vô nhân xưng). Khi không có người thực hiện rõ ràng, **„es“** đóng vai trò chủ ngữ giả (Scheinsubjekt).",
          },
          {
            type: "list",
            title: "4 chức năng chính của „es“",
            items: [
              "**1. Thay thế để tránh lặp lại:** thay cho danh từ giống trung (*Das Auto ist rot. **Es** ist ein Ferrari*), thay cho cả câu (*Was macht sie? — Ich weiß **es** nicht*), thay cho tính từ (*Meine Mutter ist jung. Deine ist **es** nicht*), hoặc thay cho 1 hành động (*Warum hast du **es** noch nicht gemacht?*).",
              "**2. Đại diện cho mệnh đề phụ đứng sau (Korrelat):** Khi mệnh đề *dass*, câu hỏi gián tiếp *ob*, hoặc *Infinitivsatz* đóng vai trò chủ ngữ và đứng ở vế sau, vế đầu phải có „es“ giữ vị trí 1. Nếu đưa mệnh đề phụ lên đầu thì **bỏ „es“**!",
              "**3. Chủ ngữ giả với động từ vô nhân xưng:** Thời tiết (*Es regnet, Es ist kalt, Es sind 12 Grad*), giờ giấc/mùa (*Es ist 12 Uhr, Es ist Sommer, Es sind Ferien*), cảm giác/cơ thể (*Wie geht es dir? Es schmeckt mir. Es stinkt hier*).",
              "**4. Âm thanh không rõ nguồn & Cụm cố định:** *Es klingelt an der Tür* (Có tiếng chuông cửa), *Es gibt nichts Neues* (Không có gì mới), *Wo tut es weh?* (Đau ở đâu?), *Es ist leicht/schwer...*",
            ],
          },
          {
            type: "examples",
            title: "Cách „es“ biến mất khi đảo mệnh đề phụ lên Vị trí 1",
            items: [
              { de: "**Es** tut mir leid, dass ich gestern nicht da war. → Dass ich gestern nicht da war, tut mir leid.", vi: "Tôi rất tiếc vì hôm qua đã không có mặt." },
              { de: "**Es** ist leicht, Deutsch zu lernen. → Deutsch zu lernen, ist leicht.", vi: "Học tiếng Đức thật dễ." },
              { de: "**Es** ist fraglich, ob er kommt. → Ob er kommt, ist fraglich.", vi: "Chưa chắc anh ấy có đến hay không." },
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "„man“ (người ta) biến cách thành „einen“ (Akk) và „einem“ (Dat), luôn chia động từ ngôi 3 số ít.",
      "Số nhiều hoặc vật không đếm được thay cho „ein-“ dùng „welche / welches“ (VD: Hast du noch Salz? — Ja, ich habe noch welches).",
      "„es“ là chủ ngữ giả bắt buộc cho thời tiết, thời gian, cảm giác (Wie geht es dir?, Es gibt...) và đại diện cho mệnh đề phụ đứng sau.",
      "Khi đảo mệnh đề phụ (dass / ob / Infinitiv) lên đầu câu, đại từ „es“ biến mất.",
    ],
    quiz: [
      {
        question: "Chọn câu đúng: „Hier gibt es viele Äpfel. Möchtest du ___?“ (số nhiều của ein-)",
        options: ["eine", "eins", "welche"],
        answer: 2,
        explanation: "Dạng đại từ bất định số nhiều của „ein-“ là „welche“ (phủ định là „keine“).",
      },
      {
        question: "Điền dạng Dativ của „man“: „Bei diesem Lärm tut ___ der Kopf weh.“",
        options: ["man", "einen", "einem"],
        answer: 2,
        explanation: "„wehtun“ + Dativ; dạng Dativ của „man“ là „einem“.",
      },
      {
        question: "Đảo vế phụ lên đầu câu cho „Es ist wichtig, dass du kommst.“:",
        options: ["Dass du kommst, es ist wichtig.", "Dass du kommst, ist wichtig.", "Dass du kommst, ist es wichtig."],
        answer: 1,
        explanation: "Khi mệnh đề phụ (đóng vai trò chủ ngữ) đã đứng ở Vị trí 1 thì phải bỏ „es“.",
      },
    ],
  },
];
