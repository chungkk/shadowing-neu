import type { GrammarLesson } from "./types";

export const VERBEN_LESSONS: GrammarLesson[] = [
  {
    slug: "dong-tu-co-ban-sein-va-haben",
    categoryId: "verben",
    order: 1,
    code: "V1",
    title: "Tổng quan Động từ & Hai động từ nền tảng „sein“ và „haben“",
    germanTitle: "Verben, „sein“ & „haben“",
    level: "A1",
    summary: "6 loại động từ, 3 thức động từ (Indikativ, Imperativ, Konjunktiv), bảng chia đầy đủ và 4 cách dùng cốt lõi của „sein“ và „haben“.",
    sections: [
      {
        id: "phan-loai-dong-tu",
        heading: "1. Động từ là gì? Phân loại & 3 Thức (Modi)",
        blocks: [
          {
            type: "text",
            content:
              "Động từ (Verben) diễn tả **hành động / quá trình** (*laufen, fahren, kaufen, wachsen*) hoặc **trạng thái** (*sein, haben, stehen, sitzen*). Trong tiếng Đức có 6 loại động từ: **Vollverben** (động từ chính), **Hilfsverben** (trợ động từ *sein, haben, werden*), **Modalverben** (khuyết thiếu), **Reflexive Verben** (phản thân), **Zusammengesetzte Verben** (động từ ghép) và **Partizipien** (phân từ). Động từ còn chia theo 3 thức: **Indikativ** (thực tế), **Imperativ** (mệnh lệnh), **Konjunktiv** (gián tiếp / giả định), và 2 thể: **Aktiv** (chủ động) / **Passiv** (bị động).",
          },
        ],
      },
      {
        id: "sein-va-haben",
        heading: "2. Bảng chia & 4 cách dùng của „sein“ và „haben“",
        blocks: [
          {
            type: "table",
            caption: "Bảng chia đầy đủ „sein“ (100% bất quy tắc) & „haben“",
            headers: ["Ngôi", "sein (Präsens)", "sein (Präteritum)", "haben (Präsens)", "haben (Präteritum)"],
            rows: [
              ["ich", "**bin**", "**war**", "habe", "**hatte**"],
              ["du", "**bist**", "**warst**", "**hast**", "**hattest**"],
              ["er / sie / es", "**ist**", "**war**", "**hat**", "**hatte**"],
              ["wir", "**sind**", "**waren**", "haben", "**hatten**"],
              ["ihr", "**seid**", "**wart**", "habt", "**hattet**"],
              ["sie / Sie", "**sind**", "**waren**", "haben", "**hatten**"],
              ["Partizip 1 / 2", "seiend / **gewesen**", "—", "habend / **gehabt**", "—"],
            ],
          },
          {
            type: "compare",
            leftTitle: "4 cách dùng của „sein“ (là / ở / thì)",
            leftItems: [
              "**1. Đi với tính từ:** *Du **bist** nett. Wir **sind** schlau.*",
              "**2. Định danh (tên, quốc tịch, nghề nghiệp):** *Das **ist** Sebastian. Ich **bin** Deutschlehrer.*",
              "**3. Tuổi, ngày tháng, giờ giấc:** *Er **ist** 27 Jahre alt. Es **ist** 23 Uhr. Heute **ist** der 30. August.*",
              "**4. Làm trợ động từ** (Perfekt, Plusquamperfekt, Futur 2, Zustandspassiv): *Er **ist** nach Hause gekommen.*",
            ],
            rightTitle: "4 cách dùng của „haben“ (có)",
            rightItems: [
              "**1. Chỉ sở hữu:** *Ich **habe** einen Hund. Er **hat** ein Haus.*",
              "**2. Trạng thái gắn với danh từ:** *Er **hat** Zeit. Sie **hat** lange Haare. Ihr **habt** viel Spaß.*",
              "**3. Cụm cố định:** *Ich **habe** Recht* (Tôi đúng), *Ich **habe** dich lieb*, *Er **hat** es eilig* (Anh ấy đang vội).",
              "**4. Làm trợ động từ** (Perfekt, Plusquamperfekt, Futur 2): *Wir **haben** auf dich gewartet.*",
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "„sein“ và „haben“ vừa là động từ chính (nghĩa „là“ và „có“), vừa là 2 trợ động từ quan trọng nhất để chia thì quá khứ.",
      "Thuộc lòng ngay cả Präsens lẫn Präteritum (war / hatte) của 2 động từ này vì văn nói cũng dùng „war“ và „hatte“ rất nhiều!",
    ],
    quiz: [
      {
        question: "Chọn câu đúng nói về tuổi và thời gian:",
        options: ["Ich habe 25 Jahre alt.", "Ich bin 25 Jahre alt.", "Ich werde 25 Jahre alt."],
        answer: 1,
        explanation: "Trong tiếng Đức, tuổi tác luôn đi với „sein“ (Ich bin ... Jahre alt), không dùng „haben“.",
      },
    ],
  },
  {
    slug: "dong-tu-manh-doi-nguyen-am",
    categoryId: "verben",
    order: 2,
    code: "V2",
    title: "Động từ mạnh đổi nguyên âm (Starke Verben)",
    germanTitle: "Starke Verben mit Vokalwechsel",
    level: "A1",
    summary: "Quy luật đổi nguyên âm ở thì hiện tại: chỉ có e→ie, e→i và a→ä, chỉ xảy ra ở ngôi „du“ và „er/sie/es“, giữ nguyên bộ đuôi chuẩn.",
    sections: [
      {
        id: "quy-luat-doi-nguyen-am",
        heading: "1. Ba quy tắc vàng của động từ mạnh ở thì hiện tại (Präsens)",
        blocks: [
          {
            type: "list",
            items: [
              "**Quy tắc 1 — CHỈ ĐỔI nguyên âm „e“ và „a“:** Các nguyên âm *i, o, u* KHÔNG BAO GIỜ đổi ở Präsens! (Ngoại lệ cực hiếm: *laufen → du läufst, stoßen → du stößt*).",
              "**Quy tắc 2 — CHỈ ĐỔI ở ngôi 2 và ngôi 3 số ít („du“ và „er/sie/es“):** Ngôi *ich, wir, ihr, sie/Sie* giữ nguyên 100% nguyên âm gốc!",
              "**Quy tắc 3 — Đuôi động từ KHÔNG thay đổi:** Vẫn gắn đúng đuôi *-st* (du) và *-t* (er/sie/es).",
            ],
          },
          {
            type: "table",
            caption: "3 kiểu đổi nguyên âm chuẩn trong Präsens",
            headers: ["Ngôi", "e → ie (sehen, lesen, empfehlen)", "e → i (helfen, geben, essen, sprechen)", "a → ä (schlafen, fahren, tragen, waschen)"],
            rows: [
              ["ich", "sehe", "helfe", "schlafe"],
              ["**du** ★", "**siehst**", "**hilfst**", "**schläfst**"],
              ["**er / sie / es** ★", "**sieht**", "**hilft**", "**schläft**"],
              ["wir", "sehen", "helfen", "schlafen"],
              ["ihr", "seht", "helft", "schlaft"],
              ["sie / Sie", "sehen", "helfen", "schlafen"],
            ],
          },
          {
            type: "tip",
            variant: "tip",
            title: "Chú ý đặc biệt với „nehmen“ và „essen“",
            content:
              "• **nehmen** (lấy): *ich nehme, du **nimmst**, er **nimmt**, ihr nehmt* (rút gọn chữ h, gấp đôi m).\n• **essen** (ăn): *ich esse, du **isst**, er **isst*** (bỏ bớt s thừa).\n• **lesen** (đọc): *du **liest**, er **liest*** (giống nhau vì thân kết thúc bằng -s).",
          },
        ],
      },
    ],
    keyPoints: [
      "Động từ mạnh chỉ đổi nguyên âm ở 2 ngôi: du và er/sie/es.",
      "3 kiểu đổi chính: e → ie (sehen, lesen), e → i (geben, helfen, sprechen, essen, nehmen), a → ä (fahren, schlafen, tragen, waschen).",
      "Ngôi „ihr“ KHÔNG BAO GIỜ đổi nguyên âm (ihr seht, ihr helft, ihr fahrt!).",
    ],
    quiz: [
      {
        question: "Chia đúng „fahren“ ở ngôi „ihr“ và „er“:",
        options: ["ihr fährt / er fährt", "ihr fahrt / er fährt", "ihr fahrt / er fahrt"],
        answer: 1,
        explanation: "Vokalwechsel CHỈ xảy ra ở ngôi „du“ và „er/sie/es“, ngôi „ihr“ giữ nguyên gốc → ihr fahrt / er fährt.",
      },
      {
        question: "Chia đúng „nehmen“ ở ngôi „er“:",
        options: ["er nehmt", "er niehmt", "er nimmt"],
        answer: 2,
        explanation: "„nehmen“ đổi nguyên âm e → i và gấp đôi m: du nimmst, er nimmt.",
      },
    ],
  },
  {
    slug: "dong-tu-khuyet-thieu-modalverben",
    categoryId: "verben",
    order: 3,
    code: "V3",
    title: "6 Động từ khuyết thiếu (Modalverben)",
    germanTitle: "Modalverben (müssen, können, wollen/möchten, dürfen, sollen)",
    level: "A1",
    summary: "Bảng chia Präsens & Präteritum của 6 Modalverben, cấu trúc khung câu và phân tích chi tiết mọi sắc thái nghĩa (bắt buộc, cho phép, cấm, khuyên, phỏng đoán).",
    sections: [
      {
        id: "bang-chia-modalverben",
        heading: "1. Vị trí câu & Bảng chia 6 Modalverben",
        blocks: [
          {
            type: "rule",
            title: "Vị trí câu với Modalverb (Khung câu chuẩn)",
            formula: "Chủ ngữ + Modalverb (chia ở Vị trí 2) + ... + Động từ chính nguyên thể (Infinitiv ở CUỐI câu)",
            note: "Trong cả Präsens lẫn Präteritum, ngôi „ich“ và ngôi „er/sie/es“ của Modalverben LUÔN GIỐNG NHAU và KHÔNG có đuôi -e/-t ở Präsens!",
          },
          {
            type: "table",
            caption: "Bảng chia Präsens (và Präteritum trong ngoặc) của 6 Modalverben",
            headers: ["Ngôi", "müssen (phải)", "können (có thể)", "wollen (muốn)", "möchten (muốn - lịch sự)", "dürfen (được phép)", "sollen (nên / được bảo)"],
            rows: [
              ["**ich / er / sie / es**", "**muss** *(musste)*", "**kann** *(konnte)*", "**will** *(wollte)*", "**möchte** *(wollte)*", "**darf** *(durfte)*", "**soll** *(sollte)*"],
              ["du", "musst *(musstest)*", "kannst *(konntest)*", "willst *(wolltest)*", "möchtest *(wolltest)*", "darfst *(durftest)*", "sollst *(solltest)*"],
              ["wir / sie / Sie", "müssen *(mussten)*", "können *(konnten)*", "wollen *(wollten)*", "möchten *(wollten)*", "dürfen *(durften)*", "sollen *(sollten)*"],
              ["ihr", "müsst *(musstet)*", "könnt *(konntet)*", "wollt *(wolltet)*", "möchtet *(wolltet)*", "dürft *(durftet)*", "sollt *(solltet)*"],
            ],
          },
          {
            type: "tip",
            variant: "note",
            title: "Lưu ý về „möchten“ và „sollen“",
            content:
              "• **möchten** thực chất là dạng Konjunktiv 2 của *mögen*, dùng làm cách nói **lịch sự** của *wollen* (*Ich **will** ein Eis* = đòi hỏi; *Ich **möchte** ein Eis* = lịch sự). Ở quá khứ, cả *wollen* và *möchten* đều dùng **wollte**!\n• **sollen** ở Konjunktiv 2 KHÔNG có Umlaut (vẫn là **sollte**, không phải *söllte*).",
          },
        ],
      },
      {
        id: "sac-thai-nghia",
        heading: "2. Sắc thái ý nghĩa & Mức độ phỏng đoán của từng Modalverb",
        blocks: [
          {
            type: "table",
            caption: "Tóm tắt toàn bộ ý nghĩa & phỏng đoán (Vermutung — mức độ chắc chắn)",
            headers: ["Modalverb", "Nghĩa thực tế hàng ngày", "Nghĩa phỏng đoán (B1–B2)"],
            rows: [
              ["**müssen**", "• Bắt buộc / cần thiết (*Ich muss lernen*)\n• Mệnh lệnh (*Du musst aufräumen!*)\n• *Lưu ý:* **nicht müssen** = KHÔNG CẦN PHẢI (chứ không phải „cấm“!)", "Chắc chắn rất cao (>90%): *Das Haus **muss** 30m hoch sein.* / *müsste* (~95%)"],
              ["**dürfen**", "• Được phép (*Wir dürfen spielen*)\n• **Cấm** khi đi với phủ định: ***nicht dürfen*** (*Du darfst hier nicht parken!*)\n• Xin phép lịch sự (*Darf / Dürfte ich fragen?*)", "Chắc chắn cao (80–90%, dùng K2 **dürfte**): *Der Schal **dürfte** Maria gehören.*"],
              ["**sollen**", "• Nhiệm vụ / lời nhắn từ người khác (*Ich soll abwaschen*)\n• Gợi ý / lời khuyên (K2 **sollte**): *Du solltest mehr schlafen.*", "Khá chắc chắn (60–80%, dùng K2 **sollte**): *Thomas **sollte** um 18 Uhr kommen.*"],
              ["**können**", "• Khả năng (*Ich kann schwimmen*)\n• Cơ hội / tính khả thi (*Man kann hier gut essen*)\n• Cho phép/cấm (khẩu ngữ)\n• Gợi ý / nhờ lịch sự (K2 **könnte**): *Könntest du mir helfen?*", "Khả năng thấp (<50%, dùng K2 **könnte**): *Sie **könnte** bei einer Freundin sein.*"],
              ["**wollen / möchten**", "• Mong muốn, ý định (*Ich will nach Deutschland umziehen*)\n• Từ chối (với *nicht*: *Ich will nicht gehen*)\n• Có thể làm động từ chính với mệnh đề *dass* (*Ich will, dass du bleibst*)", "*(Ít dùng phỏng đoán — chủ yếu diễn tả ý muốn hoặc lời tự nhận ở B2)*"],
            ],
          },
          {
            type: "tip",
            variant: "warning",
            title: "Cạm bẫy kinh điển của người Việt: „nicht müssen“ vs „nicht dürfen“!",
            content:
              "• **Du musst heute nicht arbeiten.** = Hôm nay bạn **không cần phải** đi làm (nếu muốn làm vẫn được).\n• **Du darfst hier nicht rauchen.** = Bạn **KHÔNG ĐƯỢC PHÉP / BỊ CẤM** hút thuốc ở đây!",
          },
        ],
      },
    ],
    keyPoints: [
      "Modalverb chia ở Vị trí 2, động từ chính nguyên thể (Infinitiv) luôn đứng ở cuối câu.",
      "Ngôi ich và er/sie/es của 6 Modalverben luôn giống hệt nhau (muss, kann, will, möchte, darf, soll).",
      "Phân biệt cực rõ: „nicht müssen“ = không cần phải; „nicht dürfen“ = bị cấm / không được phép.",
      "Ở quá khứ, cả „wollen“ và „möchten“ đều dùng „wollte“.",
    ],
    quiz: [
      {
        question: "Biển báo cấm đỗ xe ở Đức nên diễn đạt bằng câu nào?",
        options: ["Man muss hier nicht parken.", "Man darf hier nicht parken.", "Man will hier nicht parken."],
        answer: 1,
        explanation: "„nicht dürfen“ diễn tả sự cấm đoán (= bị cấm); „nicht müssen“ chỉ mang nghĩa „không cần phải“.",
      },
      {
        question: "Chọn câu đúng với „können“ ở ngôi „er“:",
        options: ["Er kannt gut Deutsch sprechen.", "Er kann gut Deutsch spricht.", "Er kann gut Deutsch sprechen."],
        answer: 2,
        explanation: "Modalverb „können“ ở ngôi er là „kann“ (không có -t), động từ chính ở cuối giữ nguyên thể „sprechen“.",
      },
    ],
  },
  {
    slug: "dong-tu-tach-va-khong-tach",
    categoryId: "verben",
    order: 4,
    code: "V4",
    title: "Động từ ghép: Tiền tố tách được & Không tách được",
    germanTitle: "Zusammengesetzte Verben (Trennbar & Untrennbar)",
    level: "A1",
    summary: "Danh sách tiền tố tách (ab-, an-, auf-...), không tách (be-, ent-, er-, ver-, zer-...), 7 tiền tố lưỡng tính và khi nào phải tách hoặc không tách động từ.",
    sections: [
      {
        id: "ba-nhom-tien-to",
        heading: "1. Ba nhóm tiền tố của động từ ghép",
        blocks: [
          {
            type: "text",
            content:
              "Tiếng Đức gắn thêm **tiền tố (Präfix / Vorsilbe)** vào trước động từ gốc để tạo nghĩa mới (*stehen* = đứng → ***auf**stehen* = thức dậy, ***ver**stehen* = hiểu). Cách chia động từ luôn **giống hệt động từ gốc**, chỉ khác ở chỗ tiền tố có bị tách ra cuối câu hay không!",
          },
          {
            type: "table",
            caption: "3 nhóm tiền tố cần phân biệt rành mạch",
            headers: ["Nhóm tiền tố", "Danh sách tiền tố", "Quy tắc & Ví dụ"],
            rows: [
              [
                "**1. TÁCH ĐƯỢC** *(Trennbar)*",
                "**Quan trọng nhất:** *ab-, an-, auf-, aus-, ein-, mit-, nach-, vor-, weg-, weiter-, zurück-, zu-, los-, her-, hin-, raus-, rein-, rüber-, runter-, hoch-, gegen-, da-*\n*Khác:* *bei-, fern-, fest-, fort-, heim-, zusammen-...*",
                "**Mẹo nhận diện:** Đa số đứng một mình được (là giới từ hoặc trạng từ) và **nhấn trọng âm vào tiền tố**.\nVD: *aufstehen → Ich **stehe** um 6 Uhr **auf**.*\n*Partizip 2:* chèn **-ge-** vào giữa: *auf**ge**standen*.",
              ],
              [
                "**2. KHÔNG TÁCH ĐƯỢC** *(Untrennbar)*",
                "**5 tiền tố vàng:** **be-, ent-, er-, ver-, zer-**\n**Thêm:** **emp-, ge-, miss-** *(và gốc ngoại lai: de-, dis-, in-, re-...)*",
                "**Mẹo nhớ câu thần chú:** *be-ge-er-ver-zer-ent-emp-miss*. **Không nhấn trọng âm vào tiền tố**.\nVD: *verstehen → Du **verstehst** den Satz.*\n*Partizip 2:* **KHÔNG có „ge-“!** (*verstanden*, *besucht*).",
              ],
              [
                "**3. LƯỠNG TÍNH** *(Tách hoặc Không tách tùy nghĩa)*",
                "**7 tiền tố:** **durch-, hinter-, über-, unter-, um-, wieder-, wider-**",
                "**Quy tắc trọng âm:** Trọng âm ở **âm tiết 1 (tiền tố) → TÁCH** (thường mang nghĩa đen); Trọng âm ở **âm tiết 2 (thân động từ) → KHÔNG TÁCH** (thường nghĩa bóng).\n• *Er **umfährt** das Schild* (lái vòng qua biển báo — không tách).\n• *Er **fährt** das Schild **um*** (đâm đổ biển báo — tách!).",
              ],
            ],
          },
        ],
      },
      {
        id: "khi-nao-tach",
        heading: "2. Khi nào tách động từ, khi nào KHÔNG tách?",
        blocks: [
          {
            type: "examples",
            title: "So sánh các tình huống với „einschlafen“ (ngủ thiếp đi)",
            items: [
              { de: "Ich **schlafe** immer spät **ein**.", vi: "Tôi luôn ngủ thiếp đi rất muộn.", note: "Chia ở Vị trí 2 trong Hauptsatz (Präsens/Präteritum/Imperativ) → TÁCH!" },
              { de: "Ich bin schnell **eingeschlafen**.", vi: "Tôi đã ngủ thiếp đi rất nhanh.", note: "Ở Partizip 2 → chèn „ge“ vào giữa tiền tố và thân." },
              { de: "Ich kann heute nicht **einschlafen**.", vi: "Hôm nay tôi không thể ngủ được.", note: "Có Modalverb / Futur (động từ đứng nguyên thể ở cuối) → KHÔNG TÁCH!" },
              { de: "Ich bin müde, weil ich spät **einschlafe**.", vi: "Tôi mệt vì tôi ngủ muộn.", note: "Trong mệnh đề phụ (Nebensatz), động từ bị đẩy ra cuối gặp lại tiền tố → VIẾT LIỀN, KHÔNG TÁCH!" },
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Tiền tố tách (ab-, an-, auf-, aus-, ein-, mit-, vor-, zu-, zurück-...) bị đẩy ra cuối mệnh đề chính khi động từ chia ở Vị trí 2.",
      "Tiền tố không tách (be-, emp-, ent-, er-, ge-, miss-, ver-, zer-) dính liền mãi mãi và KHÔNG thêm „ge-“ ở Partizip 2.",
      "Động từ tách KHÔNG tách ra khi đứng cùng Modalverb/Futur hoặc khi nằm trong mệnh đề phụ (Nebensatz).",
    ],
    quiz: [
      {
        question: "Chọn câu đúng với động từ „aufmachen“ trong mệnh đề phụ „wenn“:",
        options: [
          "Wenn ich das Fenster mache auf, wird es kalt.",
          "Wenn ich das Fenster aufmache, wird es kalt.",
          "Wenn ich auf das Fenster mache, wird es kalt.",
        ],
        answer: 1,
        explanation: "Trong mệnh đề phụ (Nebensatz), động từ chia bị đẩy về cuối gặp lại tiền tố nên viết liền: aufmache.",
      },
      {
        question: "Động từ nào sau đây là động từ KHÔNG tách được?",
        options: ["einkaufen", "mitkommen", "verstehen"],
        answer: 2,
        explanation: "Tiền tố „ver-“ thuộc nhóm không tách được (be-, ent-, er-, ver-, zer-, emp-, ge-, miss-).",
      },
    ],
  },
  {
    slug: "thuc-menh-lenh-imperativ",
    categoryId: "verben",
    order: 5,
    code: "V5",
    title: "Thức mệnh lệnh (Der Imperativ)",
    germanTitle: "Der Imperativ",
    level: "A1",
    summary: "Cách lập câu mệnh lệnh cho 3 ngôi (du, ihr, Sie), quy tắc đổi nguyên âm e→i/ie (nhưng KHÔNG đổi a→ä!), động từ tách, 3 ngoại lệ và mẹo nói lịch sự.",
    sections: [
      {
        id: "lap-cau-imperativ",
        heading: "1. Công thức Imperativ cho 3 ngôi: Sie, ihr, du",
        blocks: [
          {
            type: "text",
            content:
              "Imperativ dùng để yêu cầu, hướng dẫn hoặc ra lệnh trực tiếp cho người đối diện. Vì vậy nó **chỉ tồn tại ở 3 ngôi: du, ihr và Sie**, và **động từ luôn đứng ở Vị trí 1**!",
          },
          {
            type: "table",
            caption: "Công thức lập Imperativ chuẩn cho từng ngôi",
            headers: ["Ngôi", "Công thức", "Ví dụ (gehen / mitkommen)"],
            rows: [
              ["**Sie** *(lịch sự)*", "**Infinitiv + Sie** *(Bắt buộc giữ „Sie“!)*", "**Gehen Sie** nach Hause! · **Kommen Sie** bitte **mit**!"],
              ["**ihr** *(các bạn)*", "**Dạng chia ngôi ihr** *(Bỏ „ihr“!)*", "**Geht** nach Hause! · **Räumt** euer Zimmer **auf**!"],
              ["**du** *(bạn)*", "**Dạng chia ngôi du — Bỏ đuôi „-st“ và bỏ „du“!**", "**Geh** nach Hause! · **Hol** deine Mutter **ab**!"],
            ],
          },
        ],
      },
      {
        id: "luu-y-ngoai-le-lich-su",
        heading: "2. Lưu ý riêng cho ngôi „du“, 3 Ngoại lệ & Phép lịch sự",
        blocks: [
          {
            type: "list",
            title: "Lưu ý đặc biệt CHỈ áp dụng cho ngôi „du“",
            items: [
              "**Đổi nguyên âm e → i / ie GIỮ NGUYÊN**, nhưng **KHÔNG đổi a → ä**: *helfen (du hilfst) → **Hilf** deinem Bruder!* · *lesen → **Lies**!* · NHƯNG *fahren (du fährst) → **Fahr** langsamer!* (bỏ Umlaut!).",
              "**Thêm đuôi „-e“ bắt buộc** khi thân động từ kết thúc bằng **-d, -t** (hoặc -m/-n sau phụ âm): *warten → **Warte** noch 5 Minuten!* · *arbeiten → **Arbeite**!*",
              "Động từ tách vẫn tách tiền tố ra cuối câu: ***Hol** mich bitte am Bahnhof **ab**!*",
            ],
          },
          {
            type: "table",
            caption: "3 động từ ngoại lệ cần thuộc (chủ yếu là „sein“!)",
            headers: ["Infinitiv", "du", "ihr", "Sie"],
            rows: [
              ["**sein** ★", "**Sei** ruhig!", "**Seid** ruhig!", "**Seien Sie** ruhig!"],
              ["**haben**", "**Hab** keine Angst!", "**Habt** keine Angst!", "**Haben Sie** keine Angst!"],
              ["**werden**", "**Werd(e)** gesund!", "**Werdet** gesund!", "**Werden Sie** gesund!"],
            ],
          },
          {
            type: "tip",
            variant: "warning",
            title: "Văn hóa giao tiếp ở Đức: Đừng dùng Imperativ cộc lốc!",
            content:
              "Nói Imperativ ngắn và gắt nghe rất bất lịch sự. Hãy luôn kèm **„bitte“** hoặc **„bitte mal“** (*Geh **bitte mal** in den Supermarkt*). Nếu muốn thật sự lịch sự (với người lạ, đồng nghiệp, sếp), hãy dùng **Konjunktiv 2**: ***Würdest** du mich bitte am Bahnhof abholen?* / ***Könnten** Sie mir bitte helfen?*",
          },
        ],
      },
    ],
    keyPoints: [
      "Imperativ đặt động từ ở Vị trí 1; chỉ giữ đại từ ở ngôi lịch sự „Sie“ (bỏ „du“ và „ihr“).",
      "Ở ngôi „du“: giữ nguyên đổi nguyên âm e→i/ie (Hilf!, Gib!), bỏ Umlaut của a→ä (Fahr!, Schlaf!), thêm -e với thân -d/-t (Warte!).",
      "Nhớ động từ „sein“: Sei! (du) · Seid! (ihr) · Seien Sie! (Sie).",
    ],
    quiz: [
      {
        question: "Dạng Imperativ đúng ở ngôi „du“ của động từ „fahren“ (lái xe) và „helfen“ (giúp) là:",
        options: ["Fähr! / Helf!", "Fahr! / Hilf!", "Fährst! / Hilfst!"],
        answer: 1,
        explanation: "Ở Imperativ ngôi „du“, đổi nguyên âm a→ä bị bỏ đi (Fahr!), còn đổi e→i/ie vẫn giữ nguyên (Hilf!).",
      },
      {
        question: "Chọn câu Imperativ đúng với „sein“ ở ngôi „Sie“:",
        options: ["Sind Sie bitte pünktlich!", "Seid Sie bitte pünktlich!", "Seien Sie bitte pünktlich!"],
        answer: 2,
        explanation: "Imperativ bất quy tắc của „sein“ ở ngôi lịch sự Sie là „Seien Sie“.",
      },
    ],
  },
  {
    slug: "dong-tu-phan-than-reflexive-verben",
    categoryId: "verben",
    order: 6,
    code: "V6",
    title: "Động từ phản thân (Reflexive Verben)",
    germanTitle: "Reflexive Verben (Echt vs. Unecht)",
    level: "A2",
    summary: "Phân biệt động từ phản thân thật (luôn bắt buộc có sich) và giả, quy tắc chọn Akk vs Dat và vị trí của đại từ phản thân trong mọi kiểu câu.",
    sections: [
      {
        id: "that-va-gia",
        heading: "1. Động từ phản thân thật (Echt) vs Giả (Unecht)",
        blocks: [
          {
            type: "compare",
            leftTitle: "Phản thân THẬT (Echte reflexive Verben)",
            leftItems: [
              "**LUÔN BẮT BUỘC** đi kèm đại từ phản thân (*sich*), không thể bỏ hay thay bằng vật khác.",
              "Trong từ điển ký hiệu là *s. / sich ...* (VD: *sich konzentrieren, sich freuen, sich beeilen, sich bedanken, sich interessieren, sich erholen*).",
              "*Ich **konzentriere mich** auf den Unterricht.* (Dù tiếng Việt không nói „tự tập trung mình“, tiếng Đức vẫn BẮT BUỘC có *mich*!)",
            ],
            rightTitle: "Phản thân GIẢ (Unechte reflexive Verben)",
            rightItems: [
              "Có thể dùng phản thân (tác động lên chính mình) HOẶC dùng thường (tác động lên người/vật khác).",
              "*Ich wasche **mich**.* (Tôi tắm cho chính tôi → phản thân).",
              "*Ich wasche **die Wäsche**.* (Tôi giặt quần áo → không phản thân!).",
            ],
          },
        ],
      },
      {
        id: "vi-tri-tu-phan-than",
        heading: "2. Vị trí của đại từ phản thân trong 4 kiểu câu",
        blocks: [
          {
            type: "table",
            caption: "Đại từ phản thân luôn bám sát động từ chia hoặc chủ ngữ (thường ở Vị trí 3!)",
            headers: ["Loại câu", "Vị trí 1", "Vị trí 2", "Vị trí 3", "Phần còn lại"],
            rows: [
              ["**Hauptsatz**", "Ich", "wasche", "**mich**", "heute Abend."],
              ["**Ja/Nein-Frage**", "Wäschst", "du", "**dich**", "heute Abend?"],
              ["**Với Modal/Hilfsverb**", "Ich", "kann / habe", "**mich**", "heute Abend waschen / gewaschen."],
              ["**Nebensatz**", "..., weil", "ich", "**mich**", "heute Abend waschen werde."],
            ],
          },
          {
            type: "tip",
            variant: "tip",
            title: "Mẹo nhớ nhanh vị trí khi chủ ngữ là Danh từ vs Đại từ",
            content:
              "Khi chủ ngữ là **đại từ** (*ich, du, er...*), đại từ phản thân đứng **ngay sau chủ ngữ** (*weil ich **mich** wasche*). Khi có thêm tân ngữ Akkusativ (*die Hände*), đại từ phản thân đổi sang Dativ (*Ich wasche **mir** die Hände*).",
          },
        ],
      },
    ],
    keyPoints: [
      "Động từ phản thân thật (sich freuen, sich konzentrieren, sich beeilen, sich interessieren...) bắt buộc luôn có đại từ phản thân.",
      "Có 1 tân ngữ → Reflexivpronomen ở Akkusativ (mich/dich); có thêm tân ngữ Akk thứ 2 → đổi sang Dativ (mir/dir).",
      "Trong mọi kiểu câu (HS, câu hỏi, Perfekt, Modalverb, NS), đại từ phản thân giữ vị trí sát ngay sau động từ chia / chủ ngữ (Vị trí 3).",
    ],
    quiz: [
      {
        question: "Chọn câu đúng trong mệnh đề phụ với „sich beeilen“ (vội vã):",
        options: [
          "..., weil ich heute beeilen mich muss.",
          "..., weil ich mich heute beeilen muss.",
          "..., weil mich ich heute beeilen muss.",
        ],
        answer: 1,
        explanation: "Trong Nebensatz, chủ ngữ đại từ đứng ở vị trí 2 ngay sau liên từ, tiếp theo là đại từ phản thân „mich“ ở vị trí 3, còn động từ chia đẩy về cuối.",
      },
    ],
  },
  {
    slug: "dong-tu-werden-va-lassen",
    categoryId: "verben",
    order: 7,
    code: "V7",
    title: "Hai động từ đa năng: „werden“ và „lassen“",
    germanTitle: "Die Verben „werden“ & „lassen“",
    level: "B1",
    summary: "5 chức năng của „werden“ + phân biệt worden vs geworden; 4 nghĩa của „lassen“ (để lại, cho phép, khả thi, sai/nhờ làm thay bị động) + lassen vs gelassen.",
    sections: [
      {
        id: "dong-tu-werden",
        heading: "1. Động từ „werden“ — 5 vai trò & „worden“ vs „geworden“",
        blocks: [
          {
            type: "table",
            caption: "5 cách dùng của „werden“ (Động từ chính vs Trợ động từ)",
            headers: ["Cấu trúc", "Vai trò", "Ví dụ"],
            rows: [
              ["**werden + Danh từ**", "Động từ chính: *trở thành* (+ Nominativ)", "*Ich **werde** später Polizist.*"],
              ["**werden + Tính từ**", "Động từ chính: *trở nên / dần trở thành*", "*Autos **werden** immer schneller.*"],
              ["**werden + Infinitiv**", "Trợ động từ tạo **Futur 1**", "*Ich **werde** morgen ins Kino **gehen**.*"],
              ["**werden + Partizip 2**", "Trợ động từ tạo **Vorgangspassiv (Bị động)**", "*Das Auto **wird** morgen **repariert**.*"],
              ["**würde + Infinitiv**", "Trợ động từ tạo **Konjunktiv 2**", "*Ich **würde** das Haus gern **kaufen**.*"],
            ],
          },
          {
            type: "compare",
            leftTitle: "geworden (Chủ động — „werden“ là ĐỘNG TỪ CHÍNH)",
            leftItems: [
              "Công thức: **sein + ... + geworden**.",
              "*Ich **bin** gestern 30 **geworden**.* (Hôm qua tôi đã tròn 30 tuổi.)",
              "*Er **ist** Arzt **geworden**.* (Anh ấy đã trở thành bác sĩ.)",
            ],
            rightTitle: "worden (Bị động — „werden“ là TRỢ ĐỘNG TỪ của Passiv)",
            rightItems: [
              "Công thức: **sein + Partizip 2 + worden**.",
              "*Der Kuchen **ist** gestern gebacken **worden**.* (Chiếc bánh đã được nướng hôm qua.)",
              "*(KHÔNG BAO GIỜ viết „geworden“ trong câu bị động!)*",
            ],
          },
        ],
      },
      {
        id: "dong-tu-lassen",
        heading: "2. Động từ „lassen“ — 4 nghĩa vàng & „lassen“ vs „gelassen“",
        blocks: [
          {
            type: "text",
            content:
              "**lassen** (*ich lasse, du lässt, er lässt · Prät: ließ*) vừa đứng một mình làm động từ chính (= *dừng/bỏ làm gì*: *Ich lasse das Rauchen; Lasst Papa in Ruhe!*), vừa kết hợp với 1 động từ nguyên thể cuối câu **y hệt một Modalverb** với 4 nghĩa cực hữu dụng:",
          },
          {
            type: "table",
            caption: "4 nghĩa khi „lassen“ đi với động từ thứ 2 (Infinitiv cuối câu)",
            headers: ["Ý nghĩa", "Ví dụ & Giải thích tương đương"],
            rows: [
              ["**1. Để nguyên / Không mang theo** *(thường với stehen, liegen, sitzen — có thể lược bỏ động từ 2)*", "*Ich **lasse** mein Handy zu Hause (**liegen**).* (= Tôi để điện thoại ở nhà.)\n*Ich **lasse** das Auto in der Garage **stehen**.*"],
              ["**2. Cho phép** (= erlauben)", "*Ich **lasse** meinen Sohn abends **fernsehen**.* (= Tôi cho phép con trai xem tivi buổi tối.)"],
              ["**3. Có thể / Không thể làm được** *(**sich lassen + Infinitiv** = thay bị động + können!)*", "*Das Problem **lässt sich** einfach **lösen**.* (= Das Problem kann einfach gelöst werden.)\n*Der Fernseher **lässt sich** nicht **reparieren**.*"],
              ["**4. Nhờ / Thuê ai làm hộ** *(không tự làm — thay cho Passiv!)*", "*Ich **lasse** mein Fahrrad **reparieren**.* (= Tôi đem xe đi sửa / nhờ thợ sửa.)\n*Meine Freundin **lässt** sich die Haare **schneiden**.* (= Cô ấy đi cắt tóc ở tiệm.)"],
            ],
          },
          {
            type: "compare",
            leftTitle: "Perfekt dùng „gelassen“ (1 động từ — động từ chính)",
            leftItems: ["*Ich **habe** mein Auto zu Hause **gelassen**.* (Chỉ có 1 động từ „lassen“ → dùng Partizip 2 „gelassen“.)"],
            rightTitle: "Perfekt dùng „lassen“ (2 động từ — Ersatzinfinitiv như Modalverb!)",
            rightItems: ["*Ich **habe** mein Auto **reparieren lassen**.* · *Das Problem **hat** sich leicht **lösen lassen**.* (Có động từ thứ 2 → giữ nguyên thể „lassen“ ở cuối!)"],
          },
        ],
      },
    ],
    keyPoints: [
      "„geworden“ dùng khi „werden“ là động từ chính (Ich bin 30 geworden); „worden“ dùng trong bị động Perfekt (ist gebaut worden).",
      "„lassen + Infinitiv“ hay dùng nhất với nghĩa „đi thuê/nhờ người khác làm“ (sich die Haare schneiden lassen) và „sich lassen + Infinitiv“ = có thể được làm (thay bị động với können).",
      "Ở Perfekt: 1 mình „lassen“ → „gelassen“; đi cùng động từ thứ 2 → giữ nguyên „lassen“ (Infinitiv + lassen).",
    ],
    quiz: [
      {
        question: "Chọn câu đúng cho „Chiếc xe đã được sửa xong (Bị động Perfekt)“:",
        options: [
          "Das Auto ist repariert geworden.",
          "Das Auto ist repariert worden.",
          "Das Auto hat repariert worden.",
        ],
        answer: 1,
        explanation: "Trong thể bị động Perfekt, Partizip 2 của trợ động từ „werden“ là „worden“ (không có ge-).",
      },
      {
        question: "Câu „Ich lasse mein Auto reparieren“ có nghĩa là gì?",
        options: [
          "Tôi tự tay sửa chiếc xe của mình.",
          "Tôi đưa xe cho thợ sửa hộ (nhờ/thuê người khác làm).",
          "Tôi bỏ mặc chiếc xe hỏng luôn.",
        ],
        answer: 1,
        explanation: "„lassen + Infinitiv“ mang nghĩa nhờ/thuê người khác thực hiện hành động cho mình.",
      },
    ],
  },
  {
    slug: "phan-tu-1-va-phan-tu-2",
    categoryId: "verben",
    order: 8,
    code: "V8",
    title: "Phân từ 1 (Partizip Präsens) & Phân từ 2 (Partizip Perfekt)",
    germanTitle: "Partizip 1 & Partizip 2",
    level: "A2",
    summary: "Cách tạo Partizip 1 (Infinitiv + d) và toàn bộ quy tắc tạo Partizip 2: động từ quy tắc, -ieren, động từ mạnh, hỗn hợp, đổi nguyên âm và động từ tách/không tách.",
    sections: [
      {
        id: "partizip-1",
        heading: "1. Phân từ 1 (Partizip Präsens) — Cực dễ: Infinitiv + d",
        blocks: [
          {
            type: "rule",
            title: "Công thức Partizip 1 (chỉ 2 ngoại lệ duy nhất trong toàn tiếng Đức!)",
            formula: "Infinitiv + d   (VD: schlafen → schlafend · rennen → rennend · telefonieren → telefonierend)",
            note: "2 ngoại lệ duy nhất: sein → seiend · tun → tuend. Partizip 1 dùng làm tính từ/trạng từ chỉ hành động xảy ra ĐỒNG THỜI (Der telefonierende Mann bestellt ein Bier).",
          },
        ],
      },
      {
        id: "partizip-2",
        heading: "2. Phân từ 2 (Partizip Perfekt) — Xương sống của Perfekt & Passiv",
        blocks: [
          {
            type: "text",
            content:
              "Partizip 2 tương đương cột 3 của động từ tiếng Anh (*go – went – **gone*** / *gehen – ging – **gegangen***). Nó dùng trong **Perfekt, Plusquamperfekt, Futur 2, Passiv** và làm **tính từ chỉ trạng thái/hành động đã xong** (*das geputzte Auto*).",
          },
          {
            type: "table",
            caption: "Tổng hợp 6 quy tắc tạo Partizip 2 đầy đủ nhất",
            headers: ["Nhóm động từ", "Công thức", "Ví dụ"],
            rows: [
              ["**1. Động từ quy tắc**", "**ge- + Thân + -(e)t** *(thêm -e- nếu thân đuôi -d/-t)*", "machen → **ge**mach**t** · arbeiten → **ge**arbeit**et**"],
              ["**2. Động từ đuôi „-ieren“**", "**KHÔNG có „ge-“!** Thân + **-t**", "organisieren → organisier**t** · studieren → studier**t** · telefonieren → telefonier**t**"],
              ["**3. Động từ mạnh (không đổi gốc ở P2)**", "**ge- + Thân + -en**", "fahren → **ge**fahr**en** · schlafen → **ge**schlaf**en** · sehen → **ge**seh**en**"],
              ["**4. Động từ hỗn hợp** *(thân Präteritum + -t)*", "**ge- + Thân Präteritum + -t**", "bringen → **ge**brach**t** · kennen → **ge**kann**t** · denken → **ge**dach**t** · brennen → **ge**brann**t**"],
              ["**5. Động từ mạnh đổi nguyên âm**", "**ge- + Thân đổi nguyên âm + -en** *(ei thường đổi thành ie!)*", "helfen → **ge**holf**en** · nehmen → **ge**nomm**en** · schreiben → **ge**schr**ie**b**en**"],
              ["**6. Động từ ghép (Tách vs Không tách)**", "• **Tách được:** Tiền tố + **ge** + P2 gốc\n• **Không tách:** Tiền tố + P2 gốc **(KHÔNG „ge-“!)**", "• aufstehen → auf**ge**standen · aufräumen → auf**ge**räumt\n• verstehen → **ver**standen · besuchen → **be**sucht"],
            ],
          },
          {
            type: "tip",
            variant: "tip",
            title: "Mẹo cực hay với động từ ghép",
            content:
              "Gốc Partizip 2 **KHÔNG BAO GIỜ ĐỔI** dù bạn gắn tiền tố nào vào: *stehen → **gestanden*** ⇒ *aufstehen → auf**gestanden*** · *verstehen → ver**standen*** · *entstehen → ent**standen***!",
          },
        ],
      },
    ],
    keyPoints: [
      "Partizip 1 = Infinitiv + d (2 ngoại lệ duy nhất: seiend, tuend).",
      "Partizip 2 quy tắc = ge- + thân + -(e)t; động từ đuôi -ieren và tiền tố không tách (be-, er-, ver-...) KHÔNG có „ge-“!",
      "Động từ tách được chèn „ge-“ vào giữa tiền tố và thân (eingeschlafen, aufgeräumt).",
    ],
    quiz: [
      {
        question: "Partizip 2 đúng của „fotografieren“ và „besuchen“ là gì?",
        options: ["gefotografiert / gebesucht", "fotografiert / besucht", "fotografieren / besucht"],
        answer: 1,
        explanation: "Động từ đuôi -ieren và động từ có tiền tố không tách (be-) đều KHÔNG thêm „ge-“ khi lập Partizip 2.",
      },
      {
        question: "Partizip 2 đúng của động từ tách được „einkaufen“ là gì?",
        options: ["geeinkauft", "einkauft", "eingekauft"],
        answer: 2,
        explanation: "Tiền tố „ein-“ tách được nên „ge“ chèn vào giữa tiền tố và thân động từ → eingekauft.",
      },
    ],
  },
  {
    slug: "konjunktiv-1-cau-tuong-thuat",
    categoryId: "verben",
    order: 9,
    code: "V9",
    title: "Konjunktiv 1 – Câu tường thuật gián tiếp (Indirekte Rede)",
    germanTitle: "Der Konjunktiv 1",
    level: "B2",
    summary: "Cách dùng Konjunktiv 1 trong báo chí, tin tức và lời nói gián tiếp; bảng chia „sein“ & ngôi 3 số ít; 3 thì trong Konjunktiv 1 và thực tế giao tiếp.",
    sections: [
      {
        id: "khi-nao-dung-k1",
        heading: "1. Konjunktiv 1 dùng để làm gì?",
        blocks: [
          {
            type: "text",
            content:
              "**Konjunktiv 1** dùng để **tường thuật lại lời nói của người thứ ba (Indirekte Rede)** một cách khách quan (người nói không khẳng định điều đó đúng hay sai — chỉ thuật lại!). Bạn sẽ gặp nó hàng ngày trên **báo chí, bản tin Tagesschau, văn bản tòa án/bệnh viện**, và trong một số thành ngữ cố định (*Gott **sei** Dank!* – Cảm ơn Chúa!, *Hoch **lebe** das Geburtstagskind!*, ***Lebe** wohl!*).",
          },
          {
            type: "examples",
            title: "Trực tiếp (Direkte Rede) → Gián tiếp (Indirekte Rede)",
            items: [
              { de: "Der Lehrer sagt: „Deutsch ist nicht schwer!“ → Der Schüler sagt, Deutsch **sei** nicht schwer.", vi: "Thầy giáo nói: „Tiếng Đức không khó!“ → Học sinh kể lại rằng thầy nói tiếng Đức không khó." },
            ],
          },
        ],
      },
      {
        id: "chia-konjunktiv-1",
        heading: "2. Cách chia Konjunktiv 1 (Cực gọn!) & Quy tắc thay thế",
        blocks: [
          {
            type: "rule",
            title: "Mẹo chia ngôi 3 số ít (er / sie / es / man) — Chiếm 95% thực tế!",
            formula: "Lấy Infinitiv bỏ chữ „-n“ cuối!   (leben → er lebe · haben → er habe · fahren → er fahre · kommen → er komme)",
            note: "Riêng „sein“ dùng đủ cả 6 ngôi: ich sei · du sei(e)st · er/sie/es sei · wir seien · ihr seiet · sie/Sie seien.",
          },
          {
            type: "table",
            caption: "3 thì tồn tại trong Konjunktiv 1 (Chỉ chia động từ ở Vị trí 2 sang K1!)",
            headers: ["Thì", "Công thức Konjunktiv 1", "Ví dụ"],
            rows: [
              ["**Präsens**", "Động từ ở K1", "*Er **sage** / Er **fahre** / Er **sei** zu Hause.*"],
              ["**Quá khứ (Perfekt)**", "**habe / sei** + Partizip 2", "*Er **habe** gesagt / Er **sei** gefahren.*"],
              ["**Futur 1**", "**werde** + Infinitiv", "*Er **werde** sagen / Er **werde** fahren.*"],
            ],
          },
          {
            type: "tip",
            variant: "tip",
            title: "Quy tắc thay thế khi K1 trùng với Indikativ (Ngôi ich, wir, sie)",
            content:
              "Ở ngôi *ich, wir, sie*, dạng K1 (*wir gehen, sie haben*) trùng hệt Indikativ nên người Đức chuyển sang **Konjunktiv 2** (*Er sagt, sie **würden** ins Kino gehen / sie **hätten** keine Zeit*). Trong **văn nói đời thường**, đa số người Đức thậm chí dùng luôn Indikativ với „dass“ (*Er sagt, dass Deutsch nicht schwer ist*) — chỉ cần nhớ K1 thật chắc để đọc hiểu báo chí và thi B2/C1!",
          },
        ],
      },
    ],
    keyPoints: [
      "Konjunktiv 1 chủ yếu xuất hiện trong báo chí, tin tức và câu tường thuật gián tiếp để giữ sự khách quan.",
      "Cách chia cực dễ cho ngôi 3 số ít: Infinitiv bỏ -n (habe, komme, mache, könne); riêng „sein“ là „sei“.",
      "Nếu K1 trùng Indikativ (thường ở wir/sie), chuyển sang dùng Konjunktiv 2.",
    ],
    quiz: [
      {
        question: "Chuyển sang lời nói gián tiếp chuẩn báo chí (Konjunktiv 1): „Der Minister sagt: ‚Die Wirtschaft ist stabil.‘“",
        options: [
          "Der Minister sagt, die Wirtschaft wäre stabil.",
          "Der Minister sagt, die Wirtschaft sei stabil.",
          "Der Minister sagt, die Wirtschaft sind stabil.",
        ],
        answer: 1,
        explanation: "Konjunktiv 1 ngôi 3 số ít của „sein“ là „sei“.",
      },
    ],
  },
  {
    slug: "konjunktiv-2-gia-dinh-va-lich-su",
    categoryId: "verben",
    order: 10,
    code: "V10",
    title: "Konjunktiv 2 (A2 & B1+): Lịch sự, Ước muốn & Giả định không có thật",
    germanTitle: "Konjunktiv 2 — Gegenwart & Vergangenheit",
    level: "A2",
    summary: "6 cách dùng Konjunktiv 2 (nhờ lịch sự, lời khuyên, ước muốn, điều kiện & so sánh không có thật als ob), bảng chia hätte/wäre/würde/könnte/sollte, quá khứ và lược bỏ „wenn“.",
    sections: [
      {
        id: "sau-cach-dung-k2",
        heading: "1. Sáu cách dùng thiết yếu của Konjunktiv 2 (Từ A2 đến B1+)",
        blocks: [
          {
            type: "text",
            content:
              "Nếu Indikativ mô tả **thế giới thật** (*Ich bin Millionär*), thì **Konjunktiv 2** mô tả **thế giới giả định, ước muốn và phép lịch sự** (*Ich **wäre** so gern Millionär*):",
          },
          {
            type: "list",
            items: [
              "**1. Lời nhờ / gọi món lịch sự (A2):** *Ich **hätte** gern noch ein Bier.* · ***Würdest** du bitte das Fenster zumachen?*",
              "**2. Gợi ý & Lời khuyên (A2):** *Wir **könnten** heute ins Kino gehen.* · *Du **solltest** für die Prüfung lernen.*",
              "**3. Ước muốn & Giấc mơ (A2):** *Ich **wünschte** mir, ich **wäre** jetzt am Meer.*",
              "**4. Ước muốn trái thực tế (B1 — thường kèm *bloß, doch, nur*):** *Ach, wenn ich nur nicht so müde **wäre**!* · *Wenn ich doch keinen Alkohol **getrunken hätte**!*",
              "**5. Điều kiện không có thật (B1 — Irreale Bedingungen):** *Wenn ich reich **wäre**, **würde** ich eine Weltreise machen.*",
              "**6. So sánh không có thật (B1 — với *als ob / als wenn*):** *Ich fühle mich, **als ob** ich krank **wäre**.* · *Sie tut so, **als ob** sie mich nicht **kennen würde**.*",
            ],
          },
        ],
      },
      {
        id: "chia-k2-hien-tai-va-qua-khu",
        heading: "2. Cách chia Konjunktiv 2 ở Hiện tại & Quá khứ",
        blocks: [
          {
            type: "table",
            caption: "Bảng chia 5 động từ DÙNG DẠNG K2 RIÊNG (mọi động từ thường khác dùng „würde + Infinitiv“!)",
            headers: ["Ngôi", "haben", "sein", "werden", "können", "sollen *(không ö!)*"],
            rows: [
              ["ich / er / sie / es", "**hätte**", "**wäre**", "**würde**", "**könnte**", "**sollte**"],
              ["du", "hättest", "wär(e)st", "würdest", "könntest", "solltest"],
              ["wir / sie / Sie", "hätten", "wären", "würden", "könnten", "sollten"],
              ["ihr", "hättet", "wär(e)t", "würdet", "könntet", "solltet"],
            ],
          },
          {
            type: "rule",
            title: "Quy tắc vàng trong giao tiếp (Hiện tại vs Quá khứ)",
            formula: "Hiện tại: hätte / wäre / Modalverb-K2  HOẶC  würde + Infinitiv   |   Quá khứ (CHỈ CÓ 1 DẠNG!): hätte / wäre + Partizip 2",
            note: "Ví dụ quá khứ: Ich habe das Spiel gesehen (Perfekt) → Ich **hätte** das Spiel **gesehen** (K2 quá khứ). Du bist zu spät gekommen → Du **wärst** nicht zu spät **gekommen**.",
          },
          {
            type: "examples",
            title: "Mẹo lược bỏ „wenn“ khi mệnh đề phụ đứng đầu (rất hay dùng ở B1+!)",
            items: [
              { de: "**Wenn** du viel Geld **hättest**, würde sie dich heiraten. = **Hättest** du viel Geld, würde sie dich heiraten.", vi: "Nếu bạn có nhiều tiền thì cô ấy đã cưới bạn rồi.", note: "Bỏ „wenn“ → đưa động từ K2 lên Vị trí 1! (Chỉ làm được khi vế phụ đứng trước)." },
              { de: "**Hättest** du mal mehr **gelernt**!", vi: "Giá mà hồi đó con học chăm hơn!", note: "Cách nói rút gọn cực phổ biến của người Đức để góp ý/tiếc nuối chuyện đã qua." },
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Trong văn nói hiện tại: chỉ dùng dạng K2 riêng cho haben (hätte), sein (wäre), werden (würde) và Modalverben (könnte, müsste, dürfte, sollte); mọi động từ còn lại dùng „würde + Infinitiv“.",
      "Konjunktiv 2 ở quá khứ chỉ có 1 cách tạo duy nhất: đổi haben/sein của Perfekt thành hätte/wäre + Partizip 2.",
      "Khi mệnh đề „wenn“ đứng đầu câu, có thể lược bỏ „wenn“ và đẩy động từ K2 lên Vị trí 1 (Hätte ich Zeit, würde ich kommen).",
    ],
    quiz: [
      {
        question: "Hoàn thành câu điều kiện quá khứ không có thật: „Wenn ich mehr gelernt ___, ___ ich die Prüfung bestanden.“",
        options: ["habe / habe", "hätte / hätte", "würde / würde"],
        answer: 1,
        explanation: "Konjunktiv 2 trong quá khứ dùng hätte/wäre + Partizip 2 (cả lernen và bestehen đều đi với haben → hätte).",
      },
      {
        question: "Viết lại „Wenn ich reich wäre, würde ich nicht arbeiten.“ bằng cách bỏ „wenn“:",
        options: [
          "Wäre ich reich, würde ich nicht arbeiten.",
          "Ich wäre reich, würde ich nicht arbeiten.",
          "Reich wäre ich, würde ich nicht arbeiten.",
        ],
        answer: 0,
        explanation: "Khi bỏ „wenn“ ở mệnh đề phụ đứng đầu, động từ chia ở K2 (Wäre) nhảy lên Vị trí 1.",
      },
    ],
  },
  {
    slug: "the-bi-dong-passiv",
    categoryId: "verben",
    order: 11,
    code: "V11",
    title: "Thể bị động (Vorgangspassiv, Unpersönliches Passiv & Zustandspassiv)",
    germanTitle: "Das Passiv (A2 – B2)",
    level: "B1",
    summary: "Chuyển từ Chủ động sang Bị động hành động (6 thì + Modalverb), động từ không có bị động, Bị động vô nhân xưng B2 (không có tân ngữ Akk) và Bị động trạng thái với „sein“.",
    sections: [
      {
        id: "vorgangspassiv",
        heading: "1. Bị động hành động (Vorgangspassiv) — 6 thì & với Modalverb",
        blocks: [
          {
            type: "text",
            content:
              "Trong câu **chủ động (Aktiv)**, người làm hành động là trọng tâm (*Frau Meier kocht eine Suppe*). Trong **bị động hành động (Vorgangspassiv)**, **bản thân hành động** là trọng tâm, còn ai làm không quan trọng hoặc không biết (*Die Suppe **wird gekocht***). Nếu muốn nêu tác nhân, ta dùng **von + Dativ** (cho người) hoặc *durch + Akk* (cho phương tiện/nguyên nhân).",
          },
          {
            type: "steps",
            title: "3 bước đổi từ Chủ động sang Bị động",
            items: [
              { step: "1. Đổi Tân ngữ Akkusativ thành Chủ ngữ (Nominativ)", detail: "Der Mann öffnet {akk:den Schrank} → {nom:Der Schrank}..." },
              { step: "2. Bỏ chủ ngữ cũ (hoặc đưa vào „von + Dativ“)", detail: "... (**von** {dat:dem Mann}) ..." },
              { step: "3. Chia „werden“ theo đúng thì + giữ động từ chính ở Partizip 2", detail: "{nom:Der Schrank} **wird** (von dem Mann) **geöffnet**." },
            ],
          },
          {
            type: "table",
            caption: "Công thức Vorgangspassiv trong cả 6 thì & với Modalverb",
            headers: ["Thì / Cấu trúc", "Công thức", "Ví dụ (das Fenster öffnen)"],
            rows: [
              ["**Präsens**", "**werden** (chia) + Partizip 2", "Das Fenster **wird** geöffnet."],
              ["**Präteritum**", "**wurden** (chia) + Partizip 2", "Das Fenster **wurde** geöffnet."],
              ["**Perfekt**", "**sein** (chia) + Partizip 2 + **worden**", "Das Fenster **ist** geöffnet **worden**."],
              ["**Plusquamperfekt**", "**waren** (chia) + Partizip 2 + **worden**", "Das Fenster **war** geöffnet **worden**."],
              ["**Futur 1**", "**werden** (chia) + Partizip 2 + **werden**", "Das Fenster **wird** geöffnet **werden**."],
              ["**Futur 2** *(hiếm)*", "**werden** + Partizip 2 + **worden sein**", "Das Fenster **wird** geöffnet **worden sein**."],
              ["**Với Modalverb** ★", "**Modalverb** (chia) + Partizip 2 + **werden**", "Der Kuchen **muss** gebacken **werden**."],
            ],
          },
          {
            type: "tip",
            variant: "warning",
            title: "Những động từ KHÔNG tạo được Vorgangspassiv thông thường",
            content:
              "1. Động từ chuyển động chia Perfekt với *sein* (*gehen, fahren, kommen*) · 2. Động từ phản thân thật (*sich konzentrieren*) · 3. Động từ chỉ trạng thái/sở hữu (*haben, besitzen, wissen, kennen, schlafen*).",
          },
        ],
      },
      {
        id: "unpersoenliches-passiv",
        heading: "2. Bị động vô nhân xưng (Unpersönliches Passiv — B2)",
        blocks: [
          {
            type: "text",
            content:
              "Khi câu chủ động **không có tân ngữ Akkusativ** (như động từ Dativ *helfen, zuhören*, động từ có giới từ *warten auf, spielen mit*, hoặc chủ ngữ là *man*), ta KHÔNG có chủ ngữ mới! Lúc này ta dùng **„es“ làm từ giữ chỗ ở Vị trí 1** (hoặc đẩy 1 thành phần khác lên Vị trí 1 rồi **bỏ „es“**!), và **„werden“ LUÔN chia ngôi 3 số ít (wird / wurde)**!",
          },
          {
            type: "table",
            caption: "Cách chuyển sang Unpersönliches Passiv (Lưu ý: Dativ VẪN GIỮ NGUYÊN Dativ!)",
            headers: ["Câu chủ động (Aktiv)", "Câu bị động vô nhân xưng (Passiv)"],
            rows: [
              ["Mein Sohn hilft {dat:mir} heute.", "**Es** **wird** {dat:mir} heute **geholfen**.\n→ {dat:Mir} **wird** heute **geholfen**. *(đưa „Mir“ lên P1 → bỏ „es“!)*"],
              ["Der Mann wartet **auf mich**.", "**Es** **wird** auf mich **gewartet**. / **Auf mich** **wird** **gewartet**."],
              ["In Italien isst **man** viel Pizza.", "**In Italien** **wird** viel Pizza **gegessen**. *(„man“ biến mất hoàn toàn!)*"],
            ],
          },
        ],
      },
      {
        id: "zustandspassiv",
        heading: "3. Bị động trạng thái (Zustandspassiv) — dùng „sein“",
        blocks: [
          {
            type: "compare",
            leftTitle: "Vorgangspassiv (werden + P2) — ĐANG DIỄN RA",
            leftItems: [
              "Nhấn mạnh **quá trình / hành động** đang xảy ra.",
              "*Das Fenster **wird** geöffnet.* (Cửa sổ đang được ai đó mở ra.)",
            ],
            rightTitle: "Zustandspassiv (sein + P2) — KẾT QUẢ / TRẠNG THÁI",
            rightItems: [
              "Hành động đã kết thúc, nhấn mạnh **trạng thái hiện tại**.",
              "*Das Fenster **ist** geöffnet.* (Cửa sổ đang ở trạng thái mở.)",
              "Chỉ dùng 3 thì: **Präsens** (*ist verletzt*), **Präteritum** (*war verletzt*), **Futur 1** (*wird verletzt sein*) và với Modalverb (*muss geöffnet sein*).",
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Vorgangspassiv (quá trình) = werden + Partizip 2; Zustandspassiv (trạng thái kết quả) = sein + Partizip 2.",
      "Vorgangspassiv với Modalverb = Modalverb (Vị trí 2) + ... + Partizip 2 + werden (cuối câu).",
      "Trong Unpersönliches Passiv: tân ngữ Dativ giữ nguyên Dativ (KHÔNG biến thành Nominativ!), „werden“ luôn chia ngôi 3 số ít (wird/wurde), và „es“ bị bỏ nếu có từ khác đứng ở Vị trí 1.",
    ],
    quiz: [
      {
        question: "Chuyển „Man hilft dem alten Mann.“ sang thể bị động chuẩn (Unpersönliches Passiv):",
        options: [
          "Der alte Mann wird geholfen.",
          "Dem alten Mann wird geholfen.",
          "Dem alten Mann werden geholfen.",
        ],
        answer: 1,
        explanation: "„helfen“ đi với Dativ nên „dem alten Mann“ giữ nguyên ở Dativ; động từ „werden“ chia ngôi 3 số ít (wird), và vì „Dem alten Mann“ đã đứng Vị trí 1 nên bỏ „es“.",
      },
      {
        question: "Chọn câu đúng cho Bị động với Modalverb: „Bức thư phải được viết hôm nay.“",
        options: [
          "Der Brief muss heute geschrieben sein.",
          "Der Brief wird heute geschrieben müssen.",
          "Der Brief muss heute geschrieben werden.",
        ],
        answer: 2,
        explanation: "Vorgangspassiv với Modalverb: Modalverb (muss) + ... + Partizip 2 (geschrieben) + werden.",
      },
    ],
  },
  {
    slug: "dong-tu-voi-bo-ngu",
    categoryId: "verben",
    order: 12,
    code: "V12",
    title: "Động từ với Bổ ngữ (Ergänzungen) & Trật tự Dativ – Akkusativ",
    germanTitle: "Verben mit Ergänzungen (Nom / Akk / Dat / Gen / Präp)",
    level: "B1",
    summary: "Phân biệt Ergänzung (bắt buộc) vs Angabe (tùy chọn), 6 nhóm động từ theo bổ ngữ, quy tắc vàng sắp xếp trật tự Dativ/Akkusativ khi có đại từ và cách đặt câu hỏi với giới từ.",
    sections: [
      {
        id: "ergaenzung-vs-angabe",
        heading: "1. Bổ ngữ (Ergänzung) vs Thông tin thêm (Angabe)",
        blocks: [
          {
            type: "text",
            content:
              "**Ergänzungen** là những thành phần mà động từ **bắt buộc phải có** để câu đủ nghĩa (VD: *Der Mann gibt dem Kind den Ball*). **Angaben** là thông tin phụ có thể lược bỏ (VD: *jetzt, heute, per Post*). Động từ quyết định loại bổ ngữ đi kèm nó:",
          },
          {
            type: "table",
            caption: "6 nhóm động từ theo Bổ ngữ (Ergänzungen)",
            headers: ["Nhóm động từ", "Động từ tiêu biểu", "Ví dụ & Lưu ý đặc biệt"],
            rows: [
              ["**1. Hai Nominativ**", "*sein, werden, bleiben, heißen*", "*Mein Sohn wird {nom:ein Pilot}.*\n*(Ngoại lệ: đi với đơn vị đo lường/thời gian dùng Akk: Der Schrank ist {akk:einen Meter} hoch.)*"],
              ["**2. Akkusativ** *(và 5 động từ Akk kép)*", "Đa số động từ (*besuchen, kennen, kaufen...*)\n**5 động từ 2 Akk:** *abfragen, abhören, lehren, nennen, kosten*", "*Er besucht {akk:seine Eltern}.*\n*Der Apfel kostet {akk:mich} {akk:einen Euro}.*"],
              ["**3. Dativ**", "*helfen, antworten, danken, gehören, gefallen, glauben, passen, schmecken, zuhören*", "*Sie antwortet {dat:ihrem Vater}.* *(Bắt buộc học thuộc danh sách Dativverben!)*"],
              ["**4. Dativ + Akkusativ**", "Động từ cho/tặng/gửi/nói: *geben, schenken, schicken, schreiben, zeigen, erklären, bringen*", "*Der Mann gibt {dat:dem Kind} {akk:den Ball}.* (Người nhận = Dat, Vật = Akk)"],
              ["**5. Genitiv** *(chủ yếu văn trang trọng/pháp lý)*", "*gedenken, bedürfen; sich erinnern/schämen; anklagen, beschuldigen, verdächtigen, bezichtigen, überführen*", "*Man klagt {akk:ihn} {gen:der Korruption} an.* *(Phần lớn các động từ khác ngoài pháp lý có thể thay bằng giới từ, VD: sich erinnern an + Akk.)*"],
              ["**6. Bổ ngữ Giới từ** *(Präpositionalergänzung)*", "*sich interessieren für (Akk), warten auf (Akk), denken an (Akk), sprechen mit (Dat) über (Akk), sich bedanken bei (Dat) für (Akk)*", "*Ich interessiere mich **für** {akk:das neue Handy}.*\n*Er bedankt sich **bei** {dat:ihr} **für** {akk:das Geschenk}.*"],
            ],
          },
        ],
      },
      {
        id: "trat-tu-dativ-akkusativ",
        heading: "2. Quy tắc vàng trật tự từ giữa Dativ và Akkusativ!",
        blocks: [
          {
            type: "table",
            caption: "3 quy tắc sắp xếp Dativ & Akkusativ trong câu (Cực hay thi A2–B1!)",
            headers: ["Trường hợp", "Thứ tự chuẩn", "Ví dụ (geben: seiner Tochter / das Buch)"],
            rows: [
              ["**Cả 2 đều là DANH TỪ**", "**Dativ** đứng TRƯỚC **Akkusativ**", "Der Mann gibt **{dat:seiner Tochter}** **{akk:das Buch}**."],
              ["**1 cái là ĐẠI TỪ, 1 cái là DANH TỪ**", "**Đại từ** LUÔN đứng TRƯỚC **Danh từ**", "Der Mann gibt **{dat:ihr}** {akk:das Buch}.\nDer Mann gibt **{akk:es}** {dat:seiner Tochter}."],
              ["**Cả 2 đều là ĐẠI TỪ** ★", "**Akkusativ** đứng TRƯỚC **Dativ** *(ngược lại!)*", "Der Mann gibt **{akk:es}** **{dat:ihr}**."],
            ],
          },
        ],
      },
      {
        id: "cau-hoi-gioi-tu",
        heading: "3. Đặt câu hỏi cho Động từ đi với Giới từ",
        blocks: [
          {
            type: "compare",
            leftTitle: "Hỏi về NGƯỜI: Giới từ + wen (Akk) / wem (Dat)",
            leftItems: [
              "***Auf wen** warten wir?* (warten auf + Akk)",
              "***An wen** denkst du?* (denken an + Akk)",
              "***Mit wem** redet er?* (reden mit + Dat)",
            ],
            rightTitle: "Hỏi về VẬT / VIỆC: wo + (r) + Giới từ",
            rightItems: [
              "***Wovon** träumst du?* (von → bắt đầu bằng phụ âm)",
              "***Womit** machst du die Flasche auf?* (mit)",
              "***Woran** denkst du? / **Worauf** wartest du?* (giới từ bắt đầu bằng nguyên âm *a, e, i, o, u* → chèn thêm **-r-**!)",
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Trật tự Dativ & Akkusativ: 2 danh từ → Dat trước Akk; 1 đại từ → đại từ lên trước; 2 đại từ → Akk trước Dat (Er gibt es ihr).",
      "Hỏi cho động từ có giới từ: hỏi Người dùng „Giới từ + wen/wem“; hỏi Vật dùng „wo(r) + Giới từ“ (thêm -r- trước nguyên âm).",
    ],
    quiz: [
      {
        question: "Thay cả „seiner Tochter“ và „das Buch“ bằng đại từ trong „Er gibt seiner Tochter das Buch.“:",
        options: ["Er gibt ihr es.", "Er gibt es ihr.", "Er gibt sie ihm."],
        answer: 1,
        explanation: "Khi cả 2 tân ngữ đều là đại từ, Akkusativ (es) phải đứng TRƯỚC Dativ (ihr) → Er gibt es ihr.",
      },
      {
        question: "Đặt câu hỏi cho vật được gạch chân: „Ich warte auf den Bus.“ (warten auf + Akk)",
        options: ["Auf was wartest du?", "Worauf wartest du?", "Wofür wartest du?"],
        answer: 1,
        explanation: "Hỏi về vật với giới từ „auf“ (bắt đầu bằng nguyên âm a): wo + r + auf = Worauf wartest du?",
      },
    ],
  },
];
