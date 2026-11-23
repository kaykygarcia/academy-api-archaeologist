import { expect, test, vi } from 'vitest';
import {
  inferContract,
  LIMITS,
  validateContract,
  type ValueStats,
} from '../src';
import { baseline, current, mixed, special, property } from './helpers';

vi.mock('../src/limits', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/limits')>();
  return {
    ...original,
    LIMITS: { ...original.LIMITS, MAX_VISITED_VALUES: 100 },
  };
});

const contract = inferContract(baseline);

test('accepts fixture contracts and safely round-trips prototype-like names', () => {
  for (const input of [contract, inferContract([special])]) {
    const parsed: unknown = JSON.parse(JSON.stringify(input));
    const result = validateContract(parsed);
    expect(result).toEqual({ ok: true, contract: input });
    if (result.ok && input !== contract) {
      expect(
        property(result.contract.root, '__proto__').value.kindCounts.string,
      ).toBe(1);
      expect(Object.hasOwn(result.contract.root, '__proto__')).toBe(false);
    }
  }
});

test.each([
  null,
  [],
  1,
  'contract',
  { ...contract, formatVersion: 2 },
  { ...contract, sampleCount: Number.MAX_SAFE_INTEGER + 1 },
  { ...contract, sampleCount: -1 },
  { formatVersion: 1, sampleCount: 1 },
  { ...contract, root: null },
  { ...contract, root: { ...contract.root, observations: '1' } },
  { ...contract, root: { ...contract.root, observations: -1 } },
  { ...contract, root: { ...contract.root, observations: 0.5 } },
  {
    ...contract,
    root: {
      ...contract.root,
      kindCounts: { ...contract.root.kindCounts, extra: 0 },
    },
  },
  { ...contract, root: { ...contract.root, kindCounts: { string: 0 } } },
  { ...contract, root: { ...contract.root, object: { properties: 'bad' } } },
  {
    ...contract,
    root: {
      ...contract.root,
      object: {
        properties: [{ name: 1, presentCount: 1, value: contract.root }],
      },
    },
  },
  {
    ...contract,
    root: {
      ...contract.root,
      object: {
        properties: [{ name: 'a', presentCount: -1, value: contract.root }],
      },
    },
  },
  {
    ...contract,
    root: {
      ...contract.root,
      array: { emptyCount: -1, elementCount: 0, element: null },
    },
  },
  {
    ...contract,
    root: { ...contract.root, array: { emptyCount: 0, elementCount: 1 } },
  },
])('rejects malformed contracts %#', (value) => {
  expect(validateContract(value).ok).toBe(false);
});

test('rejects inherited required fields and duplicate names', () => {
  expect(validateContract(Object.create(contract)).ok).toBe(false);
  const entry = {
    name: '__proto__',
    presentCount: 1,
    value: inferContract([1]).root,
  };
  expect(
    validateContract({
      ...contract,
      root: { ...contract.root, object: { properties: [entry, entry] } },
    }),
  ).toMatchObject({ ok: false, reason: 'Nome de propriedade duplicado.' });
});

test('bounds depth including array elements', () => {
  let root: ValueStats = inferContract([1]).root;
  for (let depth = 0; depth < LIMITS.MAX_DEPTH + 1; depth++) {
    root = {
      ...inferContract([[]]).root,
      object: null,
      array: { emptyCount: 0, elementCount: 1, element: root },
    };
  }
  expect(validateContract({ ...contract, sampleCount: 1, root }).ok).toBe(true);
  root = { ...root, array: { emptyCount: 0, elementCount: 1, element: root } };
  expect(validateContract({ ...contract, root })).toMatchObject({
    ok: false,
    reason: 'Profundidade máxima do contrato excedida.',
  });
});

test('bounds total visited nodes without allocating millions in tests', () => {
  const scalar = inferContract([1]).root;
  const root = {
    ...contract.root,
    object: {
      properties: Array.from(
        { length: LIMITS.MAX_VISITED_VALUES },
        (_, index) => ({ name: String(index), presentCount: 1, value: scalar }),
      ),
    },
  };
  expect(validateContract({ ...contract, root })).toMatchObject({
    ok: false,
    reason: 'Limite de nós do contrato excedido.',
  });
});

test('real inference fixtures satisfy the consistency invariants', () => {
  for (const samples of [
    baseline,
    current,
    mixed,
    [special],
    [[], [[1]], null],
  ]) {
    const inferred = inferContract(samples);
    function check(slot: ValueStats) {
      expect(Number.isSafeInteger(slot.observations)).toBe(true);
      expect(Object.values(slot.kindCounts).every(Number.isSafeInteger)).toBe(
        true,
      );
      expect(
        Object.values(slot.kindCounts).reduce((sum, count) => sum + count, 0),
      ).toBe(slot.observations);
      expect(slot.object !== null).toBe(slot.kindCounts.object > 0);
      expect(slot.array !== null).toBe(slot.kindCounts.array > 0);
      for (const property of slot.object?.properties ?? []) {
        expect(Number.isSafeInteger(property.presentCount)).toBe(true);
        expect(property.presentCount).toBeLessThanOrEqual(
          slot.kindCounts.object,
        );
        check(property.value);
      }
      if (slot.array) {
        expect(Number.isSafeInteger(slot.array.emptyCount)).toBe(true);
        expect(Number.isSafeInteger(slot.array.elementCount)).toBe(true);
        expect(slot.array.emptyCount).toBeLessThanOrEqual(
          slot.kindCounts.array,
        );
        if (slot.array.element) {
          expect(slot.array.elementCount).toBeGreaterThan(0);
          check(slot.array.element);
        }
      }
    }
    check(inferred.root);
    expect(validateContract(inferred)).toEqual({
      ok: true,
      contract: inferred,
    });
  }
});

test.each([
  [
    'observations',
    (slot: ValueStats) => {
      slot.observations = Number.MAX_SAFE_INTEGER + 1;
    },
  ],
  [
    'kindCounts',
    (slot: ValueStats) => {
      slot.kindCounts.object = Number.MAX_SAFE_INTEGER + 1;
    },
  ],
  [
    'presentCount',
    (slot: ValueStats) => {
      const first = slot.object?.properties[0];
      if (first) first.presentCount = Number.MAX_SAFE_INTEGER + 1;
    },
  ],
  [
    'emptyCount',
    (slot: ValueStats) => {
      if (slot.array) slot.array.emptyCount = Number.MAX_SAFE_INTEGER + 1;
    },
  ],
  [
    'elementCount',
    (slot: ValueStats) => {
      if (slot.array) slot.array.elementCount = Number.MAX_SAFE_INTEGER + 1;
    },
  ],
])('rejects unsafe %s counts', (_name, mutate) => {
  const inferred = inferContract([{ a: 1 }, [1]]);
  mutate(inferred.root);
  expect(validateContract(inferred)).toEqual({
    ok: false,
    reason: 'Contagem deve ser um inteiro seguro não negativo.',
  });
});

test.each([
  {
    name: 'missing object',
    root: { ...inferContract([{}]).root, object: null },
    reason: 'A estrutura de objeto deve corresponder à contagem de objetos.',
  },
  {
    name: 'unexpected object',
    root: { ...inferContract([1]).root, object: { properties: [] } },
    reason: 'A estrutura de objeto deve corresponder à contagem de objetos.',
  },
  {
    name: 'missing array',
    root: { ...inferContract([[]]).root, array: null },
    reason: 'A estrutura de array deve corresponder à contagem de arrays.',
  },
  {
    name: 'unexpected array',
    root: {
      ...inferContract([1]).root,
      array: { emptyCount: 0, elementCount: 0, element: null },
    },
    reason: 'A estrutura de array deve corresponder à contagem de arrays.',
  },
  {
    name: 'excess presence',
    root: {
      ...inferContract([{}]).root,
      object: {
        properties: [
          { name: 'a', presentCount: 2, value: inferContract([1]).root },
        ],
      },
    },
    reason:
      'A presença da propriedade não pode exceder a contagem de objetos pai.',
  },
  {
    name: 'element without count',
    root: {
      ...inferContract([[]]).root,
      array: {
        emptyCount: 1,
        elementCount: 0,
        element: inferContract([1]).root,
      },
    },
    reason:
      'Um elemento observado exige uma contagem de elementos maior que zero.',
  },
  {
    name: 'excess empty arrays',
    root: {
      ...inferContract([[]]).root,
      array: { emptyCount: 2, elementCount: 0, element: null },
    },
    reason:
      'A contagem de arrays vazios não pode exceder a contagem de arrays.',
  },
  {
    name: 'inconsistent observations',
    root: { ...inferContract([1]).root, observations: 2 },
    reason: 'A soma dos tipos deve ser igual à contagem de observações.',
  },
])('rejects $name', ({ root, reason }) => {
  expect(validateContract({ ...contract, root })).toEqual({
    ok: false,
    reason,
  });
});

test.each([
  { name: 'empty array root', samples: [[]] },
  { name: 'null property', samples: [{ a: null }] },
  { name: 'primitive root', samples: [42] },
])('accepts an inferred $name', ({ samples }) => {
  const inferred = inferContract(samples);
  expect(inferred.root.observations).toBe(inferred.sampleCount);
  expect(validateContract(inferred)).toEqual({ ok: true, contract: inferred });
});

test('rejects a root observation count different from sampleCount', () => {
  expect(
    validateContract({ ...contract, sampleCount: contract.sampleCount + 1 }),
  ).toEqual({
    ok: false,
    reason:
      'A contagem de observações da raiz deve ser igual à contagem de amostras.',
  });
});
