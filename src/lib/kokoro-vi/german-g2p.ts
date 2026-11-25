/**
 * Deterministic rule-based German G2P mirrored from `german_g2p.py` with
 * enhanced compound/brand/acronym coverage and context detection.
 * Emits ONLY IPA characters present in `config.json` (token IDs 1..177).
 */

const DE_LETTERS: Readonly<Record<string, string>> = {
  a: 'aː',
  b: 'beː',
  c: 'tseː',
  d: 'deː',
  e: 'eː',
  f: 'ɛf',
  g: 'ɡeː',
  h: 'haː',
  i: 'iː',
  j: 'jɔt',
  k: 'kaː',
  l: 'ɛl',
  m: 'ɛm',
  n: 'ɛn',
  o: 'oː',
  p: 'peː',
  q: 'kuː',
  r: 'ɛʁ',
  s: 'ɛs',
  t: 'teː',
  u: 'uː',
  v: 'faʊ',
  w: 'veː',
  x: 'ɪks',
  y: 'ˈypsilɔn',
  z: 'tsɛt',
  ä: 'ɛː',
  ö: 'øː',
  ü: 'yː',
};

/** German acronyms pronounced with German letter names (ARD, ZDF, WDR, AOK, GmbH, BMW...). */
const DE_ACRONYMS: ReadonlySet<string> = new Set([
  'ARD', 'ZDF', 'WDR', 'NDR', 'SWR', 'BR', 'MDR', 'RBB',
  'ADAC', 'TÜV', 'IHK', 'AWO', 'DRK', 'THW', 'GEZ',
  'CDU', 'CSU', 'SPD', 'FDP', 'AFD', 'BSW',
  'BGB', 'STVO', 'STGB', 'GMBH', 'OHG', 'KG',
  'DHL', 'ICE', 'DB', 'BVG', 'MVG', 'HVV', 'VRR', 'VRS', 'RMV', 'VBB', 'KVB', 'LVB',
  'AOK', 'TK', 'DAK', 'IKK', 'BKK',
  'LKW', 'PKW', 'KFZ', 'MWST', 'UST', 'PLZ', 'NRW', 'DDR', 'BRD', 'EUGH',
  'BMW', 'VW',
]);

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
    deutsche: 'dˈɔɪʧə',
    deutscher: 'dˈɔɪʧɐ',
    deutsches: 'dˈɔɪʧəs',
    deutschen: 'dˈɔɪʧən',
    deutschland: 'dˈɔɪʧlant',
    deutschlandticket: 'dˈɔɪʧlanttɪkət',
    // Cities & states
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
    // German brands, banks, supermarkets, media
    sparkasse: 'ʃpˈaʁkasə',
    sparkassen: 'ʃpˈaʁkasən',
    volksbank: 'fˈɔlksbaŋk',
    commerzbank: 'kɔmˈɛʁtsbaŋk',
    postbank: 'pˈɔstbaŋk',
    rewe: 'ʁˈeːvə',
    aldi: 'ˈaldi',
    lidl: 'lˈiːdəl',
    edeka: 'ˈeːdeka',
    rossmann: 'ʁˈɔsman',
    kaufland: 'kˈaʊflant',
    penny: 'pˈɛni',
    netto: 'nˈɛto',
    mercedes: 'mɛʁtsˈeːdəs',
    porsche: 'pˈɔʁʃə',
    audi: 'ˈaʊdi',
    volkswagen: 'fˈɔlksvaːɡən',
    siemens: 'zˈiːməns',
    bosch: 'bˈɔʃ',
    lufthansa: 'lˈʊfthanza',
    telekom: 'tˈeːləkɔm',
    zalando: 'tsalˈando',
    adidas: 'ˈadidas',
    allianz: 'aliˈants',
    bayer: 'bˈaɪɐ',
    tagesschau: 'tˈaːɡəsʃaʊ',
    spiegel: 'ʃpˈiːɡəl',
    zeitung: 'tsˈaɪtʊŋ',
    bundesliga: 'bˈʊndəsliːɡa',
    bundeswehr: 'bˈʊndəsveːɐ',
    bundeskanzler: 'bˈʊndəskantslɐ',
    bundesrepublik: 'bˈʊndəsʁepubliːk',
    verbraucherzentrale: 'fɛɐbʁˈaʊχɐtsɛntʁaːlə',
    warentest: 'vˈaːʁəntɛst',
    stiftung: 'ʃtˈɪftʊŋ',
    dekra: 'dˈeːkʁa',
    bafög: 'bˈaːfœk',
    tüv: 'tˈyf',
    // Daily life, admin, driving, LiD
    euro: 'ˈɔɪʁo',
    bahn: 'bˈaːn',
    bahnhof: 'bˈaːnhoːf',
    hauptbahnhof: 'hˈaʊptbaːnhoːf',
    autobahn: 'ˈaʊtobaːn',
    straße: 'ʃtʁˈaːsə',
    strasse: 'ʃtʁˈaːsə',
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
    krankenversicherung: 'kʁˈaŋkənfɛɐzɪçəʁʊŋ',
    pflegeversicherung: 'pflˈeːɡəfɛɐzɪçəʁʊŋ',
    rentenversicherung: 'ʁˈɛntənfɛɐzɪçəʁʊŋ',
    sozialversicherung: 'zotsiˈaːlfɛɐzɪçəʁʊŋ',
    apotheke: 'apotˈeːkə',
    arzt: 'ˈaʁtst',
    hausarzt: 'hˈaʊsaʁtst',
    zahnarzt: 'tsˈaːnaʁtst',
    termin: 'tɛʁmˈiːn',
    vertrag: 'fɛɐtʁˈaːk',
    mietvertrag: 'mˈiːtfɛɐtʁaːk',
    arbeitsvertrag: 'ˈaʁbaɪtsfɛɐtʁaːk',
    miete: 'mˈiːtə',
    wohnung: 'vˈoːnʊŋ',
    rathaus: 'ʁˈaːthaʊs',
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
    fahrschule: 'fˈaːɐʃuːlə',
    grundschule: 'ɡʁˈʊntʃuːlə',
    hochschule: 'hˈoːχʃuːlə',
    volkshochschule: 'fˈɔlkshoːχʃuːlə',
    kindergarten: 'kˈɪndɐɡaʁtən',
    gymnasium: 'ɡymnˈaːziʊm',
    universität: 'univɛʁzitˈɛːt',
    studium: 'ʃtˈuːdiʊm',
    ausbildung: 'ˈaʊsbɪldʊŋ',
    beruf: 'bəʁˈuːf',
    gehalt: 'ɡəhˈalt',
    steuer: 'ʃtˈɔɪɐ',
    steuerklasse: 'ʃtˈɔɪɐklasə',
    mehrwertsteuer: 'mˈeːɐveːɐtʃtɔɪɐ',
    rundfunkbeitrag: 'ʁˈʊntfʊŋkbaɪtʁaːk',
    versicherung: 'fɛɐzˈɪçəʁʊŋ',
    reisepass: 'ʁˈaɪzəpas',
    personalausweis: 'pɛʁzonˈaːlaʊsvaɪs',
    ausweis: 'ˈaʊsvaɪs',
    visum: 'vˈiːzʊm',
    aufenthalt: 'ˈaʊfənthalt',
    aufenthaltstitel: 'ˈaʊfənthaltstiːtəl',
    aufenthaltserlaubnis: 'ˈaʊfənthaltsɛɐlaʊpnɪs',
    niederlassungserlaubnis: 'nˈiːdɐlasʊŋsɛɐlaʊpnɪs',
    meldebescheinigung: 'mˈɛldəbəʃaɪnɪɡʊŋ',
    kindergeld: 'kˈɪndɐɡɛlt',
    elterngeld: 'ˈɛltɐnɡɛlt',
    wohngeld: 'vˈoːnɡɛlt',
    bürgergeld: 'bˈyʁɡɐɡɛlt',
    arbeitslosengeld: 'ˈaʁbaɪtsloːzənɡɛlt',
    mindestlohn: 'mˈɪndəstloːn',
    probezeit: 'pʁˈoːbətsaɪt',
    urlaub: 'ˈuːɐlaʊp',
    wochenende: 'vˈɔχənɛndə',
    bewerbung: 'bəvˈɛʁbʊŋ',
    lebenslauf: 'lˈeːbənslaʊf',
    integrationskurs: 'ɪntəɡʁatsiˈoːnskʊʁs',
    sprachkurs: 'ʃpʁˈaːχkʊʁs',
    vertriebskanal: 'fɛɐtʁˈiːpskanaːl',
    unternehmen: 'ʊntɐnˈeːmən',
    mitarbeiter: 'mˈɪtaʁbaɪtɐ',
    nachrichten: 'nˈaːχʁɪçtən',
    wirtschaft: 'vˈɪʁtʃaft',
    gesellschaft: 'ɡəzˈɛlʃaft',
    datenschutz: 'dˈaːtənʃʊts',
    oktoberfest: 'ɔktˈoːbɐfɛst',
    weihnachtsmarkt: 'vˈaɪnaχtsmaʁkt',
    supermarkt: 'zˈuːpɐmaʁkt',
    // Common German words & grammar
    guten: 'ɡˈuːtən',
    morgen: 'mˈɔʁɡən',
    abend: 'ˈaːbənt',
    nacht: 'nˈaχt',
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
    weiter: 'vˈaɪtɐ',
    weitere: 'vˈaɪtəʁə',
    weiterer: 'vˈaɪtəʁɐ',
    weiteres: 'vˈaɪtəʁəs',
    oder: 'ˈoːdɐ',
    aber: 'ˈaːbɐ',
    über: 'ˈyːbɐ',
    unter: 'ˈʊntɐ',
    heute: 'hˈɔɪtə',
    gestern: 'ɡˈɛstɐn',
    jetzt: 'jˈɛtst',
    hier: 'hˈiːɐ',
    dort: 'dˈɔʁt',
    wie: 'vˈiː',
    was: 'vˈas',
    wer: 'vˈeːɐ',
    wo: 'vˈoː',
    wann: 'vˈan',
    warum: 'vaʁˈʊm',
    weil: 'vˈaɪl',
    wenn: 'vˈɛn',
    dass: 'dˈas',
    und: 'ˈʊnt',
    mit: 'mˈɪt',
    in: 'ˈɪn',
    im: 'ˈɪm',
    an: 'ˈan',
    am: 'ˈam',
    um: 'ˈʊm',
    auf: 'ˈaʊf',
    für: 'fˈyːɐ',
    von: 'fˈɔn',
    vom: 'fˈɔm',
    aus: 'ˈaʊs',
    bei: 'bˈaɪ',
    beim: 'bˈaɪm',
    zu: 'tsˈuː',
    zum: 'tsˈʊm',
    zur: 'tsˈuːɐ',
    vor: 'fˈoːɐ',
    durch: 'dˈʊʁç',
    ohne: 'ˈoːnə',
    gegen: 'ɡˈeːɡən',
    seit: 'zˈaɪt',
    bis: 'bˈɪs',
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
    eines: 'ˈaɪnəs',
    kein: 'kˈaɪn',
    keine: 'kˈaɪnə',
    keinen: 'kˈaɪnən',
    mein: 'mˈaɪn',
    meine: 'mˈaɪnə',
    dein: 'dˈaɪn',
    deine: 'dˈaɪnə',
    wir: 'vˈiːɐ',
    ihr: 'ˈiːɐ',
    ihnen: 'ˈiːnən',
    sie: 'zˈiː',
    er: 'ˈeːɐ',
    es: 'ˈɛs',
    du: 'dˈuː',
    uns: 'ˈʊns',
    euch: 'ˈɔɪç',
    mir: 'mˈiːɐ',
    dir: 'dˈiːɐ',
    ihm: 'ˈiːm',
    ist: 'ˈɪst',
    sind: 'zˈɪnt',
    bin: 'bˈɪn',
    bist: 'bˈɪst',
    war: 'vˈaːɐ',
    waren: 'vˈaːʁən',
    hat: 'hˈat',
    habe: 'hˈaːbə',
    haben: 'hˈaːbən',
    hatte: 'hˈatə',
    sein: 'zˈaɪn',
    wird: 'vˈɪʁt',
    werden: 'vˈeːɐdən',
    kann: 'kˈan',
    können: 'kˈœnən',
    muss: 'mˈʊs',
    müssen: 'mˈysən',
    will: 'vˈɪl',
    wollen: 'vˈɔlən',
    soll: 'zˈɔl',
    sollen: 'zˈɔlən',
    darf: 'dˈaʁf',
    dürfen: 'dˈyʁfən',
    mögen: 'mˈøːɡən',
    möchte: 'mˈœçtə',
    machen: 'mˈaχən',
    macht: 'mˈaχt',
    gehen: 'ɡˈeːən',
    geht: 'ɡˈeːt',
    kommen: 'kˈɔmən',
    kommt: 'kˈɔmt',
    sprechen: 'ʃpʁˈɛçən',
    spricht: 'ʃpʁˈɪçt',
    verstehen: 'fɛɐʃtˈeːən',
    versteht: 'fɛɐʃtˈeːt',
    lernen: 'lˈɛʁnən',
    lernt: 'lˈɛʁnt',
    arbeiten: 'ˈaʁbaɪtən',
    arbeitet: 'ˈaʁbaɪtət',
    wohnen: 'vˈoːnən',
    wohne: 'vˈoːnə',
    wohnt: 'vˈoːnt',
    fahren: 'fˈaːʁən',
    fährt: 'fˈɛːɐt',
    leben: 'lˈeːbən',
    lebt: 'lˈeːpt',
    geben: 'ɡˈeːbən',
    gibt: 'ɡˈiːpt',
    nehmen: 'nˈeːmən',
    nimmt: 'nˈɪmt',
    sehen: 'zˈeːən',
    sieht: 'zˈiːt',
    wissen: 'vˈɪsən',
    weiß: 'vˈaɪs',
    glauben: 'ɡlˈaʊbən',
    denken: 'dˈɛŋkən',
    brauchen: 'bʁˈaʊχən',
    braucht: 'bʁˈaʊχt',
    finden: 'fˈɪndən',
    findet: 'fˈɪndət',
    bleiben: 'blˈaɪbən',
    bleibt: 'blˈaɪpt',
    zahlen: 'tsˈaːlən',
    sparen: 'ʃpˈaːʁən',
    spart: 'ʃpˈaːʁt',
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
 * Unambiguously German cities, states, brands, media, and domain terms that should
 * ALWAYS take German IPA even inside a Vietnamese sentence (and before sea_g2p.bin's
 * English guesses!). Never includes words that collide with Vietnamese or common English words.
 */
const DE_PRIORITY_WORDS: ReadonlySet<string> = new Set([
  'deutsch', 'deutsche', 'deutscher', 'deutsches', 'deutschen', 'deutschland', 'deutschlandticket',
  'berlin', 'hamburg', 'frankfurt', 'stuttgart', 'leipzig',
  'dresden', 'hannover', 'bremen', 'dortmund', 'duisburg', 'bochum', 'wuppertal',
  'bielefeld', 'bonn', 'karlsruhe', 'mannheim', 'augsburg', 'wiesbaden', 'gelsenkirchen',
  'braunschweig', 'chemnitz', 'kiel', 'aachen', 'magdeburg', 'freiburg', 'krefeld',
  'oberhausen', 'erfurt', 'mainz', 'rostock', 'kassel', 'potsdam', 'ludwigshafen',
  'oldenburg', 'leverkusen', 'heidelberg', 'darmstadt', 'paderborn', 'regensburg',
  'ingolstadt', 'wolfsburg', 'offenbach', 'ulm', 'heilbronn', 'trier', 'koblenz',
  'jena', 'weimar', 'passau', 'konstanz', 'bayern', 'sachsen', 'hessen', 'brandenburg',
  'niedersachsen', 'saarland', 'westfalen', 'rheinland', 'schleswig', 'holstein',
  'mecklenburg', 'vorpommern', 'schweiz',
  // German brands, banks, supermarkets, media
  'sparkasse', 'sparkassen', 'volksbank', 'commerzbank', 'postbank',
  'rewe', 'aldi', 'lidl', 'edeka', 'rossmann', 'kaufland',
  'mercedes', 'porsche', 'audi', 'volkswagen', 'siemens', 'bosch', 'lufthansa',
  'telekom', 'zalando', 'adidas', 'allianz', 'bayer', 'dekra',
  'tagesschau', 'spiegel', 'zeitung', 'bundesliga', 'bundeswehr', 'bundeskanzler', 'bundesrepublik',
  'verbraucherzentrale', 'warentest', 'stiftung',
  // Domain terms
  'autobahn', 'bahnhof', 'hauptbahnhof', 'rathaus', 'strasse',
  'anmeldung', 'arbeitsamt', 'finanzamt', 'krankenkasse', 'krankenhaus', 'apotheke',
  'krankenversicherung', 'pflegeversicherung', 'rentenversicherung', 'sozialversicherung',
  'hausarzt', 'zahnarzt', 'mietvertrag', 'arbeitsvertrag', 'fahrschule', 'grundschule',
  'hochschule', 'volkshochschule', 'kindergarten', 'gymnasium',
  'vorfahrt', 'geschwindigkeit', 'polizei', 'feuerwehr', 'notruf', 'ausbildung',
  'versicherung', 'reisepass', 'personalausweis', 'ausweis', 'aufenthalt', 'aufenthaltstitel',
  'aufenthaltserlaubnis', 'niederlassungserlaubnis', 'meldebescheinigung',
  'kindergeld', 'elterngeld', 'wohngeld', 'arbeitslosengeld', 'mindestlohn', 'probezeit',
  'steuerklasse', 'mehrwertsteuer', 'rundfunkbeitrag', 'bewerbung', 'lebenslauf',
  'integrationskurs', 'sprachkurs', 'vertriebskanal', 'unternehmen', 'mitarbeiter',
  'nachrichten', 'wirtschaft', 'gesellschaft', 'datenschutz', 'oktoberfest', 'weihnachtsmarkt', 'supermarkt',
  'wochenende', 'entschuldigung', 'gesundheit', 'bundestag',
  'grundgesetz', 'verfassung', 'gleichberechtigung', 'danke', 'bitte', 'guten',
]);

/** Common German function/clause words used ONLY to detect a German sentence/clause. */
const DE_CLAUSE_WORDS: ReadonlySet<string> = new Set([
  'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'ihnen', 'mich', 'dich', 'sich', 'uns', 'euch', 'mir', 'dir', 'ihm',
  'der', 'die', 'das', 'den', 'dem', 'des',
  'ein', 'eine', 'einem', 'einen', 'einer', 'eines', 'kein', 'keine', 'keinen', 'keinem', 'keiner',
  'mein', 'meine', 'meinen', 'dein', 'deine', 'sein', 'seine', 'unser', 'unsere',
  'und', 'oder', 'aber', 'denn', 'weil', 'dass', 'wenn', 'als', 'wie', 'was', 'wer', 'wo', 'wann', 'warum',
  'nicht', 'auch', 'noch', 'doch', 'schon', 'sehr', 'viel', 'viele', 'mehr', 'immer', 'wieder', 'weiter', 'weiterer', 'weitere', 'weiteres',
  'jetzt', 'heute', 'gestern', 'morgen', 'hier', 'dort',
  'mit', 'für', 'von', 'vom', 'aus', 'bei', 'beim', 'nach', 'zu', 'zum', 'zur', 'über', 'unter', 'vor', 'durch', 'gegen', 'ohne', 'seit', 'bis',
  'ist', 'sind', 'war', 'waren', 'wird', 'werden', 'hat', 'habe', 'haben', 'hatte',
  'kann', 'können', 'muss', 'müssen', 'will', 'wollen', 'soll', 'sollen', 'darf', 'dürfen', 'möchte',
  'geht', 'gehen', 'kommt', 'kommen', 'macht', 'machen', 'sagt', 'sagen', 'gibt', 'geben',
  'nimmt', 'nehmen', 'sieht', 'sehen', 'weiß', 'wissen', 'wohne', 'wohnt', 'wohnen',
  'lebt', 'leben', 'arbeitet', 'arbeiten', 'lernt', 'lernen', 'spricht', 'sprechen',
  'versteht', 'verstehen', 'spart', 'sparen', 'braucht', 'brauchen', 'findet', 'finden', 'bleibt', 'bleiben',
  'guten', 'tag', 'abend', 'nacht', 'zeit', 'geld', 'welt', 'land', 'stadt', 'haus', 'mensch', 'menschen', 'leute', 'kinder', 'frage', 'antwort', 'beispiel', 'sprache',
]);

const DE_UNSTRESSED_PREFIXES = ['emp', 'ent', 'ver', 'zer', 'be', 'ge', 'er'] as const;
const DE_VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'ä', 'ö', 'ü', 'y']);
const DE_BACK_VOWELS = new Set(['a', 'o', 'u']);
const DE_VOICELESS_NEXT = new Set(['s', 't', 'k', 'p', 'f', 'z', 'c', 'ß']);

/** Unambiguous German compound suffixes (safe to route BEFORE sea_g2p's English guesses). */
const DE_STRONG_SUFFIXES = [
  'straße', 'strasse', 'schule', 'schein', 'prüfung', 'steuer', 'behörde',
  'kasse', 'vertrag', 'gesetz', 'pflicht', 'titel', 'schaft', 'keit', 'heit',
  'chen', 'lein', 'ierung', 'ieren', 'kanal', 'bahnhof', 'platz', 'stadt',
  'hausen', 'geld', 'markt', 'recht', 'dienst', 'schutz', 'stelle', 'pflege',
  'hilfe', 'rente', 'wirtschaft', 'bildung', 'forschung', 'verkehr', 'betrieb',
  'vertrieb', 'wohnung', 'miete', 'zimmer', 'ausweis', 'antrag', 'bescheid',
  'gebühr', 'beitrag', 'rechnung', 'urlaub', 'zeitung',
] as const;

const DE_FALLBACK_SUFFIXES = [
  ...DE_STRONG_SUFFIXES,
  'bahn', 'amt', 'heim', 'burg', 'berg', 'dorf', 'ung', 'lich', 'isch',
] as const;

const EN_SCH_EXCEPTIONS = new Set([
  'school', 'schools', 'schooling', 'schedule', 'scheduled', 'schedules', 'scheduling',
  'scheme', 'schemes', 'schema', 'schemas', 'schematic', 'scholar', 'scholars',
  'scholarship', 'scholarships', 'scholarly', 'schizophrenia', 'schooner',
]);

const EN_TZ_EXCEPTIONS = new Set([
  'blitz', 'waltz', 'quartz', 'ritz', 'ritzy', 'glitz', 'glitzy', 'fritz', 'spitz', 'klutz', 'putz',
]);

const EN_PF_EXCEPTIONS = new Set([
  'campfire', 'stepfather', 'helpful', 'hopeful', 'cupful', 'upfront', 'topflight', 'flipflop',
]);

export function isGermanAcronym(word: string): boolean {
  if (!/^[A-ZÄÖÜ]{2,5}$/u.test(word)) return false;
  return DE_ACRONYMS.has(word);
}

export function spellGermanAcronym(word: string): string {
  return Array.from(word.toLowerCase(), (ch) => DE_LETTERS[ch] ?? '')
    .filter(Boolean)
    .join(' ');
}

export function isGermanClauseWord(word: string): boolean {
  const w = word.normalize('NFC').toLowerCase();
  return DE_CLAUSE_WORDS.has(w) || isPriorityGermanWord(word);
}

/**
 * True when a token should immediately route to German G2P BEFORE sea_g2p.bin lookup
 * (umlauts/ß, unambiguous German cities/brands/nouns, or clear German orthography/suffixes).
 */
export function isPriorityGermanWord(word: string): boolean {
  const w = word.normalize('NFC').toLowerCase();
  if (!w) return false;
  if (/[äöüß]/u.test(w)) return true;
  if (DE_PRIORITY_WORDS.has(w)) return true;
  if (w.length >= 6 && DE_STRONG_SUFFIXES.some((suf) => w.endsWith(suf))) return true;
  if (w.includes('tsch')) return true;
  if (w.includes('sch') && !EN_SCH_EXCEPTIONS.has(w)) return true;
  if (w.includes('tz') && !EN_TZ_EXCEPTIONS.has(w)) return true;
  if (w.includes('pf') && !EN_PF_EXCEPTIONS.has(w)) return true;
  return false;
}

/** Fallback German detector for tokens NOT found in the Vietnamese/English SEA-G2P dictionary. */
export function isGermanWord(word: string): boolean {
  const w = word.normalize('NFC').toLowerCase();
  if (!w) return false;
  if (isPriorityGermanWord(word)) return true;
  if (DE_OVERRIDES[w] !== undefined) return true;
  if (w.length >= 5 && DE_FALLBACK_SUFFIXES.some((suf) => w.endsWith(suf))) return true;
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

  // Natural German pronunciation of unstressed prefixes ver-, zer-, er-
  if (stressMinIdx === 3 && w.startsWith('ver')) {
    out.push('fɛɐ');
    i = 3;
  } else if (stressMinIdx === 3 && w.startsWith('zer')) {
    out.push('tsɛɐ');
    i = 3;
  } else if (stressMinIdx === 2 && w.startsWith('er')) {
    out.push('ɛɐ');
    i = 2;
  }

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
      const wasStressed = stressed;
      maybeStress(i);
      const cAfter = countFollowingConsonants(w, i + 1);
      const nextIsH = i + 1 < n && w[i + 1] === 'h' && (i + 2 === n || !isVowel(w[i + 2]!));
      const isLong = nextIsH || (cAfter <= 1 && i + 1 < n);

      if (ch === 'a') out.push(isLong ? 'aː' : 'a');
      else if (ch === 'e') {
        const next1 = i + 1 < n ? w[i + 1]! : '';
        const next2 = i + 2 < n ? w[i + 2]! : '';
        if (i === n - 1 && i > 0) out.push('ə');
        else if (i < stressMinIdx && !stressed) out.push('ə');
        // Unstressed medial schwa before r/l/n (e.g. weiterer -> vˈaɪtəʁɐ, anderes -> ˈandəʁəs)
        else if (wasStressed && !nextIsH && 'rln'.includes(next1) && (next2 === '' || isVowel(next2) || !isVowel(next2))) {
          out.push('ə');
        } else out.push(isLong ? 'eː' : 'ɛ');
      } else if (ch === 'i') out.push(isLong ? 'iː' : 'ɪ');
      else if (ch === 'o') out.push(isLong ? 'oː' : 'ɔ');
      else if (ch === 'u') out.push(isLong ? 'uː' : 'ʊ');
      else if (ch === 'ä') out.push(isLong ? 'ɛː' : 'ɛ');
      else if (ch === 'ö') out.push(isLong ? 'øː' : 'œ');
      else if (ch === 'ü' || ch === 'y') out.push(isLong ? 'yː' : 'y');
      i += 1;
      continue;
    }

    const nextCh = i + 1 < n ? w[i + 1]! : '';
    const devoiced = i === n - 1 || DE_VOICELESS_NEXT.has(nextCh);

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
    } else if (ch === 'g') out.push(devoiced ? 'k' : 'ɡ');
    else if (ch === 'd') out.push(devoiced ? 't' : 'd');
    else if (ch === 'b') out.push(devoiced ? 'p' : 'b');
    else if ('ptkfhmln'.includes(ch)) out.push(ch);
    i += 1;
  }

  return out.join('').replace(/ːː/g, 'ː');
}
