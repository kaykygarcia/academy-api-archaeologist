import { expect, test } from 'vitest';
import { compareContracts, inferContract } from '../src';
import type { ChangeCode, ChangeSeverity, JsonValue } from '../src';
import { baseline, current } from './helpers';

function diff(before: JsonValue[], after: JsonValue[]) {
  return compareContracts(inferContract(before), inferContract(after));
}

type Expected = [string, ChangeCode, ChangeSeverity];

function signatures(before: JsonValue[], after: JsonValue[]) {
  return diff(before, after).map(({ path, code, severity }) => [
    path,
    code,
    severity,
  ]);
}

const cases: {
  name: string;
  before: JsonValue[];
  after: JsonValue[];
  expected: Expected[];
}[] = [
  {
    name: 'DIF-01 top-most new property',
    before: [{}],
    after: [{ a: { b: { c: 1 } } }],
    expected: [['$.a', 'property-added', 'informational']],
  },
  {
    name: 'DIF-02 top-most property not observed',
    before: [{ a: { b: { c: 1 } } }],
    after: [{}],
    expected: [['$.a', 'property-not-observed', 'potentially-breaking']],
  },
  {
    name: 'DIF-03 number to string',
    before: [1],
    after: ['x'],
    expected: [['$', 'type-changed', 'potentially-breaking']],
  },
  {
    name: 'DIF-03 number to union',
    before: [1],
    after: [1, 'x'],
    expected: [['$', 'type-expanded', 'potentially-breaking']],
  },
  {
    name: 'union narrowed',
    before: [1, 'x'],
    after: [1],
    expected: [['$', 'type-narrowed', 'review']],
  },
  {
    name: 'DIF-03 string to nullable reports only nullability',
    before: ['x'],
    after: ['x', null],
    expected: [['$', 'became-nullable', 'potentially-breaking']],
  },
  {
    name: 'null no longer observed',
    before: ['x', null],
    after: ['x'],
    expected: [['$', 'null-not-observed', 'informational']],
  },
  {
    name: 'null-only to string',
    before: [null],
    after: ['x'],
    expected: [
      ['$', 'type-expanded', 'potentially-breaking'],
      ['$', 'null-not-observed', 'informational'],
    ],
  },
  {
    name: 'string to null-only',
    before: ['x'],
    after: [null],
    expected: [
      ['$', 'type-narrowed', 'review'],
      ['$', 'became-nullable', 'potentially-breaking'],
    ],
  },
  {
    name: 'required to optional',
    before: [{ a: 1 }],
    after: [{ a: 2 }, {}],
    expected: [['$.a', 'presence-reduced', 'potentially-breaking']],
  },
  {
    name: 'optional to observed in all',
    before: [{ a: 1 }, {}],
    after: [{ a: 2 }],
    expected: [['$.a', 'presence-increased', 'informational']],
  },
  {
    name: 'optional ratio changed',
    before: [{ a: 1 }, {}],
    after: [{ a: 2 }, {}, {}],
    expected: [],
  },
  {
    name: 'required counts changed',
    before: [{ a: 1 }],
    after: [{ a: 2 }, { a: 3 }],
    expected: [],
  },
  {
    name: 'object to array root suppresses children',
    before: [{ a: { b: { c: 1 } } }],
    after: [[{ b: 2 }]],
    expected: [['$', 'type-changed', 'potentially-breaking']],
  },
  {
    name: 'DIF-05 added, absent and changed inside array objects',
    before: [{ items: [{ old: true, id: 1 }] }],
    after: [{ items: [{ new: true, id: 'x' }] }],
    expected: [
      ['$.items[*].id', 'type-changed', 'potentially-breaking'],
      ['$.items[*].new', 'property-added', 'informational'],
      ['$.items[*].old', 'property-not-observed', 'potentially-breaking'],
    ],
  },
  {
    name: 'arrays of arrays',
    before: [{ matrix: [[1]] }],
    after: [{ matrix: [['x']] }],
    expected: [['$.matrix[*][*]', 'type-changed', 'potentially-breaking']],
  },
  {
    name: 'nested arrays of objects',
    before: [{ orders: [{ lines: [{ sku: 1 }] }] }],
    after: [{ orders: [{ lines: [{ sku: 'x' }] }] }],
    expected: [
      ['$.orders[*].lines[*].sku', 'type-changed', 'potentially-breaking'],
    ],
  },
  {
    name: 'elements no longer observed without child noise',
    before: [{ items: [{ sku: 1 }] }],
    after: [{ items: [] }],
    expected: [['$.items', 'elements-not-observed', 'review']],
  },
  {
    name: 'elements now observed without child noise',
    before: [{ items: [] }],
    after: [{ items: [{ sku: 1 }] }],
    expected: [['$.items', 'elements-observed', 'informational']],
  },
  {
    name: 'object branch absent on current suppresses property changes',
    before: [{ value: { child: 1 } }],
    after: [{ value: null }],
    expected: [
      ['$.value', 'type-narrowed', 'review'],
      ['$.value', 'became-nullable', 'potentially-breaking'],
    ],
  },
  {
    name: 'object branch absent on baseline suppresses property changes',
    before: [{ value: null }],
    after: [{ value: { child: 1 } }],
    expected: [
      ['$.value', 'type-expanded', 'potentially-breaking'],
      ['$.value', 'null-not-observed', 'informational'],
    ],
  },
  {
    name: 'special path escaping',
    before: [{ 'a-b': 1 }],
    after: [{ 'a-b': 'x' }],
    expected: [['$["a-b"]', 'type-changed', 'potentially-breaking']],
  },
];

for (const entry of cases)
  test(entry.name, () =>
    expect(signatures(entry.before, entry.after)).toEqual(entry.expected),
  );

test('DIF-02 absence explanation limits claims and includes parent evidence', () => {
  const changes = diff([{ a: 1 }, { a: 2 }, { a: 3 }], [{}, {}]);
  expect(changes[0]?.explanation).toContain(
    'não observada nas novas amostras; pode ter sido removida ou as amostras podem não cobrir o caso',
  );
  expect(changes[0]?.explanation).toContain('3/3 objetos pai no baseline, 0/2');
});

test('presence increase does not prove requiredness', () => {
  expect(diff([{ a: 1 }, {}], [{ a: 2 }])[0]?.explanation).toContain(
    'não comprova que a propriedade agora é obrigatória',
  );
});

test('DIF-05 nested presence uses item occurrences, not sample count', () => {
  const changes = diff(
    [{ items: [{ a: 1 }, { a: 2 }, { a: 3 }] }],
    [{ items: [{ a: 4 }, {}] }],
  );
  expect(changes).toHaveLength(1);
  expect(changes[0]).toMatchObject({
    path: '$.items[*].a',
    previous: '3/3 objetos pai',
    current: '1/2 objetos pai',
    code: 'presence-reduced',
    severity: 'potentially-breaking',
  });
  expect(changes[0]?.explanation).toContain('3/3 objetos pai no baseline, 1/2');
});

test('DIF-04 no false positives from order, duplicates, counts or string values', () => {
  const shuffled = baseline.toSorted(
    (a, b) => JSON.stringify(b).length - JSON.stringify(a).length,
  );
  for (const samples of [
    baseline,
    baseline.toReversed(),
    shuffled,
    [...baseline, ...baseline],
  ])
    expect(diff(baseline, samples)).toEqual([]);
  expect(
    diff(
      [{ a: 1, b: 'old' }],
      [
        { b: 'new', a: 2 },
        { a: 3, b: 'other' },
      ],
    ),
  ).toEqual([]);
  expect(diff([{ a: 1 }, { a: 2 }], [{ a: 3 }])).toEqual([]);
});

test('output sorts by code-unit path then rule order', () => {
  expect(
    signatures(
      [{ z: 1, A: 1, a: 1, é: 1 }],
      [{ z: null, A: null, a: null, é: null }],
    ),
  ).toEqual(
    ['$.A', '$.a', '$.z', '$["é"]'].flatMap((path) => [
      [path, 'type-narrowed', 'review'],
      [path, 'became-nullable', 'potentially-breaking'],
    ]),
  );
});

test('mismatched and unknown format versions throw incompatible-contract', () => {
  const contract = inferContract([{}]);
  const incompatible = structuredClone(contract);
  Object.defineProperty(incompatible, 'formatVersion', { value: 2 });
  for (const [a, b] of [
    [contract, incompatible],
    [incompatible, contract],
    [incompatible, incompatible],
  ]) {
    if (!a || !b) throw new Error('Missing contract');
    expect(() => compareContracts(a, b)).toThrowError(
      expect.objectContaining({ code: 'incompatible-contract' }),
    );
  }
});

test('spec example produces exactly five stable changes in output order', () => {
  expect(diff(baseline, current)).toMatchInlineSnapshot(`
    [
      {
        "code": "type-narrowed",
        "current": "null",
        "explanation": "Tipos não nulos não observados: string. Uma observação mais restrita não comprova que o comportamento anterior foi removido. Baseline: string 1, null 1. Novas amostras: null 1.",
        "path": "$.coupon",
        "previous": "string | null",
        "severity": "review",
      },
      {
        "code": "property-added",
        "current": "string",
        "explanation": "Nova propriedade observada. Observado em 0/3 objetos pai no baseline, 1/2 objetos pai nas novas amostras.",
        "path": "$.currency",
        "previous": null,
        "severity": "informational",
      },
      {
        "code": "property-added",
        "current": "string",
        "explanation": "Nova propriedade observada. Observado em 0/3 objetos pai no baseline, 2/2 objetos pai nas novas amostras.",
        "path": "$.customer.fullName",
        "previous": null,
        "severity": "informational",
      },
      {
        "code": "property-not-observed",
        "current": null,
        "explanation": "Propriedade não observada nas novas amostras; pode ter sido removida ou as amostras podem não cobrir o caso. Observado em 3/3 objetos pai no baseline, 0/2 objetos pai nas novas amostras.",
        "path": "$.customer.name",
        "previous": "string",
        "severity": "potentially-breaking",
      },
      {
        "code": "type-expanded",
        "current": "string | number",
        "explanation": "Novos tipos não nulos: string. Baseline: number 3. Novas amostras: string 1, number 1.",
        "path": "$.id",
        "previous": "number",
        "severity": "potentially-breaking",
      },
    ]
  `);
});

test('type evidence names gained and lost kinds when both occur', () => {
  const changes = diff([1, 'x'], [1, true]);
  expect(changes).toHaveLength(1);
  expect(changes[0]).toMatchObject({
    code: 'type-expanded',
    explanation:
      'Novos tipos não nulos: boolean. Tipos não nulos não observados: string. Baseline: string 1, number 1. Novas amostras: number 1, boolean 1.',
  });
});

test('narrowing evidence includes each observed kind count on both sides', () => {
  expect(diff(['x', null], [null])[0]?.explanation).toBe(
    'Tipos não nulos não observados: string. Uma observação mais restrita não comprova que o comportamento anterior foi removido. Baseline: string 1, null 1. Novas amostras: null 1.',
  );
});

test('null evidence uses singular and plural occurrences', () => {
  expect(diff([null], ['x'])[1]?.explanation).toBe(
    'Null observado 1/1 vez no baseline, 0/1 vezes nas novas amostras; isso não comprova que null deixou de ser possível.',
  );
  expect(diff(['x'], [null, null])[1]?.explanation).toBe(
    'Null observado 0/1 vezes no baseline, 2/2 vezes nas novas amostras.',
  );
});

test('array evidence preserves counts and uses singular and plural forms', () => {
  expect(diff([[1]], [[], []])[0]?.explanation).toBe(
    'Contagem: 1 elemento em 1 array no baseline, 0 elementos em 2 arrays nas novas amostras.',
  );
  expect(
    diff([[]], [Array.from({ length: 1000 }, () => 1)])[0]?.explanation,
  ).toBe(
    'Contagem: 0 elementos em 1 array no baseline, 1.000 elementos em 1 array nas novas amostras.',
  );
});
