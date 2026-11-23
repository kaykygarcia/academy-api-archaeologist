import { expect, test } from 'vitest';
import {
  compareContracts,
  describeType,
  elementPath,
  generateJsonSchema,
  generateTypeScript,
  generateZod,
  hasTypeConflict,
  inferContract,
  isNullable,
  isOptional,
  propertyPath,
  summarizeContract,
} from '../src';
import type { JsonKind, JsonValue, ValueStats } from '../src';
import {
  baseline,
  current,
  mixed,
  property,
  root,
  special,
  specialKeys,
} from './helpers';

test('INF-01 missing, null and string have separate evidence', () => {
  const slot = root(baseline);
  const coupon = property(slot, 'coupon');
  expect(coupon.presentCount).toBe(2);
  expect(coupon.value.kindCounts).toEqual({
    object: 0,
    array: 0,
    string: 1,
    number: 0,
    boolean: 0,
    null: 1,
  });
  expect(isOptional(coupon, slot)).toBe(true);
  expect(isNullable(coupon.value)).toBe(true);
  expect(hasTypeConflict(coupon.value)).toBe(false);
});

test('INF-02 mixed primitive kinds retain counts', () => {
  const slot = property(root([{ id: 1 }, { id: '2' }, { id: 3 }]), 'id').value;
  expect(describeType(slot)).toBe('string | number');
  expect(slot.kindCounts.number).toBe(2);
  expect(hasTypeConflict(slot)).toBe(true);
});

test('INF-03 empty arrays do not restrict observed elements', () => {
  const slot = root([[], [{ id: 1 }]]);
  expect(slot.array?.emptyCount).toBe(1);
  expect(slot.array?.elementCount).toBe(1);
  expect(describeType(slot)).toBe('array<object>');
});

test('INF-04 always-empty arrays have unknown elements', () => {
  const slot = root([[], []]);
  expect(slot.array).toEqual({ emptyCount: 2, elementCount: 0, element: null });
  expect(describeType(slot)).toBe('array<unknown>');
});

test('INF-05 array objects merge per parent occurrence', () => {
  const slot = root([[{ a: 1 }, { b: true }, { a: 2, b: false }]]).array
    ?.element;
  if (!slot) throw new Error('Expected element');
  expect(slot.kindCounts.object).toBe(3);
  expect(property(slot, 'a').presentCount).toBe(2);
  expect(property(slot, 'b').presentCount).toBe(2);
});

test('INF-06 false, zero and empty strings are present', () => {
  const slot = root([{ a: false, b: 0, c: '' }]);
  for (const item of slot.object?.properties ?? []) {
    expect(item.presentCount).toBe(1);
    expect(isOptional(item, slot)).toBe(false);
  }
});

test('INF-07 reverse and shuffled samples produce identical trees and code', () => {
  const samples = [...baseline, ...current, ...mixed];
  const expected = inferContract(samples);
  for (const reordered of [
    samples.toReversed(),
    [...samples.filter((_, i) => i % 2), ...samples.filter((_, i) => !(i % 2))],
  ]) {
    const actual = inferContract(reordered);
    expect(actual).toEqual(expected);
    for (const generate of [
      generateTypeScript,
      generateZod,
      generateJsonSchema,
    ])
      expect(generate(actual)).toBe(generate(expected));
  }
  expect(root([{ b: 2, a: 1 }])).toEqual(root([{ a: 1, b: 2 }]));
});

test('INF-08 user keys remain own evidence without prototype pollution', () => {
  const before = Object.getOwnPropertyDescriptors(Object.prototype);
  const slot = root([special, special]);
  expect(slot.object?.properties.map((item) => item.name)).toEqual(
    [...specialKeys].sort(),
  );
  for (const key of specialKeys)
    expect(property(slot, key).presentCount).toBe(2);
  expect(Object.getOwnPropertyDescriptors(Object.prototype)).toEqual(before);
  expect(generateJsonSchema(inferContract([special]))).toContain(
    '"__proto__":',
  );
});

test.each([
  { value: null, kind: 'null', description: 'null' },
  { value: true, kind: 'boolean', description: 'boolean' },
  { value: 0, kind: 'number', description: 'number' },
  { value: '', kind: 'string', description: 'string' },
  { value: {}, kind: 'object', description: 'object' },
  { value: [], kind: 'array', description: 'array<unknown>' },
] satisfies { value: JsonValue; kind: JsonKind; description: string }[])(
  'INF-09 root $kind has matching evidence and description',
  ({ value, kind, description }) => {
    const slot = root([value]);
    expect(slot.observations).toBe(1);
    expect(slot.kindCounts).toEqual({
      object: 0,
      array: 0,
      string: 0,
      number: 0,
      boolean: 0,
      null: 0,
      [kind]: 1,
    });
    expect(describeType(slot)).toBe(description);
  },
);

test('one observation reports 1 of 1 parent objects without claiming requiredness', () => {
  const contract = inferContract([{ once: 1 }]);
  expect(property(contract.root, 'once').presentCount).toBe(1);
  expect(contract.root.kindCounts.object).toBe(1);
  expect(describeType(property(contract.root, 'once').value)).toBe('number');
  expect(generateTypeScript(contract)).toContain('once: number;');
  expect(generateTypeScript(contract)).not.toContain('once?:');
  const changes = compareContracts(
    inferContract([{ a: 1 }]),
    inferContract([{ a: 1 }, {}]),
  );
  expect(changes).toHaveLength(1);
  const [change] = changes;
  expect(change).toMatchObject({
    code: 'presence-reduced',
    previous: '1/1 objeto pai',
    current: '1/2 objetos pai',
  });
  expect(change?.explanation).not.toMatch(/\bobrigatóri[oa]\b/i);
});

test('INF-09 heterogeneous roots and nested arrays keep canonical kinds', () => {
  const slot = root([null, true, 0, '', {}, []]);
  expect(describeType(slot)).toBe(
    'object | array<unknown> | string | number | boolean | null',
  );
  expect(describeType(root([[{}, [1], 'x', null]]))).toBe(
    'array<object | array<number> | string | null>',
  );
});

function checkInvariants(slot: ValueStats): void {
  expect(slot.observations).toBe(
    Object.values(slot.kindCounts).reduce((sum, count) => sum + count, 0),
  );
  expect(slot.object !== null).toBe(slot.kindCounts.object > 0);
  expect(slot.array !== null).toBe(slot.kindCounts.array > 0);
  for (const item of slot.object?.properties ?? []) {
    expect(item.presentCount).toBeLessThanOrEqual(slot.kindCounts.object);
    expect(item.presentCount).toBe(item.value.observations);
    expect(isOptional(item, slot)).toBe(
      item.presentCount < slot.kindCounts.object,
    );
    expect(isNullable(item.value)).toBe(item.value.kindCounts.null > 0);
    checkInvariants(item.value);
  }
  if (slot.array) {
    expect(slot.array.element === null).toBe(slot.array.elementCount === 0);
    expect(slot.array.emptyCount).toBeLessThanOrEqual(slot.kindCounts.array);
    if (slot.array.element) {
      expect(slot.array.element.observations).toBe(slot.array.elementCount);
      checkInvariants(slot.array.element);
    }
  }
}

test('5.1 invariants hold across every fixture individually and merged', () => {
  for (const samples of [
    ...[...baseline, ...current, ...mixed, special].map((value) => [value]),
    baseline,
    current,
    mixed,
    [...baseline, ...current],
  ])
    checkInvariants(root(samples));
  expect(summarizeContract(inferContract(baseline))).toEqual({
    sampleCount: 3,
    propertyPathCount: 9,
    conflictPathCount: 0,
  });
  expect(summarizeContract(inferContract(current))).toEqual({
    sampleCount: 2,
    propertyPathCount: 10,
    conflictPathCount: 1,
  });
  expect(summarizeContract(inferContract([1, 'x'])).conflictPathCount).toBe(1);
});

test('path helpers escape keys and retain array nesting', () => {
  expect(propertyPath('$', 'a-b')).toBe('$["a-b"]');
  expect(propertyPath('$', '"q"')).toBe('$["\\"q\\""]');
  expect(propertyPath('$', '$x')).toBe('$.$x');
  expect(elementPath(elementPath('$.matrix'))).toBe('$.matrix[*][*]');
});
