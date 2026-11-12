/**
 * Nội dung Chính sách quyền riêng tư & Điều khoản sử dụng (tiếng Việt · tiếng Đức) — hiển thị ở /privacy, /terms (+ /de).
 * App mở các trang này trong trình duyệt nhúng. "{email}" được thay bằng email liên hệ lúc hiển thị (CONTACT_EMAIL).
 * Sửa nội dung quan trọng → đổi `updated` cho cả 2 ngôn ngữ.
 */

export type LegalLang = "vi" | "de";
export type LegalDoc = "privacy" | "terms";

/** Đoạn văn (chuỗi) hoặc danh sách gạch đầu dòng (mảng) */
type Block = string | string[];
export type LegalContent = {
  title: string;
  updated: string;
  intro: string;
  sections: { h: string; body: Block[] }[];
};

const UPDATED = { vi: "Cập nhật lần cuối: 12 tháng 11 năm 2026", de: "Zuletzt aktualisiert: 12. November 2026" };

const privacy: Record<LegalLang, LegalContent> = {
  vi: {
    title: "Chính sách quyền riêng tư",
    updated: UPDATED.vi,
    intro:
      "Deutsch Shadowing (“chúng tôi”) gồm ứng dụng di động và trang web ckk.biz, giúp bạn luyện nghe, nói và chép chính tả tiếng Đức. Chính sách này giải thích chúng tôi thu thập dữ liệu nào, dùng để làm gì và bạn có những quyền gì. Chúng tôi chỉ thu thập những gì cần để dịch vụ hoạt động và không bán dữ liệu. Ứng dụng di động không có quảng cáo; trang web ckk.biz hiển thị quảng cáo của Google AdSense (xem mục 4 và 8).",
    sections: [
      {
        h: "1. Dữ liệu chúng tôi thu thập",
        body: [
          [
            "Tài khoản: tên hiển thị, email, mật khẩu (chỉ lưu dạng băm, không ai đọc được), ảnh đại diện nếu bạn tải lên, ngôn ngữ giao diện.",
            "Đăng nhập bằng Google / Apple: mã định danh tài khoản và email do Google / Apple cung cấp. Với Apple, chúng tôi lưu thêm một mã để thu hồi quyền truy cập khi bạn xoá tài khoản.",
            "Dữ liệu học tập: sổ từ vựng và câu ví dụ, tiến độ từng bài, kết quả chính tả, lịch sử ôn tập, điểm và các bài đã mở khoá.",
            "Góp ý bạn gửi: nội dung, email để trả lời (nếu có) và thông tin kỹ thuật cơ bản (hệ điều hành, đời máy, phiên bản app) để tái hiện lỗi.",
            "Dữ liệu kỹ thuật: địa chỉ IP chỉ được dùng tạm thời trong bộ nhớ máy chủ để chống spam và lạm dụng, không lưu vào cơ sở dữ liệu.",
          ],
        ],
      },
      {
        h: "2. Micro, giọng nói và ảnh",
        body: [
          [
            "Micro chỉ được dùng khi bạn bấm ghi âm. Bản ghi ở chế độ Shadowing nằm trên máy của bạn để nghe lại và không được tải lên.",
            "Chế độ Crazy (chấm phát âm): câu bạn vừa nói được gửi tới máy chủ và chuyển cho dịch vụ nhận dạng giọng nói để chấm điểm, rồi bị huỷ ngay — chúng tôi không lưu bản ghi.",
            "Ảnh: app chỉ đọc ảnh bạn chọn làm ảnh đại diện; ảnh được cắt vuông và thu nhỏ trước khi tải lên.",
          ],
          "Bạn có thể cấp hoặc thu hồi các quyền này bất cứ lúc nào trong Cài đặt → Quyền riêng tư của app hoặc trong Cài đặt của máy.",
        ],
      },
      {
        h: "3. Mục đích sử dụng dữ liệu",
        body: [
          [
            "Cung cấp tính năng: đăng nhập, đồng bộ tiến độ và sổ từ vựng giữa app và web, lịch ôn tập, điểm.",
            "Bảng xếp hạng: tên hiển thị và số điểm của bạn được hiện cho những người dùng đã đăng nhập khác. Email và ảnh đại diện không được hiện.",
            "Gửi email cần thiết: mã xác nhận, đặt lại mật khẩu, bản sao dữ liệu khi bạn yêu cầu. Chúng tôi không gửi email quảng cáo.",
            "Trả lời góp ý, sửa lỗi và cải thiện bài học.",
            "Bảo vệ dịch vụ khỏi spam, gian lận và lạm dụng.",
          ],
          "Cơ sở pháp lý theo GDPR: thực hiện hợp đồng (Điều 6(1)(b)) cho các tính năng; lợi ích chính đáng (Điều 6(1)(f)) cho bảo mật và chống lạm dụng; sự đồng ý của bạn (Điều 6(1)(a)) cho quyền micro và ảnh.",
        ],
      },
      {
        h: "4. Bên thứ ba xử lý dữ liệu",
        body: [
          "Chúng tôi không bán hay cho thuê dữ liệu của bạn. Một số nhà cung cấp hỗ trợ vận hành dịch vụ và chỉ nhận phần dữ liệu cần cho việc của họ:",
          [
            "Máy chủ lưu trữ (VPS) đặt cơ sở dữ liệu và ảnh đại diện.",
            "Dịch vụ AI (ví dụ OpenAI, Groq): nhận bản ghi âm ở chế độ Crazy để nhận dạng giọng nói, và từ / câu tiếng Đức cần dịch — không kèm tên hay email của bạn.",
            "Dịch vụ giọng đọc (ví dụ Microsoft Azure, ElevenLabs, OpenAI): chỉ nhận câu trong bài học.",
            "Google và Apple: khi bạn chọn đăng nhập bằng tài khoản của họ.",
            "YouTube (Google): video được phát qua trình phát nhúng của YouTube, và YouTube có thể thu thập dữ liệu theo chính sách riêng của Google.",
            "Google AdSense (Google Ireland Ltd.): chỉ trên trang web — hiển thị quảng cáo và có thể dùng cookie / mã định danh để đo lường và cá nhân hoá quảng cáo theo chính sách của Google (policies.google.com/technologies/ads). Ứng dụng di động không dùng AdSense.",
            "Dịch vụ email (SMTP) để gửi mã xác nhận và thông báo.",
          ],
          "Một số nhà cung cấp đặt máy chủ ngoài Liên minh châu Âu; khi đó việc chuyển dữ liệu dựa trên các biện pháp bảo vệ phù hợp như Điều khoản hợp đồng mẫu (SCC) của EU.",
        ],
      },
      {
        h: "5. Lưu trữ và bảo mật",
        body: [
          [
            "Dữ liệu tài khoản và học tập được giữ đến khi bạn xoá tài khoản. Khi xoá, toàn bộ dữ liệu và ảnh đại diện bị xoá ngay khỏi cơ sở dữ liệu; góp ý đã gửi được giữ lại ở dạng ẩn danh.",
            "Kết nối luôn được mã hoá (HTTPS). Mật khẩu được băm; mã đăng nhập trên điện thoại được lưu trong vùng bảo mật của hệ điều hành (Keychain / Keystore).",
            "Bản dịch câu và giọng đọc mẫu được dùng chung cho mọi người học và không chứa dữ liệu cá nhân.",
          ],
        ],
      },
      {
        h: "6. Quyền của bạn",
        body: [
          [
            "Xem và sửa thông tin: Cài đặt → Thông tin cá nhân.",
            "Nhận bản sao dữ liệu: Cài đặt → Quyền riêng tư → Tải dữ liệu của tôi (gửi về email dạng JSON).",
            "Xoá tài khoản: Cài đặt → Xoá tài khoản — xoá vĩnh viễn, không cần liên hệ.",
            "Phản đối hoặc yêu cầu hạn chế xử lý; rút lại sự đồng ý (thu hồi quyền micro / ảnh) bất cứ lúc nào.",
            "Khiếu nại tới cơ quan bảo vệ dữ liệu nơi bạn sinh sống.",
          ],
          "Với các yêu cầu khác, hãy liên hệ {email}. Chúng tôi trả lời trong vòng 30 ngày.",
        ],
      },
      {
        h: "7. Trẻ em",
        body: [
          "Dịch vụ không dành cho trẻ em dưới 13 tuổi (tại EU: dưới 16 tuổi nếu không có sự đồng ý của cha mẹ). Nếu bạn biết một trẻ em đã tạo tài khoản, hãy báo để chúng tôi xoá.",
        ],
      },
      {
        h: "8. Cookie",
        body: [
          "Trang web dùng cookie cần thiết để giữ bạn đăng nhập. Ngoài ra, Google AdSense có thể đặt cookie hoặc dùng mã định danh tương tự để hiển thị và đo lường quảng cáo; bạn có thể tắt quảng cáo cá nhân hoá tại adssettings.google.com hoặc chặn cookie bên thứ ba trong trình duyệt. Trình phát YouTube nhúng có thể đặt cookie riêng của Google. Ứng dụng di động không dùng cookie quảng cáo.",
        ],
      },
      {
        h: "9. Thay đổi chính sách",
        body: [
          "Khi có thay đổi quan trọng, chúng tôi sẽ thông báo trong app hoặc qua email trước khi áp dụng. Ngày cập nhật ở đầu trang cho biết phiên bản hiện hành.",
        ],
      },
      { h: "10. Liên hệ", body: ["Email: {email} — hoặc dùng Cài đặt → Gửi góp ý ngay trong app."] },
    ],
  },
  de: {
    title: "Datenschutzerklärung",
    updated: UPDATED.de,
    intro:
      "Deutsch Shadowing („wir“) besteht aus der App und der Website ckk.biz und hilft dir, Deutsch zu hören, zu sprechen und zu schreiben. Diese Erklärung beschreibt, welche Daten wir erheben, wofür wir sie nutzen und welche Rechte du hast. Wir erheben nur, was für den Dienst nötig ist, und verkaufen keine Daten. Die App enthält keine Werbung; die Website ckk.biz zeigt Werbung von Google AdSense (siehe Abschnitte 4 und 8).",
    sections: [
      {
        h: "1. Welche Daten wir erheben",
        body: [
          [
            "Konto: Anzeigename, E-Mail-Adresse, Passwort (nur als Hash gespeichert, für niemanden lesbar), Profilbild, falls du eines hochlädst, Sprache der Oberfläche.",
            "Anmeldung mit Google / Apple: die von Google / Apple übermittelte Konto-ID und E-Mail-Adresse. Bei Apple speichern wir zusätzlich ein Token, um den Zugriff beim Löschen deines Kontos zu widerrufen.",
            "Lerndaten: Vokabelheft und Beispielsätze, Fortschritt je Lektion, Diktatergebnisse, Wiederholungsverlauf, Punkte und freigeschaltete Lektionen.",
            "Feedback: Inhalt, eine Antwort-E-Mail (optional) und technische Basisdaten (Betriebssystem, Gerätemodell, App-Version), um Fehler nachzuvollziehen.",
            "Technische Daten: Die IP-Adresse wird nur kurzzeitig im Arbeitsspeicher des Servers zum Schutz vor Spam und Missbrauch verwendet und nicht in der Datenbank gespeichert.",
          ],
        ],
      },
      {
        h: "2. Mikrofon, Sprache und Fotos",
        body: [
          [
            "Das Mikrofon wird nur genutzt, wenn du auf Aufnahme tippst. Shadowing-Aufnahmen bleiben zum Anhören auf deinem Gerät und werden nicht hochgeladen.",
            "Crazy-Modus (Aussprachebewertung): Der gesprochene Satz wird an unseren Server und an einen Spracherkennungsdienst übermittelt, bewertet und sofort verworfen — wir speichern keine Aufnahmen.",
            "Fotos: Die App liest nur das Foto, das du als Profilbild auswählst; es wird vor dem Hochladen quadratisch zugeschnitten und verkleinert.",
          ],
          "Du kannst diese Berechtigungen jederzeit unter Einstellungen → Datenschutz in der App oder in den Einstellungen deines Geräts erteilen oder widerrufen.",
        ],
      },
      {
        h: "3. Wofür wir Daten nutzen",
        body: [
          [
            "Bereitstellung der Funktionen: Anmeldung, Synchronisierung von Fortschritt und Vokabelheft zwischen App und Web, Wiederholungsplan, Punkte.",
            "Rangliste: Dein Anzeigename und deine Punktzahl werden anderen angemeldeten Nutzern angezeigt. E-Mail-Adresse und Profilbild werden nicht angezeigt.",
            "Notwendige E-Mails: Bestätigungscodes, Passwort zurücksetzen, Datenkopie auf Anfrage. Wir versenden keine Werbe-E-Mails.",
            "Beantwortung von Feedback, Fehlerbehebung und Verbesserung der Lektionen.",
            "Schutz des Dienstes vor Spam, Betrug und Missbrauch.",
          ],
          "Rechtsgrundlagen nach DSGVO: Vertragserfüllung (Art. 6 Abs. 1 lit. b) für die Funktionen; berechtigtes Interesse (Art. 6 Abs. 1 lit. f) für Sicherheit und Missbrauchsschutz; deine Einwilligung (Art. 6 Abs. 1 lit. a) für Mikrofon und Fotos.",
        ],
      },
      {
        h: "4. Auftragsverarbeiter und Dritte",
        body: [
          "Wir verkaufen oder vermieten deine Daten nicht. Einige Anbieter unterstützen den Betrieb und erhalten nur die Daten, die sie dafür benötigen:",
          [
            "Hosting-Server (VPS) für Datenbank und Profilbilder.",
            "KI-Dienste (z. B. OpenAI, Groq): Aufnahmen im Crazy-Modus zur Spracherkennung sowie zu übersetzende deutsche Wörter / Sätze — ohne deinen Namen oder deine E-Mail-Adresse.",
            "Sprachausgabe-Dienste (z. B. Microsoft Azure, ElevenLabs, OpenAI): nur Sätze aus den Lektionen.",
            "Google und Apple: wenn du dich mit deren Konto anmeldest.",
            "YouTube (Google): Videos werden über den eingebetteten YouTube-Player abgespielt; YouTube kann dabei Daten gemäß der Datenschutzerklärung von Google erheben.",
            "Google AdSense (Google Ireland Ltd.): nur auf der Website — blendet Werbung ein und kann Cookies / ähnliche Kennungen zur Messung und Personalisierung von Werbung gemäß den Richtlinien von Google verwenden (policies.google.com/technologies/ads). Die App nutzt kein AdSense.",
            "E-Mail-Dienst (SMTP) für Bestätigungscodes und Benachrichtigungen.",
          ],
          "Einige Anbieter verarbeiten Daten außerhalb der EU; die Übermittlung erfolgt dann auf Grundlage geeigneter Garantien wie der EU-Standardvertragsklauseln (SCC).",
        ],
      },
      {
        h: "5. Speicherdauer und Sicherheit",
        body: [
          [
            "Konto- und Lerndaten werden gespeichert, bis du dein Konto löschst. Beim Löschen werden alle Daten und das Profilbild sofort aus der Datenbank entfernt; bereits gesendetes Feedback bleibt anonymisiert erhalten.",
            "Verbindungen sind immer verschlüsselt (HTTPS). Passwörter werden gehasht; das Anmeldetoken auf dem Handy liegt im sicheren Speicher des Betriebssystems (Keychain / Keystore).",
            "Satzübersetzungen und Beispielaudios werden für alle Lernenden gemeinsam genutzt und enthalten keine personenbezogenen Daten.",
          ],
        ],
      },
      {
        h: "6. Deine Rechte",
        body: [
          [
            "Auskunft und Berichtigung: Einstellungen → Profil.",
            "Datenkopie (Datenübertragbarkeit): Einstellungen → Datenschutz → Meine Daten anfordern (per E-Mail als JSON).",
            "Löschung: Einstellungen → Konto löschen — dauerhaft und ohne Kontaktaufnahme.",
            "Widerspruch und Einschränkung der Verarbeitung; Widerruf deiner Einwilligung (Mikrofon / Fotos) jederzeit.",
            "Beschwerde bei der Datenschutz-Aufsichtsbehörde deines Wohnorts.",
          ],
          "Für weitere Anfragen schreibe an {email}. Wir antworten innerhalb von 30 Tagen.",
        ],
      },
      {
        h: "7. Kinder",
        body: [
          "Der Dienst richtet sich nicht an Kinder unter 13 Jahren (in der EU: unter 16 Jahren ohne Zustimmung der Eltern). Wenn du weißt, dass ein Kind ein Konto erstellt hat, melde es uns bitte, damit wir es löschen.",
        ],
      },
      {
        h: "8. Cookies",
        body: [
          "Die Website verwendet technisch notwendige Cookies, um dich angemeldet zu halten. Zusätzlich kann Google AdSense Cookies oder ähnliche Kennungen setzen, um Werbung anzuzeigen und zu messen; personalisierte Werbung kannst du unter adssettings.google.com deaktivieren oder Drittanbieter-Cookies im Browser blockieren. Der eingebettete YouTube-Player kann eigene Cookies von Google setzen. Die App verwendet keine Werbe-Cookies.",
        ],
      },
      {
        h: "9. Änderungen",
        body: [
          "Über wesentliche Änderungen informieren wir dich vorab in der App oder per E-Mail. Das Datum oben auf der Seite zeigt die aktuelle Fassung.",
        ],
      },
      { h: "10. Kontakt", body: ["E-Mail: {email} — oder direkt in der App unter Einstellungen → Feedback senden."] },
    ],
  },
};

const terms: Record<LegalLang, LegalContent> = {
  vi: {
    title: "Điều khoản sử dụng",
    updated: UPDATED.vi,
    intro:
      "Khi tạo tài khoản hoặc sử dụng Deutsch Shadowing (ứng dụng di động và trang web ckk.biz), bạn đồng ý với các điều khoản dưới đây. Vui lòng đọc kỹ trước khi sử dụng.",
    sections: [
      {
        h: "1. Dịch vụ",
        body: [
          "Deutsch Shadowing là công cụ luyện nghe, nói và chép chính tả tiếng Đức qua video, kèm sổ từ vựng, ôn tập ngắt quãng và giải thích từ bằng AI. Chúng tôi có thể thêm, thay đổi hoặc ngừng một số tính năng để cải thiện dịch vụ.",
        ],
      },
      {
        h: "2. Tài khoản",
        body: [
          [
            "Bạn cần cung cấp thông tin chính xác và tự giữ bí mật mật khẩu.",
            "Mỗi tài khoản dành cho một người; bạn chịu trách nhiệm với hoạt động trên tài khoản của mình.",
            "Nếu nghi ngờ tài khoản bị truy cập trái phép, hãy đổi mật khẩu ngay — mọi thiết bị khác sẽ bị đăng xuất.",
            "Bạn có thể xoá tài khoản bất cứ lúc nào trong Cài đặt.",
          ],
        ],
      },
      {
        h: "3. Điểm và mở khoá bài học",
        body: [
          "Điểm nhận được khi luyện tập là điểm ảo trong app, không có giá trị tiền tệ và không thể quy đổi, chuyển nhượng hay hoàn lại. Chúng tôi có thể điều chỉnh cách tính điểm và số điểm cần để mở khoá; bài bạn đã mở khoá vẫn được giữ.",
        ],
      },
      {
        h: "4. Sử dụng hợp lệ",
        body: [
          "Bạn đồng ý không:",
          [
            "dùng công cụ tự động để tải hàng loạt nội dung hoặc gọi API ngoài app và trang web;",
            "tìm cách vượt qua giới hạn sử dụng, khoá bài học hay cơ chế bảo mật;",
            "làm quá tải, gây gián đoạn hoặc truy cập trái phép hệ thống;",
            "dùng dịch vụ cho mục đích trái pháp luật, hoặc gửi nội dung xúc phạm, spam qua phần góp ý.",
          ],
        ],
      },
      {
        h: "5. Nội dung",
        body: [
          [
            "Video thuộc quyền sở hữu của tác giả trên YouTube, được phát qua trình phát nhúng và tuân theo Điều khoản dịch vụ của YouTube.",
            "Phụ đề, bản dịch và giải thích từ do AI tạo chỉ mang tính tham khảo và có thể chưa chính xác.",
            "Giao diện, mã nguồn và bài học do chúng tôi biên soạn thuộc về Deutsch Shadowing.",
          ],
        ],
      },
      {
        h: "6. Dữ liệu và góp ý của bạn",
        body: [
          "Sổ từ vựng và tiến độ học thuộc về bạn — bạn có thể xuất hoặc xoá bất cứ lúc nào. Khi gửi góp ý, bạn cho phép chúng tôi dùng ý tưởng đó để cải thiện dịch vụ mà không phát sinh nghĩa vụ nào. Việc xử lý dữ liệu cá nhân tuân theo Chính sách quyền riêng tư.",
        ],
      },
      {
        h: "7. Miễn trừ bảo đảm",
        body: [
          "Dịch vụ được cung cấp theo hiện trạng. Chúng tôi luôn cố gắng giữ dịch vụ ổn định nhưng không bảo đảm dịch vụ không bao giờ gián đoạn, không có lỗi, hay đem lại kết quả học tập cụ thể.",
        ],
      },
      {
        h: "8. Giới hạn trách nhiệm",
        body: [
          "Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm về thiệt hại gián tiếp phát sinh từ việc sử dụng dịch vụ. Điều này không giới hạn trách nhiệm mà pháp luật bắt buộc, chẳng hạn với lỗi cố ý, sơ suất nghiêm trọng hoặc quyền lợi của người tiêu dùng.",
        ],
      },
      {
        h: "9. Tạm ngưng và chấm dứt",
        body: [
          "Chúng tôi có thể tạm khoá hoặc xoá tài khoản vi phạm nghiêm trọng các điều khoản này, và sẽ thông báo trước khi có thể. Bạn có thể ngừng sử dụng và xoá tài khoản bất cứ lúc nào.",
        ],
      },
      {
        h: "10. Thay đổi điều khoản",
        body: [
          "Khi có thay đổi quan trọng, chúng tôi thông báo trước trong app hoặc qua email. Tiếp tục sử dụng sau ngày áp dụng nghĩa là bạn đồng ý với điều khoản mới.",
        ],
      },
      { h: "11. Liên hệ", body: ["Email: {email} — hoặc dùng Cài đặt → Gửi góp ý ngay trong app."] },
    ],
  },
  de: {
    title: "Nutzungsbedingungen",
    updated: UPDATED.de,
    intro:
      "Mit der Erstellung eines Kontos oder der Nutzung von Deutsch Shadowing (App und Website ckk.biz) stimmst du den folgenden Bedingungen zu. Bitte lies sie aufmerksam durch.",
    sections: [
      {
        h: "1. Der Dienst",
        body: [
          "Deutsch Shadowing ist ein Werkzeug zum Hör-, Sprech- und Diktattraining mit Videos, inklusive Vokabelheft, verteilter Wiederholung und KI-Worterklärungen. Wir können Funktionen hinzufügen, ändern oder einstellen, um den Dienst zu verbessern.",
        ],
      },
      {
        h: "2. Konto",
        body: [
          [
            "Gib korrekte Angaben an und halte dein Passwort geheim.",
            "Jedes Konto ist für eine Person bestimmt; du bist für Aktivitäten in deinem Konto verantwortlich.",
            "Bei Verdacht auf unbefugten Zugriff ändere sofort dein Passwort — alle anderen Geräte werden abgemeldet.",
            "Du kannst dein Konto jederzeit in den Einstellungen löschen.",
          ],
        ],
      },
      {
        h: "3. Punkte und Freischaltungen",
        body: [
          "Punkte aus dem Training sind virtuelle Punkte ohne Geldwert und können nicht umgetauscht, übertragen oder erstattet werden. Wir können die Punktevergabe und die Kosten für Freischaltungen anpassen; bereits freigeschaltete Lektionen bleiben erhalten.",
        ],
      },
      {
        h: "4. Zulässige Nutzung",
        body: [
          "Du verpflichtest dich, Folgendes zu unterlassen:",
          [
            "automatisiertes Herunterladen von Inhalten oder Nutzung der API außerhalb von App und Website;",
            "Umgehung von Nutzungslimits, Lektionssperren oder Sicherheitsmechanismen;",
            "Überlastung, Störung oder unbefugter Zugriff auf die Systeme;",
            "rechtswidrige Nutzung oder das Senden beleidigender Inhalte bzw. Spam über das Feedback.",
          ],
        ],
      },
      {
        h: "5. Inhalte",
        body: [
          [
            "Videos gehören ihren Urhebern auf YouTube, werden über den eingebetteten Player abgespielt und unterliegen den Nutzungsbedingungen von YouTube.",
            "Untertitel, Übersetzungen und Worterklärungen werden von KI erstellt, dienen nur als Hilfe und können Fehler enthalten.",
            "Oberfläche, Quellcode und von uns erstellte Lektionen gehören Deutsch Shadowing.",
          ],
        ],
      },
      {
        h: "6. Deine Daten und dein Feedback",
        body: [
          "Vokabelheft und Lernfortschritt gehören dir — du kannst sie jederzeit exportieren oder löschen. Mit dem Senden von Feedback erlaubst du uns, deine Ideen ohne weitere Verpflichtung zur Verbesserung des Dienstes zu nutzen. Personenbezogene Daten verarbeiten wir gemäß unserer Datenschutzerklärung.",
        ],
      },
      {
        h: "7. Gewährleistung",
        body: [
          "Der Dienst wird so bereitgestellt, wie er ist. Wir bemühen uns um einen stabilen Betrieb, garantieren aber keine ununterbrochene, fehlerfreie Verfügbarkeit oder bestimmte Lernergebnisse.",
        ],
      },
      {
        h: "8. Haftung",
        body: [
          "Soweit gesetzlich zulässig, haften wir nicht für mittelbare Schäden aus der Nutzung des Dienstes. Die gesetzliche Haftung, insbesondere bei Vorsatz, grober Fahrlässigkeit oder nach Verbraucherschutzrecht, bleibt unberührt.",
        ],
      },
      {
        h: "9. Sperrung und Kündigung",
        body: [
          "Bei schweren Verstößen gegen diese Bedingungen können wir ein Konto sperren oder löschen und informieren dich nach Möglichkeit vorher. Du kannst die Nutzung jederzeit beenden und dein Konto löschen.",
        ],
      },
      {
        h: "10. Änderungen",
        body: [
          "Über wesentliche Änderungen informieren wir dich vorab in der App oder per E-Mail. Wenn du den Dienst nach dem Inkrafttreten weiter nutzt, gelten die neuen Bedingungen als akzeptiert.",
        ],
      },
      { h: "11. Kontakt", body: ["E-Mail: {email} — oder direkt in der App unter Einstellungen → Feedback senden."] },
    ],
  },
};

export const LEGAL: Record<LegalDoc, Record<LegalLang, LegalContent>> = { privacy, terms };

/** Đường dẫn trang (tiếng Việt ở gốc, tiếng Đức thêm /de) */
export const legalPath = (doc: LegalDoc, lang: LegalLang) => `/${doc}${lang === "de" ? "/de" : ""}`;
