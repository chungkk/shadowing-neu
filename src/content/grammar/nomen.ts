import type { GrammarLesson } from "./types";

export const NOMEN_LESSONS: GrammarLesson[] = [
  {
    slug: "danh-tu-va-giong-der-die-das",
    categoryId: "nomen",
    order: 1,
    code: "N1",
    title: "Danh từ, Giống (der, die, das) & Mẹo đoán 75% mạo từ",
    germanTitle: "Nomen, Genus & Artikeltrick",
    level: "A1",
    summary: "Hiểu bản chất danh từ tiếng Đức, bảng dấu hiệu nhận biết giống đực/cái/trung qua nghĩa và đuôi từ, cộng quy tắc 4 bước đoán đúng tới 75% khi giao tiếp.",
    sections: [
      {
        id: "khai-niem",
        heading: "1. Danh từ (Nomen / Substantive) là gì?",
        blocks: [
          {
            type: "text",
            content:
              "Danh từ dùng để gọi tên người, con vật, đồ vật hoặc khái niệm trừu tượng (như thời tiết, ánh sáng, tự do). Trong tiếng Đức có **3 đặc điểm cốt lõi** bạn phải nhớ ngay từ ngày đầu:",
          },
          {
            type: "list",
            items: [
              "**Luôn viết hoa chữ cái đầu**, dù đứng ở bất kỳ vị trí nào trong câu (VD: *das Haus, die Lampe, das Wetter*).",
              "**Hầu như luôn đi kèm mạo từ** (*der, die, das, ein, eine...*) đứng trước nó.",
              "**Danh từ ghép luôn viết liền thành một từ** (VD: *der Führerschein* = bằng lái xe, *die Wasserflasche* = chai nước).",
            ],
          },
        ],
      },
      {
        id: "ba-giong",
        heading: "2. Ba giống ngữ pháp: Maskulin, Feminin, Neutral",
        blocks: [
          {
            type: "text",
            content:
              "Mỗi danh từ tiếng Đức đều mang một **giống ngữ pháp (Genus)** cố định. Trong từ điển, giống được viết tắt là **m** (maskulin – giống đực: **der**), **f** (feminin – giống cái: **die**) và **n** (neutral – giống trung: **das**). Lưu ý: ngay cả đồ vật vô tri cũng mang giống đực hoặc cái (VD: *der Tisch* – cái bàn là giống đực, *die Flasche* – cái chai là giống cái, *das Mädchen* – cô gái lại là giống trung vì đuôi *-chen*).",
          },
          {
            type: "tip",
            variant: "warning",
            title: "Nguyên tắc vàng khi học từ vựng",
            content:
              "Không có quy tắc tuyệt đối 100% cho mọi danh từ. Hãy **luôn học danh từ kèm theo mạo từ và dạng số nhiều** (VD: *die Lampe, die Lampen*) thay vì chỉ học riêng từ *Lampe*.",
          },
        ],
      },
      {
        id: "dau-hieu-giong",
        heading: "3. Dấu hiệu nhận biết giống qua nghĩa và đuôi từ",
        blocks: [
          {
            type: "table",
            caption: "Danh từ giống đực — Maskulin (der)",
            headers: ["Nhóm / Đuôi từ", "Ví dụ"],
            rows: [
              ["Người giới tính nam", "**der** Mann, **der** Vater, **der** Student"],
              ["Nghề nghiệp (dạng nam)", "**der** Arzt, **der** Architekt, **der** Mechaniker"],
              ["Phương hướng", "**der** Norden, **der** Süden, **der** Osten, **der** Westen"],
              ["Thứ, tháng, mùa trong năm", "**der** Montag, **der** März, **der** Winter"],
              ["Hiện tượng mưa/tuyết (Niederschlag)", "**der** Regen, **der** Schnee, **der** Hagel"],
              ["Hầu hết núi & sông ngoài nước Đức", "**der** Mt. Everest, **der** Nil, **der** Amazonas"],
              ["Đuôi **-ling, -ismus, -ich**", "**der** Schmetterling, **der** Kapitalismus, **der** Teppich"],
              ["Đuôi thường là der: **-ig, -ent, -ier, -ist, -or, -ör, -iker, -ast, -eur**", "**der** König, **der** Student, **der** Motor, **der** Ingenieur"],
            ],
          },
          {
            type: "table",
            caption: "Danh từ giống cái — Feminin (die)",
            headers: ["Nhóm / Đuôi từ", "Ví dụ"],
            rows: [
              ["Người giới tính nữ", "**die** Frau, **die** Schwester, **die** Mutter"],
              ["Nghề nghiệp đuôi **-in, -frau**", "**die** Ärztin, **die** Lehrerin, **die** Kauffrau"],
              ["Hầu hết sông ở Đức", "**die** Elbe, **die** Donau, **die** Isar"],
              ["Tên hoa, tàu thủy, xe mô tô", "**die** Orchidee, **die** Titanic, **die** Kawasaki"],
              ["Đuôi **-heit, -keit**", "**die** Freiheit, **die** Gesundheit, **die** Möglichkeit"],
              ["Đuôi **-schaft, -ion, -ung**", "**die** Freundschaft, **die** Station, **die** Wohnung"],
              ["Đuôi thường là die: **-anz, -ik, -tät, -ur, -ei, -sis, -ive, -ade**", "**die** Musik, **die** Universität, **die** Bäckerei, **die** Natur"],
            ],
          },
          {
            type: "table",
            caption: "Danh từ giống trung — Neutral (das)",
            headers: ["Nhóm / Đuôi từ", "Ví dụ"],
            rows: [
              ["Màu sắc & tên khách sạn", "**das** Rot, **das** Blau, **das** Hilton"],
              ["Động từ danh từ hóa (Nominalisierung)", "**das** Lernen, **das** Essen, **das** Laufen"],
              ["Đuôi thu nhỏ **-chen, -lein** (100% das)", "**das** Mädchen, **das** Brötchen, **das** Fräulein"],
              ["Đuôi **-ment, -ing**", "**das** Dokument, **das** Experiment, **das** Training"],
              ["Đuôi thường là das: **-tel, -tum, -um, -o, -ma, -ett**", "**das** Viertel, **das** Zentrum, **das** Auto, **das** Thema"],
            ],
          },
        ],
      },
      {
        id: "meo-doan-75",
        heading: "4. Mẹo đoán 75% mạo từ khi đang nói chuyện",
        blocks: [
          {
            type: "text",
            content:
              "Theo thống kê tần suất thực tế của danh từ tiếng Đức: **der chiếm ~41%**, **die chiếm ~35%**, và **das chỉ chiếm ~24%**. Khi đang nói nhanh mà quên mất mạo từ (không có từ điển bên cạnh), bạn chỉ cần nhớ 3 đuôi trung, 6 đuôi cái và đi theo 4 bước sau:",
          },
          {
            type: "steps",
            title: "Quy trình 4 bước đoán nhanh mạo từ",
            items: [
              {
                step: "Bước 1 — Xét người và động vật",
                detail: "Người (và hầu hết động vật) mặc định là **der**, trừ khi nói rõ là nữ (đuôi *-in, -frau* hoặc mẹ/chị/em gái → **die**).",
                example: "der Kollege → die Kollegin",
              },
              {
                step: "Bước 2 — Kiểm tra 3 đuôi giống trung → chọn das",
                detail: "Nếu từ kết thúc bằng **-chen, -lein, -ment** → chọn ngay **das**.",
                example: "das Brötchen, das Apartment",
              },
              {
                step: "Bước 3 — Kiểm tra 6 đuôi giống cái → chọn die",
                detail: "Nếu từ kết thúc bằng **-e, -heit, -keit, -ung, -schaft, -ion** → chọn ngay **die**.",
                example: "die Lampe, die Zeitung, die Information",
              },
              {
                step: "Bước 4 — Các trường hợp còn lại → chọn der",
                detail: "Vì **der** chiếm tỷ lệ cao nhất (~41%) sau khi đã loại các đuôi phổ biến của *die/das*, đoán **der** giúp bạn đạt độ chính xác trung bình tới ~75%!",
              },
            ],
          },
          {
            type: "tip",
            variant: "tip",
            title: "Tin vui cho số nhiều & danh từ ghép",
            content:
              "Ở dạng **số nhiều (Plural)**, mọi giống đều dùng chung **die** (*die Bälle, die Frauen, die Häuser*). Với **danh từ ghép**, giống luôn theo **từ đứng cuối cùng** (*der Schrank + die Tür = die Schranktür*).",
          },
        ],
      },
    ],
    keyPoints: [
      "Mọi danh từ tiếng Đức đều viết hoa chữ cái đầu và có một trong 3 giống: der (m), die (f), das (n).",
      "Danh từ ghép lấy giống theo danh từ cuối cùng; số nhiều luôn dùng chung mạo từ „die“.",
      "Đuôi -chen/-lein/-ment luôn là das; đuôi -heit/-keit/-ung/-schaft/-ion luôn là die.",
      "Mẹo nói nhanh: xét người/nữ → 3 đuôi das → 6 đuôi die → còn lại đoán der.",
    ],
    quiz: [
      {
        question: "Mạo từ đúng của danh từ „Möglichkeit“ (khả năng) là gì?",
        options: ["der Möglichkeit", "die Möglichkeit", "das Möglichkeit"],
        answer: 1,
        explanation: "Mọi danh từ kết thúc bằng đuôi -keit (và -heit) luôn là giống cái (die).",
      },
      {
        question: "Mạo từ đúng của „Brötchen“ (bánh mì nhỏ) là gì?",
        options: ["der Brötchen", "die Brötchen", "das Brötchen"],
        answer: 2,
        explanation: "Mọi danh từ có đuôi thu nhỏ -chen hoặc -lein luôn là giống trung (das).",
      },
      {
        question: "Ghép „die Hand“ + „das Tuch“ thành „Handtuch“ (khăn tay). Mạo từ đúng là gì?",
        options: ["die Handtuch", "der Handtuch", "das Handtuch"],
        answer: 2,
        explanation: "Danh từ ghép luôn lấy giống của danh từ đứng cuối cùng (das Tuch → das Handtuch).",
      },
    ],
  },
  {
    slug: "so-nhieu-danh-tu",
    categoryId: "nomen",
    order: 2,
    code: "N2",
    title: "Thành lập số nhiều của danh từ",
    germanTitle: "Die Pluralbildung",
    level: "A1",
    summary: "5 kiểu đuôi số nhiều (-n/-en, -e, -r/-er, -s, không đổi), quy tắc biến âm Umlaut, từ mượn và các danh từ chỉ có số ít hoặc chỉ có số nhiều.",
    sections: [
      {
        id: "tong-quan-so-nhieu",
        heading: "1. Tổng quan: 5 kiểu tạo số nhiều trong tiếng Đức",
        blocks: [
          {
            type: "text",
            content:
              "Tin vui là ở số nhiều (Plural), bạn **không cần phân biệt giống đực/cái/trung nữa** — tất cả đều dùng chung mạo từ **die** (ở cách 1 Nominativ). Tuy nhiên, phần đuôi của danh từ có tới 5 kiểu khác nhau (đôi khi kèm biến âm Umlaut *a → ä, o → ö, u → ü*):",
          },
          {
            type: "table",
            caption: "5 quy tắc nhận diện đuôi số nhiều phổ biến nhất",
            headers: ["Đuôi số nhiều", "Thường áp dụng cho", "Ví dụ"],
            rows: [
              [
                "**-n / -en**",
                "• 99% danh từ kết thúc bằng **-e**\n• Danh từ giống cái đuôi **-in, -ion, -ik, -ung, -tät, -schaft, -keit, -heit**\n• Danh từ giống đực đuôi **-ent, -ant, -and, -or, -ist**",
                "die Flasche → die Flasche**n**\ndie Universität → die Universität**en**\nder Student → die Student**en**\ndie Kellnerin → die Kellnerin**nen** (gấp đôi n!)",
              ],
              [
                "**-e** *(thường kèm Umlaut)*",
                "• Nhiều danh từ giống đực\n• Danh từ giống cái 1 âm tiết (**luôn** có Umlaut nếu có a, o, u)",
                "der Baum → die B**ä**um**e**\nder König → die König**e**\ndie Nacht → die N**ä**cht**e**\ndie Hand → die H**ä**nd**e**",
              ],
              [
                "**-r / -er** *(thường kèm Umlaut)*",
                "• Nhiều danh từ giống trung 1 âm tiết\n• **Lưu ý:** Danh từ giống cái KHÔNG BAO GIỜ tạo số nhiều bằng -r/-er!",
                "das Haus → die H**ä**us**er**\ndas Glas → die Gl**ä**s**er**\ndas Kind → die Kind**er**",
              ],
              [
                "**-s**",
                "• Danh từ kết thúc bằng nguyên âm **a, i, o, u, y**\n• Từ mượn tiếng Anh & tên họ gia đình",
                "das Auto → die Auto**s**\ndas Hobby → die Hobby**s**\ndas Team → die Team**s**\ndie Müller**s** (= gia đình Müller)",
              ],
              [
                "**Không thêm đuôi** *(chỉ đổi mạo từ, đôi khi thêm Umlaut)*",
                "• Danh từ giống đực & trung đuôi **-el, -en, -er** (và -chen/-lein)\n• *Ngoại lệ:* giống cái đuôi -el thêm **-n** (*die Kartoffel → die Kartoffeln*)",
                "der Apfel → die **Ä**pfel\nder Vater → die V**ä**ter\ndas Brötchen → die Brötchen",
              ],
            ],
          },
        ],
      },
      {
        id: "truong-hop-dac-biet",
        heading: "2. Từ mượn, danh từ không có số nhiều & không có số ít",
        blocks: [
          {
            type: "compare",
            leftTitle: "Chỉ có số ít (Singulariatantum)",
            leftItems: [
              "**das Obst** (hoa quả nói chung — bản thân đã mang nghĩa tập hợp)",
              "**die Milch** (sữa — chất lỏng không đếm được)",
              "**der Durst** (cơn khát — khái niệm không đếm được)",
              "**das Geld** (tiền bạc), **die Zeit** (thời gian)",
            ],
            rightTitle: "Chỉ có số nhiều (Pluraliatantum)",
            rightItems: [
              "**die Leute** (mọi người — không có dạng số ít)",
              "**die Eltern** (bố mẹ — luôn là số nhiều)",
              "**die Ferien** (kỳ nghỉ lễ/hè)",
              "**die Möbel** (đồ nội thất), **die Lebensmittel** (thực phẩm)",
            ],
          },
          {
            type: "tip",
            variant: "note",
            title: "Từ mượn gốc Latin / Hy Lạp",
            content:
              "Một số danh từ gốc Latin/Hy Lạp có dạng số nhiều đặc biệt (thường đổi đuôi *-um* thành *-en* hoặc *-a*): **das Museum → die Museen**, **das Praktikum → die Praktika**, **das Visum → die Visa**.",
          },
          {
            type: "tip",
            variant: "tip",
            title: "Mẹo nhớ nhanh 4 dòng",
            content:
              "Giống cái (**die**) đa số thêm **-n/-en** · Giống đực (**der**) đa số thêm **-e** · Giống trung (**das**) đa số thêm **-er** · Giống đực/trung đuôi **-el, -en, -er** giữ nguyên không thêm đuôi.",
          },
        ],
      },
    ],
    keyPoints: [
      "Số nhiều không phân biệt giống, tất cả đều dùng mạo từ „die“ ở Nominativ.",
      "Danh từ nữ đuôi -in luôn gấp đôi chữ n ở số nhiều (-innen).",
      "Danh từ giống cái không bao giờ tạo số nhiều bằng -r/-er.",
      "Một số danh từ chỉ có số ít (Obst, Milch) hoặc chỉ có số nhiều (Leute, Eltern, Ferien).",
    ],
    quiz: [
      {
        question: "Dạng số nhiều đúng của „die Kellnerin“ (nữ phục vụ) là gì?",
        options: ["die Kellnerinen", "die Kellnerinnen", "die Kellnerins"],
        answer: 1,
        explanation: "Danh từ giống cái kết thúc bằng -in luôn gấp đôi chữ n khi sang số nhiều: -innen.",
      },
      {
        question: "Dạng số nhiều đúng của „die Kartoffel“ (củ khoai tây) là gì?",
        options: ["die Kartoffel", "die Kartöffel", "die Kartoffeln"],
        answer: 2,
        explanation: "Danh từ giống đực/trung đuôi -el không thêm đuôi, nhưng danh từ giống cái đuôi -el lại thêm -n (die Kartoffeln).",
      },
      {
        question: "Từ nào sau đây KHÔNG có dạng số ít?",
        options: ["das Obst", "die Eltern", "das Auto"],
        answer: 1,
        explanation: "„die Eltern“ (bố mẹ) là danh từ chỉ tồn tại ở dạng số nhiều.",
      },
    ],
  },
  {
    slug: "danh-tu-ghep",
    categoryId: "nomen",
    order: 3,
    code: "N3",
    title: "Danh từ ghép trong tiếng Đức",
    germanTitle: "Zusammengesetzte Nomen (Komposita)",
    level: "A2",
    summary: "Cách người Đức ghép nhiều từ thành một danh từ dài gọn nghĩa, 4 kiểu ghép phổ biến và quy tắc đọc nghĩa từ phải sang trái.",
    sections: [
      {
        id: "bon-kieu-ghep",
        heading: "1. Bốn kiểu ghép danh từ phổ biến",
        blocks: [
          {
            type: "text",
            content:
              "Thay vì dùng cụm giới từ dài dòng như *die Tür vom Haus* (cánh cửa của ngôi nhà), tiếng Đức ghép trực tiếp thành một từ duy nhất: **die Haustür**. Từ mang nghĩa chính luôn đứng **ở cuối**, các từ đứng trước dùng để bổ sung/thu hẹp nghĩa.",
          },
          {
            type: "table",
            caption: "4 cách kết hợp tạo danh từ ghép",
            headers: ["Công thức", "Cách ghép", "Kết quả & Nghĩa"],
            rows: [
              ["**Nomen + Nomen**", "das Haus + **die Tür**\nder Kampf + **der Hund**", "**die** Haustür (cửa nhà)\n**der** Kampfhund (chó chiến đấu)"],
              ["**Verb (bỏ -en) + Nomen**", "schlafen + **das Zimmer**\nschreiben + **der Tisch**", "**das** Schlafzimmer (phòng ngủ)\n**der** Schreibtisch (bàn viết)"],
              ["**Adjektiv + Nomen**", "rot + **der Wein**\nhoch + **das Haus**", "**der** Rotwein (rượu vang đỏ)\n**das** Hochhaus (nhà cao tầng)"],
              ["**Adverb + Nomen**", "zusammen + **die Arbeit**\naußen + **die Wand**", "**die** Zusammenarbeit (sự hợp tác)\n**die** Außenwand (tường ngoài)"],
            ],
          },
        ],
      },
      {
        id: "giong-va-cach-dich",
        heading: "2. Quy tắc chọn giống, số nhiều & mẹo dịch từ dài",
        blocks: [
          {
            type: "rule",
            title: "Quy tắc từ đứng cuối (Grundwort)",
            formula: "Giống (der/die/das) & Số nhiều của danh từ ghép = Giống & Số nhiều của danh từ CUỐI CÙNG",
            note: "Các thành phần đứng trước không ảnh hưởng đến mạo từ hay đuôi số nhiều của cả từ.",
          },
          {
            type: "examples",
            title: "Ví dụ minh họa quy tắc từ cuối",
            items: [
              { de: "das Wasser + die Flasche → die Wasserflasche (die Wasserflaschen)", vi: "chai nước (lấy giống và số nhiều của die Flasche)" },
              { de: "die Kartoffel + der Salat → der Kartoffelsalat (die Kartoffelsalate)", vi: "salad khoai tây (lấy giống của der Salat)" },
              { de: "das Haus + die Tür → die Haustür (die Haustüren)", vi: "cửa chính ngôi nhà (lấy giống của die Tür)" },
            ],
          },
          {
            type: "tip",
            variant: "tip",
            title: "Mẹo giải mã từ siêu dài: đọc từ PHẢI sang TRÁI!",
            content:
              "Gặp từ dài như **die Sofatischglasplatte**, đừng hoảng! Hãy tách ngược từ cuối lên đầu: **Platte** (tấm) ← **Glas** (kính) ← **Tisch** (bàn) ← **Sofa** (ghế sofa) ⇒ *tấm kính của cái bàn đặt cạnh ghế sofa*!",
          },
        ],
      },
    ],
    keyPoints: [
      "Danh từ ghép tiếng Đức luôn viết liền và chỉ viết hoa chữ cái đầu tiên.",
      "Thành phần cuối cùng quyết định nghĩa chính, mạo từ (der/die/das) và dạng số nhiều.",
      "Khi ghép động từ + danh từ, động từ thường bỏ đuôi -en (schlafen + Zimmer → Schlafzimmer).",
      "Gặp từ ghép dài, hãy tách và dịch ngược từ phải sang trái.",
    ],
    quiz: [
      {
        question: "Ghép „kochen“ (nấu ăn) + „das Buch“ (quyển sách) thành danh từ ghép đúng:",
        options: ["das Kochenbuch", "das Kochbuch", "der Kochbuch"],
        answer: 1,
        explanation: "Động từ bỏ đuôi -en (koch-) và giữ nguyên giống của từ cuối „das Buch“ → das Kochbuch.",
      },
      {
        question: "Trong từ „die Bahnhofstraße“, thành phần nào quyết định mạo từ „die“?",
        options: ["die Bahn", "der Hof", "die Straße"],
        answer: 2,
        explanation: "Danh từ đứng cuối cùng (die Straße) luôn quyết định giống của cả từ ghép.",
      },
    ],
  },
  {
    slug: "bon-cach-trong-tieng-duc-va-nominativ",
    categoryId: "nomen",
    order: 4,
    code: "N4",
    title: "Tổng quan 4 Cách & Cách 1 (Nominativ)",
    germanTitle: "Die 4 Fälle & Der Nominativ",
    level: "A1",
    summary: "Hiểu rõ vai trò của 4 Cách (Kasus) trong câu tiếng Đức, quy ước màu giúp ghi nhớ trực quan và cách dùng Nominativ làm chủ ngữ & vị ngữ danh từ.",
    sections: [
      {
        id: "bon-cach-la-gi",
        heading: "1. Cách (Kasus / Fall) là gì? Hệ màu 4 Cách",
        blocks: [
          {
            type: "text",
            content:
              "Trong tiếng Đức, vị trí từ trong câu rất linh hoạt. Để biết ai là người làm hành động, ai là người nhận, và vật gì bị tác động, tiếng Đức dùng **4 Cách (Fälle)**. Khi danh từ đổi Cách, **mạo từ, tính từ đi kèm và đại từ thay thế** cũng phải biến đổi theo.",
          },
          {
            type: "table",
            caption: "Bảng tổng quan 4 Cách & màu nhận diện trên HalloVN",
            headers: ["Cách", "Vai trò chính", "Câu hỏi kiểm tra", "Ví dụ nhận diện"],
            rows: [
              ["{nom:Nominativ} (Cách 1)", "Chủ ngữ (người/vật thực hiện hành động)", "**Wer?** (Ai?) / **Was?** (Cái gì?)", "{nom:Ich} gebe {dat:dir} {akk:den Schlüssel} {gen:meines Hauses}."],
              ["{akk:Akkusativ} (Cách 4)", "Tân ngữ trực tiếp (đối tượng chịu tác động)", "**Wen?** (Ai?) / **Was?** (Cái gì?)", "sau động từ thường & giới từ *für, um, durch, ohne, gegen, bis*"],
              ["{dat:Dativ} (Cách 3)", "Tân ngữ gián tiếp (người nhận)", "**Wem?** (Cho ai?)", "sau *helfen, gehören, gefallen* & giới từ *aus, bei, mit, nach, seit, von, zu*"],
              ["{gen:Genitiv} (Cách 2)", "Sở hữu / thuộc về", "**Wessen?** (Của ai?)", "sau *während, wegen, trotz* & cụm sở hữu danh từ–danh từ"],
            ],
          },
          {
            type: "examples",
            title: "Một câu có đủ cả 4 Cách",
            items: [
              {
                de: "{nom:Ich} gebe {dat:dir} {akk:den Schlüssel} {gen:meines Hauses}.",
                vi: "Tôi đưa cho bạn chiếc chìa khóa của ngôi nhà tôi.",
                note: "Ich (Nom: chủ ngữ) · dir (Dat: người nhận) · den Schlüssel (Akk: vật được đưa) · meines Hauses (Gen: sở hữu).",
              },
            ],
          },
        ],
      },
      {
        id: "nominativ-la-gi",
        heading: "2. Cách 1 – Nominativ: Chủ ngữ & Prädikativ",
        blocks: [
          {
            type: "table",
            caption: "Mạo từ ở Cách 1 (Nominativ — dạng gốc trong từ điển)",
            headers: ["Giống", "Mạo từ xác định", "Mạo từ không xác định"],
            rows: [
              ["Maskulin (Đực)", "{nom:der} Mann", "{nom:ein} Mann"],
              ["Feminin (Cái)", "{nom:die} Frau", "{nom:eine} Frau"],
              ["Neutral (Trung)", "{nom:das} Kind", "{nom:ein} Kind"],
              ["Plural (Số nhiều)", "{nom:die} Eltern", "– Eltern"],
            ],
          },
          {
            type: "text",
            content:
              "Ta dùng **Nominativ** trong **2 trường hợp**:\n1. **Làm chủ ngữ (Subjekt)** — người/vật thực hiện hành động, quyết định cách chia động từ. **Chủ ngữ LUÔN ở Nominativ, không có ngoại lệ**, kể cả khi đứng sau động từ.\n2. **Làm bổ ngữ định danh (Prädikativ)** sau 4 động từ đặc biệt: **sein** (là), **werden** (trở thành), **bleiben** (vẫn là), **heißen** (tên là) — khi chúng là **động từ chính**.",
          },
          {
            type: "examples",
            title: "Ví dụ Nominativ làm chủ ngữ & Prädikativ",
            items: [
              { de: "{nom:Das Pferd} ist weiß.", vi: "Con ngựa màu trắng.", note: "Chủ ngữ → Nominativ." },
              { de: "Den Ball hat {nom:der Junge} zum Geburtstag bekommen.", vi: "Cậu bé đã nhận được quả bóng vào ngày sinh nhật.", note: "Dù đứng sau động từ „hat“, „der Junge“ vẫn là chủ ngữ → Nominativ!" },
              { de: "{nom:Du} bist {nom:ein guter Schüler}.", vi: "Bạn là một học sinh giỏi.", note: "Sau động từ chính „sein“ → Nominativ thứ hai (Prädikativ)." },
              { de: "{nom:Mein Sohn} wird {nom:ein guter Arzt}.", vi: "Con trai tôi sẽ trở thành một bác sĩ giỏi.", note: "Sau động từ chính „werden“ → Nominativ." },
            ],
          },
          {
            type: "tip",
            variant: "warning",
            title: "Cẩn thận: phân biệt „sein/werden“ là động từ chính hay trợ động từ!",
            content:
              "Trong *Er **ist** {nom:der Beste}* → *sein* là động từ chính nên sau nó là Nominativ. Nhưng trong *Er **ist** zu {dat:dem Mann} **gegangen*** → *ist* chỉ là trợ động từ chia thì Perfekt, không tạo Nominativ!",
          },
        ],
      },
    ],
    keyPoints: [
      "Tiếng Đức có 4 cách: Nominativ (chủ ngữ), Akkusativ (tân ngữ trực tiếp), Dativ (người nhận), Genitiv (sở hữu).",
      "Chủ ngữ luôn luôn ở Nominativ và quyết định ngôi chia của động từ.",
      "Sau các động từ chính sein, werden, bleiben, heißen luôn dùng Nominativ (không dùng Akkusativ!).",
    ],
    quiz: [
      {
        question: "Chọn câu đúng với động từ „sein“:",
        options: ["Er ist einen guten Lehrer.", "Er ist ein guter Lehrer.", "Er ist einem guten Lehrer."],
        answer: 1,
        explanation: "Động từ „sein“ luôn đi với Nominativ (Maskulin không xác định = ein guter Lehrer).",
      },
      {
        question: "Trong câu „Den Kuchen hat mein Vater gebacken“, đâu là chủ ngữ (Nominativ)?",
        options: ["Den Kuchen", "mein Vater", "gebacken"],
        answer: 1,
        explanation: "„mein Vater“ là người thực hiện hành động nướng bánh (Wer hat gebacken?) → Nominativ. „Den Kuchen“ là Akkusativ đưa lên đầu để nhấn mạnh.",
      },
    ],
  },
  {
    slug: "cach-4-akkusativ",
    categoryId: "nomen",
    order: 5,
    code: "N5",
    title: "Cách 4 – Akkusativ (Đối cách)",
    germanTitle: "Der Akkusativ",
    level: "A1",
    summary: "Khi nào dùng Akkusativ, bảng biến đổi mạo từ (chỉ giống đực đổi!), tân ngữ trực tiếp và 6 giới từ luôn bắt buộc dùng Akkusativ.",
    sections: [
      {
        id: "bang-akkusativ",
        heading: "1. Biến đổi mạo từ ở Akkusativ (Chỉ giống đực thay đổi!)",
        blocks: [
          {
            type: "table",
            caption: "Mạo từ ở Cách 4 (Akkusativ) — tin vui: die, das và số nhiều giữ nguyên!",
            headers: ["Giống", "Mạo từ xác định", "Mạo từ không xác định", "Phủ định / Sở hữu"],
            rows: [
              ["Maskulin (Đực) ★", "{akk:den} Mann", "{akk:einen} Mann", "{akk:keinen / meinen} Mann"],
              ["Feminin (Cái)", "{akk:die} Frau", "{akk:eine} Frau", "{akk:keine / meine} Frau"],
              ["Neutral (Trung)", "{akk:das} Kind", "{akk:ein} Kind", "{akk:kein / mein} Kind"],
              ["Plural (Số nhiều)", "{akk:die} Eltern", "– Eltern", "{akk:keine / meine} Eltern"],
            ],
          },
          {
            type: "tip",
            variant: "tip",
            title: "Mẹo siêu dễ nhớ cho Akkusativ",
            content:
              "So với Nominativ, **chỉ duy nhất giống đực số ít thay đổi**: *der → **den***, *ein → **einen***, *kein → **keinen***, *mein → **meinen***. Ba nhóm còn lại giữ nguyên y hệt!",
          },
        ],
      },
      {
        id: "khi-nao-dung-akkusativ",
        heading: "2. Ba trường hợp sử dụng Akkusativ",
        blocks: [
          {
            type: "list",
            items: [
              "**1. Tân ngữ trực tiếp (trong câu có 2 tân ngữ):** Là vật/người trực tiếp được dùng cho hành động (hỏi bằng *Wen? / Was?*). VD: *Der Junge schenkt {dat:einer Freundin} {akk:die Blumen}* (Tặng cái gì? → những bông hoa).",
              "**2. Bổ ngữ của đa số động từ tiếng Đức:** Nếu câu chỉ có 1 tân ngữ, mặc định đó là Akkusativ — trừ khi động từ hoặc giới từ bắt buộc dùng cách khác. VD: *haben, kaufen, lesen, sehen, essen, suchen, brauchen, kennen...*",
              "**3. Sau 6 giới từ Akkusativ cố định:** **durch** (xuyên qua), **für** (cho), **gegen** (chống lại/khoảng), **ohne** (không có), **um** (xung quanh/vào lúc), **bis** (cho đến). Mẹo nhớ chữ cái đầu: **F-U-D-G-O-B**.",
            ],
          },
          {
            type: "examples",
            title: "Ví dụ thực tế với Akkusativ",
            items: [
              { de: "{nom:Der Mann} hat {akk:einen Hund}.", vi: "Người đàn ông có một con chó.", note: "Sau „haben“ luôn là Akkusativ." },
              { de: "{nom:Er} fährt **durch** {akk:den Tunnel}.", vi: "Anh ấy lái xe xuyên qua đường hầm.", note: "Giới từ „durch“ bắt buộc dùng Akkusativ." },
              { de: "{nom:Die Blumen} sind **für** {akk:meinen Vater}.", vi: "Những bông hoa này dành cho bố tôi.", note: "Giới từ „für“ → Akkusativ." },
              { de: "{nom:Ich} trinke Kaffee **ohne** {akk:Zucker}.", vi: "Tôi uống cà phê không đường.", note: "Giới từ „ohne“ → Akkusativ." },
            ],
          },
          {
            type: "tip",
            variant: "warning",
            title: "Quy tắc quyền lực của Giới từ",
            content:
              "Nếu trước danh từ có **giới từ**, hãy quên mọi quy tắc về động từ hay tân ngữ trực tiếp/gián tiếp đi — **giới từ LUÔN LUÔN quyết định Cách của danh từ đi sau nó!**",
          },
        ],
      },
    ],
    keyPoints: [
      "Ở Akkusativ, chỉ giống đực số ít đổi đuôi thành -n (der → den, ein → einen).",
      "Đa số động từ tiếng Đức (như haben, kaufen, sehen, lieben) đi với tân ngữ Akkusativ.",
      "6 giới từ luôn bắt buộc Akkusativ: für, um, durch, gegen, ohne, bis.",
      "Giới từ đứng trước danh từ luôn có quyền ưu tiên cao nhất trong việc quyết định Cách.",
    ],
    quiz: [
      {
        question: "Điền mạo từ đúng: „Ich kaufe heute ___ neuen Tisch.“ (der Tisch)",
        options: ["ein", "einen", "einem"],
        answer: 1,
        explanation: "„kaufen“ cần tân ngữ trực tiếp Akkusativ, mà „der Tisch“ là giống đực → einen.",
      },
      {
        question: "Điền đúng sau giới từ „für“: „Das Geschenk ist für ___ Bruder.“ (der Bruder)",
        options: ["mein", "meinen", "meinem"],
        answer: 1,
        explanation: "Giới từ „für“ luôn bắt buộc Akkusativ → meinen Bruder.",
      },
      {
        question: "Nhóm giới từ nào sau đây LUÔN đi với Akkusativ?",
        options: ["mit, aus, bei, zu", "durch, für, gegen, ohne, um", "wegen, während, trotz"],
        answer: 1,
        explanation: "durch, für, gegen, ohne, um (và bis) là các giới từ Akkusativ cố định.",
      },
    ],
  },
  {
    slug: "cach-3-dativ",
    categoryId: "nomen",
    order: 6,
    code: "N6",
    title: "Cách 3 – Dativ (Tặng cách)",
    germanTitle: "Der Dativ",
    level: "A1",
    summary: "Bảng biến đổi mạo từ ở Dativ, quy tắc thêm -n cho danh từ số nhiều, động từ Dativ thường gặp và 8 giới từ luôn đi với Dativ.",
    sections: [
      {
        id: "bang-dativ",
        heading: "1. Biến đổi mạo từ & đuôi số nhiều ở Dativ",
        blocks: [
          {
            type: "table",
            caption: "Mạo từ ở Cách 3 (Dativ) — nhớ nhanh bằng mã đuôi: M – R – M – N",
            headers: ["Giống", "Mạo từ xác định", "Mạo từ không xác định", "Phủ định / Sở hữu"],
            rows: [
              ["Maskulin (Đực)", "{dat:dem} Mann", "{dat:einem} Mann", "{dat:keinem / meinem} Mann"],
              ["Feminin (Cái)", "{dat:der} Frau", "{dat:einer} Frau", "{dat:keiner / meiner} Frau"],
              ["Neutral (Trung)", "{dat:dem} Kind", "{dat:einem} Kind", "{dat:keinem / meinem} Kind"],
              ["Plural (Số nhiều) ★", "{dat:den} Eltern", "– Eltern", "{dat:keinen / meinen} Eltern"],
            ],
          },
          {
            type: "rule",
            title: "Lưu ý cực quan trọng ở Dativ Số nhiều (+n)",
            formula: "Danh từ số nhiều ở Dativ + thêm „-n“ (trừ khi đã kết thúc bằng -n hoặc -s)",
            note: "die Fahrräder → den Fahrrädern · die Bilder → den Bildern · die Tische → den Tischen · NHƯNG: die Autos → den Autos, die Frauen → den Frauen.",
          },
        ],
      },
      {
        id: "khi-nao-dung-dativ",
        heading: "2. Ba trường hợp sử dụng Dativ",
        blocks: [
          {
            type: "list",
            items: [
              "**1. Tân ngữ gián tiếp (người nhận):** Trong câu có 2 tân ngữ, người nhận hành động đứng ở Dativ (hỏi bằng **Wem?**). VD: *Er gibt {dat:dem Mann} {akk:die Schlüssel}* (Đưa cho ai? → cho người đàn ông).",
              "**2. Sau các động từ Dativ đặc biệt (Dativverben):** Một số động từ dù chỉ có 1 tân ngữ nhưng vẫn bắt buộc dùng Dativ — cần học thuộc lòng! Tiêu biểu: **helfen** (giúp), **danken** (cảm ơn), **gehören** (thuộc về), **gefallen** (làm thích), **passen** (vừa vặn), **schmecken** (ngon), **antworten** (trả lời), **glauben** (tin), **zuhören** (lắng nghe), **gratulieren** (chúc mừng), **folgen** (đi theo).",
              "**3. Sau 8 giới từ Dativ cố định:** **aus** (từ bên trong), **bei** (ở chỗ), **mit** (với/bằng), **nach** (sau/đến), **seit** (từ lúc), **von** (từ/của), **zu** (đến chỗ), **gegenüber** (đối diện) — và *außer* (ngoại trừ).",
            ],
          },
          {
            type: "examples",
            title: "Ví dụ thực tế với Dativ",
            items: [
              { de: "{nom:Das Auto} gehört {dat:dem Mann}.", vi: "Chiếc ô tô này thuộc về người đàn ông đó.", note: "Động từ „gehören“ luôn đi với Dativ." },
              { de: "{nom:Ich} helfe {dat:meiner Freundin} beim Umzug.", vi: "Tôi giúp bạn gái chuyển nhà.", note: "Động từ „helfen“ → Dativ (die Freundin → meiner Freundin)." },
              { de: "{nom:Er} kommt **aus** {dat:dem Haus}.", vi: "Anh ấy bước ra khỏi nhà.", note: "Giới từ „aus“ → Dativ (das Haus → dem Haus)." },
              { de: "{nom:Wir} spielen **mit** {dat:den Kindern}.", vi: "Chúng tôi chơi với bọn trẻ.", note: "Giới từ „mit“ + Dativ số nhiều → die Kinder đổi thành den Kindern!" },
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Mạo từ xác định Dativ: dem (đực), der (cái), dem (trung), den (số nhiều) — nhớ nhanh M-R-M-N.",
      "Danh từ số nhiều ở Dativ phải thêm „-n“ vào cuối (nếu chưa có -n hoặc -s).",
      "Luôn học thuộc các động từ Dativ phổ biến: helfen, danken, gehören, gefallen, passen, schmecken, antworten, zuhören.",
      "8 giới từ Dativ cố định: aus, bei, mit, nach, seit, von, zu, gegenüber.",
    ],
    quiz: [
      {
        question: "Chọn câu đúng với động từ „helfen“:",
        options: ["Ich helfe den Mann.", "Ich helfe dem Mann.", "Ich helfe der Mann."],
        answer: 1,
        explanation: "„helfen“ là động từ Dativ; „der Mann“ đổi sang Dativ thành „dem Mann“.",
      },
      {
        question: "Điền đúng dạng Dativ số nhiều của „die Kinder“: „Sie spricht mit ___ .“",
        options: ["die Kinder", "den Kinder", "den Kindern"],
        answer: 2,
        explanation: "Sau „mit“ dùng Dativ; số nhiều là „den“ và danh từ „Kinder“ chưa kết thúc bằng -n/-s nên phải thêm -n → den Kindern.",
      },
      {
        question: "Điền mạo từ đúng: „Ich fahre mit ___ Bahn.“ (die Bahn)",
        options: ["dem", "der", "den"],
        answer: 1,
        explanation: "„die Bahn“ là giống cái → Dativ là „der Bahn“.",
      },
    ],
  },
  {
    slug: "cach-2-genitiv",
    categoryId: "nomen",
    order: 7,
    code: "N7",
    title: "Cách 2 – Genitiv (Sở hữu cách)",
    germanTitle: "Der Genitiv",
    level: "B1",
    summary: "Cách dùng Genitiv để chỉ sở hữu, quy tắc thêm -s/-es, sở hữu với tên riêng, giới từ/động từ/tính từ Genitiv và mẹo thay bằng „von + Dativ“ trong văn nói.",
    sections: [
      {
        id: "bang-genitiv",
        heading: "1. Biến đổi mạo từ & đuôi danh từ ở Genitiv",
        blocks: [
          {
            type: "table",
            caption: "Mạo từ ở Cách 2 (Genitiv) — nhớ nhanh mã đuôi: S – R – S – R",
            headers: ["Giống", "Mạo từ xác định", "Mạo từ không xác định", "Quy tắc đuôi danh từ"],
            rows: [
              ["Maskulin (Đực) ★", "{gen:des} Mann**es**", "{gen:eines} Mann**es**", "Danh từ thêm **-s** hoặc **-es**"],
              ["Feminin (Cái)", "{gen:der} Frau", "{gen:einer} Frau", "Không thêm đuôi"],
              ["Neutral (Trung) ★", "{gen:des} Kind**es**", "{gen:eines} Kind**es**", "Danh từ thêm **-s** hoặc **-es**"],
              ["Plural (Số nhiều)", "{gen:der} Eltern", "– Eltern", "Không thêm đuôi"],
            ],
          },
          {
            type: "list",
            title: "Khi nào thêm „-es“ hay „-s“ cho danh từ đực/trung?",
            items: [
              "**Bắt buộc thêm -es** nếu danh từ kết thúc bằng **-s, -ß, -x, -z**: *der Platz → des Platz**es***, *das Haus → des Haus**es***.",
              "**Danh từ 1 âm tiết:** thường dùng **-es** cho dễ đọc (nhưng *-s* vẫn đúng): *der Mann → des Mann**(e)s***.",
              "**Danh từ nhiều âm tiết còn lại:** chỉ thêm **-s**: *der Lehrer → des Lehrer**s***, *das Auto → des Auto**s***.",
            ],
          },
        ],
      },
      {
        id: "cach-dung-genitiv",
        heading: "2. Năm cách dùng của Genitiv",
        blocks: [
          {
            type: "list",
            items: [
              "**1. Cụm Danh từ – Danh từ chỉ sở hữu (trả lời Wessen?):** *Das Pferd {gen:des Reiters} ist weiß* (Con ngựa của người cưỡi màu trắng).",
              "**2. Sở hữu với tên riêng (không có mạo từ):** Đặt tên riêng lên trước + thêm **-s** (cho cả nam lẫn nữ): *{gen:Annas} Auto*, *{gen:Holgers} Pferd*. Nếu tên kết thúc bằng *-s, -ß, -x, -z* thì thêm dấu nháy đơn: *{gen:Hans’} Pferd*.",
              "**3. Sau các giới từ Genitiv quan trọng:** **während** (trong lúc), **wegen** (vì), **trotz** (mặc dù), **innerhalb** (trong vòng), **außerhalb** (bên ngoài), **oberhalb / unterhalb** (phía trên/dưới), **aufgrund** (dựa trên/do), **anstelle / (an)statt** (thay vì).",
              "**4. Sau một số động từ trang trọng/pháp lý (B2):** *gedenken, bedürfen* (Nom+Gen); *anklagen, beschuldigen, verdächtigen, bezichtigen, überführen* (buộc tội/nghi ngờ ai về tội gì: Nom+Akk+Gen); *sich erinnern, sich schämen, sich erfreuen*.",
              "**5. Sau một số tính từ đặc biệt (đứng sau danh từ, không chia đuôi):** *bewusst, fähig, gewiss, sicher, verdächtig, würdig*. VD: *Ich bin mir {gen:meines Fehlers} bewusst* (Tôi ý thức được lỗi của mình).",
            ],
          },
          {
            type: "examples",
            title: "Ví dụ thực tế với Genitiv",
            items: [
              { de: "**Wegen** {gen:der Krankheit} kann er nicht arbeiten.", vi: "Vì bị ốm nên anh ấy không thể đi làm.", note: "Giới từ „wegen“ → Genitiv (die Krankheit → der Krankheit)." },
              { de: "**Während** {gen:des Spiels} hat es stark geregnet.", vi: "Trong suốt trận đấu trời đã mưa rất to.", note: "Giới từ „während“ → Genitiv (das Spiel → des Spiels)." },
              { de: "Man verdächtigt {akk:ihn} {gen:des Verbrechens}.", vi: "Người ta nghi ngờ anh ta phạm tội ác đó.", note: "Động từ pháp lý „verdächtigen“ + Akk + Gen." },
            ],
          },
          {
            type: "tip",
            variant: "tip",
            title: "Tin vui cho văn nói: Mẹo tránh Genitiv bằng giới từ!",
            content:
              "Trong giao tiếp hàng ngày, Genitiv ngày càng ít dùng. Bạn có thể thay cụm sở hữu bằng **von + Dativ** (*das Auto **von meinem Vater***) hoặc dùng giới từ thay thế động từ Genitiv (*Ich erinnere mich **an** {akk:die alten Zeiten}* thay cho *der alten Zeiten*). Tuy nhiên trong **văn viết, báo chí và kỳ thi B1/B2**, hãy dùng Genitiv chuẩn xác vì sẽ tạo ấn tượng học thuật và chuyên nghiệp hơn nhiều!",
          },
        ],
      },
    ],
    keyPoints: [
      "Mạo từ Genitiv: des (đực/trung + danh từ thêm -s/-es), der (cái & số nhiều).",
      "Tên riêng sở hữu đặt phía trước danh từ và thêm -s (Annas Buch, Hans’ Buch).",
      "Các giới từ Genitiv hay thi nhất ở B1–B2: während, wegen, trotz, (an)statt, innerhalb, außerhalb, aufgrund.",
      "Trong văn nói có thể dùng „von + Dativ“ để diễn đạt sở hữu thay cho Genitiv.",
    ],
    quiz: [
      {
        question: "Chọn câu đúng với giới từ „trotz“ (mặc dù) và „der Regen“ (cơn mưa):",
        options: ["Trotz dem Regen gehen wir spazieren.", "Trotz des Regens gehen wir spazieren.", "Trotz den Regen gehen wir spazieren."],
        answer: 1,
        explanation: "Trong tiếng Đức chuẩn, „trotz“ đi với Genitiv: der Regen → des Regens.",
      },
      {
        question: "Dạng Genitiv đúng của „das Haus“ là gì?",
        options: ["des Hauss", "des Hauses", "dem Hauses"],
        answer: 1,
        explanation: "Danh từ giống trung kết thúc bằng -s bắt buộc thêm -es ở Genitiv → des Hauses.",
      },
    ],
  },
  {
    slug: "bon-buoc-chon-cach-va-n-deklination",
    categoryId: "nomen",
    order: 8,
    code: "N8",
    title: "4 bước chọn đúng Cách & Biến cách N (N-Deklination)",
    germanTitle: "In 4 Schritten zum richtigen Fall & N-Deklination",
    level: "B1",
    summary: "Thuật toán 4 bước xác định chính xác Cách cho mọi danh từ trong câu + toàn tập quy tắc và 3 nhóm ngoại lệ của biến cách N (N-Deklination).",
    sections: [
      {
        id: "bon-buoc-chon-cach",
        heading: "1. Quy trình 4 bước xác định đúng Cách (không bao giờ nhầm)",
        blocks: [
          {
            type: "steps",
            title: "Kiểm tra theo đúng thứ tự ưu tiên từ 1 → 4",
            items: [
              {
                step: "Bước 1: Danh từ có phải là Chủ ngữ (người/vật hành động) không?",
                detail: "Nếu **CÓ** → chắc chắn là **{nom:Nominativ}**. Nếu không → sang Bước 2.",
                example: "{nom:Er} gibt dem Mann die Schlüssel.",
              },
              {
                step: "Bước 2: Có Giới từ (Präposition) đứng ngay trước danh từ không?",
                detail: "Nếu **CÓ** → Trúng tủ! **Giới từ luôn quyết định Cách** (Akk / Dat / Gen / hoặc Wechselpräposition hỏi Wo? vs Wohin?). Nếu không → sang Bước 3.",
                example: "mit {dat:dem Auto} · für {akk:den Freund} · wegen {gen:des Wetters}",
              },
              {
                step: "Bước 3: Động từ có bắt buộc một Cách riêng không?",
                detail: "Kiểm tra động từ đặc biệt: *sein/werden/bleiben* → **{nom:Nominativ}**; *helfen/gehören/gefallen/danken...* → **{dat:Dativ}**; động từ Genitiv → **{gen:Genitiv}**. Nếu là cụm sở hữu 2 danh từ → **{gen:Genitiv}**. Nếu không → sang Bước 4.",
                example: "Ich helfe {dat:dem Kind}.",
              },
              {
                step: "Bước 4: Phân biệt Tân ngữ trực tiếp hay gián tiếp",
                detail: "Vật/người chịu tác động trực tiếp = **{akk:Akkusativ}**. Người nhận vật đó = **{dat:Dativ}**.",
                example: "{nom:Er} gibt {dat:dem Mann} (nhận → Dat) {akk:die Schlüssel} (vật → Akk).",
              },
            ],
          },
        ],
      },
      {
        id: "n-deklination",
        heading: "2. Biến cách N (N-Deklination) là gì?",
        blocks: [
          {
            type: "text",
            content:
              "Một nhóm danh từ giống đực đặc biệt sẽ nhận thêm đuôi **-(e)n** ngay vào thân danh từ ở **cả Akkusativ, Dativ và Genitiv số ít** (chỉ giữ nguyên ở Nominativ số ít!). Đó gọi là **N-Deklination**.",
          },
          {
            type: "table",
            caption: "Ví dụ chuẩn: der Russe (người Nga)",
            headers: ["Số", "Nominativ", "Akkusativ", "Dativ", "Genitiv"],
            rows: [
              ["Số ít (Singular)", "{nom:der} Russe", "{akk:den} Russe**n**", "{dat:dem} Russe**n**", "{gen:des} Russe**n**"],
              ["Số nhiều (Plural)", "{nom:die} Russen", "{akk:die} Russen", "{dat:den} Russen", "{gen:der} Russen"],
            ],
          },
          {
            type: "rule",
            title: "4 điều kiện ĐỒNG THỜI để dùng N-Deklination",
            formula: "1. Giống đực (der) + Số ít   ✓   2. Chỉ Người hoặc Động vật   ✓   3. Số nhiều kết thúc bằng -n/-en   ✓   4. KHÔNG ở Nominativ",
            note: "Phải thỏa mãn CẢ 4 điều kiện! VD: „Der Franzose“ (người Pháp, Pl: die Franzosen) → Ich gebe dem Franzose**n** einen Tipp. (Nhưng „Der Franzose ist nett“ ở Nominativ → không thêm -n).",
          },
        ],
      },
      {
        id: "ngoai-le-n-deklination",
        heading: "3. Ba nhóm ngoại lệ N-Deklination cần thuộc (hay ra thi B1–B2)",
        blocks: [
          {
            type: "table",
            caption: "Tổng hợp ngoại lệ của N-Deklination",
            headers: ["Nhóm ngoại lệ", "Danh từ tiêu biểu & Biến cách (Akk / Dat / Gen)"],
            rows: [
              [
                "**1. Không phải người/vật nhưng VẪN chia N-Deklination**",
                "• **der Automat** → den / dem / des Automat**en**\n• **der Planet** → den / dem / des Planet**en**\n• **der Konsonant** → den / dem / des Konsonant**en**\n• **der Hydrant** → den / dem / des Hydrant**en**\n• **das Herz** (giống trung duy nhất!) → das Herz (Akk) / dem Herz**en** (Dat) / des Herz**ens** (Gen)",
              ],
              [
                "**2. Đủ 4 điều kiện nhưng KHÔNG chia N-Deklination**",
                "• **der Doktor** (Pl: Doktoren) → den Doktor / dem Doktor / des Doktor**s**\n• **der Drachen** (con diều) → den Drachen / dem Drachen / des Drachen**s**",
              ],
              [
                "**3. Chia N-Deklination VÀ thêm cả -s ở Genitiv (-ns)**",
                "• **der Name** → den Name**n** / dem Name**n** / des Name**ns**\n• **der Gedanke** → den Gedanke**n** / dem Gedanke**n** / des Gedanke**ns**\n• **der Glaube** → den Glaube**n** / dem Glaube**n** / des Glaube**ns**\n• **der Wille** → den Wille**n** / dem Wille**n** / des Wille**ns**\n• **der Frieden** → den Frieden / dem Frieden / des Frieden**s**",
              ],
            ],
          },
          {
            type: "examples",
            title: "Danh từ N-Deklination gặp hàng ngày ở Đức",
            items: [
              { de: "Ich kenne {akk:den neuen Kollegen} noch nicht.", vi: "Tôi vẫn chưa quen người đồng nghiệp mới.", note: "der Kollege → den Kollegen." },
              { de: "Der Arzt spricht mit {dat:dem Patienten}.", vi: "Bác sĩ đang nói chuyện với bệnh nhân.", note: "der Patient → dem Patienten." },
              { de: "Wie ist die Schreibweise {gen:Ihres Namens}?", vi: "Cách viết tên của ngài như thế nào?", note: "der Name thuộc nhóm ngoại lệ 3 → des Namens." },
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Chọn đúng Cách luôn đi theo thứ tự 4 bước: Chủ ngữ (Nom) → Giới từ → Động từ đặc biệt → Trực tiếp (Akk) vs Gián tiếp (Dat).",
      "N-Deklination thêm -(e)n vào thân danh từ ở Akk, Dat, Gen số ít (không thêm ở Nom).",
      "4 điều kiện: giống đực số ít + người/động vật + số nhiều -n/-en + không ở Nominativ.",
      "Nhớ các từ cực hay gặp: der Kollege, der Kunde, der Student, der Nachbar, der Mensch, der Name (des Namens), das Herz.",
    ],
    quiz: [
      {
        question: "Chọn câu đúng với „der Student“ (số nhiều: die Studenten):",
        options: ["Ich frage den Student.", "Ich frage den Studenten.", "Der Studenten lernt Deutsch."],
        answer: 1,
        explanation: "„der Student“ thỏa mãn cả 4 điều kiện N-Deklination nên ở Akkusativ phải thêm -en: den Studenten. Ở Nominativ giữ nguyên „Der Student“.",
      },
      {
        question: "Dạng Genitiv đúng của „der Name“ là gì?",
        options: ["des Names", "des Namen", "des Namens"],
        answer: 2,
        explanation: "„der Name“ thuộc nhóm đặc biệt dùng N-Deklination kèm thêm -s ở Genitiv → des Namens.",
      },
    ],
  },
];
