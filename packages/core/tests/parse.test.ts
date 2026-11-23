import { expect, test, vi } from 'vitest';
import { InferenceError, LIMITS, inferContract, parseSamples } from '../src';
import type { JsonValue } from '../src';

function parse(text: string) {
  return parseSamples([{ name: 'sample.json', text }]);
}

function nested(depth: number): JsonValue {
  let value: JsonValue = 0;
  for (let i = 0; i < depth; i++) value = [value];
  return value;
}

test('INF-10 depth 50 succeeds and depth 51 fails with path', () => {
  expect(inferContract([nested(50)]).sampleCount).toBe(1);
  expect(() => inferContract([nested(51)])).toThrowError(
    expect.objectContaining({
      code: 'depth-exceeded',
      path: '$' + '[*]'.repeat(51),
      message: expect.stringContaining('50'),
    }),
  );
});

test('INF-10 visited values include roots and elements with exact boundary', () => {
  expect(
    inferContract([
      Array.from({ length: LIMITS.MAX_VISITED_VALUES - 1 }, () => 0),
    ]).root.array?.elementCount,
  ).toBe(LIMITS.MAX_VISITED_VALUES - 1);
  expect(() =>
    inferContract([Array.from({ length: LIMITS.MAX_VISITED_VALUES }, () => 0)]),
  ).toThrowError(
    expect.objectContaining({
      code: 'too-many-values',
      message: expect.stringContaining('2.000.000'),
    }),
  );
});

test('INF-10 many wide properties are supported', () => {
  const value = Object.fromEntries(
    Array.from({ length: 10000 }, (_, i) => [`key${i}`, i]),
  );
  expect(inferContract([value]).root.object?.properties).toHaveLength(10000);
});

test('INF-10 byte limits use UTF-8, including astral and unpaired surrogates', () => {
  const exact = '"' + 'a'.repeat(LIMITS.MAX_SAMPLE_BYTES - 2) + '"';
  expect(parse(exact).ok).toBe(true);
  for (const suffix of ['a', 'é', '\u{1F600}', '\ud800'])
    expect(parse(exact + suffix)).toMatchObject({
      ok: false,
      errors: [
        {
          code: 'sample-too-large',
          name: 'sample.json',
          message: 'O tamanho máximo da amostra é 5 MiB em sample.json.',
        },
      ],
    });
  expect(parse('"' + 'é'.repeat(LIMITS.MAX_SAMPLE_BYTES / 2) + '"').ok).toBe(
    false,
  );
  expect(
    parseSamples(
      Array.from({ length: 4 }, (_, i) => ({ name: `${i}`, text: exact })),
    ).ok,
  ).toBe(true);
  expect(
    parseSamples([
      ...Array.from({ length: 4 }, (_, i) => ({ name: `${i}`, text: exact })),
      { name: 'extra', text: '0' },
    ]),
  ).toMatchObject({
    ok: false,
    errors: [
      {
        code: 'session-too-large',
        message: 'O tamanho máximo da sessão é 20 MiB.',
      },
    ],
  });
});

test('sample count limits are enforced by parsing and inference', () => {
  expect(parseSamples([])).toMatchObject({
    ok: false,
    errors: [{ code: 'no-samples' }],
  });
  expect(() => inferContract([])).toThrowError(InferenceError);
  expect(() => inferContract([])).toThrowError(
    expect.objectContaining({ code: 'no-samples' }),
  );
  const samples = Array.from({ length: 200 }, () => 0);
  expect(inferContract(samples).sampleCount).toBe(200);
  expect(() => inferContract([...samples, 0])).toThrowError(
    expect.objectContaining({ code: 'too-many-samples' }),
  );
  const inputs = samples.map(() => ({ name: 'sample', text: '0' }));
  expect(parseSamples(inputs).ok).toBe(true);
  expect(parseSamples([...inputs, { name: 'extra', text: '0' }])).toMatchObject(
    { ok: false, errors: [{ code: 'too-many-samples' }] },
  );
});

test('invalid JSON reports all errors without returning partial values or payload text', () => {
  const result = parseSamples([
    { name: 'valid', text: '{}' },
    { name: 'empty', text: '  ' },
    { name: 'jsonl', text: '{}\n{}' },
    { name: 'broken', text: '{\n "secret": }' },
  ]);
  expect(result.ok).toBe(false);
  expect(result).not.toHaveProperty('values');
  if (result.ok) throw new Error('Expected errors');
  expect(result.errors.map((error) => error.name)).toEqual([
    'empty',
    'jsonl',
    'broken',
  ]);
  expect(result.errors[1]).toMatchObject({ line: 2, column: 1 });
  expect(JSON.stringify(result)).not.toContain('secret');
});

test('parser RangeError becomes a friendly named error', () => {
  const spy = vi.spyOn(JSON, 'parse').mockImplementationOnce(() => {
    throw new RangeError('stack');
  });
  try {
    expect(parse('{}')).toMatchObject({
      ok: false,
      errors: [
        { code: 'invalid-json', message: expect.stringContaining('50') },
      ],
    });
  } finally {
    spy.mockRestore();
  }
});

test('deep parsed JSON reaches the guarded inference instead of overflowing', () => {
  const result = parse('['.repeat(5000) + '0' + ']'.repeat(5000));
  expect(result.ok).toBe(true);
  if (result.ok)
    expect(() => inferContract(result.values)).toThrowError(
      expect.objectContaining({ code: 'depth-exceeded' }),
    );
});

test('oversized samples and invalid JSON are reported together', () => {
  const result = parseSamples([
    { name: 'oversized', text: ' '.repeat(LIMITS.MAX_SAMPLE_BYTES + 1) },
    { name: 'invalid', text: '{' },
  ]);
  expect(result).toMatchObject({
    ok: false,
    errors: [
      { name: 'oversized', code: 'sample-too-large' },
      { name: 'invalid', code: 'invalid-json' },
    ],
  });
});

test('invalid JSON before an oversized sample preserves input error order', () => {
  expect(
    parseSamples([
      { name: 'invalid', text: '{' },
      { name: 'oversized', text: ' '.repeat(LIMITS.MAX_SAMPLE_BYTES + 1) },
    ]),
  ).toMatchObject({
    ok: false,
    errors: [
      { name: 'invalid', code: 'invalid-json' },
      { name: 'oversized', code: 'sample-too-large' },
    ],
  });
});

test('session overflow returns only its error and never parses samples', () => {
  const spy = vi.spyOn(JSON, 'parse');
  try {
    expect(
      parseSamples([
        { name: 'oversized', text: ' '.repeat(LIMITS.MAX_SESSION_BYTES + 1) },
        { name: 'invalid', text: '{' },
      ]),
    ).toMatchObject({
      ok: false,
      errors: [
        {
          code: 'session-too-large',
          message: 'O tamanho máximo da sessão é 20 MiB.',
        },
      ],
    });
    expect(spy).not.toHaveBeenCalled();
  } finally {
    spy.mockRestore();
  }
});

test('engine position produces exact line and column', () => {
  const input = '{}\n{}';
  expect(() => JSON.parse(input)).toThrow(/position 3/);
  expect(parse(input)).toMatchObject({
    ok: false,
    errors: [{ line: 2, column: 1 }],
  });
});

test('known limitation: engine errors without a position have no line or column', () => {
  expect(() => JSON.parse('')).toThrow();
  try {
    JSON.parse('');
  } catch (error) {
    expect(error).toBeInstanceOf(SyntaxError);
    if (error instanceof Error)
      expect(error.message).not.toMatch(/position|line .*column/);
  }
  const result = parse('');
  if (result.ok) throw new Error('Expected parse error');
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0]).not.toHaveProperty('line');
  expect(result.errors[0]).not.toHaveProperty('column');
});
