import type { GrammarLesson } from "./types";

export const ADVERBIEN_LESSONS: GrammarLesson[] = [
  {
    slug: "trang-tu-va-phan-biet-voi-tinh-tu",
    categoryId: "adverbien",
    order: 1,
    code: "Av1",
    title: "Trạng từ là gì? Phân biệt Trạng từ vs Tính từ",
    germanTitle: "Was ist ein Adverb? Adverb vs. Adjektiv",
    level: "A1",
    summary: "Hiểu rõ khái niệm trạng từ (Adverb), 4 nhóm trạng từ chính và điểm khác biệt sống còn giữa Adverb (không bao giờ chia đuôi) với Adjektiv.",
    sections: [
      {
        id: "adverb-vs-adjektiv",
        heading: "1. Phân biệt rạch ròi Trạng từ (Adverb) và Tính từ (Adjektiv)",
        blocks: [
          {
            type: "compare",
            leftTitle: "Tính từ (Adjektiv)",
            leftItems: [
              "Bổ nghĩa cho **Danh từ** (nêu đặc điểm của người/vật).",
              "Khi đứng trước danh từ **BẮT BUỘC phải chia đuôi** (Adjektivdeklination).",
              "VD: *ein **tolles** Konzert*, *viele **geniale** Fotos*.",
            ],
            rightTitle: "Trạng từ (Adverb)",
            rightItems: [
              "Bổ nghĩa cho **Động từ / hoàn cảnh** (trả lời *Khi nào? Ở đâu? Tại sao? Như thế nào?*).",
              "**BẤT BIẾN 100% — KHÔNG BAO GIỜ chia đuôi!**",
              "VD: ***Gestern** war ich im Kino.* · *Ich stand **vorn**.* · ***Deshalb** komme ich spät.*",
            ],
          },
          {
            type: "list",
            title: "Các nhóm trạng từ chính trong tiếng Đức",
            items: [
              "**Temporaladverbien** (Thời gian): *heute, gestern, bald, oft, morgens...*",
              "**Lokaladverbien** (Nơi chốn / phương hướng): *hier, dort, draußen, oben, hin, her...*",
              "**Kausaladverbien** (Nguyên nhân / kết quả): *deshalb, darum, trotzdem...*",
              "**Modaladverbien** (Cách thức / mức độ): *gern, leider, vielleicht, kaum...*",
              "**Konjunktionaladverbien** (Trạng từ liên kết 2 mệnh đề chính): *außerdem, danach, jedoch...*",
            ],
          },
          {
            type: "examples",
            title: "Nhận diện Trạng từ, Tiểu từ và Tính từ trong câu",
            items: [
              { de: "**Gestern** war ich bei einem **tollen** Konzert.", vi: "Hôm qua tôi đã đi một buổi hòa nhạc tuyệt vời.", note: "Gestern = Adverb (không đổi); tollen = Adjektiv (chia đuôi)." },
              { de: "**Deshalb** konnte ich auch viele **geniale** Fotos machen.", vi: "Vì vậy tôi cũng có thể chụp được nhiều bức ảnh cực đẹp.", note: "Deshalb = Konjunktionaladverb; geniale = Adjektiv." },
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Trạng từ (Adverb) mô tả hoàn cảnh của hành động (thời gian, nơi chốn, nguyên nhân, cách thức) và KHÔNG BAO GIỜ chia đuôi.",
      "Tính từ (Adjektiv) mô tả danh từ và phải chia đuôi khi đứng trước danh từ.",
    ],
    quiz: [
      {
        question: "Điểm khác biệt ngữ pháp lớn nhất của Adverb so với Adjektiv là gì?",
        options: [
          "Adverb luôn viết hoa chữ cái đầu",
          "Adverb không bao giờ biến cách / không chia đuôi",
          "Adverb chỉ đứng ở cuối câu",
        ],
        answer: 1,
        explanation: "Adverb là từ loại bất biến (unveränderlich), không bao giờ nhận đuôi chia như Adjektiv.",
      },
    ],
  },
  {
    slug: "trang-tu-chi-thoi-gian-temporal",
    categoryId: "adverbien",
    order: 2,
    code: "Av2",
    title: "Trạng từ chỉ thời gian (Temporale Adverbien)",
    germanTitle: "Temporale Adverbien",
    level: "A2",
    summary: "Hệ thống trạng từ thời gian theo 6 câu hỏi (Wann, Ab wann, Bis wann, Seit wann, Wie lange, Wie oft) và bảng tổng hợp 4 nhóm ý nghĩa.",
    sections: [
      {
        id: "sau-cau-hoi-thoi-gian",
        heading: "1. Trạng từ thời gian trả lời 6 câu hỏi quen thuộc",
        blocks: [
          {
            type: "table",
            caption: "Phân loại trạng từ thời gian theo câu hỏi",
            headers: ["Câu hỏi", "Ý nghĩa", "Trạng từ tiêu biểu", "Ví dụ"],
            rows: [
              ["**Wann?** *(Khi nào?)*", "Thời điểm cụ thể", "*gestern, heute, morgen, bald, damals, gerade, jetzt, sofort, später, vorhin, demnächst, heutzutage*", "*Wann warst du bei Oma? — **Gestern**.*"],
              ["**Ab wann?** *(Từ khi nào?)*", "Thời điểm **bắt đầu** (ab + Adverb)", "*ab sofort, ab jetzt, ab morgen, ab übermorgen, ab dann, ab nun*", "***Ab morgen** kann ich dir helfen.*"],
              ["**Bis wann?** *(Đến khi nào?)*", "Thời điểm **kết thúc** (bis + Adverb)", "*bis dann, bis morgen, bis später, bis jetzt, bis nachher*", "***Bis übermorgen** habe ich Urlaub.*"],
              ["**Seit wann?** *(Từ lúc nào tới giờ?)*", "Bắt đầu trong quá khứ & **vẫn tiếp diễn**", "*seit gestern, seit vorgestern, seit eben, seit gerade, seit damals, schon immer*", "*Ich lerne **seit gestern** Deutsch.*"],
              ["**Wie lange?** *(Bao lâu?)*", "Khoảng thời gian", "*schon immer, seit gestern, seit vorhin, lange, kurz*", "*Wie lange sprichst du Englisch? — **Schon immer**!*"],
              ["**Wie oft?** *(Bao lâu một lần?)*", "Tần suất / lặp lại", "*immer, oft, öfters, mehrmals, manchmal, selten, nie, einmal/zweimal, montags, morgens, abends*", "*Ich gehe **immer montags** zum Sport.*"],
            ],
          },
          {
            type: "tip",
            variant: "tip",
            title: "Mẹo dùng đuôi „-s“ cho thứ & buổi trong ngày",
            content:
              "Khi thêm **-s** và viết thường tên thứ hoặc buổi trong ngày, bạn tạo ra trạng từ chỉ thói quen lặp lại đều đặn: **montags** (= vào mỗi thứ Hai), **freitags** (= mỗi thứ Sáu), **morgens** (= vào các buổi sáng), **abends** (= vào các buổi tối).",
          },
        ],
      },
      {
        id: "tong-hop-4-nhom",
        heading: "2. Bốn nhóm nghĩa tổng hợp",
        blocks: [
          {
            type: "table",
            headers: ["Nhóm nghĩa", "Từ vựng trọng tâm"],
            rows: [
              ["**Thời điểm (Zeitpunkt)**", "bald, damals, dann, demnächst, gerade, gestern, heute, heutzutage, inzwischen, jetzt, nie, niemals, seitdem, sofort, später, vorgestern, vorhin"],
              ["**Lặp lại / Tần suất**", "morgens, mittags, abends, montags, dienstags..., immer, manchmal, selten, täglich, oft, mehrmals"],
              ["**Khoảng thời gian (Zeitraum)**", "schon immer, seit eben, seit gestern, stundenlang, tagelang"],
              ["**Trình tự (Reihenfolge)**", "zuerst (đầu tiên), dann (sau đó), danach, anschließend, nachher, schließlich (cuối cùng), erst"],
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "„ab + trạng từ“ chỉ mốc bắt đầu; „bis + trạng từ“ chỉ mốc kết thúc; „seit + trạng từ“ chỉ hành động kéo dài từ quá khứ đến hiện tại.",
      "Thêm -s và viết thường thứ/buổi (montags, morgens, abends) để diễn tả thói quen lặp lại.",
    ],
    quiz: [
      {
        question: "Chọn câu diễn tả đúng: „Tôi luôn tập thể dục vào mỗi sáng thứ Hai.“",
        options: ["Ich mache immer Montag Sport.", "Ich mache immer montags morgens Sport.", "Ich mache seit Montag Sport."],
        answer: 1,
        explanation: "„montags“ (mỗi thứ Hai) và „morgens“ (mỗi sáng) là trạng từ chỉ sự lặp lại đều đặn (viết thường + -s).",
      },
    ],
  },
  {
    slug: "trang-tu-noi-chon-va-hin-her",
    categoryId: "adverbien",
    order: 3,
    code: "Av3",
    title: "Trạng từ nơi chốn & Cách dùng „hin“ và „her“",
    germanTitle: "Lokale Adverbien & Hin und Her",
    level: "A2",
    summary: "Trạng từ trả lời Wo/Wohin/Woher, sự khác biệt giữa trả lời bằng giới từ vs trạng từ và cách dùng „hin“ (đi ra xa) & „her“ (hướng lại gần người nói).",
    sections: [
      {
        id: "wo-wohin-woher",
        heading: "1. Trạng từ chỉ Vị trí (Wo?) và Hướng (Wohin? / Woher?)",
        blocks: [
          {
            type: "table",
            caption: "Hệ thống trạng từ nơi chốn theo 3 câu hỏi",
            headers: ["Wo? (Vị trí tĩnh)", "Wohin? (Đi về đâu)", "Woher? (Từ đâu tới)"],
            rows: [
              ["**hier, da, dort** (đây, đó)", "**nach links / rechts**", "**von links / rechts**"],
              ["**oben / unten** (trên / dưới)", "**nach oben / unten**", "**von oben / unten**"],
              ["**drinnen / draußen** (trong / ngoài)", "**nach drinnen / draußen**", "**von drinnen / draußen**"],
              ["**vorn / hinten** (trước / sau)", "**vorwärts / rückwärts**", "**dorther / irgendwoher**"],
              ["**überall / irgendwo / nirgends**", "**bergauf / bergab · dorthin**", "**rauf / runter** *(khẩu ngữ)*"],
            ],
          },
          {
            type: "compare",
            leftTitle: "Giới từ + Danh từ (Địa điểm CỤ THỂ)",
            leftItems: [
              "*Wo ist dein Vater? — **Im Keller!*** (Ở trong tầng hầm — địa điểm cố định, chính xác).",
              "*Wohin geht er? — **In den Keller!***",
              "*Woher kommt er? — **Aus dem Keller!***",
            ],
            rightTitle: "Trạng từ (Vị trí TƯƠNG ĐỐI theo góc nhìn người nói)",
            rightItems: [
              "*Wo ist dein Vater? — **Unten!*** (Ở bên dưới — có thể là tầng 1, sân, hay tầng hầm).",
              "*Wohin geht er? — **Nach unten!***",
              "*Woher kommt er? — **Von unten!***",
            ],
          },
        ],
      },
      {
        id: "hin-va-her",
        heading: "2. Bí quyết dùng „hin“ và „her“ chuẩn như người bản xứ",
        blocks: [
          {
            type: "rule",
            title: "Quy tắc hướng so với NGƯỜI NÓI",
            formula: "hin = Chuyển động RỜI XA người nói (đi ra / đi tới đó)  |  her = Chuyển động HƯỚNG VỀ PHÍA người nói (đến đây / lại đây)",
          },
          {
            type: "examples",
            title: "4 cách kết hợp cực hay của „hin“ và „her“",
            items: [
              { de: "**Wohin** gehst du? = **Wo** gehst du **hin**?", vi: "Bạn đang đi đâu thế?", note: "Wohin / Woher có thể viết liền hoặc tách riêng trong văn nói." },
              { de: "**Woher** kommst du? = **Wo** kommst du **her**?", vi: "Bạn từ đâu đến thế?" },
              { de: "Ich gehe **dorthin**, wo wir uns getroffen haben.", vi: "Tôi đi tới chỗ mà chúng ta đã gặp nhau.", note: "Ghép với trạng từ: dahin/daher, dorthin/dorther, hierhin/hierher." },
              { de: "**Komm** bitte **her**! / **Geht** bitte woanders **hin**!", vi: "Làm ơn lại đây! / Làm ơn đi chỗ khác đi!", note: "Làm tiền tố tách cho động từ chuyển động." },
              { de: "Anna kam ins Haus **hinein** und ging gleich wieder **heraus**.", vi: "Anna bước vào trong nhà rồi lại đi ra ngoài ngay.", note: "Ghép với giới từ (hinein/heraus, hinauf/herunter, hinüber/herüber — khẩu ngữ rút gọn thành rein/raus/rauf/runter/rüber)." },
            ],
          },
        ],
      },
    ],
    keyPoints: [
      "Giới từ + Danh từ chỉ địa điểm cụ thể (im Keller); Trạng từ chỉ hướng/vị trí tương đối từ góc nhìn người nói (unten).",
      "„hin“ luôn chỉ hướng RỜI XA người nói; „her“ luôn chỉ hướng TIẾN LẠI GẦN người nói.",
      "Trong khẩu ngữ, hinein/heraus/hinauf/herunter thường rút gọn thành rein, raus, rauf, runter.",
    ],
    quiz: [
      {
        question: "Bạn đang đứng ở trên tầng 2 và gọi con đi lên chỗ mình. Bạn dùng từ nào?",
        options: ["Komm bitte hinauf!", "Komm bitte herauf!", "Geh bitte herunter!"],
        answer: 1,
        explanation: "Chuyển động đi lên HƯỚNG VỀ PHÍA người nói → dùng „her-“ → herauf (khẩu ngữ: rauf).",
      },
    ],
  },
  {
    slug: "trang-tu-lien-ket-konjunktionaladverbien",
    categoryId: "adverbien",
    order: 4,
    code: "Av4",
    title: "Trạng từ liên kết (Konjunktionaladverbien)",
    germanTitle: "Konjunktionaladverbien (Position 1)",
    level: "B1",
    summary: "Sự khác biệt sống còn về trật tự từ giữa Konjunktionaladverb (Position 1 → đảo chủ ngữ) và Konjunktion (Position 0), kèm bảng 8 nhóm nghĩa B1–B2.",
    sections: [
      {
        id: "vi-tri-1-vs-0",
        heading: "1. Konjunktionaladverb (Vị trí 1) vs Konjunktion (Vị trí 0)",
        blocks: [
          {
            type: "text",
            content:
              "Cả hai đều dùng để nối 2 câu, nhưng **Konjunktionaladverb** là một thành phần câu thực thụ nên nó **chiếm Vị trí 1** — kéo theo **động từ chia phải đứng ngay Vị trí 2** và **chủ ngữ lùi ra Vị trí 3**! Đặc biệt: Konjunktionaladverb **KHÔNG BAO GIỜ đẩy động từ về cuối câu** (nó luôn mở đầu một Hauptsatz).",
          },
          {
            type: "examples",
            title: "So sánh trật tự từ trực quan",
            items: [
              { de: "Anna kommt später **und** {nom:Jan} **kommt** auch später.", vi: "Anna đến muộn và Jan cũng đến muộn.", note: "„und“ là Konjunktion (Vị trí 0) → Jan (1) + kommt (2)." },
              { de: "Anna kommt später, **außerdem** **kommt** {nom:Jan} auch später.", vi: "Anna đến muộn, ngoài ra Jan cũng đến muộn.", note: "„außerdem“ là Konjunktionaladverb (Vị trí 1) → kommt (2) + Jan (3)!" },
              { de: "Es regnet stark. **Trotzdem** **gehen** {nom:wir} spazieren.", vi: "Trời mưa to. Tuy nhiên chúng tôi vẫn đi dạo.", note: "Trotzdem (1) + gehen (2) + wir (3)." },
            ],
          },
        ],
      },
      {
        id: "tam-nhom-nghia",
        heading: "2. Bảng 8 nhóm Konjunktionaladverbien thiết yếu (A2–B2)",
        blocks: [
          {
            type: "table",
            caption: "Phân loại các trạng từ liên kết thông dụng nhất",
            headers: ["Nhóm nghĩa", "Các Konjunktionaladverbien tiêu biểu"],
            rows: [
              ["**Bổ sung / Liệt kê** *(kopulativ)*", "**außerdem** (ngoài ra), **zudem**, **dazu**, **darüber hinaus**, **ebenso**, **zusätzlich**, **weiter**"],
              ["**Thời gian** *(temporal)*", "**davor** (trước đó), **währenddessen** (trong lúc đó), **danach** (sau đó), **anschließend** (tiếp theo)"],
              ["**Nơi chốn** *(lokal)*", "**daneben** (bên cạnh đó), **darüber**, **darunter**, **dazwischen**"],
              ["**Nguyên nhân / Kết quả** *(kausal / konsekutiv)*", "**deshalb, deswegen, darum, daher** (vì vậy), **also** (vậy nên), **folglich, somit, infolgedessen, demzufolge** (do đó)"],
              ["**Đối lập** *(adversativ)*", "**jedoch** (tuy nhiên), **dagegen, hingegen** (trái lại), **stattdessen** (thay vào đó), **allerdings** (song), **vielmehr**"],
              ["**Hạn chế** *(restriktiv)*", "**insofern** (xét về mặt đó), **nur**, **freilich**, **allerdings**"],
              ["**Nhượng bộ** *(konzessiv)*", "**trotzdem, dennoch** (mặc dù vậy), **immerhin** (dù sao cũng), **sowieso** (dù sao đi nữa)"],
            ],
          },
          {
            type: "tip",
            variant: "note",
            title: "Có bắt buộc đứng ở Vị trí 1 không?",
            content:
              "Không bắt buộc! Nếu đặt vào giữa câu (sau động từ), câu vẫn đúng (VD: *Wir gehen **trotzdem** spazieren*), chỉ là lúc này sắc thái nối câu nhẹ đi và mang tính trạng từ thông thường.",
          },
        ],
      },
    ],
    keyPoints: [
      "Konjunktionaladverb luôn tính là 1 vị trí (thường là Vị trí 1) → động từ chia đứng ngay sau nó ở Vị trí 2, rồi mới tới chủ ngữ.",
      "Khác với liên từ phụ thuộc (weil, obwohl), Konjunktionaladverb (deshalb, trotzdem) KHÔNG đẩy động từ về cuối câu.",
    ],
    quiz: [
      {
        question: "Chọn câu có trật tự từ ĐÚNG với „deshalb“:",
        options: [
          "Ich bin krank, deshalb ich bleibe zu Hause.",
          "Ich bin krank, deshalb bleibe ich zu Hause.",
          "Ich bin krank, deshalb ich zu Hause bleibe.",
        ],
        answer: 1,
        explanation: "„deshalb“ là Konjunktionaladverb chiếm Vị trí 1 → động từ „bleibe“ đứng ở Vị trí 2, chủ ngữ „ich“ ở Vị trí 3.",
      },
    ],
  },
  {
    slug: "tieu-tu-va-tieu-tu-tinh-thai-modalpartikel",
    categoryId: "adverbien",
    order: 5,
    code: "Av5",
    title: "Tiểu từ (Partikel) & 10 Tiểu từ tình thái (Modalpartikel)",
    germanTitle: "Partikel & Modalpartikel (ja, doch, mal, eben...)",
    level: "B2",
    summary: "7 loại tiểu từ trong tiếng Đức (Gradpartikel, Fokuspartikel...) và giải mã sắc thái cảm xúc của 10 Modalpartikel giúp bạn hiểu người Đức nói chuyện tự nhiên.",
    sections: [
      {
        id: "bay-loai-partikel",
        heading: "1. Tiểu từ (Partikel) là gì? 7 loại tiểu từ",
        blocks: [
          {
            type: "text",
            content:
              "Tiểu từ là những từ nhỏ bất biến, **không chiếm vị trí độc lập**, **không thể đặt câu hỏi cho chúng** và **có thể lược bỏ mà câu vẫn đúng ngữ pháp**. Nhưng chúng làm câu tiếng Đức trở nên sống động, thể hiện mức độ, điểm nhấn và thái độ người nói.",
          },
          {
            type: "table",
            caption: "Các nhóm tiểu từ phổ biến (ngoài Modalpartikel)",
            headers: ["Loại Partikel", "Chức năng", "Từ tiêu biểu & Ví dụ"],
            rows: [
              ["**Gradpartikel** *(Mức độ)*", "Đứng trước tính từ/trạng từ để tăng hoặc giảm mức độ", "*sehr, total, extrem, ziemlich, völlig, kaum, zu, höchst, einigermaßen*\nVD: *Der Fernseher ist **total** teuer.*"],
              ["**Fokuspartikel** *(Tiêu điểm)*", "Đứng trước thành phần cần nhấn mạnh đặc biệt", "*besonders, vor allem, sogar, nur, bloß, erst, bereits, mindestens, zumindest*\nVD: ***Sogar** meine 80-jährige Oma ist bei Facebook!*"],
              ["**Negationspartikel**", "Phủ định", "**nicht** (*Ich fahre heute **nicht** zu Oma.*)"],
              ["**Gesprächspartikel**", "Lời đáp, chào hỏi trong hội thoại", "*ja, nein, hm, okay, genau, richtig, gern*"],
              ["**Ausdruckspartikel**", "Thán từ biểu cảm", "*oh!, schade!, hurra!, igitt!, autsch!, hoppla!, oje!*"],
              ["**Lautmalende Partikel**", "Từ tượng thanh (hay gặp trong truyện tranh)", "*wau, miau, peng, bumm, ticktack, plumps, klirr, hatschi*"],
            ],
          },
        ],
      },
      {
        id: "muoi-modalpartikel",
        heading: "2. Giải mã 10 Tiểu từ tình thái (Modalpartikel) hay gặp nhất",
        blocks: [
          {
            type: "text",
            content:
              "Modalpartikel (còn gọi là *Abtönungspartikel*) là „gia vị cảm xúc“ cực kỳ đặc trưng của văn nói tiếng Đức. Chúng thường đứng ở **giữa câu, ngay sau động từ và đại từ**.",
          },
          {
            type: "table",
            caption: "10 Modalpartikel quan trọng & sắc thái tiếng Việt tương đương",
            headers: ["Modalpartikel", "Sắc thái cảm xúc", "Ví dụ & Cách hiểu tự nhiên"],
            rows: [
              ["**mal**", "Làm câu mệnh lệnh / lời nhờ **nhẹ nhàng, thân thiện hơn** („giùm / thử xem“)", "*Komm **mal** her!* (Lại đây chút đi!)\n*Schaltest du **mal** bitte das Licht an?*"],
              ["**doch**", "1. Gợi ý thân thiện\n2. Trách móc / thanh minh (gắt)\n3. Nhắc lại điều ai cũng biết („đấy thôi / mà“)", "*Ruf **doch** endlich an!* (Gọi luôn đi chứ!)\n*Darüber haben wir **doch** gestern gesprochen.* (Hôm qua mình nói rồi mà!)"],
              ["**ja**", "1. Điều hiển nhiên/đúng như dự đoán\n2. Ngạc nhiên („ồ, hóa ra“)\n3. Cảnh báo mạnh (trong mệnh lệnh)", "*Das war **ja** einfach!* (Ồ, dễ thế!)\n*Mach das **ja** nie wieder!* (Tuyệt đối đừng làm thế nữa nhé!)"],
              ["**denn**", "1. Làm câu hỏi **thân thiện, quan tâm hơn**\n2. Ngạc nhiên tiêu cực („thế hả / vậy trời“)", "*Wie spät ist es **denn**?* (Mấy giờ rồi nhỉ?)\n*Was hast du **denn** gemacht?* (Cậu làm cái gì thế này?!)"],
              ["**eigentlich**", "1. Chuyển chủ đề nhẹ nhàng („à này“)\n2. Nghĩ kỹ lại / thực ra thì\n3. Ngạc nhiên vì khác lý thuyết", "*Was kommt heute **eigentlich** im Fernsehen?*\n***Eigentlich** müsste die Uhr funktionieren.* (Lẽ ra đồng hồ phải chạy chứ.)"],
              ["**eben / halt** *(đồng nghĩa)*", "Cam chịu, chấp nhận thực tế không đổi được („đành chịu / vốn thế rồi“)", "*Das kann man **eben** nicht ändern.* (Chuyện đó đành chịu thôi, không đổi được.)"],
              ["**wohl**", "Phỏng đoán, không chắc chắn („chắc là / có lẽ“)", "*Wo ist Anna? — Die wird **wohl** zu Hause sein.*"],
              ["**schon / ruhig**", "Động viên, trấn an tích cực („rồi sẽ ổn thôi / cứ thoải mái đi“)", "*Das wird **schon** wieder!* (Rồi sẽ ổn cả thôi!)\n*Versuch es **ruhig**!* (Cứ thử đi!)"],
              ["**bloß / nur** *(đồng nghĩa)*", "Cảnh báo gay gắt, nhấn mạnh mệnh lệnh („coi chừng / liệu hồn“)", "*Stell die Vase **bloß** wieder hin!* (Đặt ngay cái bình xuống đi!)"],
              ["**vielleicht**", "Bực bội hoặc nghi ngờ („thật đúng là / liệu có phải“)", "*Das ist **vielleicht** blöd gelaufen!* (Đúng là xui hết chỗ nói!)"],
            ],
          },
          {
            type: "tip",
            variant: "warning",
            title: "Lời khuyên thực tế khi giao tiếp ở Đức",
            content:
              "Nếu chưa chắc chắn sắc thái của một Modalpartikel (đặc biệt khi nói với sếp hoặc người lớn tuổi), **hãy bỏ qua nó**! Dùng sai *doch* hay *bloß* có thể khiến một câu có ý tốt bị hiểu thành khó chịu hoặc bất lịch sự.",
          },
        ],
      },
    ],
    keyPoints: [
      "Gradpartikel tăng/giảm mức độ trước tính từ/trạng từ (sehr, total, ziemlich); Fokuspartikel nhấn mạnh 1 thành phần (sogar, vor allem, besonders).",
      "Modalpartikel (mal, doch, ja, denn, eben/halt, wohl, schon/ruhig, bloß/nur) tạo sắc thái cảm xúc tự nhiên trong văn nói và đứng giữa câu.",
    ],
    quiz: [
      {
        question: "Câu „Komm mal bitte her!“ dùng „mal“ để làm gì?",
        options: [
          "Tăng mức độ giận dữ của mệnh lệnh",
          "Làm lời gọi nghe nhẹ nhàng, thân thiện hơn",
          "Hỏi số lần lặp lại",
        ],
        answer: 1,
        explanation: "Modalpartikel „mal“ giúp câu mệnh lệnh hoặc lời nhờ bớt gay gắt và thân thiện hơn nhiều.",
      },
      {
        question: "Cặp Modalpartikel nào đồng nghĩa với nhau và mang nghĩa „đành chịu, không đổi được“?",
        options: ["eben / halt", "ja / denn", "schon / wohl"],
        answer: 0,
        explanation: "„eben“ và „halt“ hoàn toàn đồng nghĩa, diễn tả sự cam chịu hoặc một sự thật hiển nhiên không thay đổi được.",
      },
    ],
  },
];
