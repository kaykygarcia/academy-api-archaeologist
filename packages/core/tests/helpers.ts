import { readFileSync } from 'node:fs';
import { inferContract, parseSamples } from '../src';
import type { JsonValue, ValueStats } from '../src';

export function readSamples(names: string[]): JsonValue[] {
  const result = parseSamples(
    names.map((name) => ({
      name,
      text: readFileSync(
        new URL(`../../../fixtures/orders/${name}`, import.meta.url),
        'utf8',
      ),
    })),
  );
  if (!result.ok) throw new Error('Fixture parse failed');
  return result.values;
}

export const baseline = readSamples([
  'baseline/order-101.json',
  'baseline/order-102.json',
  'baseline/order-103.json',
]);

export const current = readSamples([
  'current/order-104.json',
  'current/order-105.json',
]);

export const specialKeys = [
  'new',
  'default',
  'class',
  'delete',
  'in',
  '__proto__',
  'constructor',
  'toString',
  'a b',
  'a-b',
  'a.b',
  '"q"',
  '$x',
  'ção',
  '',
];

export const special: { [key: string]: JsonValue } = Object.fromEntries(
  specialKeys.map((key) => [key, 'value']),
);

export const mixed: JsonValue[] = [
  {
    id: 1,
    coupon: null,
    items: [{ quantity: 2, nested: { value: true } }],
    empty: [],
    special,
  },
  { id: '2', coupon: 'SAVE', items: [], empty: [], special },
  { id: 3, items: [], empty: [], special },
];

export function property(slot: ValueStats, name: string) {
  const result = slot.object?.properties.find((item) => item.name === name);
  if (!result) throw new Error(`Missing property ${name}`);
  return result;
}

export function root(samples: JsonValue[]): ValueStats {
  return inferContract(samples).root;
}
