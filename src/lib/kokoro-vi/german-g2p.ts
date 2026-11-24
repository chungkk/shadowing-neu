/**
 * Deterministic rule-based German G2P mirrored line-by-line from `german_g2p.py`.
 * Emits ONLY IPA characters present in `config.json` (token IDs 1..177).
 */

const DE_OVERRIDES: Readonly<Record<string, string>> = Object.assign(
  Object.create(null) as Record<string, string>,
  {
    ich: 'ˈɪç',
    nicht: 'nˈɪçt',
    sich: 'zˈɪç',
    mich: 'mˈɪç',
    dich: 'dˈɪç',
    auch: 'ˈaʊχ',
    noch: 'nˈɔχ',
    doch: 'dˈɔχ',
    nach: 'nˈaːχ',
    buch: 'bˈuːχ',
    hoch: 'hˈoːχ',
    deutsch: 'dˈɔɪʧ',
    deutschland: 'dˈɔɪʧlant',
    münchen: 'mˈynçən',
    köln: 'kˈœln',
    berlin: 'bɛʁlˈiːn',
    hamburg: 'hˈambʊʁk',
    frankfurt: 'fʁˈaŋkfʊʁt',
    stuttgart: 'ʃtˈʊtɡaʁt',
    düsseldorf: 'dˈysəldɔʁf',
    leipzig: 'lˈaɪptsɪç',
    dresden: 'dʁˈeːzdən',
    nürnberg: 'nˈyʁnbɛʁk',
    hannover: 'hanˈoːfɐ',
    bremen: 'bʁˈeːmən',
    dortmund: 'dˈɔʁtmʊnt',
    duisburg: 'dˈyːsbʊʁk',
    bochum: 'bˈoːχʊm',
    wuppertal: 'vˈʊpɐtaːl',
    bielefeld: 'bˈiːləfɛlt',
    bonn: 'bˈɔn',
    münster: 'mˈynstɐ',
    karlsruhe: 'kˈaʁlsʁuːə',
    mannheim: 'mˈanhaɪm',
    augsburg: 'ˈaʊksbʊʁk',
    wiesbaden: 'vˈiːsbaːdən',
    gelsenkirchen: 'ɡˈɛlzənkɪʁçən',
    mönchengladbach: 'mˈœnçənɡlatbaχ',
    braunschweig: 'bʁˈaʊnʃvaɪk',
    chemnitz: 'kˈɛmnɪts',
    kiel: 'kˈiːl',
    aachen: 'ˈaːχən',
    halle: 'hˈalə',
    magdeburg: 'mˈakdəbʊʁk',
    freiburg: 'fʁˈaɪbʊʁk',
    krefeld: 'kʁˈeːfɛlt',
    lübeck: 'lˈyːbɛk',
    oberhausen: 'ˈoːbɐhaʊzən',
    erfurt: 'ˈɛʁfʊʁt',
    mainz: 'mˈaɪnts',
    rostock: 'ʁˈɔstɔk',
    kassel: 'kˈasəl',
    hagen: 'hˈaːɡən',
    saarbrücken: 'zaːɐbʁˈykən',
    hamm: 'hˈam',
    potsdam: 'pˈɔtsdam',
    ludwigshafen: 'lˈuːtvɪçshaːfən',
    oldenburg: 'ˈɔldənbʊʁk',
    leverkusen: 'lˈeːfɐkuːzən',
    osnabrück: 'ɔsnabʁˈyk',
    heidelberg: 'hˈaɪdəlbɛʁk',
    darmstadt: 'dˈaʁmʃtat',
    paderborn: 'paːdɐbˈɔʁn',
    regensburg: 'ʁˈeːɡənsbʊʁk',
    ingolstadt: 'ˈɪŋɡɔlʃtat',
    würzburg: 'vˈyʁtsbʊʁk',
    wolfsburg: 'vˈɔlfsbʊʁk',
    offenbach: 'ˈɔfənbaχ',
    ulm: 'ˈʊlm',
    heilbronn: 'haɪlbʁˈɔn',
    göttingen: 'ɡˈœtɪŋən',
    trier: 'tʁˈiːɐ',
    koblenz: 'kˈoːblɛnts',
    jena: 'jˈeːna',
    weimar: 'vˈaɪmaʁ',
    passau: 'pˈasaʊ',
    konstanz: 'kˈɔnstants',
    bayern: 'bˈaɪɐn',
    sachsen: 'zˈaksən',
    hessen: 'hˈɛsən',
    thüringen: 'tˈyːʁɪŋən',
    brandenburg: 'bʁˈandənbʊʁk',
    niedersachsen: 'nˈiːdɐzaksən',
    saarland: 'zˈaːɐlant',
    württemberg: 'vˈyʁtəmbɛʁk',
    westfalen: 'vɛstfˈaːlən',
    rheinland: 'ʁˈaɪnlant',
    schleswig: 'ʃlˈeːsvɪç',
    holstein: 'hˈɔlʃtaɪn',
    mecklenburg: 'mˈeːklənbʊʁk',
    vorpommern: 'fˈoːɐpɔmɐn',
    österreich: 'ˈøːstəʁaɪç',
    schweiz: 'ʃvˈaɪts',
    euro: 'ˈɔɪʁo',
    bahn: 'bˈaːn',
    bahnhof: 'bˈaːnhoːf',
    hauptbahnhof: 'hˈaʊptbaːnhoːf',
    autobahn: 'ˈaʊtobaːn',
    straße: 'ʃtʁˈaːsə',
    führerschein: 'fˈyːʁɐʃaɪn',
    anmeldung: 'ˈanmɛldʊŋ',
    ausländerbehörde: 'ˈaʊslɛndɐbəhøːʁdə',
    bürgeramt: 'bˈyʁɡɐamt',
    einbürgerung: 'ˈaɪnbyʁɡəʁʊŋ',
    einbürgerungstest: 'ˈaɪnbyʁɡəʁʊŋstɛst',
    arbeitsamt: 'ˈaʁbaɪtsamt',
    jobcenter: 'ʤˈɔpsɛntɐ',
    finanzamt: 'finˈantsamt',
    krankenkasse: 'kʁˈaŋkənkasə',
    krankenhaus: 'kʁˈaŋkənhaʊs',
    apotheke: 'apotˈeːkə',
    arzt: 'ˈaʁtst',
    termin: 'tɛʁmˈiːn',
    vertrag: 'fɛɐtʁˈaːk',
    miete: 'mˈiːtə',
    wohnung: 'vˈoːnʊŋ',
    vorfahrt: 'fˈoːɐfaːʁt',
    geschwindigkeit: 'ɡəʃvˈɪndɪçkaɪt',
    prüfung: 'pʁˈyːfʊŋ',
    theorie: 'teoʁˈiː',
    praxis: 'pʁˈaksɪs',
    polizei: 'politsˈaɪ',
    feuerwehr: 'fˈɔɪɐveːɐ',
    notruf: 'nˈoːtʁuːf',
    stadt: 'ʃtˈat',
    staat: 'ʃtˈaːt',
    schule: 'ʃˈuːlə',
    universität: 'univɛʁzitˈɛːt',
    studium: 'ʃtˈuːdiʊm',
    ausbildung: 'ˈaʊsbɪldʊŋ',
    beruf: 'bəʁˈuːf',
    gehalt: 'ɡəhˈalt',
    steuer: 'ʃtˈɔɪɐ',
    versicherung: 'fɛɐzˈɪçəʁʊŋ',
    reisepass: 'ʁˈaɪzəpas',
    ausweis: 'ˈaʊsvaɪs',
    visum: 'vˈiːzʊm',
    aufenthalt: 'ˈaʊfənthalt',
    aufenthaltstitel: 'ˈaʊfənthaltstiːtəl',
    kindergeld: 'kˈɪndɐɡɛlt',
    elterngeld: 'ˈɛltɐnɡɛlt',
    urlaub: 'ˈuːɐlaʊp',
    wochenende: 'vˈɔχənɛndə',
    guten: 'ɡˈuːtən',
    morgen: 'mˈɔʁɡən',
    abend: 'ˈaːbənt',
    danke: 'dˈaŋkə',
    bitte: 'bˈɪtə',
    entschuldigung: 'ɛntʃˈʊldɪɡʊŋ',
    tschüss: 'ʧˈys',
    hallo: 'halˈoː',
    vielleicht: 'filˈaɪçt',
    natürlich: 'natˈyːɐlɪç',
    eigentlich: 'ˈaɪɡəntlɪç',
    zusammen: 'tsuzˈamən',
    schön: 'ʃˈøːn',
    groß: 'ɡʁˈoːs',
    klein: 'klˈaɪn',
    neu: 'nˈɔɪ',
    alt: 'ˈalt',
    gut: 'ɡˈuːt',
    sehr: 'zˈeːɐ',
    mehr: 'mˈeːɐ',
    viel: 'fˈiːl',
    viele: 'fˈiːlə',
    immer: 'ˈɪmɐ',
    wieder: 'vˈiːdɐ',
    oder: 'ˈoːdɐ',
    aber: 'ˈaːbɐ',
    über: 'ˈyːbɐ',
    unter: 'ˈʊntɐ',
    heute: 'hˈɔɪtə',
    gestern: 'ɡˈɛstɐn',
    jetzt: 'jˈɛtst',
    hier: 'hˈiːɐ',
    dort: 'dˈɔʁt',
    warum: 'vaʁˈʊm',
    weil: 'vˈaɪl',
    wenn: 'vˈɛn',
    dass: 'dˈas',
    und: 'ˈʊnt',
    mit: 'mˈɪt',
    für: 'fˈyːɐ',
    von: 'fˈɔn',
    aus: 'ˈaʊs',
    bei: 'bˈaɪ',
    zu: 'tsˈuː',
    zum: 'tsˈʊm',
    zur: 'tsˈuːɐ',
    der: 'dˈeːɐ',
    die: 'dˈiː',
    das: 'dˈas',
    den: 'dˈeːn',
    dem: 'dˈeːm',
    des: 'dˈɛs',
    ein: 'ˈaɪn',
    eine: 'ˈaɪnə',
    einem: 'ˈaɪnəm',
    einen: 'ˈaɪnən',
    einer: 'ˈaɪnɐ',
    kein: 'kˈaɪn',
    keine: 'kˈaɪnə',
    wir: 'vˈiːɐ',
    ihr: 'ˈiːɐ',
    sie: 'zˈiː',
    er: 'ˈeːɐ',
    es: 'ˈɛs',
    ist: 'ˈɪst',
    sind: 'zˈɪnt',
    war: 'vˈaːɐ',
    haben: 'hˈaːbən',
    sein: 'zˈaɪn',
    werden: 'vˈeːɐdən',
    können: 'kˈœnən',
    müssen: 'mˈysən',
    wollen: 'vˈɔlən',
    sollen: 'zˈɔlən',
    dürfen: 'dˈyʁfən',
    mögen: 'mˈøːɡən',
    möchte: 'mˈœçtə',
    machen: 'mˈaχən',
    gehen: 'ɡˈeːən',
    kommen: 'kˈɔmən',
    sprechen: 'ʃpʁˈɛçən',
    verstehen: 'fɛɐʃtˈeːən',
    lernen: 'lˈɛʁnən',
    arbeiten: 'ˈaʁbaɪtən',
    wohnen: 'vˈoːnən',
    fahren: 'fˈaːʁən',
    leben: 'lˈeːbən',
    geben: 'ɡˈeːbən',
    nehmen: 'nˈeːmən',
    sehen: 'zˈeːən',
    wissen: 'vˈɪsən',
    glauben: 'ɡlˈaʊbən',
    denken: 'dˈɛŋkən',
    brauchen: 'bʁˈaʊχən',
    finden: 'fˈɪndən',
    bleiben: 'blˈaɪbən',
    zahlen: 'tsˈaːlən',
    kaufen: 'kˈaʊfən',
    essen: 'ˈɛsən',
    trinken: 'tʁˈɪŋkən',
    brötchen: 'bʁˈøːtçən',
    kaffee: 'kˈafe',
    wasser: 'vˈasɐ',
    bier: 'bˈiːɐ',
    geld: 'ɡˈɛlt',
    zeit: 'tsˈaɪt',
    jahr: 'jˈaːɐ',
    jahre: 'jˈaːʁə',
    tag: 'tˈaːk',
    woche: 'vˈɔχə',
    monat: 'mˈoːnat',
    uhr: 'ˈuːɐ',
    mensch: 'mˈɛnʃ',
    menschen: 'mˈɛnʃən',
    leute: 'lˈɔɪtə',
    familie: 'famˈiːliə',
    kinder: 'kˈɪndɐ',
    freund: 'fʁˈɔɪnt',
    freunde: 'fʁˈɔɪndə',
    haus: 'hˈaʊs',
    auto: 'ˈaʊto',
    zug: 'tsˈuːk',
    bus: 'bˈʊs',
    fahrrad: 'fˈaːɐʁaːt',
    flugzeug: 'flˈuːktsɔɪk',
    frage: 'fʁˈaːɡə',
    antwort: 'ˈantvɔʁt',
    problem: 'pʁoblˈeːm',
    lösung: 'lˈøːzʊŋ',
    beispiel: 'bˈaɪʃpiːl',
    sprache: 'ʃpʁˈaːχə',
    wort: 'vˈɔʁt',
    satz: 'zˈats',
    gesundheit: 'ɡəzˈʊnthaɪt',
    demokratie: 'demokʁatˈiː',
    bundestag: 'bˈʊndəstaːk',
    grundgesetz: 'ɡʁˈʊntɡəzɛts',
    verfassung: 'fɛɐfˈasʊŋ',
    wahlen: 'vˈaːlən',
    regierung: 'ʁəɡˈiːʁʊŋ',
    gesetz: 'ɡəzˈɛts',
    recht: 'ʁˈɛçt',
    pflicht: 'pflˈɪçt',
    freiheit: 'fʁˈaɪhaɪt',
    gleichberechtigung: 'ɡlˈaɪçbəʁɛçtɪɡʊŋ',
    sechs: 'zˈɛks',
    sieben: 'zˈiːbən',
    acht: 'ˈaχt',
    neun: 'nˈɔɪn',
    zehn: 'tsˈeːn',
    elf: 'ˈɛlf',
    zwölf: 'tsvˈœlf',
    zwanzig: 'tsvˈantsɪç',
    dreißig: 'dʁˈaɪsɪç',
    vierzig: 'fˈɪʁtsɪç',
    fünfzig: 'fˈynftsɪç',
    hundert: 'hˈʊndɐt',
    tausend: 'tˈaʊzənt',
  },
);

/**
 * Unambiguously German cities, states, and domain terms that should take German IPA
 * even if sea_g2p has an English reading for them (e.g. Berlin, Hamburg, Frankfurt, Autobahn).
 * Never includes words that collide with Vietnamese or common English words (die, war, tag, bus, auto...).
 */
const DE_PRIORITY_WORDS: ReadonlySet<string> = new Set([
  'deutsch', 'deutschland', 'berlin', 'hamburg', 'frankfurt', 'stuttgart', 'leipzig',
  'dresden', 'hannover', 'bremen', 'dortmund', 'duisburg', 'bochum', 'wuppertal',
  'bielefeld', 'bonn', 'karlsruhe', 'mannheim', 'augsburg', 'wiesbaden', 'gelsenkirchen',
  'braunschweig', 'chemnitz', 'kiel', 'aachen', 'magdeburg', 'freiburg', 'krefeld',
  'oberhausen', 'erfurt', 'mainz', 'rostock', 'kassel', 'potsdam', 'ludwigshafen',
  'oldenburg', 'leverkusen', 'heidelberg', 'darmstadt', 'paderborn', 'regensburg',
  'ingolstadt', 'wolfsburg', 'offenbach', 'ulm', 'heilbronn', 'trier', 'koblenz',
  'jena', 'weimar', 'passau', 'konstanz', 'bayern', 'sachsen', 'hessen', 'brandenburg',
  'niedersachsen', 'saarland', 'westfalen', 'rheinland', 'schleswig', 'holstein',
  'mecklenburg', 'vorpommern', 'schweiz', 'autobahn', 'bahnhof', 'hauptbahnhof',
  'anmeldung', 'arbeitsamt', 'finanzamt', 'krankenkasse', 'krankenhaus', 'apotheke',
  'vorfahrt', 'geschwindigkeit', 'polizei', 'feuerwehr', 'notruf', 'ausbildung',
  'versicherung', 'reisepass', 'aufenthalt', 'aufenthaltstitel', 'kindergeld',
  'elterngeld', 'wochenende', 'entschuldigung', 'gesundheit', 'bundestag',
  'grundgesetz', 'verfassung', 'gleichberechtigung', 'danke', 'bitte', 'guten',
]);

const DE_UNSTRESSED_PREFIXES = ['emp', 'ent', 'ver', 'zer', 'be', 'ge', 'er'] as const;
const DE_VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'ä', 'ö', 'ü', 'y']);
const DE_BACK_VOWELS = new Set(['a', 'o', 'u']);
const DE_SUFFIX_CUES = [
  'straße', 'strasse', 'platz', 'bahn', 'amt', 'schule', 'schein', 'prüfung',
  'steuer', 'geld', 'heim', 'stadt', 'burg', 'berg', 'dorf', 'hausen',
  'keit', 'heit', 'schaft', 'chen', 'lein', 'ung', 'lich', 'isch', 'ieren',
  'kasse', 'vertrag', 'gesetz', 'recht', 'pflicht', 'titel', 'behörde',
] as const;

/** True when a token should immediately route to German G2P (umlauts/ß or unambiguous German city/noun). */
export function isPriorityGermanWord(word: string): boolean {
  const w = word.normalize('NFC').toLowerCase();
  if (!w) return false;
  if (/[äöüß]/u.test(w)) return true;
  return DE_PRIORITY_WORDS.has(w);
}

/** Fallback German detector for tokens NOT found in the Vietnamese/English SEA-G2P dictionary. */
export function isGermanWord(word: string): boolean {
  const w = word.normalize('NFC').toLowerCase();
  if (!w) return false;
  if (/[äöüß]/u.test(w)) return true;
  if (DE_OVERRIDES[w] !== undefined) return true;
  if (w.length >= 5 && DE_SUFFIX_CUES.some((suf) => w.endsWith(suf))) return true;
  if (w.includes('sch') || w.includes('tz') || w.includes('pf')) return true;
  return false;
}

function isVowel(ch: string): boolean {
  return DE_VOWELS.has(ch);
}

function countFollowingConsonants(w: string, idx: number): number {
  let n = 0;
  while (idx + n < w.length && !isVowel(w[idx + n]!)) n++;
  return n;
}

export function germanWordToIpa(word: string): string {
  const w = word
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^a-zäöüß]/gu, '');
  if (!w) return '';
  const override = DE_OVERRIDES[w];
  if (override !== undefined) return override;

  let stressMinIdx = 0;
  for (const pref of DE_UNSTRESSED_PREFIXES) {
    if (w.startsWith(pref) && w.length > pref.length + 2) {
      stressMinIdx = pref.length;
      break;
    }
  }

  const out: string[] = [];
  let i = 0;
  const n = w.length;
  let stressed = false;

  const maybeStress = (pos: number) => {
    if (!stressed && pos >= stressMinIdx) {
      out.push('ˈ');
      stressed = true;
    }
  };

  while (i < n) {
    const rem = w.slice(i);

    if (rem.startsWith('tsch')) {
      out.push('ʧ');
      i += 4;
      continue;
    }
    if (rem.startsWith('sch')) {
      out.push('ʃ');
      i += 3;
      continue;
    }
    if (rem.startsWith('chs') && (i + 3 === n || !isVowel(w[i + 3]!))) {
      out.push('ks');
      i += 3;
      continue;
    }

    if (rem.startsWith('ch')) {
      if (i === 0 && n > 2 && 'aourl'.includes(w[2]!)) {
        out.push('k');
      } else {
        const prev2 = w.slice(Math.max(0, i - 2), i);
        const prev1 = i > 0 ? w[i - 1]! : '';
        out.push(prev2 === 'au' || DE_BACK_VOWELS.has(prev1) ? 'χ' : 'ç');
      }
      i += 2;
      continue;
    }
    if (rem.startsWith('ck')) {
      out.push('k');
      i += 2;
      continue;
    }
    if (rem.startsWith('tz')) {
      out.push('ts');
      i += 2;
      continue;
    }
    if (rem.startsWith('pf')) {
      out.push('pf');
      i += 2;
      continue;
    }
    if (rem.startsWith('ph')) {
      out.push('f');
      i += 2;
      continue;
    }
    if (rem.startsWith('qu')) {
      out.push('kv');
      i += 2;
      continue;
    }
    if (rem.startsWith('ng')) {
      out.push('ŋ');
      i += 2;
      continue;
    }
    if (rem.startsWith('nk')) {
      out.push('ŋk');
      i += 2;
      continue;
    }
    if (rem.startsWith('sp') && (i === 0 || i === stressMinIdx)) {
      out.push('ʃp');
      i += 2;
      continue;
    }
    if (rem.startsWith('st') && (i === 0 || i === stressMinIdx)) {
      out.push('ʃt');
      i += 2;
      continue;
    }
    if (rem.startsWith('th') || rem.startsWith('dt')) {
      out.push('t');
      i += 2;
      continue;
    }

    if (rem.startsWith('eu') || rem.startsWith('äu')) {
      maybeStress(i);
      out.push('ɔɪ');
      i += 2;
      continue;
    }
    if (rem.startsWith('ei') || rem.startsWith('ai') || rem.startsWith('ey') || rem.startsWith('ay')) {
      maybeStress(i);
      out.push('aɪ');
      i += 2;
      continue;
    }
    if (rem.startsWith('au')) {
      maybeStress(i);
      out.push('aʊ');
      i += 2;
      continue;
    }
    if (rem.startsWith('ie')) {
      maybeStress(i);
      out.push('iː');
      i += 2;
      continue;
    }

    if (rem.startsWith('aa')) {
      maybeStress(i);
      out.push('aː');
      i += 2;
      continue;
    }
    if (rem.startsWith('ee')) {
      maybeStress(i);
      out.push('eː');
      i += 2;
      continue;
    }
    if (rem.startsWith('oo')) {
      maybeStress(i);
      out.push('oː');
      i += 2;
      continue;
    }

    if (rem === 'ig' && i >= 2) {
      out.push('ɪç');
      i += 2;
      continue;
    }
    if (rem === 'er' && i >= 2) {
      out.push('ɐ');
      i += 2;
      continue;
    }
    if (rem === 'en' && i >= 2) {
      out.push('ən');
      i += 2;
      continue;
    }
    if (rem === 'el' && i >= 2) {
      out.push('əl');
      i += 2;
      continue;
    }

    const ch = w[i]!;

    if (ch === 'h' && i > 0 && isVowel(w[i - 1]!)) {
      if (i + 1 === n || !isVowel(w[i + 1]!)) {
        if (out.length && !out[out.length - 1]!.endsWith('ː')) out.push('ː');
        i += 1;
        continue;
      }
    }

    if (i + 1 < n && ch === w[i + 1] && !isVowel(ch)) {
      i += 1;
      continue;
    }

    if (isVowel(ch)) {
      maybeStress(i);
      const cAfter = countFollowingConsonants(w, i + 1);
      const nextIsH = i + 1 < n && w[i + 1] === 'h' && (i + 2 === n || !isVowel(w[i + 2]!));
      const isLong = nextIsH || (cAfter <= 1 && i + 1 < n);

      if (ch === 'a') out.push(isLong ? 'aː' : 'a');
      else if (ch === 'e') {
        if (i === n - 1 && i > 0) out.push('ə');
        else if (i < stressMinIdx && !stressed) out.push('ə');
        else out.push(isLong ? 'eː' : 'ɛ');
      } else if (ch === 'i') out.push(isLong ? 'iː' : 'ɪ');
      else if (ch === 'o') out.push(isLong ? 'oː' : 'ɔ');
      else if (ch === 'u') out.push(isLong ? 'uː' : 'ʊ');
      else if (ch === 'ä') out.push(isLong ? 'ɛː' : 'ɛ');
      else if (ch === 'ö') out.push(isLong ? 'øː' : 'œ');
      else if (ch === 'ü' || ch === 'y') out.push(isLong ? 'yː' : 'y');
      i += 1;
      continue;
    }

    if (ch === 'ß') out.push('s');
    else if (ch === 'z') out.push('ts');
    else if (ch === 'v') out.push('f');
    else if (ch === 'w') out.push('v');
    else if (ch === 'j') out.push('j');
    else if (ch === 'x') out.push('ks');
    else if (ch === 'c') out.push(i + 1 < n && 'eiäö'.includes(w[i + 1]!) ? 'ts' : 'k');
    else if (ch === 's') {
      const prevIsV = i > 0 && isVowel(w[i - 1]!);
      const nextIsV = i + 1 < n && isVowel(w[i + 1]!);
      out.push((i === 0 || prevIsV) && nextIsV ? 'z' : 's');
    } else if (ch === 'r') {
      const prevIsV = i > 0 && isVowel(w[i - 1]!);
      const nextIsV = i + 1 < n && isVowel(w[i + 1]!);
      if (prevIsV && !nextIsV && (i + 1 === n || w[i + 1] !== 'r')) out.push('ɐ');
      else out.push('ʁ');
    } else if (ch === 'g') out.push(i === n - 1 ? 'k' : 'ɡ');
    else if (ch === 'd') out.push(i === n - 1 ? 't' : 'd');
    else if (ch === 'b') out.push(i === n - 1 ? 'p' : 'b');
    else if ('ptkfhmln'.includes(ch)) out.push(ch);
    i += 1;
  }

  return out.join('').replace(/ːː/g, 'ː');
}
