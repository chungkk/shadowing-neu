import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const LANGUAGES = ['vi', 'en', 'ar', 'zh', 'ru'];
export const CATALOG_DIR = path.join(process.cwd(), 'content', 'laixe', 'catalog');
// Multi-class catalog (all license classes), served under /api/fuehrerschein/all/*.
export const CATALOG_ALL_DIR = path.join(process.cwd(), 'content', 'laixe', 'catalog_all');
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const options = value => Array.isArray(value) && value.every(o =>
    record(o) && typeof o.letter === 'string' && typeof o.text === 'string');

export function sourceQuestions(input) {
    if (!Array.isArray(input) || !input.length) throw new Error('Empty question catalog');
    const ids = new Set();
    return input.map(q => {
        if (!record(q) || !['question_id', 'question_text', 'comment', 'theme_number', 'theme_name',
            'chapter_number', 'chapter_name', 'question_number', 'points', 'url']
            .every(key => typeof q[key] === 'string')
            || !q.question_id || ids.has(q.question_id)
            || !options(q.options) || !options(q.correct_answers) || !q.correct_answers.length
            || !['image_urls', 'local_image_paths', 'video_urls', 'local_video_paths']
                .every(key => Array.isArray(q[key]) && q[key].every(item => typeof item === 'string'))
            || new Set(q.options.map(o => o.letter)).size !== q.options.length
            || (q.options.length && q.correct_answers.some(a => !q.options.some(o => o.letter === a.letter)))) {
            throw new Error(`Invalid source question: ${q?.question_id}`);
        }
        ids.add(q.question_id);
        const source = { ...q };
        for (const field of ['translations', 'question_text_vi', 'options_vi', 'comment_vi']) delete source[field];
        return source;
    });
}

export function questionPack(input, date) {
    const questions = sourceQuestions(input);
    return { schemaVersion: 2, version: `q-${hash(questions)}`, date, questionCount: questions.length, questions };
}

export function translationPack(language, input, source) {
    if (!LANGUAGES.includes(language) || !record(input)) throw new Error('Invalid translation input');
    const sources = new Map(source.questions.map(q => [q.question_id, q]));
    const translations = {};
    for (const [id, t] of Object.entries(input)) {
        const q = sources.get(id);
        const valid = q && record(t) && typeof t.question_text === 'string' && t.question_text.trim()
            && typeof t.comment === 'string' && options(t.options)
            && t.options.length === q.options.length
            && t.options.every((o, i) => o.letter === q.options[i].letter
                && (q.options[i].text.trim() ? o.text.trim() : o.text === ''))
            && (q.comment.trim() ? t.comment.trim() : t.comment === '');
        if (!valid) {
            throw new Error(`Translation ${language}/${id} does not match its source`);
        }
        translations[id] = { question_text: t.question_text, options: t.options, comment: t.comment };
    }
    const missing = source.questions.filter(q => !Object.hasOwn(translations, q.question_id));
    if (missing.length) {
        throw new Error(`Incomplete translation ${language}: ${Object.keys(translations).length}/${source.questions.length}; missing: ${missing.slice(0, 10).map(q => q.question_id).join(', ')}`);
    }
    const content = { language, questionsVersion: source.version, translations };
    return {
        pack: { schemaVersion: 2, version: `t-${hash(content)}`, count: Object.keys(translations).length, ...content },
    };
}

export function readManifest(directory = CATALOG_DIR) {
    return JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
}

export function readQuestionPack(version, directory = CATALOG_DIR) {
    if (!/^q-[a-f0-9]{64}$/.test(version)) throw new Error('Invalid question version');
    return JSON.parse(fs.readFileSync(path.join(directory, `${version}.json`), 'utf8'));
}

export function readTranslationPack(language, version, directory = CATALOG_DIR) {
    if (!LANGUAGES.includes(language) || !/^t-[a-f0-9]{64}$/.test(version)) throw new Error('Invalid translation version');
    const pack = JSON.parse(fs.readFileSync(path.join(directory, `${version}.json`), 'utf8'));
    if (pack.language !== language || pack.version !== version) throw new Error('Translation version mismatch');
    return pack;
}

function writeImmutable(directory, pack) {
    const target = path.join(directory, `${pack.version}.json`);
    if (fs.existsSync(target)) {
        const existing = JSON.parse(fs.readFileSync(target, 'utf8'));
        // Dates are descriptive, not part of a question's content identity.
        if (JSON.stringify({ ...existing, date: undefined }) !== JSON.stringify({ ...pack, date: undefined })) {
            throw new Error(`Refusing to overwrite immutable pack ${pack.version}`);
        }
        return;
    }
    const temporary = path.join(directory, `.pack-${randomUUID()}.tmp`);
    fs.writeFileSync(temporary, JSON.stringify(pack) + '\n', { flag: 'wx' });
    fs.renameSync(temporary, target);
}

// Local filesystem publication only. Upload/deploy remains an explicit operator action.
export function publishCatalog({ directory = CATALOG_DIR, questions, translations = {}, date }) {
    const source = questions ? questionPack(questions, date) : readQuestionPack(readManifest(directory).version, directory);
    const packs = [];
    for (const [lang, input] of Object.entries(translations)) {
        const result = translationPack(lang, input, source);
        packs.push(result.pack);
    }
    let previous = {};
    if (fs.existsSync(path.join(directory, 'manifest.json'))) previous = readManifest(directory).translations;
    // Never relabel an old translation as compatible with a changed source.
    const metadata = Object.fromEntries(Object.entries(previous).filter(([, info]) => info.questionsVersion === source.version));
    // A translation-only update must not silently retain another incomplete active pack.
    for (const [lang, info] of Object.entries(metadata)) {
        if (Object.hasOwn(translations, lang)) continue;
        const existing = readTranslationPack(lang, info.version, directory);
        const verified = translationPack(lang, existing.translations, source).pack;
        if (existing.questionsVersion !== source.version || verified.version !== info.version
            || existing.count !== verified.count || info.count !== verified.count) {
            throw new Error(`Translation metadata mismatch: ${lang}`);
        }
    }
    for (const pack of packs) {
        metadata[pack.language] = { version: pack.version, questionsVersion: pack.questionsVersion, count: pack.count };
    }
    const manifest = {
        schemaVersion: 2, version: source.version, date: source.date, questionCount: source.questionCount,
        translations: metadata,
        availableLanguages: Object.keys(metadata),
        translationVersions: Object.fromEntries(Object.entries(metadata).map(([lang, info]) => [lang, info.version])),
    };
    fs.mkdirSync(directory, { recursive: true });
    // Stage all immutable files before changing the active manifest.
    writeImmutable(directory, source);
    packs.forEach(pack => writeImmutable(directory, pack));
    const temporary = path.join(directory, `.manifest-${randomUUID()}.tmp`);
    fs.writeFileSync(temporary, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
    fs.renameSync(temporary, path.join(directory, 'manifest.json'));
    return { manifest };
}
