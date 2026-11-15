import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  audit, buildOutputs, cachedTranslation, responseSchema, sourceHash, translateBatch, validateBatch, validateTranslation,
} from './translate-vi.mjs';

const question = {
  question_id: '1.1.01-001',
  question_text: 'Was ist bei 50 km/h zu beachten?',
  options: [
    { letter: 'A.', text: 'Den Abstand zum [roten Pkw] vergrößern' },
    { letter: 'B.', text: 'Bei 50 km/h bremsen' },
  ],
  comment: 'Halten Sie bei 50 km/h einen Abstand von 25 m.',
  correct_answers: [{ letter: 'A.', text: 'Den Abstand zum [roten Pkw] vergrößern' }],
  local_image_paths: ['images/example.png'],
};
const translation = {
  question_text: 'Cần chú ý điều gì khi chạy với tốc độ 50 km/h?',
  options: [
    { letter: 'A.', text: 'Tăng khoảng cách với [ô tô màu đỏ]' },
    { letter: 'B.', text: 'Phanh khi chạy với tốc độ 50 km/h' },
  ],
  comment: 'Giữ khoảng cách 25 m khi chạy với tốc độ 50 km/h.',
};
const clone = value => structuredClone(value);
const checkpoint = () => ({
  entries: { [question.question_id]: { sourceHash: sourceHash(question), reviewed: true, translation: clone(translation) } },
});

test('accepts complete translations, including numbers in a different word order', () => {
  assert.deepEqual(validateTranslation(question, translation), translation);
});

test('rejects German copied into the Vietnamese question, option, or explanation', () => {
  for (const field of ['question_text', 'comment']) {
    const invalid = clone(translation);
    invalid[field] = question[field];
    assert.throws(() => validateTranslation(question, invalid), /copied/);
  }
  const invalid = clone(translation);
  invalid.options[0].text = question.options[0].text;
  assert.throws(() => validateTranslation(question, invalid), /copied/);
});

test('rejects missing options, reordered letters, changed numbers, and removed brackets', () => {
  const invalidCases = [
    { ...translation, options: translation.options.slice(0, 1) },
    { ...translation, options: [...translation.options].reverse() },
    { ...translation, question_text: translation.question_text.replace('50', '60') },
    { ...translation, options: [{ ...translation.options[0], text: 'Tăng khoảng cách với ô tô màu đỏ' }, translation.options[1]] },
  ];
  invalidCases.forEach(invalid => assert.throws(() => validateTranslation(question, invalid)));
});

test('preserves placeholders and decimal notation', () => {
  const source = { ...question, question_text: 'Abstand {count}: 1,5 m' };
  assert.doesNotThrow(() => validateTranslation(source, { ...translation, question_text: 'Khoảng cách {count}: 1,5 m' }));
  assert.throws(() => validateTranslation(source, { ...translation, question_text: 'Khoảng cách {n}: 1,5 m' }), /placeholders/);
  assert.throws(() => validateTranslation(source, { ...translation, question_text: 'Khoảng cách {count}: 1.5 m' }), /numbers/);
});

test('allows translated formula labels while preserving braces and numbers', () => {
  const source = {
    ...question,
    options: [{ letter: 'A.', text: '{Geschwindigkeit in km/h}/{10} x 3' }],
  };
  const translated = {
    ...translation,
    options: [{ letter: 'A.', text: '{Tốc độ tính bằng km/h}/{10} x 3' }],
  };
  assert.doesNotThrow(() => validateTranslation(source, translated));
  assert.throws(() => validateTranslation(source, {
    ...translated,
    options: [{ letter: 'A.', text: 'Tốc độ tính bằng km/h / 10 x 3' }],
  }), /brackets/);
});

test('removes extra square-bracket markup without changing translation meaning', () => {
  const translated = { ...translation, comment: 'Giữ khoảng cách 25 m khi chạy với tốc độ [50 km/h].' };
  assert.equal(validateTranslation(question, translated).comment, translation.comment);
});

test('numeric questions keep empty options and do not get invented explanations', () => {
  const source = { ...question, options: [], comment: '' };
  const translated = { ...translation, options: [], comment: '' };
  assert.doesNotThrow(() => validateTranslation(source, translated));
  assert.throws(() => validateTranslation(source, { ...translated, comment: 'Nội dung mới' }), /invented/);
});

test('accepts unchanged numeric-only options and official acronyms', () => {
  const options = [{ letter: 'A.', text: '50 km/h' }, { letter: 'B.', text: 'ABS' }];
  assert.doesNotThrow(() => validateTranslation({ ...question, options }, { ...translation, options }));
});

test('batch validation rejects missing, duplicate, or invented question IDs', () => {
  const valid = { id: question.question_id, ...translation };
  assert.deepEqual(validateBatch([question], { questions: [valid] }), { [question.question_id]: translation });
  assert.throws(() => validateBatch([question], { questions: [] }));
  assert.throws(() => validateBatch([question], { questions: [{ ...valid, id: 'unknown' }] }));
  assert.throws(() => validateBatch([question, { ...question, question_id: 'other' }], { questions: [valid, valid] }));
});

test('resumes only translations matching current source and passing validation', () => {
  assert.deepEqual(cachedTranslation(question, checkpoint()), translation);
  assert.equal(cachedTranslation({ ...question, comment: 'Neue Erklärung' }, checkpoint()), null);
  const invalid = checkpoint();
  invalid.entries[question.question_id].translation.question_text = question.question_text;
  assert.equal(cachedTranslation(question, invalid), null);
  const unreviewed = checkpoint();
  unreviewed.entries[question.question_id].reviewed = false;
  assert.equal(cachedTranslation(question, unreviewed), null);
});

test('keeps reviewed GPT-4.1 translations when continuing with GPT-4o mini', () => {
  const saved = checkpoint();
  saved.model = 'gpt-4.1-2025-04-14';
  saved.entries[question.question_id].sourceHash = sourceHash(question, saved.model);
  assert.deepEqual(cachedTranslation(question, saved), translation);
  assert.equal(cachedTranslation({ ...question, question_text: 'Neue Frage?' }, saved), null);

  saved.entries[question.question_id].model = 'gpt-4o-mini';
  saved.entries[question.question_id].sourceHash = sourceHash(question, 'gpt-4o-mini');
  assert.deepEqual(cachedTranslation(question, saved), translation);
});

test('outputs keep translations separate without mutating source questions or answers', () => {
  const before = clone(question);
  const result = buildOutputs([question], checkpoint());
  assert.deepEqual(result.questions[0], before);
  assert.deepEqual(question, before);
  assert.deepEqual(result.translations[question.question_id], translation);
  assert.deepEqual(audit(result.questions, result.translations), []);
  assert.throws(() => buildOutputs([question], { entries: {} }), /no validated/);
});

test('audit validates independent translations and catches missing entries', () => {
  assert.deepEqual(audit([question], { [question.question_id]: translation }), []);
  assert.match(audit([question], {})[0], /missing/);
});

function apiResponse(result, status = 200) {
  return new Response(JSON.stringify(result), { status, headers: { 'Content-Type': 'application/json' } });
}
function completion(translated = translation) {
  return {
    choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ questions: [{ id: question.question_id, ...translated }] }) } }],
    usage: { prompt_tokens: 100, completion_tokens: 200 },
  };
}

test('OpenAI requests use structured output and record usage', async () => {
  let usage;
  const result = await translateBatch([question], {
    apiKey: 'test-only',
    fetchImpl: async (url, request) => {
      assert.equal(url, 'https://api.openai.com/v1/chat/completions');
      const payload = JSON.parse(request.body);
      assert.equal(payload.model, 'gpt-4o-mini');
      assert.equal(payload.response_format.json_schema.strict, true);
      assert.equal(request.headers.Authorization, 'Bearer test-only');
      return apiResponse(completion());
    },
    onUsage: value => { usage = value; },
  });
  assert.deepEqual(result, { [question.question_id]: translation });
  assert.equal(usage.completion_tokens, 200);
});

test('review requests include German sources and validated candidates', async () => {
  await translateBatch([question], {
    apiKey: 'test-only',
    candidates: { [question.question_id]: translation },
    fetchImpl: async (_url, request) => {
      const payload = JSON.parse(request.body);
      assert.match(payload.messages[0].content, /translation reviewer/);
      const input = JSON.parse(payload.messages[1].content);
      assert.equal(input.questions[0].question_text, question.question_text);
      assert.equal(input.candidates[0].question_text, translation.question_text);
      assert.match(payload.messages[0].content, /Kraftfahrstraße/);
      return apiResponse(completion());
    },
  });
});

test('picture-answer text stays empty in both the source and translation', () => {
  const options = [{ letter: 'A.', text: '' }];
  assert.doesNotThrow(() => validateTranslation({ ...question, options }, { ...translation, options }));
  assert.throws(() => validateTranslation(
    { ...question, options },
    { ...translation, options: [{ letter: 'A.', text: 'Biển dừng lại' }] },
  ), /invented/);
});

test('response schema forbids empty text for source answers that contain text', () => {
  const properties = responseSchema([question]).properties.questions.items.properties;
  assert.equal(properties.question_text.minLength, 1);
  assert.equal(properties.options.items.properties.text.minLength, 1);
  assert.equal(properties.comment.minLength, 1);
  const picture = { ...question, options: [{ letter: 'A.', text: '' }], comment: '' };
  const pictureProperties = responseSchema([picture]).properties.questions.items.properties;
  assert.equal(pictureProperties.options.items.properties.text.minLength, 0);
  assert.equal(pictureProperties.comment.minLength, 0);
});

test('invalid translations are retried with validation feedback', async () => {
  let attempts = 0;
  await translateBatch([question], {
    apiKey: 'test-only',
    wait: async () => {},
    fetchImpl: async (_url, request) => {
      attempts++;
      if (attempts === 1) return apiResponse(completion({ ...translation, options: [] }));
      assert.match(JSON.parse(request.body).messages[1].content, /option count differs/);
      return apiResponse(completion());
    },
  });
  assert.equal(attempts, 2);
});

test('auth errors never print response bodies or credentials and are not retried', async () => {
  let attempts = 0;
  await assert.rejects(translateBatch([question], {
    apiKey: 'test-only',
    fetchImpl: async () => {
      attempts++;
      return apiResponse({ error: { message: 'sensitive-value', code: 'invalid_api_key' } }, 401);
    },
  }), error => error.message === 'OpenAI HTTP 401');
  assert.equal(attempts, 1);
});

test('quota exhaustion stops immediately rather than issuing paid retries', async () => {
  let attempts = 0;
  await assert.rejects(translateBatch([question], {
    apiKey: 'test-only',
    fetchImpl: async () => {
      attempts++;
      return apiResponse({ error: { code: 'insufficient_quota' } }, 429);
    },
  }), /insufficient API quota/);
  assert.equal(attempts, 1);
});

test('transient HTTP and network failures have bounded, sanitized retries', async () => {
  let attempts = 0;
  await assert.rejects(translateBatch([question], {
    apiKey: 'test-only',
    wait: async () => {},
    fetchImpl: async () => {
      attempts++;
      if (attempts === 1) return apiResponse({}, 503);
      throw new Error('request-header-secret');
    },
  }), error => error.message === 'OpenAI request failed or timed out');
  assert.equal(attempts, 5);
});
