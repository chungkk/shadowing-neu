import type { GrammarLesson } from "./types";

export const PRAEPOSITIONEN_LESSONS: GrammarLesson[] = [
  {
    slug: "tong-quan-gioi-tu-va-gop-mao-tu",
    categoryId: "praepositionen",
    order: 1,
    code: "P1",
    title: "Tổng quan Giới từ & Quy tắc gộp Giới từ với Mạo từ",
    germanTitle: "Präpositionen im Allgemeinen & Verschmelzung",
    level: "A1",
    summary: "4 nhóm giới từ, nguyên tắc quyền lực „Giới từ luôn quyết định Cách“ và bảng gộp chuẩn (am, im, zum, zur...) phân biệt với dạng khẩu ngữ.",
    sections: [
      {
        id: "bon-nhom-gioi-tu",
        heading: "1. Khái niệm & 4 nhóm giới từ chính",
        blocks: [
          {
            type: "text",
            content:
              "Giới từ (Präpositionen / Verhältniswörter) là từ bất biến đứng trước danh từ hoặc đại từ để tạo mối quan hệ về **nơi chốn, thời gian, cách thức hoặc nguyên nhân**. Không thể dịch máy móc 1-1 từ tiếng Việt hay tiếng Anh sang tiếng Đức — hãy học theo **tình huống sử dụng**.",
          },
          {
            type: "table",
            caption: "4 nhóm ý nghĩa của giới từ",
            headers: ["Nhóm", "Ý nghĩa", "Ví dụ"],
            rows: [
              ["**Lokal** (Nơi chốn)", "Vị trí / hướng di chuyển", "*Ich komme **aus** Deutschland.*"],
              ["**Temporal** (Thời gian)", "Thời điểm / khoảng thời gian", "*Ich komme **um** 5 Uhr.*"],
              ["**Modal** (Cách thức)", "Trả lời *Wie?* (bằng cách nào)", "*Ich komme **mit** {dat:dem Auto}.*"],
              ["**Kausal** (Nguyên nhân)", "Lý do / mục đích", "*Ich komme **wegen** {gen:des Termins}.*"],
            ],
          },
          {
            type: "rule",
            title: "Nguyên tắc tối thượng của Giới từ",
            formula: "Giới từ LUÔN quyết định Cách của danh từ đứng ngay sau nó — bất kể động từ trong câu muốn Cách gì!",
            note: "VD: „Ich komme aus dem Haus“ (aus → Dativ) · „Ich fahre durch den Tunnel“ (durch → Akkusativ).",
          },
        ],
      },
      {
        id: "gop-gioi-tu-mao-tu",
        heading: "2. Gộp Giới từ với Mạo từ xác định (Verschmelzung)",
        blocks: [
          {
            type: "compare",
            leftTitle: "8 cặp NÊN LUÔN GỘP (Chuẩn ngữ pháp & văn viết)",
            leftItems: [
              "an + dem = **am** · an + das = **ans**",
              "bei + dem = **beim**",
              "in + dem = **im** · in + das = **ins**",
              "von + dem = **vom**",
              "zu + dem = **zum** · zu + der = **zur**",
            ],
            rightTitle: "Các cặp chỉ dùng trong KHẨU NGỮ (viết chuẩn phải tách)",
            rightItems: [
              "auf + das = *aufs* · auf + dem = *aufm*",
              "für + das = *fürs* · durch + das = *durchs* · um + das = *ums*",
              "hinter/über/vor + dem = *hinterm, überm, vorm*",
              "hinter/über/vor + das = *hinters, übers, vors*",
            ],
          },
          {
            type: "tip",
            variant: "note",
            title: "Khi nào tách „in dem“ hay „zu dem“ ra?",
            content:
              "Bình thường luôn nói *Ich gehe **zum** Bahnhof* / *Ich bin **im** Bahnhof*. Khi bạn cố tình tách ra (*Ich gehe **zu dem** Bahnhof*), từ „dem“ lúc đó mang nghĩa **đại từ chỉ định nhấn mạnh** (= *zu **diesem** Bahnhof* — chính cái nhà ga đó!).",
          },
        ],
      },
    ],
    keyPoints: [
      "Giới từ bất biến và luôn là yếu tố quyết định Cách của danh từ đi sau.",
      "8 dạng gộp chuẩn cần dùng tự nhiên: am, ans, beim, im, ins, vom, zum, zur.",
      "Các dạng fürs, aufs, durchs, vorm... phổ biến khi nói nhưng trong văn viết chuẩn nên tách ra.",
    ],
    quiz: [
      {
        question: "Dạng gộp đúng của „zu + der“ (VD: đi đến trường — die Schule) là gì?",
        options: ["zum", "zur", "zuer"],
        answer: 1,
        explanation: "zu + der = zur (Ich gehe zur Schule). Còn zu + dem = zum.",
      },
      {
        question: "Dạng gộp chuẩn của „in + das“ (VD: đi vào rạp chiếu phim — das Kino) là gì?",
        options: ["im", "inm", "ins"],
        answer: 2,
        explanation: "in + das = ins (Ich gehe ins Kino); còn in + dem = im (Ich bin im Kino).",
      },
    ],
  },
  {
    slug: "gioi-tu-chi-noi-chon-lokal",
    categoryId: "praepositionen",
    order: 2,
    code: "P2",
    title: "Giới từ chỉ nơi chốn (Wo, Woher, Wohin & 9 Wechselpräpositionen)",
    germanTitle: "Lokale Präpositionen & Wechselpräpositionen",
    level: "A2",
    summary: "Hệ thống đầy đủ giới từ nơi chốn theo 3 trục Wo (Dativ), Woher (aus vs von), Wohin (9 Wechselpräpositionen, in vs zu, zu vs nach) cùng durch, um...herum và gegenüber.",
    sections: [
      {
        id: "wo-dativ",
        heading: "1. Trả lời „Wo?“ (Ở đâu? — Vị trí tĩnh) → LUÔN DÙNG DATIV",
        blocks: [
          {
            type: "text",
            content:
              "Khi mô tả một vị trí cố định, không di chuyển sang địa điểm mới (trả lời **Wo?**), **mọi giới từ nơi chốn đều dùng {dat:Dativ}**: **auf** (ở trên bề mặt), **über** (phía trên, không chạm), **unter** (ở dưới), **vor** (trước), **hinter** (sau), **neben** (bên cạnh), **an** (sát cạnh/dọc theo), **bei** (ở chỗ ai/công ty), **zwischen** (ở giữa 2 vật), **in** (ở bên trong).",
          },
        ],
      },
      {
        id: "woher-aus-vs-von",
        heading: "2. Trả lời „Woher?“ (Từ đâu tới?) → „aus“ vs „von“ (đều + Dativ)",
        blocks: [
          {
            type: "compare",
            leftTitle: "aus + Dativ (Rời khỏi BÊN TRONG)",
            leftItems: [
              "Phải từng ở **bên trong** một không gian/tòa nhà rồi bước ra: *Ich komme **aus** {dat:dem Haus}.*",
              "**Quốc gia, thành phố, vùng miền:** *Ich komme **aus** Vietnam / **aus** der Schweiz / **aus** Berlin.*",
            ],
            rightTitle: "von + Dativ (Từ một điểm / người / hoạt động)",
            rightItems: [
              "Đi từ một khu vực/điểm (không nhấn mạnh bước từ trong tòa nhà ra): *Ich komme **vom** Bahnhof.*",
              "Trở về từ **người** (*vom Arzt*) hoặc từ **một hoạt động** (không thể „chui vào trong“ hoạt động đó): *Ich komme **vom** Einkaufen / **vom** Sport / **von** der Arbeit.*",
            ],
          },
        ],
      },
      {
        id: "wohin-wechselpraepositionen",
        heading: "3. Trả lời „Wohin?“ (Đi đâu?) & 9 Giới từ hai chiều (Wechselpräpositionen)",
        blocks: [
          {
            type: "rule",
            title: "Quy tắc vàng cho 9 Wechselpräpositionen (an, auf, hinter, in, neben, über, unter, vor, zwischen)",
            formula: "Trả lời WO? (Ở đâu — tĩnh) → {dat:DATIV}   |   Trả lời WOHIN? (Đi đâu — chuyển hướng/vị trí) → {akk:AKKUSATIV}",
          },
          {
            type: "table",
            caption: "So sánh trọn bộ 9 Wechselpräpositionen ở Akkusativ (Wohin?) và Dativ (Wo?)",
            headers: ["Giới từ", "Wohin? (+ Akkusativ)", "Wo? (+ Dativ)"],
            rows: [
              ["**an** *(sát / lên tường)*", "Er hängt das Bild **an** {akk:die Wand}.", "Das Bild hängt **an** {dat:der Wand}."],
              ["**auf** *(lên bề mặt)*", "Er geht **auf** {akk:einen Berg}.", "Er steht **auf** {dat:einem Berg}."],
              ["**hinter** *(ra đằng sau)*", "Sie geht **hinter** {akk:das Sofa}.", "Sie steht **hinter** {dat:dem Sofa}."],
              ["**in** *(vào bên trong)*", "Sie geht **in** {akk:den Bahnhof}.", "Sie ist **im** {dat:Bahnhof}."],
              ["**neben** *(sang bên cạnh)*", "Maja setzt sich **neben** {akk:eine Frau}.", "Maja sitzt **neben** {dat:einer Frau}."],
              ["**über** *(qua phía trên)*", "Der Vogel fliegt **über** {akk:den Wald}.", "Der Vogel fliegt **über** {dat:dem Wald}."],
              ["**unter** *(xuống gầm)*", "Die Katze legt sich **unter** {akk:den Tisch}.", "Die Katze sitzt **unter** {dat:dem Tisch}."],
              ["**vor** *(ra phía trước)*", "Er stellt sich **vor** {akk:die Tür}.", "Er steht **vor** {dat:der Tür}."],
              ["**zwischen** *(vào giữa)*", "Er läuft **zwischen** {akk:die Autos}.", "Er steht **zwischen** {dat:den Autos}."],
            ],
          },
        ],
      },
      {
        id: "in-zu-nach-va-khac",
        heading: "4. Phân biệt „in / zu / nach“ & Các giới từ nơi chốn khác",
        blocks: [
          {
            type: "table",
            caption: "Khi nào đi đâu dùng „in“, „zu“ hay „nach“?",
            headers: ["Giới từ", "Cách đi kèm", "Cách dùng chính xác", "Ví dụ"],
            rows: [
              ["**in**", "{akk:Akkusativ}", "Bước **vào bên trong** tòa nhà, phòng, hoặc **quốc gia/vùng CÓ mạo từ**", "*Ich gehe **ins** Kino.* · *Ich fahre **in** {akk:die Schweiz / die USA}.*"],
              ["**zu**", "{dat:Dativ} *(luôn luôn!)*", "Đi **tới chỗ** người, cửa hàng, cơ quan, nhà ga, hoạt động (không nhấn mạnh chui vào trong)", "*Ich fahre **zu** {dat:meiner Oma}.* · *Ich gehe **zum** Arzt / **zur** Arbeit.*"],
              ["**nach**", "{dat:Dativ}", "Đi đến **thành phố, châu lục, quốc gia KHÔNG mạo từ** + cụm cố định ***nach Hause*** (về nhà)", "*Ich fliege **nach** Vietnam / **nach** Berlin.* · *Ich gehe **nach Hause**.*"],
            ],
          },
          {
            type: "examples",
            title: "3 giới từ nơi chốn quan trọng khác: durch, um...herum, gegenüber",
            items: [
              { de: "Ich fahre **durch** {akk:den Tunnel}.", vi: "Tôi lái xe xuyên qua đường hầm.", note: "durch (xuyên qua) → LUÔN Akkusativ." },
              { de: "Wir wandern **um** {akk:den Berg} **herum**.", vi: "Chúng tôi đi bộ vòng quanh ngọn núi.", note: "um ... herum (vòng quanh) → LUÔN Akkusativ (herum có thể bỏ khi đã rõ)." },
              { de: "Ich stehe **gegenüber** {dat:der Bank}.", vi: "Tôi đang đứng ở phía đối diện ngân hàng.", note: "gegenüber (đối diện) → LUÔN Dativ." },
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "9 Wechselpräpositionen (an, auf, hinter, in, neben, über, unter, vor, zwischen): Wo? → Dativ, Wohin? → Akkusativ.",
      "Woher?: „aus“ = rời khỏi bên trong / quốc gia; „von“ = từ người, khu vực, hoạt động (cả hai + Dativ).",
      "Wohin?: „nach“ cho thành phố/nước không mạo từ (+ nach Hause); „in + Akk“ cho nước có mạo từ (in die Schweiz) hoặc vào bên trong; „zu + Dat“ cho người/địa điểm/cơ quan.",
      "durch & um...herum luôn + Akkusativ; gegenüber luôn + Dativ.",
    ],
    quiz: [
      {
        question: "Chọn câu đúng: „Ich fahre im Sommer ___ Schweiz.“ (die Schweiz — có mạo từ!)",
        options: ["nach der", "in die", "zu der"],
        answer: 1,
        explanation: "Quốc gia CÓ mạo từ (như die Schweiz, die Türkei, die USA) khi nói „đi tới“ phải dùng „in + Akkusativ“ → in die Schweiz.",
      },
      {
        question: "Chọn câu đúng: „Die Lampe hängt über ___ Tisch.“ (Wo? — vị trí tĩnh, der Tisch)",
        options: ["den", "dem", "der"],
        answer: 1,
        explanation: "„hängen“ ở đây chỉ vị trí tĩnh (Wo?) nên Wechselpräposition „über“ đi với Dativ → über dem Tisch.",
      },
      {
        question: "Chọn giới từ đúng: „Er kommt gerade ___ Einkaufen.“ (về từ hoạt động đi mua sắm)",
        options: ["aus dem", "vom", "nach dem"],
        answer: 1,
        explanation: "Với hoạt động (Einkaufen, Sport, Arbeit), không thể „chui vào trong“ nên phải dùng „von + Dativ“ → vom Einkaufen.",
      },
    ],
  },
  {
    slug: "gioi-tu-chi-thoi-gian-temporal",
    categoryId: "praepositionen",
    order: 3,
    code: "P3",
    title: "Giới từ chỉ thời gian (Temporale Präpositionen)",
    germanTitle: "Temporale Präpositionen (Akk / Dat / Gen)",
    level: "A2",
    summary: "Bảng tra cứu trọn bộ giới từ thời gian (Wann? Wie lange?) phân theo đúng 3 nhóm Cách: Akkusativ, Dativ và Genitiv.",
    sections: [
      {
        id: "temporal-akk",
        heading: "1. Giới từ thời gian đi với Akkusativ",
        blocks: [
          {
            type: "table",
            caption: "Nhóm Temporale Präpositionen + Akkusativ",
            headers: ["Giới từ", "Ý nghĩa / Cách dùng", "Ví dụ"],
            rows: [
              ["**um**", "Giờ chính xác (*Uhrzeit*)", "*Ich gehe **um** {akk:8 Uhr} ins Bett.*"],
              ["**bis**", "Cho đến mốc thời gian (→ x)", "*Ich warte **bis** {akk:nächste Woche}.*"],
              ["**von (Dat) ... bis**", "Từ mốc này đến mốc kia (x → x)", "*Die Bar ist **von** {dat:8} **bis** {akk:18 Uhr} geöffnet.*"],
              ["**für**", "Khoảng thời gian dự kiến (*trong vòng...*)", "*Wir fliegen **für** {akk:eine Woche} in den Urlaub.*"],
              ["**über**", "Lâu hơn / vượt quá (*hơn...*)", "*Ich warte schon **über** {akk:eine Stunde} auf dich!*"],
            ],
          },
        ],
      },
      {
        id: "temporal-dat",
        heading: "2. Giới từ thời gian đi với Dativ",
        blocks: [
          {
            type: "table",
            caption: "Nhóm Temporale Präpositionen + Dativ",
            headers: ["Giới từ", "Ý nghĩa / Cách dùng", "Ví dụ"],
            rows: [
              ["**an / am**", "Thứ, ngày, buổi trong ngày *(trừ in der Nacht!)*", "***Am** {dat:Montag} fange ich an.* · ***Am** {dat:Morgen} bin ich müde.*"],
              ["**in / im**", "Tháng, mùa, năm; hoặc „sau bao lâu nữa“ (tương lai)", "***Im** {dat:Winter} schneit es.* · ***In** {dat:einer Woche} fliege ich weg.*"],
              ["**vor**", "Trước một sự kiện / cách đây", "***Vor** {dat:der Arbeit} macht er Sport.*"],
              ["**nach**", "Sau một sự kiện", "***Nach** {dat:der Arbeit} schläft er.*"],
              ["**seit**", "Từ quá khứ kéo dài tới hiện tại", "***Seit** {dat:meiner Verletzung} spiele ich keinen Fußball mehr.*"],
              ["**bei / beim**", "Đồng thời / trong khi đang làm gì", "***Beim** {dat:Abendessen} sehe ich die Nachrichten.*"],
              ["**ab / von ... an**", "Mốc bắt đầu từ tương lai trở đi", "***Ab** {dat:nächster Woche} / **Von** {dat:nächster Woche} **an** höre ich auf.*"],
            ],
          },
        ],
      },
      {
        id: "temporal-gen",
        heading: "3. Giới từ thời gian đi với Genitiv (B1–B2)",
        blocks: [
          {
            type: "table",
            caption: "Nhóm Temporale Präpositionen + Genitiv",
            headers: ["Giới từ", "Ý nghĩa", "Ví dụ"],
            rows: [
              ["**während**", "Trong suốt lúc diễn ra sự việc", "***Während** {gen:des Spiels} kaufte er etwas zu trinken.*"],
              ["**innerhalb**", "Trong phạm vi một khoảng thời gian", "***Innerhalb** {gen:einer Stunde} müssen alle abgeben.*"],
              ["**außerhalb**", "Ngoài khung thời gian quy định", "***Außerhalb** {gen:der Öffnungszeiten} geht niemand ans Telefon.*"],
            ],
          },
          {
            type: "tip",
            variant: "warning",
            title: "Cẩn thận: Cùng một giới từ nhưng khác nhóm nghĩa có thể đổi Cách!",
            content:
              "VD: **in** khi làm giới từ thời gian (*in einer Woche*, *im Sommer*) **LUÔN đi với Dativ** (không chia Wo/Wohin như giới từ nơi chốn!). Tương tự, **vor** thời gian (*vor einem Jahr*) luôn là Dativ.",
          },
        ],
      },
    ],
    keyPoints: [
      "Giờ dùng „um“; thứ/ngày/buổi dùng „am“ (nhưng đêm là „in der Nacht“); tháng/mùa/khoảng tương lai dùng „in / im“.",
      "Trong giới từ thời gian: um, bis, für, über (+ Akk); an, in, vor, nach, seit, bei, ab (+ Dat); während, innerhalb, außerhalb (+ Gen).",
    ],
    quiz: [
      {
        question: "Chọn câu đúng: „Der Kurs beginnt ___ Montag ___ 9 Uhr ___ Mai.“",
        options: ["am / um / im", "im / am / um", "um / am / im"],
        answer: 0,
        explanation: "Thứ dùng „am“ (am Montag), giờ dùng „um“ (um 9 Uhr), tháng dùng „im“ (im Mai).",
      },
      {
        question: "Điền đúng dạng của „ein Jahr“: „Ich wohne seit ___ in Deutschland.“ (das Jahr)",
        options: ["ein Jahr", "einem Jahr", "eines Jahres"],
        answer: 1,
        explanation: "Giới từ thời gian „seit“ luôn đòi hỏi Dativ → seit einem Jahr.",
      },
    ],
  },
];
