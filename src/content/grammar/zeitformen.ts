import type { GrammarLesson } from "./types";

export const ZEITFORMEN_LESSONS: GrammarLesson[] = [
  {
    slug: "thi-hien-tai-praesens",
    categoryId: "zeitformen",
    order: 1,
    code: "Z1",
    title: "Thì hiện tại (Präsens): Cách chia, Cách dùng & „gerade“",
    germanTitle: "Das Präsens & Verwendung",
    level: "A1",
    summary: "Cách chia động từ quy tắc, động từ mạnh, bất quy tắc, 3 ngoại lệ chính tả (-d/-t, -s/-ß/-x/-z, -eln/-ern), 5 cách dùng Präsens và cách nói „đang làm gì“ với „gerade“.",
    sections: [
      {
        id: "chia-praesens",
        heading: "1. Chia động từ ở thì hiện tại (Präsens)",
        blocks: [
          {
            type: "text",
            content:
              "Ở dạng nguyên thể (Infinitiv), **100% động từ tiếng Đức kết thúc bằng -en hoặc -n** (*kaufen, gehen, sein, sammeln*) — không có ngoại lệ! Để chia theo ngôi, ta bỏ *-en* lấy thân động từ rồi gắn bộ đuôi chuẩn **-e, -st, -t, -en, -t, -en**.",
          },
          {
            type: "table",
            caption: "Bộ đuôi chuẩn & 3 động từ bất quy tắc quan trọng nhất",
            headers: ["Ngôi", "Đuôi chuẩn (spielen)", "sein (là)", "haben (có)", "werden (trở thành)"],
            rows: [
              ["ich", "spiel**e**", "**bin**", "habe", "werde"],
              ["du", "spiel**st**", "**bist**", "**hast**", "**wirst**"],
              ["er / sie / es / man", "spiel**t**", "**ist**", "**hat**", "**wird**"],
              ["wir", "spiel**en**", "**sind**", "haben", "werden"],
              ["ihr", "spiel**t**", "**seid**", "habt", "werdet"],
              ["sie / Sie", "spiel**en**", "**sind**", "haben", "werden"],
            ],
          },
          {
            type: "table",
            caption: "3 lưu ý chính tả khi gắn đuôi ở Präsens",
            headers: ["Dạng thân động từ", "Quy tắc", "Ví dụ"],
            rows: [
              ["Thân kết thúc bằng **-d** hoặc **-t**", "Chèn thêm **-e-** trước đuôi *-st* và *-t* *(trừ động từ đổi nguyên âm như laden → lädst, halten → hältst)*", "arbeiten → du arbeit**est**, er arbeit**et**, ihr arbeit**et**"],
              ["Thân kết thúc bằng **-s, -ß, -x, -z**", "Bỏ chữ **-s-** ở ngôi **du** (chỉ gắn **-t**)", "heißen → du heiß**t** · tanzen → du tanz**t**"],
              ["Nguyên thể đuôi **-eln / -ern**", "Chỉ bỏ **-n** (nên wir/sie cũng chỉ có *-n*); với *-eln* ở ngôi **ich** bỏ *e* trước *l*", "sammeln → ich samm**le**, wir sammel**n** · wandern → ich wander**e**, wir wander**n**"],
            ],
          },
        ],
      },
      {
        id: "cach-dung-praesens",
        heading: "2. Năm cách dùng của Präsens & Cách diễn đạt „đang xảy ra“",
        blocks: [
          {
            type: "list",
            title: "Präsens là thì dùng nhiều nhất tiếng Đức — dùng cho cả Hiện tại lẫn Tương lai!",
            items: [
              "**1. Sự thật / trạng thái ở hiện tại:** *Das ist Jan. Er sitzt auf dem Sofa.*",
              "**2. Thói quen / hành động lặp lại (hoặc không bao giờ làm):** *Jeden Sonntag spielt er Fußball. Montags macht er nie Sport.*",
              "**3. Chân lý / điều đúng lâu dài:** *Ich komme aus Vietnam. Wasser kocht bei 100 Grad.*",
              "**4. Hành động bắt đầu trong quá khứ và VẪN đang tiếp diễn (với *seit*):** *Seit 10 Jahren spielt er Fußball.* (Tiếng Anh dùng Present Perfect, tiếng Đức dùng **Präsens**!).",
              "**5. Kế hoạch TƯƠNG LAI đã định sẵn (có trạng từ thời gian):** ***Morgen gehe** ich ins Kino.* · ***Am Sonntag hat** er ein wichtiges Spiel.*",
            ],
          },
          {
            type: "tip",
            variant: "tip",
            title: "Tiếng Đức KHÔNG có thì Hiện tại tiếp diễn (-ing)!",
            content:
              "Về ngữ pháp, **Präsens đơn đã đủ** để diễn tả việc đang xảy ra lúc này (*Ich arbeite* = Tôi làm việc / Tôi đang làm việc). Nếu muốn nhấn mạnh „ngay lúc này“, chỉ cần thêm trạng từ **gerade** sau động từ chia: *Ich arbeite **gerade*** · *Wir lernen **gerade** Deutsch.*",
          },
        ],
      },
    ],
    keyPoints: [
      "Đuôi chia Präsens chuẩn: ich -e, du -st, er/sie/es -t, wir -en, ihr -t, sie/Sie -en.",
      "Nhớ 3 ngoại lệ chính tả: thân -d/-t thêm -e- (arbeitest); thân -s/-ß/-x/-z bỏ s ở ngôi du (du heißt); đuôi -eln/-ern chỉ bỏ -n.",
      "Präsens còn dùng cho hành động từ quá khứ đến hiện tại (với „seit“) và kế hoạch tương lai chắc chắn.",
      "Thêm „gerade“ sau động từ chia để nhấn mạnh „đang làm ngay lúc này“.",
    ],
    quiz: [
      {
        question: "Chia đúng động từ „heißen“ ở ngôi „du“:",
        options: ["du heißst", "du heißt", "du heißest"],
        answer: 1,
        explanation: "Thân động từ kết thúc bằng -ß nên ngôi „du“ lược bỏ chữ s của đuôi -st → du heißt.",
      },
      {
        question: "Câu nào diễn tả đúng „Tôi đã sống ở Đức được 3 năm rồi (và vẫn đang sống)“?",
        options: [
          "Ich wohne seit 3 Jahren in Deutschland.",
          "Ich habe seit 3 Jahren in Deutschland gewohnt.",
          "Ich werde seit 3 Jahren in Deutschland wohnen.",
        ],
        answer: 0,
        explanation: "Hành động bắt đầu trong quá khứ và vẫn tiếp diễn ở hiện tại (đi với „seit“) dùng thì Präsens.",
      },
    ],
  },
  {
    slug: "thi-tuong-lai-1-futur-1",
    categoryId: "zeitformen",
    order: 2,
    code: "Z2",
    title: "Thì tương lai 1 (Futur 1) vs Dùng Präsens nói tương lai",
    germanTitle: "Das Futur 1",
    level: "A2",
    summary: "Công thức werden + Infinitiv, vị trí khung câu và điểm khác biệt sắc thái giữa dùng Präsens (kế hoạch chắc chắn) vs Futur 1 (dự định, dự báo, phỏng đoán).",
    sections: [
      {
        id: "cong-thuc-futur-1",
        heading: "1. Công thức & Trật tự từ của Futur 1",
        blocks: [
          {
            type: "rule",
            title: "Công thức Futur 1",
            formula: "werden (chia theo ngôi ở Vị trí 2)  +  ...  +  Động từ nguyên thể (Infinitiv ở CUỐI câu)",
            note: "Chia „werden“: ich werde · du wirst · er/sie/es wird · wir werden · ihr werdet · sie/Sie werden.",
          },
          {
            type: "examples",
            title: "Ví dụ vị trí từ trong câu trần thuật & câu hỏi",
            items: [
              { de: "Wir **werden** nächstes Jahr ein neues Auto **kaufen**.", vi: "Năm sau chúng tôi sẽ mua một chiếc ô tô mới." },
              { de: "**Wird** er morgen mit dir **tanzen**?", vi: "Ngày mai anh ấy có nhảy với bạn không?", note: "Câu hỏi Có/Không: „wird“ lên Vị trí 1, Infinitiv vẫn ở cuối." },
              { de: "Es **wird** morgen wahrscheinlich **regnen**.", vi: "Ngày mai có lẽ trời sẽ mưa." },
            ],
          },
        ],
      },
      {
        id: "praesens-hay-futur-1",
        heading: "2. Khi nào nói tương lai bằng Präsens, khi nào dùng Futur 1?",
        blocks: [
          {
            type: "compare",
            leftTitle: "Präsens + Thời gian (Chắc chắn / Đã lên lịch)",
            leftItems: [
              "Rất phổ biến trong văn nói hàng ngày khi việc đó **đã được lên kế hoạch rõ ràng** (phải có từ chỉ thời gian).",
              "*Ich **fliege** nächstes Jahr nach Italien.* (Kế hoạch chắc chắn, có thể đã đặt vé rồi!)",
              "*Wir **kaufen** nächsten Monat ein neues Auto.*",
            ],
            rightTitle: "Futur 1 (Dự định / Dự báo / Phỏng đoán chưa chắc)",
            rightItems: [
              "Diễn tả **ý định chung chung**, **dự báo thời tiết**, **lời hứa** hoặc **phỏng đoán** (chưa chắc 100%).",
              "*Ich **werde** nach Italien **fliegen**.* (Ý định một lúc nào đó sẽ bay, chưa đặt vé.)",
              "*Er **wird** wohl krank **sein**.* (Phỏng đoán ở hiện tại: Chắc là anh ấy bị ốm.)",
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Futur 1 = werden (Vị trí 2) + Infinitiv (cuối câu).",
      "Kế hoạch chắc chắn có mốc thời gian cụ thể → người Đức ưu tiên dùng Präsens.",
      "Dự định chưa chốt lịch, lời hứa, dự báo hoặc phỏng đoán → dùng Futur 1.",
    ],
    quiz: [
      {
        question: "Hoàn thành câu Futur 1: „Du ___ die Prüfung bestimmt ___.“ (bestehen)",
        options: ["werdest / bestanden", "wirst / bestehen", "wird / bestehen"],
        answer: 1,
        explanation: "„werden“ chia ngôi „du“ là „wirst“ + nguyên thể „bestehen“ ở cuối câu.",
      },
    ],
  },
  {
    slug: "thi-qua-khu-perfekt",
    categoryId: "zeitformen",
    order: 3,
    code: "Z3",
    title: "Thì quá khứ hoàn thành (Perfekt): haben hay sein?",
    germanTitle: "Das Perfekt",
    level: "A1",
    summary: "Thì quá khứ quan trọng nhất trong giao tiếp tiếng Đức: công thức haben/sein + Partizip 2, quy tắc chọn sein hay haben không bao giờ nhầm và vị trí từ.",
    sections: [
      {
        id: "cong-thuc-perfekt",
        heading: "1. Công thức Perfekt & Vai trò trong giao tiếp",
        blocks: [
          {
            type: "text",
            content:
              "**Perfekt** diễn tả một hành động đã hoàn thành trong quá khứ. Trong **văn nói hàng ngày và email/tin nhắn thân mật**, người Đức dùng Perfekt cho gần như mọi động từ (trừ *sein, haben, werden* và các *Modalverben*).",
          },
          {
            type: "rule",
            title: "Công thức Perfekt (Tạo khung câu)",
            formula: "haben / sein (chia ở Vị trí 2)  +  ...  +  Partizip 2 (ở CUỐI câu, không đổi)",
          },
        ],
      },
      {
        id: "chon-sein-hay-haben",
        heading: "2. Quy tắc chọn trợ động từ „sein“ hay „haben“",
        blocks: [
          {
            type: "compare",
            leftTitle: "Dùng „sein“ (Chỉ 3 nhóm này!)",
            leftItems: [
              "**1. Di chuyển thay đổi vị trí từ A → B (của chủ ngữ):** *gehen, fahren, fliegen, laufen, kommen, reisen, schwimmen...* (*Ich **bin** nach Hause **gegangen**.*)",
              "**2. Thay đổi trạng thái (của chủ ngữ):** *einschlafen* (tỉnh → ngủ), *aufwachen* (ngủ → tỉnh), *sterben* (sống → chết), *wachsen* (lớn lên), *passieren* (xảy ra).",
              "**3. Ba động từ đặc biệt:** **sein** (*bin gewesen*), **werden** (*bin geworden*), **bleiben** (*bin geblieben*).",
            ],
            rightTitle: "Dùng „haben“ (Mọi trường hợp còn lại)",
            rightItems: [
              "Mọi động từ có tân ngữ Akkusativ hoặc không đổi vị trí/trạng thái: *kochen, kaufen, arbeiten, schlafen, lesen, sehen...*",
              "**100% động từ phản thân (Reflexive Verben)** LUÔN dùng *haben* — kể cả khi có thay đổi cảm xúc/trạng thái! (*Max **hat** sich in Anna **verliebt**.*)",
            ],
          },
          {
            type: "table",
            caption: "Vị trí từ của Perfekt trong 3 kiểu câu",
            headers: ["Loại câu", "Ví dụ"],
            rows: [
              ["**Câu trần thuật (HS)**", "Er **hat** gestern Essen **gekocht**."],
              ["**Câu hỏi Có/Không**", "**Habt** ihr den Mann **gesehen**?"],
              ["**Mệnh đề phụ (NS)**", "Habt ihr gesehen, wann er nach Hause **gegangen ist**? *(Trợ động từ đứng cuối cùng!)*"],
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Perfekt = haben/sein (Vị trí 2) + Partizip 2 (cuối câu).",
      "Chọn „sein“ cho: chuyển động từ A → B, thay đổi trạng thái, và 3 động từ sein / werden / bleiben.",
      "Chọn „haben“ cho mọi động từ còn lại và 100% động từ phản thân.",
    ],
    quiz: [
      {
        question: "Chọn câu Perfekt đúng với động từ „bleiben“ (ở lại):",
        options: ["Wir haben zu Hause geblieben.", "Wir sind zu Hause geblieben.", "Wir sind zu Hause bleiben."],
        answer: 1,
        explanation: "3 động từ „sein, werden, bleiben“ LUÔN dùng trợ động từ „sein“ ở Perfekt → Wir sind zu Hause geblieben.",
      },
      {
        question: "Chọn câu Perfekt đúng với động từ phản thân „sich freuen“:",
        options: ["Er ist sich sehr gefreut.", "Er hat sich sehr gefreut.", "Er hat sich sehr freuen."],
        answer: 1,
        explanation: "Tất cả động từ phản thân luôn chia Perfekt với „haben“ → Er hat sich sehr gefreut.",
      },
    ],
  },
  {
    slug: "thi-qua-khu-praeteritum-va-so-sanh-perfekt",
    categoryId: "zeitformen",
    order: 4,
    code: "Z4",
    title: "Thì quá khứ đơn (Präteritum) & Phân biệt Perfekt vs Präteritum",
    germanTitle: "Das Präteritum — Perfekt oder Präteritum?",
    level: "A2",
    summary: "Cách chia Präteritum quy tắc & bất quy tắc, sự thật bất ngờ về nghĩa của Perfekt vs Präteritum và quy tắc chọn dạng tự nhiên nhất trong giao tiếp lẫn văn viết.",
    sections: [
      {
        id: "chia-praeteritum",
        heading: "1. Cách chia Präteritum (Động từ quy tắc & bất quy tắc)",
        blocks: [
          {
            type: "table",
            caption: "Chia Präteritum: Lưu ý QUAN TRỌNG — Ngôi „ich“ và „er/sie/es“ LUÔN GIỐNG NHAU 100%!",
            headers: ["Ngôi", "Quy tắc (kaufen: -te)", "Gốc -d/-t (arbeiten: -ete)", "sein", "haben", "Bất quy tắc (schlafen)"],
            rows: [
              ["**ich** ★", "kauf**te**", "arbeit**ete**", "**war**", "**hatte**", "**schlief**"],
              ["du", "kauf**test**", "arbeit**etest**", "war**st**", "hatt**est**", "schlief**st**"],
              ["**er/sie/es** ★", "kauf**te**", "arbeit**ete**", "**war**", "**hatte**", "**schlief**"],
              ["wir", "kauf**ten**", "arbeit**eten**", "war**en**", "hatt**en**", "schlief**en**"],
              ["ihr", "kauf**tet**", "arbeit**etet**", "war**t**", "hatt**et**", "schlief**t**"],
              ["sie / Sie", "kauf**ten**", "arbeit**eten**", "war**en**", "hatt**en**", "schlief**en**"],
            ],
          },
          {
            type: "tip",
            variant: "note",
            title: "Động từ bất quy tắc ở Präteritum",
            content:
              "Động từ mạnh/bất quy tắc đổi nguyên âm gốc (như *gehen → ging, essen → aß, sehen → sah*) và **không có đuôi** ở ngôi *ich* & *er/sie/es*. Khoảng 50% động từ thông dụng là bất quy tắc ở Präteritum nên cần học bảng 3 cột (*Infinitiv – Präteritum – Partizip 2*).",
          },
        ],
      },
      {
        id: "perfekt-hay-praeteritum",
        heading: "2. Perfekt hay Präteritum? Khác nhau ở đâu?",
        blocks: [
          {
            type: "rule",
            title: "Sự thật quan trọng nhất: KHÔNG KHÁC NHAU VỀ Ý NGHĨA!",
            formula: "„Ich war im Kino.“  =  „Ich bin im Kino gewesen.“  (Nghĩa giống hệt nhau — chỉ khác NGỮ CẢNH nói hay viết!)",
            note: "Khác với tiếng Anh (Past Simple vs Present Perfect khác nghĩa), tiếng Đức chỉ chọn Perfekt hay Präteritum theo phong cách giao tiếp.",
          },
          {
            type: "compare",
            leftTitle: "Khi nào dùng PRÄTERITUM?",
            leftItems: [
              "**Văn viết trang trọng:** Báo chí, tin tức thời sự, sách truyện, báo cáo, thư hành chính gửi cơ quan/công ty.",
              "**Trong văn nói CHỈ dùng cho:**\n• **sein** (*war*), **haben** (*hatte*), **werden** (*wurde*)\n• **6 Modalverben** (*musste, konnte, wollte, durfte, sollte*) — đừng bao giờ nói Modalverb ở Perfekt!\n• Ở miền Bắc Đức đôi khi dùng thêm *wusste, dachte, kannte, gab (es gab)*.",
            ],
            rightTitle: "Khi nào dùng PERFEKT?",
            rightItems: [
              "**Trong hội thoại hàng ngày** (95% động từ thường!).",
              "**Trong tin nhắn, thư cá nhân, email thân mật.**",
              "Nếu bạn lạm dụng Präteritum khi nói chuyện đời thường (*Ich aß, ich kaufte, ich schlief*), nghe sẽ cứng nhắc như robot hoặc sách cổ (nhất là ở miền Nam Đức, Áo, Thụy Sĩ — tiếng Đức Thụy Sĩ thậm chí không dùng Präteritum!).",
            ],
          },
          {
            type: "tip",
            variant: "tip",
            title: "Quy tắc sinh tồn khi không chắc chắn",
            content:
              "Modalverb + sein/haben/werden → dùng **Präteritum**. Mọi động từ còn lại trong giao tiếp → dùng **Perfekt**!",
          },
        ],
      },
    ],
    keyPoints: [
      "Trong Präteritum, ngôi 1 số ít (ich) và ngôi 3 số ít (er/sie/es) LUÔN viết giống hệt nhau.",
      "Perfekt và Präteritum không khác nhau về ý nghĩa thời gian — chỉ khác về ngữ cảnh (nói vs viết).",
      "Trong văn nói: dùng Präteritum cho sein, haben, werden và 6 Modalverben; dùng Perfekt cho tất cả động từ còn lại.",
    ],
    quiz: [
      {
        question: "Trong văn nói hàng ngày, câu nào tự nhiên nhất cho „Hôm qua tôi đã phải làm việc“?",
        options: [
          "Gestern habe ich arbeiten müssen.",
          "Gestern musste ich arbeiten.",
          "Gestern muss ich gearbeitet.",
        ],
        answer: 1,
        explanation: "Modalverben (müssen, können, wollen, dürfen, sollen) trong giao tiếp luôn được dùng ở Präteritum (musste) cho gọn và tránh lỗi trật tự từ.",
      },
      {
        question: "Chia Präteritum của động từ quy tắc „arbeiten“ ở ngôi „er“:",
        options: ["er arbeitte", "er arbeitete", "er arbeitet"],
        answer: 1,
        explanation: "Thân động từ kết thúc bằng -t nên thêm -e- trước đuôi -te → er arbeitete.",
      },
    ],
  },
  {
    slug: "thi-qua-khu-tien-hoan-thanh-plusquamperfekt",
    categoryId: "zeitformen",
    order: 5,
    code: "Z5",
    title: "Thì quá khứ tiền hoàn thành (Plusquamperfekt)",
    germanTitle: "Das Plusquamperfekt (Vorvergangenheit)",
    level: "B1",
    summary: "Diễn tả hành động xảy ra TRƯỚC một hành động quá khứ khác: công thức war/hatte + Partizip 2, trục thời gian và 3 từ khóa nhận diện (nachdem, bevor, als).",
    sections: [
      {
        id: "cong-thuc-plusquamperfekt",
        heading: "1. Khái niệm & Công thức Plusquamperfekt",
        blocks: [
          {
            type: "text",
            content:
              "**Plusquamperfekt** (tiền quá khứ — tương đương Past Perfect trong tiếng Anh) diễn tả một sự việc **đã xảy ra trước** một sự việc khác trong quá khứ.\n\n**Trục thời gian:** *Event 1 (Plusquamperfekt)* → *Event 2 (Perfekt / Präteritum)* → *Hiện tại (Präsens)*.",
          },
          {
            type: "rule",
            title: "Công thức Plusquamperfekt",
            formula: "hatte / war (Präteritum của haben/sein, chia theo ngôi)  +  ...  +  Partizip 2 (cuối câu)",
            note: "Quy tắc chọn „war“ hay „hatte“ giống hệt 100% quy tắc chọn „sein“ hay „haben“ ở Perfekt!",
          },
          {
            type: "table",
            caption: "Bảng chia Plusquamperfekt với „laufen“ (dùng war) và „kochen“ (dùng hatte)",
            headers: ["Ngôi", "với sein (war...)", "với haben (hatte...)"],
            rows: [
              ["ich / er / sie / es", "**war** gelaufen", "**hatte** gekocht"],
              ["du", "**warst** gelaufen", "**hattest** gekocht"],
              ["wir / sie / Sie", "**waren** gelaufen", "**hatten** gekocht"],
              ["ihr", "**wart** gelaufen", "**hattet** gekocht"],
            ],
          },
        ],
      },
      {
        id: "tu-khoa-va-luu-y",
        heading: "2. Ba từ khóa nhận diện & Lưu ý thi B1/B2",
        blocks: [
          {
            type: "examples",
            title: "3 liên từ thường kéo theo Plusquamperfekt",
            items: [
              { de: "**Nachdem** er die Prüfung **bestanden hatte**, hat er gefeiert.", vi: "Sau khi đã đỗ kỳ thi, anh ấy đã ăn mừng.", note: "Đỗ thi (Event 1 → Plusquamperfekt) trước khi ăn mừng (Event 2 → Perfekt)." },
              { de: "**Bevor** ich das Auto gekauft habe, **hatte** ich lange **gespart**.", vi: "Trước khi mua xe, tôi đã tiết kiệm rất lâu.", note: "Tiết kiệm (Event 1 → Plusquamperfekt) trước khi mua xe." },
              { de: "**Als** ich ankam, **waren** alle schon **gegangen**.", vi: "Khi tôi tới nơi thì mọi người đã về hết rồi.", note: "Mọi người đã về (Event 1 → Plusquamperfekt) trước lúc tôi đến." },
            ],
          },
          {
            type: "tip",
            variant: "warning",
            title: "Khẩu ngữ vs Kỳ thi B1–B2",
            content:
              "Trong giao tiếp hàng ngày, người Đức đôi khi nói tắt cả 2 vế bằng Perfekt, nhưng **trong kỳ thi B1/B2 (đặc biệt với „nachdem“)**, việc dùng đúng Plusquamperfekt cho hành động xảy ra trước là bắt buộc để không bị trừ điểm ngữ pháp!",
          },
        ],
      },
    ],
    keyPoints: [
      "Plusquamperfekt = hatte / war + Partizip 2.",
      "Dùng cho hành động xảy ra TRƯỚC một hành động khác trong quá khứ.",
      "Thường gặp nhất đi cùng liên từ „nachdem“, „bevor“ và „als“.",
    ],
    quiz: [
      {
        question: "Hoàn thành câu: „Nachdem wir gegessen ___, gingen wir spazieren.“",
        options: ["haben", "hatten", "waren"],
        answer: 1,
        explanation: "Vế chính ở Präteritum (gingen) → hành động ăn trước đó ở vế „nachdem“ phải dùng Plusquamperfekt (essen dùng haben → hatten).",
      },
    ],
  },
  {
    slug: "thi-tuong-lai-2-futur-2",
    categoryId: "zeitformen",
    order: 6,
    code: "Z6",
    title: "Thì tương lai 2 (Futur 2)",
    germanTitle: "Das Futur 2",
    level: "B2",
    summary: "Cách dùng Futur 2 để phỏng đoán việc sẽ hoàn thành trong tương lai hoặc việc chắc là đã xảy ra trong quá khứ, kèm công thức 3 thành phần.",
    sections: [
      {
        id: "cong-thuc-futur-2",
        heading: "1. Công thức & Vị trí từ của Futur 2",
        blocks: [
          {
            type: "rule",
            title: "Công thức Futur 2 (3 động từ!)",
            formula: "werden (chia ở Vị trí 2)  +  ...  +  Partizip 2  +  haben / sein (nguyên thể ở CUỐI câu)",
            note: "Quy tắc chọn „haben“ hay „sein“ ở cuối giống hệt Perfekt (chuyển động / đổi trạng thái / bị động trạng thái dùng „sein“).",
          },
          {
            type: "table",
            caption: "Vị trí từ trong câu trần thuật & câu hỏi Futur 2",
            headers: ["Loại câu", "Vị trí 1", "Vị trí 2", "Giữa câu", "Cuối câu (P2 + haben/sein)"],
            rows: [
              ["Trần thuật", "Du", "**wirst**", "die Prüfung", "**bestanden haben**."],
              ["Câu hỏi", "**Wirst**", "du", "die Prüfung", "**bestanden haben**?"],
            ],
          },
        ],
      },
      {
        id: "hai-cach-dung-futur-2",
        heading: "2. Hai cách dùng chính của Futur 2",
        blocks: [
          {
            type: "compare",
            leftTitle: "1. Phỏng đoán việc SẼ HOÀN THÀNH trong tương lai",
            leftItems: [
              "Đứng ở một mốc tương lai nhìn lại, việc đó nhiều khả năng đã xong.",
              "*Das Auto **wird** morgen **repariert sein**.* (Ngày mai xe chắc sẽ được sửa xong.)",
              "*In einer Stunde **wird** er **angekommen sein**.* (Một tiếng nữa anh ấy chắc sẽ tới nơi.)",
            ],
            rightTitle: "2. Phỏng đoán về một việc ĐÃ XẢY RA trong quá khứ",
            rightItems: [
              "Rất hay đi kèm từ **wohl** („chắc là / có lẽ đã...“).",
              "*Er **wird** wohl den Bus **verpasst haben**.* (Chắc là anh ấy đã lỡ xe buýt rồi.)",
              "*Er **wird** **hingefallen sein**.* (Chắc là cậu ấy đã bị ngã.)",
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Futur 2 = werden (chia) + ... + Partizip 2 + haben/sein.",
      "Dùng cho 2 tình huống: (1) phỏng đoán việc sẽ hoàn tất vào 1 mốc tương lai, và (2) phỏng đoán việc đã xảy ra trong quá khứ (thường kèm „wohl“).",
    ],
    quiz: [
      {
        question: "Chọn câu Futur 2 đúng (phỏng đoán: „Chắc là cô ấy đã quên chìa khóa rồi“ — vergessen):",
        options: [
          "Sie wird wohl den Schlüssel vergessen sein.",
          "Sie wird wohl den Schlüssel vergessen haben.",
          "Sie hat wohl den Schlüssel vergessen werden.",
        ],
        answer: 1,
        explanation: "„vergessen“ đi với „haben“ → werden (wird) + Partizip 2 (vergessen) + haben ở cuối câu.",
      },
    ],
  },
];
