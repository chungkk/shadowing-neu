import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import * as catalog from '../../src/lib/laixe/catalog.mjs';
import { sourceHash, validateTranslation } from './translate-vi.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = {
    question_id: 'q1', question_text: 'Was ist defensives Fahren?',
    options: [{ letter: 'A.', text: 'Vorsichtig fahren' }],
    correct_answers: [{ letter: 'A.', text: 'Vorsichtig fahren' }],
    comment: 'Vorsichtig fahren.', theme_number: 'Thema 1.1', theme_name: 'Grundstoff',
    chapter_number: '1 Kapitel', chapter_name: 'Kapitel', question_number: '1', points: '3',
    image_urls: [], local_image_paths: [], video_urls: [], local_video_paths: [], url: 'https://example.com/q1',
};
const translation = {
    question_text: 'Lái xe phòng vệ là gì?',
    options: [{ letter: 'A.', text: 'Lái xe cẩn thận' }], comment: 'Lái xe cẩn thận.',
};
const date = '2026-09-23';
const vi = { q1: translation };

function fixture(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'driving-catalog-test-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    return directory;
}

function route(file, directory) {
    const exports = {};
    const filename = path.join(root, 'src/app/api/fuehrerschein', file, 'route.ts');
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText, {
        exports, URL,
        require: name => {
            if (name === 'next/server') return { connection: async () => {}, NextResponse: { json: (body, init) => Response.json(body, init) } };
            if (name === '@/lib/laixe/catalog.mjs') return {
                LANGUAGES: catalog.LANGUAGES,
                readManifest: () => catalog.readManifest(directory),
                readQuestionPack: version => catalog.readQuestionPack(version, directory),
                readTranslationPack: (lang, version) => catalog.readTranslationPack(lang, version, directory),
            };
            throw new Error(`Unexpected dependency ${name}`);
        },
    });
    return exports.GET;
}

test('content versions separate German questions from independent translation edits', () => {
    const sourcePack = catalog.questionPack([{ ...source, question_text_vi: 'legacy', translations: { en: {} } }], date);
    assert.equal('question_text_vi' in sourcePack.questions[0], false);
    assert.equal('translations' in sourcePack.questions[0], false);
    const clean = catalog.questionPack([source], date);
    assert.equal(sourcePack.version, clean.version);
    assert.equal(catalog.questionPack([source], '2027-01-01').version, clean.version);
    const first = catalog.translationPack('vi', vi, clean).pack;
    const corrected = catalog.translationPack('vi', { q1: { ...translation, comment: 'Lái xe thận trọng.' } }, clean).pack;
    assert.notEqual(first.version, corrected.version);
    assert.equal(first.questionsVersion, corrected.questionsVersion);
});

test('publisher carries compatible languages and invalidates them when source changes', t => {
    const directory = fixture(t);
    const first = catalog.publishCatalog({ directory, questions: [source], translations: { vi, en: vi }, date }).manifest;
    const revised = catalog.publishCatalog({ directory, translations: { vi: { q1: { ...translation, comment: 'Lái xe thận trọng.' } } }, date }).manifest;
    assert.equal(revised.version, first.version);
    assert.equal(revised.translations.en.version, first.translations.en.version);
    assert.notEqual(revised.translations.vi.version, first.translations.vi.version);
    const changed = catalog.publishCatalog({ directory, questions: [{ ...source, comment: 'Neue Erklärung.' }], date }).manifest;
    assert.notEqual(changed.version, first.version);
    assert.deepEqual(changed.translations, {});
    assert.equal(catalog.readQuestionPack(first.version, directory).questions[0].comment, source.comment);
    assert.equal(catalog.readTranslationPack('vi', first.translations.vi.version, directory).count, 1);
});

test('invalid translations cannot replace the active manifest or be silently skipped', t => {
    const directory = fixture(t);
    const initial = catalog.publishCatalog({ directory, questions: [source], translations: { vi }, date }).manifest;
    assert.throws(() => catalog.publishCatalog({ directory, translations: { vi: { q1: { ...translation, options: [] } } }, date }), /does not match/);
    assert.deepEqual(catalog.readManifest(directory), initial);
    assert.throws(() => catalog.publishCatalog({ directory, translations: { xx: vi }, date }), /Invalid translation/);
    assert.throws(() => catalog.publishCatalog({
        directory, translations: { en: { ...vi, missing: translation } }, skipInvalid: true, date,
    }), /does not match/);
    assert.deepEqual(catalog.readManifest(directory), initial);
});

test('missing question IDs are rejected before writing any pack or manifest', t => {
    const directory = fixture(t);
    const second = { ...source, question_id: 'q2' };
    const sourcePack = catalog.questionPack([source, second], date);
    assert.throws(() => catalog.translationPack('en', vi, sourcePack), /Incomplete translation en: 1\/2; missing: q2/);
    assert.throws(() => catalog.translationPack('en', {}, sourcePack), /Incomplete translation en: 0\/2/);
    assert.throws(() => catalog.publishCatalog({
        directory, questions: [source, second], translations: { vi }, date,
    }), /Incomplete translation/);
    assert.deepEqual(fs.readdirSync(directory), []);
});

test('publication cannot retain an incomplete or inconsistent active language', t => {
    const directory = fixture(t);
    const initial = catalog.publishCatalog({ directory, questions: [source], translations: { vi, en: vi }, date }).manifest;
    const enFile = path.join(directory, `${initial.translations.en.version}.json`);
    const complete = fs.readFileSync(enFile, 'utf8');
    const incomplete = JSON.parse(complete);
    incomplete.translations = {};
    incomplete.count = 0;
    fs.writeFileSync(enFile, JSON.stringify(incomplete));
    assert.throws(() => catalog.publishCatalog({ directory, translations: { vi }, date }), /Incomplete translation en/);
    assert.deepEqual(catalog.readManifest(directory), initial);
    fs.writeFileSync(enFile, complete);
    const inconsistent = { ...initial, translations: { ...initial.translations, en: { ...initial.translations.en, count: 2 } } };
    fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(inconsistent));
    assert.throws(() => catalog.publishCatalog({ directory, translations: { vi }, date }), /metadata mismatch: en/);
    assert.deepEqual(catalog.readManifest(directory), inconsistent);
});

test('rejects malformed catalogs and source/answer mismatches', () => {
    for (const bad of [[], null, [source, source], [{ ...source, options: null }],
        [{ ...source, correct_answers: [{ letter: 'Z.', text: 'Invalid' }] }]]) {
        assert.throws(() => catalog.questionPack(bad, date));
    }
});

test('version endpoint is uncached and reports real counts and individual languages', async t => {
    const directory = fixture(t);
    catalog.publishCatalog({ directory, questions: [source], translations: { vi, ru: vi }, date });
    const response = await route('version', directory)();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    const info = await response.json();
    assert.equal(info.questionCount, 1);
    assert.deepEqual(info.availableLanguages, ['vi', 'ru']);
    assert.equal(info.translations.ru.count, 1);
    assert.equal('questions' in info, false);
});

test('question API serves pinned packs and keeps the raw-array contract for older apps', async t => {
    const directory = fixture(t);
    const { manifest } = catalog.publishCatalog({ directory, questions: [source], translations: { vi }, date });
    const get = route('questions', directory);
    const legacy = await get(new Request('https://example.com/api/fuehrerschein/questions'));
    assert.deepEqual(await legacy.json(), [source]);
    assert.equal(legacy.headers.get('Cache-Control'), 'no-store');
    catalog.publishCatalog({ directory, questions: [{ ...source, comment: 'Changed.' }], date });
    const pinned = await get(new Request(`https://example.com/api/fuehrerschein/questions?version=${manifest.version}`));
    assert.equal((await pinned.json()).version, manifest.version);
    assert.match(pinned.headers.get('Cache-Control'), /immutable/);
    const traversal = await get(new Request('https://example.com/questions?version=../../private'));
    assert.equal(traversal.status, 400);
});

test('translation API serves one language, supports Russian and rejects cross-language versions', async t => {
    const directory = fixture(t);
    const { manifest } = catalog.publishCatalog({ directory, questions: [source], translations: { vi, ru: vi }, date });
    const get = route('translations/[lang]', directory);
    const request = (lang, version) => get(new Request(`https://example.com/translations/${lang}${version ? `?version=${version}` : ''}`), {
        params: Promise.resolve({ lang }),
    });
    const ru = await request('ru', manifest.translations.ru.version);
    assert.equal(ru.status, 200);
    assert.equal((await ru.json()).language, 'ru');
    assert.equal(ru.headers.get('X-Translation-Count'), '1');
    assert.deepEqual(await (await request('vi')).json(), vi);
    assert.equal((await request('fr')).status, 400);
    assert.equal((await request('vi', '../secret')).status, 400);
    assert.equal((await request('en')).status, 404);
    assert.equal((await request('vi', manifest.translations.ru.version)).status, 503);
});

test('unpublished backend returns a recoverable service error', async t => {
    const directory = fixture(t);
    assert.equal((await route('version', directory)()).status, 503);
    assert.equal((await route('questions', directory)(new Request('https://example.com/questions'))).status, 503);
});

test('every active language covers every source ID with matching options and content version', () => {
    const directory = path.join(root, 'content/laixe/catalog');
    const info = catalog.readManifest(directory);
    const sourcePack = catalog.readQuestionPack(info.version, directory);
    assert.equal(catalog.questionPack(sourcePack.questions, sourcePack.date).version, info.version);
    assert.equal(sourcePack.questionCount, sourcePack.questions.length);
    assert.deepEqual(Object.keys(info.translations).sort(), [...catalog.LANGUAGES].sort());
    const sourceIds = sourcePack.questions.map(q => q.question_id).sort();
    for (const [lang, metadata] of Object.entries(info.translations)) {
        const pack = catalog.readTranslationPack(lang, metadata.version, directory);
        assert.equal(catalog.translationPack(lang, pack.translations, sourcePack).pack.version, metadata.version);
        assert.equal(pack.count, metadata.count);
        assert.equal(pack.count, sourcePack.questions.length);
        assert.deepEqual(Object.keys(pack.translations).sort(), sourceIds);
        assert.equal(pack.questionsVersion, info.version);
    }
});

test('repaired entries preserve source numbers, placeholders and answer order', () => {
    const directory = path.join(root, 'content/laixe/catalog');
    const patch = JSON.parse(fs.readFileSync(path.join(root, 'tools/laixe-catalog/source/corrections/2026-09-23-complete-translations.json'), 'utf8'));
    const sourcePack = catalog.readQuestionPack(patch.questionsVersion, directory);
    const sources = new Map(sourcePack.questions.map(q => [q.question_id, q]));
    assert.equal(Object.values(patch.translations).reduce((sum, entries) => sum + Object.keys(entries).length, 0), 32);
    for (const [lang, entries] of Object.entries(patch.translations)) {
        for (const [id, entry] of Object.entries(entries)) {
            assert.doesNotThrow(() => validateTranslation(sources.get(id), entry), `${lang}/${id}`);
        }
    }
});

test('archived corrections have new versions and preserve all previously valid translations', () => {
    const directory = path.join(root, 'content/laixe/catalog');
    const patch = JSON.parse(fs.readFileSync(path.join(root, 'tools/laixe-catalog/source/corrections/2026-09-23-complete-translations.json'), 'utf8'));
    const previousVersions = {
        en: 't-7eb8c6e04405e100e3769205aea15cc10828bfd34f7af8784a727be09868b7d2',
        ar: 't-0d95871f06d5d0b585772ff512ec6f1665a7531bb3c0127725f7e8bcd672726f',
        zh: 't-f4d9abed6328a83e3b5b8541df076f57e65b66545c5b7a2ff8a98c92be21158d',
        ru: 't-efaff2aa91c9c6f0151b38c68c14773b33cd9a84c5a72e9c5e057fe0327c0b4a',
    };
    const sourcePack = catalog.readQuestionPack(patch.questionsVersion, directory);
    for (const [lang, version] of Object.entries(previousVersions)) {
        const before = catalog.readTranslationPack(lang, version, directory);
        const expected = catalog.translationPack(lang, { ...before.translations, ...patch.translations[lang] }, sourcePack).pack;
        const after = catalog.readTranslationPack(lang, expected.version, directory);
        assert.deepEqual(after, expected);
        assert.notEqual(after.version, before.version);
        assert.equal(after.count - before.count, Object.keys(patch.translations[lang]).length);
        for (const [id, entry] of Object.entries(before.translations)) assert.deepEqual(after.translations[id], entry);
    }
});

test('patch CLI checks source binding, merges entries and leaves the question version unchanged', t => {
    const directory = fixture(t);
    const initial = catalog.publishCatalog({ directory, questions: [source], translations: { vi }, date }).manifest;
    const patchFile = path.join(directory, 'patch.json');
    const patch = { questionsVersion: initial.version, translations: { vi: { q1: { ...translation, comment: 'Lái xe thận trọng.' } } } };
    fs.writeFileSync(patchFile, JSON.stringify(patch));
    const cli = path.join(root, 'tools/laixe-catalog/publish.mjs');
    execFileSync(process.execPath, [cli, '--output', directory, '--patch', patchFile], { cwd: root });
    const updated = catalog.readManifest(directory);
    assert.equal(updated.version, initial.version);
    assert.notEqual(updated.translations.vi.version, initial.translations.vi.version);
    assert.deepEqual(catalog.readTranslationPack('vi', updated.translations.vi.version, directory).translations, patch.translations.vi);
    fs.writeFileSync(patchFile, JSON.stringify({ ...patch, questionsVersion: `q-${'0'.repeat(64)}` }));
    assert.throws(() => execFileSync(process.execPath, [cli, '--output', directory, '--patch', patchFile], {
        cwd: root, stdio: 'pipe',
    }), /Patch question version does not match/);
    assert.deepEqual(catalog.readManifest(directory), updated);
    assert.throws(() => execFileSync(process.execPath, [cli, '--output', directory, '--patch', patchFile, '--skip-invalid'], {
        cwd: root, stdio: 'pipe',
    }), /Unknown option/);
});

test('translation CLI exports a separate file and never modifies the source', t => {
    const directory = fixture(t);
    const questions = path.join(directory, 'questions.json');
    const output = path.join(directory, 'vi.json');
    const checkpoint = path.join(directory, 'checkpoint.json');
    const sourceText = JSON.stringify([source], null, 2);
    fs.writeFileSync(questions, sourceText);
    fs.writeFileSync(checkpoint, JSON.stringify({
        version: 2, model: 'gpt-4o-mini', usage: { input: 0, output: 0 },
        entries: { q1: { sourceHash: sourceHash(source), reviewed: true, translation } },
    }));
    execFileSync(process.execPath, [path.join(root, 'tools/laixe-catalog/translate-vi.mjs'),
        '--questions', questions, '--output', output, '--checkpoint', checkpoint, '--apply-only'], { cwd: root });
    assert.equal(fs.readFileSync(questions, 'utf8'), sourceText);
    assert.deepEqual(JSON.parse(fs.readFileSync(output, 'utf8')), vi);
});
