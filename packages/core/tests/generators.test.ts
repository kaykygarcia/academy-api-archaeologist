import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import Ajv2020 from 'ajv/dist/2020';
import { expect, test } from 'vitest';
import { z } from 'zod';
import {
  generateJsonSchema,
  generateTypeScript,
  generateZod,
  inferContract,
} from '../src';
import type { JsonValue } from '../src';
import { baseline, current, mixed, special } from './helpers';

const datasets: { name: string; samples: JsonValue[] }[] = [
  { name: 'baseline', samples: baseline },
  { name: 'current', samples: current },
  { name: 'mixed', samples: mixed },
  { name: 'special', samples: [special] },
  { name: 'roots', samples: [null, true, 0, '', {}, [], [1, 'x', null]] },
  { name: 'empty', samples: [[], []] },
  { name: 'null', samples: [null] },
  { name: 'object-null', samples: [{ a: { x: 1 } }, { a: null }] },
  { name: 'array-null', samples: [{ a: [1] }, { a: null }] },
  { name: 'number-string', samples: [1, 'x'] },
  {
    name: 'nested',
    samples: [{ values: [[{ value: null }], [{ value: 'x' }]] }],
  },
];

function compile(source: string): readonly ts.Diagnostic[] {
  const filename = fileURLToPath(
    new URL('./.generated/typecheck.ts', import.meta.url),
  );
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2023,
    module: ts.ModuleKind.Preserve,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    types: [],
  };
  const host = ts.createCompilerHost(options);
  const original = host.getSourceFile.bind(host);
  host.getSourceFile = (
    name,
    languageVersion,
    onError,
    shouldCreateNewSourceFile,
  ) =>
    name === filename
      ? ts.createSourceFile(name, source, languageVersion, true)
      : original(name, languageVersion, onError, shouldCreateNewSourceFile);
  return ts.getPreEmitDiagnostics(ts.createProgram([filename], options, host));
}

async function loadZod(name: string, samples: JsonValue[]) {
  const directory = new URL('./.generated/', import.meta.url);
  await mkdir(directory, { recursive: true });
  const filename = new URL(`${name}.ts`, directory);
  await writeFile(filename, generateZod(inferContract(samples)));
  const module: unknown = await import(filename.href);
  if (
    typeof module !== 'object' ||
    module === null ||
    !('ApiResponseSchema' in module) ||
    !(module.ApiResponseSchema instanceof z.ZodType)
  )
    throw new Error('Generated module does not export a Zod schema');
  return module.ApiResponseSchema;
}

for (const { name, samples } of datasets) {
  test(`GEN-01 ${name} TypeScript compiles with strict sample assignments`, () => {
    const source =
      generateTypeScript(inferContract(samples)) +
      samples
        .map(
          (sample, i) =>
            `const sample${i}: ApiResponse = ${JSON.stringify(sample)};`,
        )
        .join('\n');
    expect(
      compile(source).map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      ),
    ).toEqual([]);
  });
  test(`GEN-02 ${name} generated Zod imports and accepts every inference sample`, async () => {
    expect(
      compile(generateZod(inferContract(samples))).map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      ),
    ).toEqual([]);
    const schema = await loadZod(name, samples);
    for (const sample of samples)
      expect(schema.safeParse(sample).success).toBe(true);
  });
  test(`GEN-03 ${name} JSON Schema compiles in Ajv2020 defaults and accepts samples`, () => {
    const schema: object = JSON.parse(
      generateJsonSchema(inferContract(samples)),
    );
    const warnings: unknown[][] = [];
    const logger = {
      log() {},
      error() {},
      warn(...args: unknown[]) {
        warnings.push(args);
      },
    };
    const validate = new Ajv2020({ logger }).compile(schema);
    expect(warnings).toEqual([]);
    for (const sample of samples) expect(validate(sample)).toBe(true);
  });
}

const order: JsonValue = {
  id: 900,
  status: 'new-status',
  customer: { id: 55, name: 'New' },
  items: [{ sku: 'other', quantity: 2.5 }],
};

const mixedValue = {
  id: 1,
  items: [{ quantity: 2, nested: { value: false } }],
  empty: [],
  special,
};

type ValidationCase = {
  name: string;
  value: JsonValue;
  accept: boolean;
  preserved?: object;
};

const tables: {
  name: string;
  samples: JsonValue[];
  cases: ValidationCase[];
}[] = [
  {
    name: 'order-table',
    samples: baseline,
    cases: [
      {
        name: 'optional omitted, new string values and fractional numbers',
        value: order,
        accept: true,
      },
      {
        name: 'extra root and nested properties preserved',
        preserved: { extra: 'root', customer: { extra: { nested: true } } },
        value: {
          ...order,
          extra: 'root',
          customer: { id: 55, name: 'New', extra: { nested: true } },
        },
        accept: true,
      },
      {
        name: 'nullable and empty inferred array',
        value: { ...order, coupon: null, items: [] },
        accept: true,
      },
      {
        name: 'missing required',
        value: { status: 'paid', customer: { id: 55, name: 'New' }, items: [] },
        accept: false,
      },
      {
        name: 'never-null property',
        value: { ...order, status: null },
        accept: false,
      },
      {
        name: 'wrong primitive',
        value: { ...order, items: [{ sku: 'other', quantity: '2' }] },
        accept: false,
      },
      { name: 'non-array', value: { ...order, items: {} }, accept: false },
    ],
  },
  {
    name: 'current-table',
    samples: current,
    cases: [
      {
        name: 'number union and optional omitted',
        value: {
          id: 1,
          status: 'new',
          customer: { id: 1, fullName: 'New' },
          items: [],
        },
        accept: true,
      },
      {
        name: 'string union and nullable',
        value: {
          id: '1',
          status: 'new',
          coupon: null,
          customer: { id: 1, fullName: 'New' },
          items: [],
        },
        accept: true,
      },
      {
        name: 'extra root and nested properties preserved',
        preserved: { extra: true, customer: { extra: true } },
        value: {
          id: 1,
          status: 'new',
          extra: true,
          customer: { id: 1, fullName: 'New', extra: true },
          items: [],
        },
        accept: true,
      },
      {
        name: 'missing required',
        value: {
          status: 'new',
          customer: { id: 1, fullName: 'New' },
          items: [],
        },
        accept: false,
      },
      {
        name: 'never-null',
        value: {
          id: null,
          status: 'new',
          customer: { id: 1, fullName: 'New' },
          items: [],
        },
        accept: false,
      },
      {
        name: 'wrong primitive',
        value: {
          id: 1,
          status: 'new',
          customer: { id: 1, fullName: 'New' },
          items: [{ sku: 'x', quantity: '2' }],
        },
        accept: false,
      },
      {
        name: 'non-array',
        value: {
          id: 1,
          status: 'new',
          customer: { id: 1, fullName: 'New' },
          items: {},
        },
        accept: false,
      },
    ],
  },
  {
    name: 'mixed-table',
    samples: mixed,
    cases: [
      {
        name: 'number union variant, optional omitted, special keys',
        value: mixedValue,
        accept: true,
      },
      {
        name: 'string union variant',
        value: { ...mixedValue, id: 'text' },
        accept: true,
      },
      {
        name: 'null and empty inferred array',
        value: { ...mixedValue, coupon: null, items: [] },
        accept: true,
      },
      {
        name: 'extra root and nested properties preserved',
        preserved: {
          extra: true,
          items: [{ extra: 'item', nested: { extra: 1 } }],
        },
        value: {
          ...mixedValue,
          extra: true,
          items: [
            { quantity: 3, extra: 'item', nested: { value: true, extra: 1 } },
          ],
        },
        accept: true,
      },
      {
        name: 'unknown elements accept arbitrary arrays',
        value: { ...mixedValue, empty: [null, 1, 'x', {}, [true]] },
        accept: true,
      },
      {
        name: 'unknown elements still require an array',
        value: { ...mixedValue, empty: 'wrong' },
        accept: false,
      },
      {
        name: 'missing required',
        value: { items: [], empty: [], special },
        accept: false,
      },
      {
        name: 'never-null property',
        value: { ...mixedValue, id: null },
        accept: false,
      },
      {
        name: 'wrong primitive',
        value: {
          ...mixedValue,
          items: [{ quantity: '2', nested: { value: false } }],
        },
        accept: false,
      },
      { name: 'non-array', value: { ...mixedValue, items: {} }, accept: false },
      {
        name: 'unobserved union variant',
        value: { ...mixedValue, id: true },
        accept: false,
      },
    ],
  },
];

tables.push(
  {
    name: 'nested-rejections',
    samples: baseline,
    cases: [
      {
        name: 'missing customer.name',
        value: { ...order, customer: { id: 55 } },
        accept: false,
      },
      {
        name: 'wrong customer.name type',
        value: { ...order, customer: { id: 55, name: 5 } },
        accept: false,
      },
    ],
  },
  {
    name: 'array-union',
    samples: [[1, 'x']],
    cases: [
      { name: 'number variant', value: [2], accept: true },
      { name: 'string variant', value: ['y'], accept: true },
      { name: 'third kind', value: [true], accept: false },
    ],
  },
  {
    name: 'null-only-slot',
    samples: [{ value: null }],
    cases: [
      { name: 'null accepted', value: { value: null }, accept: true },
      { name: 'string rejected', value: { value: 'x' }, accept: false },
    ],
  },
  {
    name: 'primitive-root',
    samples: [1],
    cases: [
      { name: 'number accepted', value: 2, accept: true },
      { name: 'string rejected', value: 'x', accept: false },
    ],
  },
  {
    name: 'union-root',
    samples: [1, 'x'],
    cases: [
      { name: 'number accepted', value: 2, accept: true },
      { name: 'string accepted', value: 'y', accept: true },
      { name: 'boolean rejected', value: true, accept: false },
    ],
  },
);

for (const table of tables) {
  test(`5.7 ${table.name} identical accept/reject table for Zod and Ajv2020`, async () => {
    const zod = await loadZod(table.name, table.samples);
    const schema: object = JSON.parse(
      generateJsonSchema(inferContract(table.samples)),
    );
    const ajv = new Ajv2020().compile(schema);
    for (const entry of [
      ...table.samples.map((value, i) => ({
        name: `inference ${i}`,
        value,
        accept: true,
      })),
      ...table.cases,
    ]) {
      expect(zod.safeParse(entry.value).success, `Zod: ${entry.name}`).toBe(
        entry.accept,
      );
      expect(ajv(entry.value), `Ajv: ${entry.name}`).toBe(entry.accept);
    }
    for (const entry of table.cases)
      if (entry.preserved !== undefined)
        expect(zod.parse(entry.value)).toMatchObject(entry.preserved);
  });
}

test('INF-08 generated special keys preserve hard safety assertions', async () => {
  const before = Object.getOwnPropertyDescriptors(Object.prototype);
  const contract = inferContract([special]);
  expect(generateZod(contract)).toContain('["__proto__"]:');
  expect(generateZod(contract)).toContain('["a-b"]:');
  const zod = await loadZod('special-behaviour', [special]);
  expect(zod.safeParse(special).success).toBe(true);
  const schema: { properties: object } = JSON.parse(
    generateJsonSchema(contract),
  );
  expect(Object.hasOwn(schema.properties, '__proto__')).toBe(true);
  expect(new Ajv2020().compile(schema)(special)).toBe(true);
  expect(Object.hasOwn(special, '__proto__')).toBe(true);
  expect(Object.getOwnPropertyDescriptors(Object.prototype)).toEqual(before);
});

test('printers preserve optionality, nullable, array union parentheses and escaping', () => {
  const contract = inferContract(mixed);
  expect(generateZod(contract)).toContain(
    'coupon: z.string().nullable().optional()',
  );
  expect(generateTypeScript(contract)).toContain('coupon?: string | null');
  expect(generateTypeScript(inferContract([[1, 'x']]))).toContain(
    '(string | number)[]',
  );
  expect(
    generateTypeScript(inferContract([{ default: true, 'a-b': false }])),
  ).toContain('default: boolean');
  expect(generateJsonSchema(inferContract([{}, { a: 1 }]))).not.toContain(
    'required',
  );
});

test.each([
  { name: 'empty object rejects a primitive', samples: [{}], invalid: '5' },
  { name: 'wrong primitive', samples: [1], invalid: '"wrong"' },
  { name: 'missing required key', samples: [{ id: 1 }], invalid: '{}' },
])('GEN-01 negative: $name', ({ samples, invalid }) => {
  const source = generateTypeScript(inferContract(samples));
  expect(
    compile(
      source +
        `\n// @ts-expect-error observed type must reject this assignment\nconst invalid: ApiResponse = ${invalid};`,
    ),
  ).toEqual([]);
});

test.each(['constructor', 'toString'])(
  'known limitation: optional %s rejects an omitted own property',
  async (key) => {
    const samples = [{ [key]: 'value' }, {}];
    const zod = await loadZod(`optional-${key}`, samples);
    const schema: object = JSON.parse(
      generateJsonSchema(inferContract(samples)),
    );
    const ajv = new Ajv2020().compile(schema);
    expect(zod.safeParse({}).success).toBe(false);
    expect(ajv({})).toBe(false);
  },
);

test('known limitation: validators do not enforce __proto__', async () => {
  const sample: JsonValue = JSON.parse('{"__proto__":"value"}');
  const zod = await loadZod('proto-limitation', [sample]);
  const schema: object = JSON.parse(
    generateJsonSchema(inferContract([sample])),
  );
  const ajv = new Ajv2020().compile(schema);
  const wrong: JsonValue = JSON.parse('{"__proto__":5}');
  for (const value of [{}, wrong]) {
    expect(zod.safeParse(value).success).toBe(true);
    expect(ajv(value)).toBe(true);
  }
});

test('known limitation: Zod output drops the own __proto__ key', async () => {
  const sample: JsonValue = JSON.parse('{"__proto__":"value"}');
  if (typeof sample !== 'object' || sample === null)
    throw new Error('Expected an object sample');
  expect(Object.hasOwn(sample, '__proto__')).toBe(true);
  const zod = await loadZod('proto-output-limitation', [sample]);
  const output: unknown = zod.parse(sample);
  expect(
    typeof output === 'object' &&
      output !== null &&
      Object.hasOwn(output, '__proto__'),
  ).toBe(false);
});

test('known limitation: JSON number overflow parses as Infinity but validators reject it', async () => {
  const overflow: JsonValue = JSON.parse('1e999');
  expect(overflow).toBe(Infinity);
  const zod = await loadZod('overflow', [overflow]);
  const schema: object = JSON.parse(
    generateJsonSchema(inferContract([overflow])),
  );
  expect(zod.safeParse(overflow).success).toBe(false);
  expect(new Ajv2020().compile(schema)(overflow)).toBe(false);
});

test('JSON Schema uses single types, nullable type pairs and anyOf for conflicts', () => {
  for (const [samples, expected] of [
    [[1], { type: 'number' }],
    [[1, null], { type: ['number', 'null'] }],
    [[{}, null], { type: ['object', 'null'], properties: {} }],
    [[[], null], { type: ['array', 'null'], items: {} }],
    [
      [1, 'x', null],
      { anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'null' }] },
    ],
  ] satisfies [JsonValue[], object][]) {
    expect(JSON.parse(generateJsonSchema(inferContract(samples)))).toEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      ...expected,
    });
  }
});
