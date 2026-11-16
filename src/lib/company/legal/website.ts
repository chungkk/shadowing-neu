import { APPLE_PRIVACY, GOOGLE_PRIVACY, HOSTING, MAIL, changes, controller, perLocale, rights, transferNote } from './common';
import type { LegalSection, Localized } from './types';
import type { Locale } from '@/components/company/LocaleContext';

/**
 * Datenschutzerklärung von HalloVN – die einzige vollständige Fassung für Website hallovn.de UND App HalloVN.
 * Angezeigt unter /privacy (WebsitePrivacy) und /shadowing/privacy (ProductPrivacy, gleicher Inhalt);
 * /deutsch-shadowing/privacy leitet auf /privacy weiter.
 *
 * Jede Aussage ist im Code belegt (Stand Nov. 2026) – beim Ändern von Diensten bitte hier nachziehen:
 * - Konto/Passwort (scrypt), Sitzung 30 Tage: src/lib/auth.ts · Google/Apple: src/lib/oauth.ts, src/lib/account.ts
 * - Löschen: deleteUser() in src/lib/db.ts, removeAccount() in src/lib/account.ts · Export: /api/v1/me/export
 * - KI: src/lib/translate.ts, word.ts, punctuate.ts, whisper.ts · Sprachausgabe: src/lib/tts.ts
 * - Sprechräume (WebRTC, STUN von Google, optional TURN): src/lib/sprechen.ts
 * - E-Mail (SMTP, Standard Gmail): src/lib/mail.ts · Feedback/Support-Formular: /api/v1/feedback
 * - Cookies: session, play_guest, lx_class, lx_lang, lid_state · AdSense: (app)/layout.tsx
 * - Backups: scripts/backup (täglich, 7 Stände auf dem Server, bis zu 60 Stände als Kopie beim Betreiber)
 */

const ADS_LINK = 'https://policies.google.com/technologies/ads';

const body: Record<Locale, LegalSection[]> = {
    de: [
        {
            id: 'overview',
            title: 'Geltungsbereich und Überblick',
            blocks: [
                'Diese Erklärung gilt für die Website **hallovn.de** mit allen Bereichen (Deutsch lernen mit Videos, Wortschatz, Führerschein-Theorie, Leben in Deutschland, Lernspiele, Sprechräume) und für die App **HalloVN** für iOS und Android. Website und App nutzen dasselbe Konto und denselben Server.',
                {
                    list: [
                        'Die meisten Inhalte können Sie ohne Konto nutzen. Ein kostenloses Konto speichert Ihren Lernstand, damit Sie auf allen Geräten weiterlernen können.',
                        'Die Website finanziert sich durch Werbung von Google AdSense. Personalisierte Werbung und Werbe-Cookies gibt es nur mit Ihrer Einwilligung. Die App enthält keine Werbung.',
                        'Wir setzen keine Analyse- oder Tracking-Dienste ein, verkaufen keine Daten und erstellen keine Profile zu Werbezwecken.',
                    ],
                },
            ],
        },
        {
            id: 'hosting',
            title: 'Hosting, Verbindungsdaten und Sicherheit',
            blocks: [
                `Website, Schnittstelle der App und Datenbank laufen auf einem eigenen Server bei ${HOSTING.de}. Bei jedem Aufruf verarbeitet der Server technisch notwendige Daten: IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse, Referrer, Browser bzw. App-Version und Betriebssystem.`,
                'Die IP-Adresse nutzen wir nur kurzzeitig im Arbeitsspeicher, um Missbrauch, Spam und das massenhafte Auslesen der Fragenkataloge zu begrenzen (Zugriffslimits; bei Suchmaschinen-Bots eine DNS-Prüfung). Sie wird nicht in der Datenbank gespeichert. Technische Protokolle des Servers werden nach höchstens 30 Tagen gelöscht. Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren, stabilen Betrieb (Art. 6 Abs. 1 lit. f DSGVO).',
                'Alle Verbindungen sind verschlüsselt (HTTPS). Schriftarten liegen auf unserem Server. Einige Videos zu Führerscheinfragen werden von einem weiteren von uns betriebenen Medienserver geladen; dabei wird ebenfalls Ihre IP-Adresse verarbeitet.',
            ],
        },
        {
            id: 'account',
            title: 'Benutzerkonto und Anmeldung',
            blocks: [
                'Für ein Konto speichern wir: E-Mail-Adresse, Anzeigename, Passwort (nur als gesalzener scrypt-Hash, für niemanden lesbar), Sprache der Oberfläche, Datum der Registrierung und optional ein Profilbild. Ihre E-Mail-Adresse bestätigen Sie mit einem Code, den wir nur als Hash und befristet speichern.',
                `**Mit Google oder Apple anmelden:** Wir erhalten die Nutzerkennung des Anbieters und Ihre E-Mail-Adresse, bei Apple ggf. eine anonyme Weiterleitungsadresse. Bei Apple speichern wir zusätzlich ein Token, um die Verbindung beim Löschen Ihres Kontos bei Apple zu widerrufen. Erst wenn Sie den Anmeldedialog öffnen, werden die Anmeldeskripte von Google bzw. Apple geladen ([Datenschutzerklärung von Google](${GOOGLE_PRIVACY}), [Datenschutzrichtlinie von Apple](${APPLE_PRIVACY})).`,
                '**Angemeldet bleiben:** Im Browser setzen wir das Cookie „session“ (HttpOnly, 30 Tage). Die App speichert ihr Anmeldetoken im geschützten Speicher des Geräts (iOS-Schlüsselbund bzw. Android Keystore). Wenn Sie Ihr Passwort ändern oder „Auf allen Geräten abmelden“ wählen, werden alle anderen Sitzungen ungültig.',
                '**Wer sieht was:** Ihr Profilbild sehen nur Sie. Ihr Anzeigename und Ihre Punktzahl erscheinen in der Rangliste für andere angemeldete Nutzer. In Sprechräumen und Mehrspieler-Spielen sehen die anderen Teilnehmer Ihren Anzeigenamen. Die E-Mail-Adresse wird niemandem angezeigt.',
                'Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).',
            ],
        },
        {
            id: 'learning',
            title: 'Lerndaten',
            blocks: [
                'Mit Konto speichern wir auf unserem Server, was Sie beim Lernen anlegen oder erreichen:',
                {
                    list: [
                        'Deutsch: Vokabelheft mit Notizen und Beispielsätzen, markierte Sätze, Fortschritt je Lektion und Video, Diktat-Ergebnisse, Wiederholungsplan und -verlauf, freigeschaltete Lektionen.',
                        'Führerschein-Theorie und Leben in Deutschland: beantwortete Fragen (richtig/falsch), Merkliste, Probeprüfungen und Einstellungen wie Führerscheinklasse oder Bundesland.',
                        'Spiele und Motivation: Punkte, Diamanten, Lernserie und Spielrunden (z. B. Sudoku, Caro). Punkte und Diamanten haben keinen Geldwert.',
                    ],
                },
                'Daraus erstellen wir die Erinnerungen in der Glocke (Website) und in der App. Tägliche Erinnerungen der App sind lokale Mitteilungen, die die App selbst auf Ihrem Gerät plant; einen Push-Dienst nutzen wir nicht.',
                'Ohne Konto bleiben Einstellungen und Zwischenstände auf Ihrem Gerät (lokaler Speicher, siehe „Cookies und lokaler Speicher“). Wer ohne Konto Sudoku oder Caro mit anderen spielt, erhält einen zufälligen Gastnamen, der mit dem Cookie „play_guest“ (30 Tage) wiedererkannt wird.',
                'Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.',
            ],
        },
        {
            id: 'youtube',
            title: 'YouTube-Videos',
            blocks: [
                'Videolektionen werden mit dem eingebetteten Player von YouTube (Google Ireland Limited) abgespielt, auf der Website und in der App. Sobald Sie eine Videoseite öffnen, baut Ihr Gerät eine Verbindung zu YouTube auf. Google erhält dabei u. a. Ihre IP-Adresse und die aufgerufene Seite und kann Cookies oder ähnliche Technologien einsetzen. Vorschaubilder der Videos werden direkt von Google-Servern (i.ytimg.com) geladen.',
                'Untertitel und, falls keine vorhanden sind, die Tonspur eines Videos ruft unser Server bei YouTube ab und speichert die Untertitel zwischen. Die App kann Untertitel, die sie auf Ihrem Gerät von YouTube geladen hat, an unseren Server übermitteln; diese werden mit Ihrer Nutzer-ID als Beitrag gespeichert und allen Lernenden zur Verfügung gestellt.',
                `Rechtsgrundlage ist unser berechtigtes Interesse, Lerninhalte mit Videos anzubieten (Art. 6 Abs. 1 lit. f DSGVO). Näheres: [Datenschutzerklärung von Google](${GOOGLE_PRIVACY}).`,
            ],
        },
        {
            id: 'ai',
            title: 'KI-Funktionen und Sprachausgabe',
            blocks: [
                'Für Übersetzungen, Wortbedeutungen, Satzzeichen in automatischen Untertiteln und das Erstellen von Untertiteln aus der Tonspur eines Videos senden wir den jeweiligen deutschen Text bzw. die Tonspur an KI-Dienste (Groq, Inc. und OpenAI). Für die Sprachausgabe deutscher Wörter und Sätze nutzen wir je nach Konfiguration ElevenLabs, Microsoft Azure (Speech) oder OpenAI.',
                'Dabei übermitteln wir nur Lerninhalte, nicht Ihren Namen, Ihre E-Mail-Adresse oder Ihre Nutzer-ID. Die Ergebnisse speichern wir zwischen und nutzen sie für alle Lernenden; sie enthalten keine personenbezogenen Daten. Ohne Konto liest die Website Sätze mit der eingebauten Sprachausgabe Ihres Browsers vor.',
                'KI-Ergebnisse dienen nur als Lernhilfe und können Fehler enthalten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.',
            ],
        },
        {
            id: 'microphone',
            title: 'Mikrofon, Sprechübungen und Sprechräume',
            blocks: [
                'Das Mikrofon wird nur verwendet, nachdem Sie es im Browser bzw. in der App erlaubt und eine Aufnahme oder einen Anruf gestartet haben. Sie können die Berechtigung jederzeit in den Einstellungen des Browsers oder des Geräts (in der App unter Einstellungen → Datenschutz) widerrufen.',
                {
                    list: [
                        '**Nachsprechen (Shadowing):** Ihre Aufnahmen bleiben auf Ihrem Gerät, damit Sie sie anhören und vergleichen können. Auf der Website liegen sie nur im Speicher der geöffneten Seite. Sie werden nicht hochgeladen.',
                        '**Aussprachebewertung:** Soweit diese Funktion angeboten wird, wird die Aufnahme eines einzelnen Satzes an unseren Server und von dort an einen Transkriptionsdienst (Groq oder OpenAI) gesendet. Der erkannte Text wird mit dem Originalsatz verglichen; die Aufnahme wird nicht gespeichert.',
                        `**Sprechräume:** Gespräche mit anderen Lernenden laufen über WebRTC direkt zwischen den Geräten der Teilnehmer. Unser Server vermittelt nur den Verbindungsaufbau und speichert Räume ausschließlich im Arbeitsspeicher. Für den Aufbau werden STUN-Server von Google genutzt; dabei sehen Google und die anderen Teilnehmer technisch Ihre IP-Adresse. Wenn eine direkte Verbindung nicht möglich ist, kann der Ton verschlüsselt über einen Relay-Server (TURN) weitergeleitet werden. Wir zeichnen Gespräche nicht auf.`,
                        `**Spracherkennung des Geräts:** Falls die App die Spracherkennung des Betriebssystems verwendet, verarbeitet Apple bzw. Google die Audiodaten nach deren eigenen Bestimmungen.`,
                    ],
                },
                'Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO; der Zugriff auf das Mikrofon erfolgt nur mit Ihrer Erlaubnis.',
            ],
        },
        {
            id: 'photos',
            title: 'Profilbild',
            blocks: ['Ein Profilbild ist freiwillig. Die App liest nur das Foto, das Sie auswählen, schneidet es zu und verkleinert es vor dem Hochladen. Wir speichern es auf unserem Server; angezeigt wird es nur Ihnen. Sie können es jederzeit entfernen.'],
        },
        {
            id: 'mail',
            title: 'E-Mails, Feedback und Support-Formular',
            blocks: [
                'Wir senden nur E-Mails, die für Ihr Konto nötig sind oder die Sie anfordern: Bestätigungscodes, Codes zum Zurücksetzen des Passworts, Hinweise bei Änderung von Passwort oder E-Mail-Adresse und auf Wunsch eine Kopie Ihrer Daten. Werbe-E-Mails oder Newsletter versenden wir nicht. Der Versand läuft über den SMTP-Dienst von Google (Gmail/Google Workspace).',
                'Wenn Sie über das Support-Formular der Website oder über „Feedback senden“ in der App schreiben, speichern wir Ihre Nachricht, die Art der Anfrage, Ihre E-Mail-Adresse (falls angegeben bzw. die Ihres Kontos), einen ggf. angegebenen Namen und technische Basisangaben (z. B. Betriebssystem, Gerätemodell, App-Version). Zusätzlich werden wir per E-Mail benachrichtigt.',
                'Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO bzw. unser berechtigtes Interesse an der Bearbeitung von Anfragen (Art. 6 Abs. 1 lit. f DSGVO).',
            ],
        },
        {
            id: 'ads',
            title: 'Werbung mit Google AdSense (nur Website)',
            blocks: [
                'Die Website hallovn.de blendet Werbung über Google AdSense ein. Anbieter ist Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland („Google“). Die App HalloVN enthält keine Werbung.',
                'Dabei verarbeitet Google unter anderem Ihre IP-Adresse, Angaben zu Browser und Gerät, die aufgerufene Seite und Ihre Interaktion mit Anzeigen. Mit Ihrer Einwilligung nutzt Google Cookies und ähnliche Technologien, um Anzeigen auszuliefern, zu messen und auf Ihre Interessen zuzuschneiden.',
                'Beim ersten Besuch fragt Sie die Einwilligungsplattform von Google (nach dem Standard IAB TCF), ob und wofür Sie einwilligen. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Ohne Einwilligung können eingeschränkte, nicht personalisierte Anzeigen erscheinen, für die keine Cookies gespeichert werden.',
                'Sie können Ihre Auswahl jederzeit über **Datenschutz-Einstellungen** im Fußbereich dieser Seiten ändern oder widerrufen. Personalisierte Werbung von Google können Sie außerdem unter [adssettings.google.com](https://adssettings.google.com) abschalten.',
                `Wie Google Daten aus Werbung verwendet: [policies.google.com/technologies/ads](${ADS_LINK}) und die [Datenschutzerklärung von Google](${GOOGLE_PRIVACY}).`,
            ],
        },
        {
            id: 'cookies',
            title: 'Cookies und lokaler Speicher',
            blocks: [
                'Eigene Cookies setzen wir nur, soweit sie für die von Ihnen genutzte Funktion erforderlich sind (§ 25 Abs. 2 Nr. 2 TDDDG):',
                {
                    list: [
                        '„session“: hält Sie angemeldet (30 Tage).',
                        '„play_guest“: erkennt Gäste in Mehrspieler-Spielen wieder (30 Tage).',
                        '„lx_class“, „lx_lang“, „lid_state“: gewählte Führerscheinklasse, Sprache der Fragen und Bundesland (1 Jahr).',
                    ],
                },
                'Im lokalen Speicher Ihres Browsers bzw. der App legen wir Einstellungen ab, z. B. Sprache, helles/dunkles Design, Lerneinstellungen und noch nicht übertragene Antworten. Diese Daten verlassen Ihr Gerät nicht, solange Sie nicht angemeldet sind.',
                'Cookies von Google für Werbung entstehen nur mit Ihrer Einwilligung (siehe „Werbung mit Google AdSense“). Der YouTube-Player kann eigene Cookies setzen (siehe „YouTube-Videos“).',
            ],
        },
        {
            id: 'recipients',
            title: 'Empfänger und Dienstleister',
            blocks: [
                'Wir verkaufen oder vermieten keine Daten. Folgende Dienstleister erhalten jeweils nur die Daten, die sie für ihre Aufgabe brauchen:',
                {
                    list: [
                        `Hosting: ${HOSTING.de}`,
                        'E-Mail-Versand und Postfach: Google (Gmail/Google Workspace)',
                        'Anmeldung: Google (Mit Google anmelden), Apple (Mit Apple anmelden)',
                        'Videos und Vorschaubilder: YouTube (Google Ireland Limited)',
                        'KI-Dienste: Groq, Inc. und OpenAI (nur Texte und Tonspuren von Lerninhalten bzw. einzelne Aufnahmen zur Aussprachebewertung)',
                        'Sprachausgabe: ElevenLabs, Microsoft Azure, OpenAI (nur Lerninhalte)',
                        'Sprechräume: STUN-Server von Google; ggf. ein Relay-Server (TURN)',
                        'Werbung (nur Website): Google Ireland Limited (Google AdSense)',
                    ],
                },
                transferNote('de'),
            ],
        },
        {
            id: 'retention',
            title: 'Speicherdauer, Datenkopie und Kontolöschung',
            blocks: [
                'Konto- und Lerndaten speichern wir, solange Ihr Konto besteht. Bestätigungscodes verfallen nach kurzer Zeit.',
                `**Datenkopie:** Unter Einstellungen → „Meine Daten herunterladen“ (Website) bzw. Einstellungen → Datenschutz (App) erhalten Sie eine Kopie aller Konto- und Lerndaten als JSON-Datei per E-Mail.`,
                `**Konto löschen:** Auf der Website unter [Einstellungen](/settings) oder in der App unter Einstellungen → „Konto löschen“. Dabei werden Konto, Profilbild, Vokabelheft, Fortschritt, Antworten, Punkte, Spielplätze und Anmeldungen mit Google/Apple sofort und dauerhaft gelöscht; eine Anmeldung mit Apple wird bei Apple widerrufen. Bereits gesendetes Feedback bleibt ohne Verbindung zu Ihrem Konto und ohne E-Mail-Adresse erhalten. Alternativ genügt eine E-Mail an [${MAIL}](mailto:${MAIL}).`,
                '**Sicherungskopien:** Wir sichern die Datenbank täglich. Sicherungen werden verschlüsselt übertragen, nur vom Betreiber verwahrt und nach spätestens 60 Tagen überschrieben; gelöschte Daten verschwinden spätestens dann auch aus den Sicherungen.',
                'Anfragen und Feedback löschen wir, wenn sie erledigt sind und keine gesetzlichen Aufbewahrungspflichten bestehen.',
            ],
        },
    ],
    en: [
        {
            id: 'overview',
            title: 'Scope and overview',
            blocks: [
                'This policy applies to the website **hallovn.de** with all its sections (learning German with videos, vocabulary, driving theory, Leben in Deutschland, learning games, speaking rooms) and to the **HalloVN** app for iOS and Android. The website and the app share the same account and server.',
                {
                    list: [
                        'You can use most content without an account. A free account stores your learning progress so you can continue on any device.',
                        'The website is funded by Google AdSense ads. Personalised ads and advertising cookies are only used with your consent. The app contains no ads.',
                        'We use no analytics or tracking services, do not sell data and do not build profiles for advertising.',
                    ],
                },
            ],
        },
        {
            id: 'hosting',
            title: 'Hosting, connection data and security',
            blocks: [
                `The website, the app’s API and the database run on our own server at ${HOSTING.en}. With every request the server processes technically necessary data: IP address, date and time, requested address, referrer, browser or app version and operating system.`,
                'We only use the IP address briefly in memory to limit abuse, spam and mass scraping of the question catalogues (rate limits; a DNS check for search engine bots). It is not stored in the database. Technical server logs are deleted after 30 days at most. The legal basis is our legitimate interest in secure, stable operation (Art. 6(1)(f) GDPR).',
                'All connections are encrypted (HTTPS). Fonts are served from our server. Some videos for driving theory questions are loaded from another media server we operate; your IP address is processed there as well.',
            ],
        },
        {
            id: 'account',
            title: 'Account and sign-in',
            blocks: [
                'For an account we store: email address, display name, password (only as a salted scrypt hash, readable by no one), interface language, registration date and an optional profile picture. You confirm your email address with a code that we store only as a hash and for a limited time.',
                `**Sign in with Google or Apple:** We receive the provider’s user ID and your email address, with Apple possibly an anonymous relay address. For Apple we also store a token so that the connection can be revoked at Apple when you delete your account. The sign-in scripts of Google or Apple are only loaded when you open the sign-in dialog ([Google’s privacy policy](${GOOGLE_PRIVACY}), [Apple’s privacy policy](${APPLE_PRIVACY})).`,
                '**Staying signed in:** In the browser we set the cookie “session” (HttpOnly, 30 days). The app keeps its sign-in token in the device’s protected storage (iOS Keychain or Android Keystore). Changing your password or choosing “Sign out on all devices” invalidates all other sessions.',
                '**Who sees what:** Only you see your profile picture. Your display name and score appear on the leaderboard for other signed-in users. In speaking rooms and multiplayer games, other participants see your display name. Your email address is never shown to anyone.',
                'The legal basis is the performance of the user agreement (Art. 6(1)(b) GDPR).',
            ],
        },
        {
            id: 'learning',
            title: 'Learning data',
            blocks: [
                'With an account we store on our server what you create or achieve while learning:',
                {
                    list: [
                        'German: vocabulary book with notes and example sentences, starred sentences, progress per lesson and video, dictation results, review schedule and history, unlocked lessons.',
                        'Driving theory and Leben in Deutschland: answered questions (right/wrong), saved questions, mock exams and settings such as licence class or federal state.',
                        'Games and motivation: points, diamonds, learning streak and game rounds (e.g. Sudoku, Caro). Points and diamonds have no monetary value.',
                    ],
                },
                'We use this data for the reminders in the bell (website) and in the app. The app’s daily reminders are local notifications scheduled by the app on your device; we do not use a push service.',
                'Without an account, settings and interim progress stay on your device (local storage, see “Cookies and local storage”). If you play Sudoku or Caro with others without an account, you get a random guest name that is recognised with the cookie “play_guest” (30 days).',
                'The legal basis is Art. 6(1)(b) GDPR.',
            ],
        },
        {
            id: 'youtube',
            title: 'YouTube videos',
            blocks: [
                'Video lessons are played with the embedded YouTube player (Google Ireland Limited), on the website and in the app. As soon as you open a video page, your device connects to YouTube. Google receives, among other things, your IP address and the page visited and may use cookies or similar technologies. Video thumbnails are loaded directly from Google servers (i.ytimg.com).',
                'Our server fetches subtitles from YouTube and, if there are none, a video’s audio track, and caches the subtitles. The app may send subtitles it has loaded from YouTube on your device to our server; these are stored with your user ID as a contribution and made available to all learners.',
                `The legal basis is our legitimate interest in offering learning content with videos (Art. 6(1)(f) GDPR). More: [Google’s privacy policy](${GOOGLE_PRIVACY}).`,
            ],
        },
        {
            id: 'ai',
            title: 'AI features and text-to-speech',
            blocks: [
                'For translations, word meanings, punctuation in automatic subtitles and creating subtitles from a video’s audio track, we send the German text or the audio track to AI services (Groq, Inc. and OpenAI). For reading German words and sentences aloud we use ElevenLabs, Microsoft Azure (Speech) or OpenAI, depending on configuration.',
                'We only send learning content, not your name, email address or user ID. We cache the results and use them for all learners; they contain no personal data. Without an account, the website reads sentences aloud with your browser’s built-in voice.',
                'AI results are only a learning aid and may contain errors. The legal basis is Art. 6(1)(b) GDPR.',
            ],
        },
        {
            id: 'microphone',
            title: 'Microphone, speaking exercises and speaking rooms',
            blocks: [
                'The microphone is only used after you allow it in your browser or the app and start a recording or a call. You can revoke the permission at any time in your browser or device settings (in the app under Settings → Privacy).',
                {
                    list: [
                        '**Shadowing:** Your recordings stay on your device so you can listen and compare. On the website they are only held in the memory of the open page. They are not uploaded.',
                        '**Pronunciation scoring:** Where this feature is offered, the recording of a single sentence is sent to our server and from there to a transcription service (Groq or OpenAI). The recognised text is compared with the original sentence; the recording is not stored.',
                        '**Speaking rooms:** Conversations with other learners run over WebRTC directly between the participants’ devices. Our server only arranges the connection and keeps rooms in memory only. Google STUN servers are used to set up the connection, so Google and the other participants can technically see your IP address. If a direct connection is not possible, the audio may be relayed in encrypted form through a relay server (TURN). We do not record conversations.',
                        '**Device speech recognition:** If the app uses the operating system’s speech recognition, Apple or Google processes the audio under their own terms.',
                    ],
                },
                'The legal basis is Art. 6(1)(b) GDPR; the microphone is only accessed with your permission.',
            ],
        },
        {
            id: 'photos',
            title: 'Profile picture',
            blocks: ['A profile picture is optional. The app only reads the photo you choose, crops and resizes it before uploading. We store it on our server and only show it to you. You can remove it at any time.'],
        },
        {
            id: 'mail',
            title: 'Emails, feedback and support form',
            blocks: [
                'We only send emails that your account needs or that you request: verification codes, password reset codes, notices when your password or email address changes and, on request, a copy of your data. We send no marketing emails or newsletters. Emails are sent via Google’s SMTP service (Gmail/Google Workspace).',
                'If you write to us via the website’s support form or “Send feedback” in the app, we store your message, the type of request, your email address (if given, or that of your account), a name if you give one and basic technical details (e.g. operating system, device model, app version). We are also notified by email.',
                'The legal basis is Art. 6(1)(b) GDPR or our legitimate interest in handling requests (Art. 6(1)(f) GDPR).',
            ],
        },
        {
            id: 'ads',
            title: 'Advertising with Google AdSense (website only)',
            blocks: [
                'The website hallovn.de shows ads through Google AdSense, provided by Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland (“Google”). The HalloVN app contains no ads.',
                'Google processes, among other things, your IP address, information about your browser and device, the page you visit and your interaction with ads. With your consent, Google uses cookies and similar technologies to deliver and measure ads and tailor them to your interests.',
                'On your first visit, Google’s consent platform (based on the IAB TCF standard) asks whether and for what you consent. The legal basis is your consent (Art. 6(1)(a) GDPR, Section 25(1) TDDDG). Without consent, limited, non-personalised ads may appear that do not store cookies.',
                'You can change or withdraw your choice at any time via **Privacy settings** in the footer of these pages. You can also turn off personalised ads from Google at [adssettings.google.com](https://adssettings.google.com).',
                `How Google uses data from advertising: [policies.google.com/technologies/ads](${ADS_LINK}) and [Google’s privacy policy](${GOOGLE_PRIVACY}).`,
            ],
        },
        {
            id: 'cookies',
            title: 'Cookies and local storage',
            blocks: [
                'We only set our own cookies where they are required for a function you use (Section 25(2) No. 2 TDDDG):',
                {
                    list: [
                        '“session”: keeps you signed in (30 days).',
                        '“play_guest”: recognises guests in multiplayer games (30 days).',
                        '“lx_class”, “lx_lang”, “lid_state”: chosen licence class, question language and federal state (1 year).',
                    ],
                },
                'In your browser’s or the app’s local storage we keep settings such as language, light/dark theme, learning preferences and answers not yet synced. This data does not leave your device unless you are signed in.',
                'Advertising cookies from Google are only set with your consent (see “Advertising with Google AdSense”). The YouTube player may set its own cookies (see “YouTube videos”).',
            ],
        },
        {
            id: 'recipients',
            title: 'Recipients and service providers',
            blocks: [
                'We do not sell or rent data. The following providers only receive the data they need for their task:',
                {
                    list: [
                        `Hosting: ${HOSTING.en}`,
                        'Sending email and mailbox: Google (Gmail/Google Workspace)',
                        'Sign-in: Google (Sign in with Google), Apple (Sign in with Apple)',
                        'Videos and thumbnails: YouTube (Google Ireland Limited)',
                        'AI services: Groq, Inc. and OpenAI (only texts and audio tracks of learning content or single recordings for pronunciation scoring)',
                        'Text-to-speech: ElevenLabs, Microsoft Azure, OpenAI (learning content only)',
                        'Speaking rooms: Google STUN servers; possibly a relay server (TURN)',
                        'Advertising (website only): Google Ireland Limited (Google AdSense)',
                    ],
                },
                transferNote('en'),
            ],
        },
        {
            id: 'retention',
            title: 'Retention, data copy and account deletion',
            blocks: [
                'We keep account and learning data as long as your account exists. Verification codes expire after a short time.',
                '**Data copy:** Under Settings → “Download my data” (website) or Settings → Privacy (app) you receive a copy of all account and learning data as a JSON file by email.',
                `**Delete account:** On the website under [Settings](/settings) or in the app under Settings → “Delete account”. This immediately and permanently deletes your account, profile picture, vocabulary book, progress, answers, points, game seats and Google/Apple sign-in links; a Sign in with Apple link is revoked at Apple. Feedback you already sent is kept without any link to your account and without your email address. Alternatively, an email to [${MAIL}](mailto:${MAIL}) is enough.`,
                '**Backups:** We back up the database daily. Backups are transferred encrypted, kept only by the operator and overwritten after 60 days at the latest; deleted data disappears from the backups by then at the latest.',
                'We delete requests and feedback once they are handled and no statutory retention duties apply.',
            ],
        },
    ],
    vi: [
        {
            id: 'overview',
            title: 'Phạm vi và tổng quan',
            blocks: [
                'Chính sách này áp dụng cho trang web **hallovn.de** với mọi mục (học tiếng Đức qua video, từ vựng, lý thuyết lái xe, Leben in Deutschland, game học tập, phòng luyện nói) và cho ứng dụng **HalloVN** trên iOS và Android. Trang web và ứng dụng dùng chung một tài khoản và một máy chủ.',
                {
                    list: [
                        'Phần lớn nội dung dùng được mà không cần tài khoản. Tài khoản miễn phí lưu tiến độ học để bạn học tiếp trên mọi thiết bị.',
                        'Trang web có quảng cáo của Google AdSense. Quảng cáo cá nhân hoá và cookie quảng cáo chỉ được dùng khi bạn đồng ý. Ứng dụng không có quảng cáo.',
                        'Chúng tôi không dùng dịch vụ phân tích hay theo dõi, không bán dữ liệu và không lập hồ sơ người dùng cho mục đích quảng cáo.',
                    ],
                },
            ],
        },
        {
            id: 'hosting',
            title: 'Lưu trữ, dữ liệu kết nối và bảo mật',
            blocks: [
                `Trang web, giao diện lập trình (API) của ứng dụng và cơ sở dữ liệu chạy trên máy chủ riêng tại ${HOSTING.vi}. Mỗi lần truy cập, máy chủ xử lý các dữ liệu kỹ thuật cần thiết: địa chỉ IP, ngày giờ, địa chỉ được truy cập, trang giới thiệu, phiên bản trình duyệt hoặc ứng dụng và hệ điều hành.`,
                'Địa chỉ IP chỉ được dùng tạm thời trong bộ nhớ máy chủ để hạn chế lạm dụng, spam và việc tải hàng loạt bộ câu hỏi (giới hạn số lượt truy cập; với bot của công cụ tìm kiếm thì kiểm tra DNS). IP không được lưu vào cơ sở dữ liệu. Nhật ký kỹ thuật của máy chủ được xoá sau tối đa 30 ngày. Cơ sở pháp lý là lợi ích hợp pháp của chúng tôi trong việc vận hành an toàn, ổn định (Điều 6 khoản 1 điểm f GDPR).',
                'Mọi kết nối đều được mã hoá (HTTPS). Phông chữ được tải từ máy chủ của chúng tôi. Một số video của câu hỏi lái xe được tải từ một máy chủ media khác do chúng tôi vận hành; ở đó địa chỉ IP của bạn cũng được xử lý.',
            ],
        },
        {
            id: 'account',
            title: 'Tài khoản và đăng nhập',
            blocks: [
                'Với tài khoản, chúng tôi lưu: email, tên hiển thị, mật khẩu (chỉ dạng băm scrypt có muối, không ai đọc được), ngôn ngữ giao diện, ngày đăng ký và ảnh đại diện nếu bạn tải lên. Bạn xác nhận email bằng một mã; mã này chỉ được lưu dạng băm và có hạn.',
                `**Đăng nhập bằng Google hoặc Apple:** Chúng tôi nhận mã người dùng của nhà cung cấp và email của bạn, với Apple có thể là địa chỉ chuyển tiếp ẩn danh. Với Apple, chúng tôi lưu thêm một mã để thu hồi liên kết phía Apple khi bạn xoá tài khoản. Mã đăng nhập (script) của Google hoặc Apple chỉ được tải khi bạn mở hộp đăng nhập ([chính sách bảo mật của Google](${GOOGLE_PRIVACY}), [chính sách bảo mật của Apple](${APPLE_PRIVACY})).`,
                '**Giữ đăng nhập:** Trên trình duyệt, chúng tôi đặt cookie “session” (HttpOnly, 30 ngày). Ứng dụng lưu mã đăng nhập trong vùng bảo mật của thiết bị (Keychain trên iOS, Keystore trên Android). Khi bạn đổi mật khẩu hoặc chọn “Đăng xuất trên mọi thiết bị”, mọi phiên khác bị vô hiệu.',
                '**Ai thấy gì:** Chỉ bạn thấy ảnh đại diện của mình. Tên hiển thị và điểm của bạn hiện trên bảng xếp hạng cho người dùng đã đăng nhập khác. Trong phòng luyện nói và game nhiều người, người cùng phòng thấy tên hiển thị của bạn. Email không bao giờ được hiện cho ai.',
                'Cơ sở pháp lý là thực hiện thoả thuận sử dụng (Điều 6 khoản 1 điểm b GDPR).',
            ],
        },
        {
            id: 'learning',
            title: 'Dữ liệu học',
            blocks: [
                'Khi có tài khoản, chúng tôi lưu trên máy chủ những gì bạn tạo ra hoặc đạt được khi học:',
                {
                    list: [
                        'Tiếng Đức: sổ từ vựng kèm ghi chú và câu ví dụ, câu đã đánh dấu, tiến độ từng bài học và video, kết quả chép chính tả, lịch và lịch sử ôn tập, các bài đã mở khoá.',
                        'Lý thuyết lái xe và Leben in Deutschland: câu đã trả lời (đúng/sai), câu đã lưu, bài thi thử và cài đặt như hạng bằng lái hoặc bang.',
                        'Game và động lực học: điểm, kim cương, chuỗi ngày học và các ván game (ví dụ Sudoku, Caro). Điểm và kim cương không có giá trị tiền tệ.',
                    ],
                },
                'Từ dữ liệu này, chúng tôi tạo nhắc nhở ở biểu tượng chuông (trang web) và trong ứng dụng. Nhắc học hằng ngày của ứng dụng là thông báo cục bộ do ứng dụng tự lên lịch trên máy bạn; chúng tôi không dùng dịch vụ push.',
                'Không có tài khoản thì cài đặt và tiến độ tạm nằm trên thiết bị của bạn (bộ nhớ cục bộ, xem mục “Cookie và bộ nhớ cục bộ”). Khi chơi Sudoku hoặc Caro với người khác mà không có tài khoản, bạn nhận một tên khách ngẫu nhiên, được nhận ra qua cookie “play_guest” (30 ngày).',
                'Cơ sở pháp lý là Điều 6 khoản 1 điểm b GDPR.',
            ],
        },
        {
            id: 'youtube',
            title: 'Video YouTube',
            blocks: [
                'Bài học video được phát bằng trình phát YouTube nhúng (Google Ireland Limited), trên trang web và trong ứng dụng. Khi bạn mở trang có video, thiết bị của bạn kết nối tới YouTube. Google nhận, trong số các dữ liệu khác, địa chỉ IP và trang bạn xem, và có thể dùng cookie hoặc công nghệ tương tự. Ảnh xem trước của video được tải trực tiếp từ máy chủ của Google (i.ytimg.com).',
                'Máy chủ của chúng tôi lấy phụ đề từ YouTube, nếu video không có phụ đề thì lấy âm thanh, và lưu đệm phụ đề. Ứng dụng có thể gửi lên máy chủ phụ đề mà nó đã tải từ YouTube trên máy bạn; phụ đề này được lưu kèm mã người dùng của bạn như một đóng góp và dùng chung cho mọi người học.',
                `Cơ sở pháp lý là lợi ích hợp pháp của chúng tôi trong việc cung cấp bài học bằng video (Điều 6 khoản 1 điểm f GDPR). Xem thêm: [chính sách bảo mật của Google](${GOOGLE_PRIVACY}).`,
            ],
        },
        {
            id: 'ai',
            title: 'Tính năng AI và giọng đọc',
            blocks: [
                'Để dịch, tra nghĩa từ, thêm dấu câu cho phụ đề tự động và tạo phụ đề từ âm thanh của video, chúng tôi gửi văn bản tiếng Đức hoặc âm thanh đó tới dịch vụ AI (Groq, Inc. và OpenAI). Để đọc từ và câu tiếng Đức, chúng tôi dùng ElevenLabs, Microsoft Azure (Speech) hoặc OpenAI tuỳ cấu hình.',
                'Chúng tôi chỉ gửi nội dung học, không gửi tên, email hay mã người dùng của bạn. Kết quả được lưu đệm và dùng chung cho mọi người học; chúng không chứa dữ liệu cá nhân. Khi chưa đăng nhập, trang web đọc câu bằng giọng có sẵn của trình duyệt.',
                'Kết quả của AI chỉ để hỗ trợ học và có thể chưa chính xác. Cơ sở pháp lý là Điều 6 khoản 1 điểm b GDPR.',
            ],
        },
        {
            id: 'microphone',
            title: 'Micro, luyện nói và phòng luyện nói',
            blocks: [
                'Micro chỉ được dùng sau khi bạn cho phép trong trình duyệt hoặc ứng dụng và bắt đầu ghi âm hoặc cuộc gọi. Bạn có thể thu hồi quyền bất cứ lúc nào trong cài đặt của trình duyệt hoặc thiết bị (trong ứng dụng: Cài đặt → Quyền riêng tư).',
                {
                    list: [
                        '**Nói đuổi (Shadowing):** Bản ghi nằm trên thiết bị của bạn để nghe lại và so sánh. Trên trang web, bản ghi chỉ nằm trong bộ nhớ của trang đang mở. Bản ghi không được tải lên.',
                        '**Chấm phát âm:** Khi tính năng này được cung cấp, bản ghi của một câu được gửi tới máy chủ của chúng tôi và từ đó tới dịch vụ chuyển giọng nói thành văn bản (Groq hoặc OpenAI). Văn bản nhận được được so với câu gốc; bản ghi không được lưu.',
                        '**Phòng luyện nói:** Cuộc trò chuyện với người học khác đi qua WebRTC trực tiếp giữa các thiết bị của người tham gia. Máy chủ của chúng tôi chỉ giúp kết nối và giữ thông tin phòng trong bộ nhớ tạm. Để kết nối, máy chủ STUN của Google được dùng; vì vậy về mặt kỹ thuật Google và những người cùng phòng thấy được địa chỉ IP của bạn. Nếu không kết nối trực tiếp được, âm thanh có thể được chuyển tiếp ở dạng mã hoá qua máy chủ trung gian (TURN). Chúng tôi không ghi âm cuộc trò chuyện.',
                        '**Nhận dạng giọng nói của thiết bị:** Nếu ứng dụng dùng tính năng nhận dạng giọng nói của hệ điều hành, Apple hoặc Google xử lý âm thanh theo điều khoản của họ.',
                    ],
                },
                'Cơ sở pháp lý là Điều 6 khoản 1 điểm b GDPR; micro chỉ được truy cập khi bạn cho phép.',
            ],
        },
        {
            id: 'photos',
            title: 'Ảnh đại diện',
            blocks: ['Ảnh đại diện là tuỳ chọn. Ứng dụng chỉ đọc ảnh bạn chọn, cắt và thu nhỏ trước khi tải lên. Ảnh được lưu trên máy chủ của chúng tôi và chỉ hiện cho chính bạn. Bạn có thể xoá ảnh bất cứ lúc nào.'],
        },
        {
            id: 'mail',
            title: 'Email, góp ý và biểu mẫu hỗ trợ',
            blocks: [
                'Chúng tôi chỉ gửi email cần cho tài khoản hoặc do bạn yêu cầu: mã xác nhận, mã đặt lại mật khẩu, thông báo khi mật khẩu hoặc email thay đổi và, khi bạn yêu cầu, bản sao dữ liệu. Chúng tôi không gửi email quảng cáo hay bản tin. Email được gửi qua dịch vụ SMTP của Google (Gmail/Google Workspace).',
                'Khi bạn viết cho chúng tôi qua biểu mẫu hỗ trợ trên trang web hoặc “Gửi góp ý” trong ứng dụng, chúng tôi lưu nội dung, loại yêu cầu, email của bạn (nếu bạn nhập, hoặc email tài khoản), tên nếu bạn ghi và thông tin kỹ thuật cơ bản (ví dụ hệ điều hành, đời máy, phiên bản ứng dụng). Chúng tôi cũng nhận thông báo qua email.',
                'Cơ sở pháp lý là Điều 6 khoản 1 điểm b GDPR hoặc lợi ích hợp pháp của chúng tôi trong việc giải quyết yêu cầu (Điều 6 khoản 1 điểm f GDPR).',
            ],
        },
        {
            id: 'ads',
            title: 'Quảng cáo qua Google AdSense (chỉ trên trang web)',
            blocks: [
                'Trang web hallovn.de hiển thị quảng cáo qua Google AdSense, do Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland (“Google”) cung cấp. Ứng dụng HalloVN không có quảng cáo.',
                'Google xử lý, trong số các dữ liệu khác, địa chỉ IP, thông tin về trình duyệt và thiết bị, trang bạn xem và tương tác của bạn với quảng cáo. Khi bạn đồng ý, Google dùng cookie và công nghệ tương tự để hiển thị, đo lường quảng cáo và điều chỉnh theo sở thích của bạn.',
                'Ở lần truy cập đầu tiên, nền tảng xin đồng ý của Google (theo chuẩn IAB TCF) hỏi bạn có đồng ý không và đồng ý cho mục đích nào. Cơ sở pháp lý là sự đồng ý của bạn (Điều 6 khoản 1 điểm a GDPR, § 25 khoản 1 TDDDG). Nếu không đồng ý, có thể vẫn hiện quảng cáo giới hạn, không cá nhân hoá và không lưu cookie.',
                'Bạn có thể đổi hoặc rút lại lựa chọn bất cứ lúc nào qua **Cài đặt quyền riêng tư** ở chân các trang này. Bạn cũng có thể tắt quảng cáo cá nhân hoá của Google tại [adssettings.google.com](https://adssettings.google.com).',
                `Cách Google dùng dữ liệu từ quảng cáo: [policies.google.com/technologies/ads](${ADS_LINK}) và [chính sách bảo mật của Google](${GOOGLE_PRIVACY}).`,
            ],
        },
        {
            id: 'cookies',
            title: 'Cookie và bộ nhớ cục bộ',
            blocks: [
                'Chúng tôi chỉ đặt cookie riêng khi cần cho chức năng bạn đang dùng (§ 25 khoản 2 số 2 TDDDG):',
                {
                    list: [
                        '“session”: giữ bạn đăng nhập (30 ngày).',
                        '“play_guest”: nhận ra khách trong game nhiều người (30 ngày).',
                        '“lx_class”, “lx_lang”, “lid_state”: hạng bằng lái, ngôn ngữ câu hỏi và bang bạn đã chọn (1 năm).',
                    ],
                },
                'Trong bộ nhớ cục bộ của trình duyệt hoặc ứng dụng, chúng tôi lưu các cài đặt như ngôn ngữ, giao diện sáng/tối, tuỳ chọn học và câu trả lời chưa kịp đồng bộ. Khi bạn chưa đăng nhập, các dữ liệu này không rời khỏi thiết bị.',
                'Cookie quảng cáo của Google chỉ được đặt khi bạn đồng ý (xem mục “Quảng cáo qua Google AdSense”). Trình phát YouTube có thể đặt cookie riêng (xem mục “Video YouTube”).',
            ],
        },
        {
            id: 'recipients',
            title: 'Bên nhận dữ liệu và nhà cung cấp dịch vụ',
            blocks: [
                'Chúng tôi không bán hay cho thuê dữ liệu. Các nhà cung cấp sau chỉ nhận phần dữ liệu cần cho việc của họ:',
                {
                    list: [
                        `Lưu trữ: ${HOSTING.vi}`,
                        'Gửi email và hộp thư: Google (Gmail/Google Workspace)',
                        'Đăng nhập: Google (Đăng nhập bằng Google), Apple (Đăng nhập bằng Apple)',
                        'Video và ảnh xem trước: YouTube (Google Ireland Limited)',
                        'Dịch vụ AI: Groq, Inc. và OpenAI (chỉ văn bản và âm thanh của nội dung học, hoặc bản ghi một câu để chấm phát âm)',
                        'Giọng đọc: ElevenLabs, Microsoft Azure, OpenAI (chỉ nội dung học)',
                        'Phòng luyện nói: máy chủ STUN của Google; có thể có máy chủ trung gian (TURN)',
                        'Quảng cáo (chỉ trên trang web): Google Ireland Limited (Google AdSense)',
                    ],
                },
                transferNote('vi'),
            ],
        },
        {
            id: 'retention',
            title: 'Thời gian lưu, bản sao dữ liệu và xoá tài khoản',
            blocks: [
                'Dữ liệu tài khoản và dữ liệu học được lưu khi tài khoản còn tồn tại. Mã xác nhận hết hạn sau thời gian ngắn.',
                '**Bản sao dữ liệu:** Tại Cài đặt → “Tải dữ liệu của tôi” (trang web) hoặc Cài đặt → Quyền riêng tư (ứng dụng), bạn nhận bản sao toàn bộ dữ liệu tài khoản và dữ liệu học dạng tệp JSON qua email.',
                `**Xoá tài khoản:** Trên trang web tại [Cài đặt](/settings) hoặc trong ứng dụng tại Cài đặt → “Xoá tài khoản”. Việc này xoá ngay và vĩnh viễn tài khoản, ảnh đại diện, sổ từ vựng, tiến độ, câu trả lời, điểm, chỗ ngồi trong game và liên kết đăng nhập Google/Apple; liên kết Đăng nhập bằng Apple được thu hồi phía Apple. Góp ý đã gửi được giữ lại nhưng không còn gắn với tài khoản và không kèm email. Bạn cũng có thể gửi email tới [${MAIL}](mailto:${MAIL}).`,
                '**Bản sao lưu:** Cơ sở dữ liệu được sao lưu hằng ngày. Bản sao lưu được truyền ở dạng mã hoá, chỉ người vận hành giữ và bị ghi đè sau tối đa 60 ngày; dữ liệu đã xoá chậm nhất khi đó cũng biến mất khỏi bản sao lưu.',
                'Yêu cầu và góp ý được xoá khi đã giải quyết xong và không còn nghĩa vụ lưu trữ theo luật.',
            ],
        },
    ],
};

const CHILDREN: Record<Locale, LegalSection> = {
    de: { id: 'children', title: 'Kinder', blocks: ['HalloVN richtet sich nicht an Kinder unter 16 Jahren. Jüngere Nutzer dürfen ein Konto nur mit Zustimmung ihrer Eltern anlegen (Art. 8 DSGVO). Wenn Sie wissen, dass ein Kind ohne diese Zustimmung ein Konto erstellt hat, schreiben Sie uns bitte, damit wir es löschen.'] },
    en: { id: 'children', title: 'Children', blocks: ['HalloVN is not directed at children under 16. Younger users may only create an account with their parents’ consent (Art. 8 GDPR). If you know that a child has created an account without this consent, please write to us so we can delete it.'] },
    vi: { id: 'children', title: 'Trẻ em', blocks: ['HalloVN không hướng tới trẻ em dưới 16 tuổi. Người dùng nhỏ tuổi hơn chỉ được tạo tài khoản khi có sự đồng ý của cha mẹ (Điều 8 GDPR). Nếu bạn biết một trẻ em đã tạo tài khoản mà không có sự đồng ý này, hãy báo cho chúng tôi để xoá.'] },
};

/** Datenschutzerklärung von HalloVN (Website + App). Wird von /privacy und /shadowing/privacy angezeigt. */
export const hallovnPrivacy: Localized<LegalSection[]> = perLocale((l) => [controller(l, 'HalloVN'), ...body[l], rights(l), CHILDREN[l], changes(l)]);

/** Gleicher Inhalt; der alte Name bleibt für bestehende Importe erhalten. */
export const websitePrivacy = hallovnPrivacy;
