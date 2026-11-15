#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { publishCatalog, readManifest, readTranslationPack } from '../../src/lib/laixe/catalog.mjs';

const { values } = parseArgs({ options: {
    questions: { type: 'string' },
    translation: { type: 'string', multiple: true },
    patch: { type: 'string' },
    output: { type: 'string' },
    date: { type: 'string', default: new Date().toISOString().slice(0, 10) },
} });
if (!values.questions && !values.translation?.length && !values.patch) {
    throw new Error('Use --questions /absolute/questions.json, --translation vi=/absolute/vi.json or --patch /absolute/corrections.json');
}
if (values.patch && (values.questions || values.translation?.length)) {
    throw new Error('--patch cannot be combined with --questions or --translation');
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const directory = values.output ? path.resolve(values.output) : path.join(root, 'content/laixe/catalog');
const translations = {};
for (const item of values.translation || []) {
    const separator = item.indexOf('=');
    if (separator < 1) throw new Error('Expected --translation language=/absolute/file.json');
    translations[item.slice(0, separator)] = JSON.parse(fs.readFileSync(item.slice(separator + 1), 'utf8'));
}
if (values.patch) {
    const patch = JSON.parse(fs.readFileSync(values.patch, 'utf8'));
    const manifest = readManifest(directory);
    if (!patch || patch.questionsVersion !== manifest.version) {
        throw new Error('Patch question version does not match the active catalog');
    }
    if (!patch.translations || typeof patch.translations !== 'object' || Array.isArray(patch.translations)
        || !Object.keys(patch.translations).length) throw new Error('Patch must contain translation corrections');
    for (const [lang, changes] of Object.entries(patch.translations)) {
        if (!changes || typeof changes !== 'object' || Array.isArray(changes) || !Object.keys(changes).length) {
            throw new Error(`Invalid patch entries: ${lang}`);
        }
        const metadata = manifest.translations[lang];
        if (!metadata) throw new Error(`No installed translation to patch: ${lang}`);
        const current = readTranslationPack(lang, metadata.version, directory);
        if (current.questionsVersion !== patch.questionsVersion) throw new Error(`Patch source mismatch: ${lang}`);
        translations[lang] = { ...current.translations, ...changes };
    }
}
const result = publishCatalog({
    directory,
    questions: values.questions ? JSON.parse(fs.readFileSync(values.questions, 'utf8')) : undefined,
    translations,
    date: values.date,
});
console.log(JSON.stringify(result, null, 2));
