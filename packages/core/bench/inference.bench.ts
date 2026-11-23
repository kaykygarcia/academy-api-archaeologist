import { test } from 'vitest';
import { inferContract, LIMITS } from '../src';
import type { JsonValue } from '../src';

const manyObjects: JsonValue = Array.from({ length: 100_000 }, (_, i) => ({
  id: i,
  active: true,
  label: 'artificial',
}));

const wideObject: JsonValue = Object.fromEntries(
  Array.from({ length: 50_000 }, (_, i) => [`field${i}`, i]),
);

let deepValue: JsonValue = 0;

for (let i = 0; i < LIMITS.MAX_DEPTH; i++) deepValue = { child: deepValue };

const nearVisitLimit: JsonValue = Array.from(
  { length: LIMITS.MAX_VISITED_VALUES - 1 },
  () => 0,
);

const workloads = [
  { name: '100,000 objects / 400,001 visited values', value: manyObjects },
  { name: '50,000 properties / 50,001 visited values', value: wideObject },
  { name: 'depth 50 / 51 visited values', value: deepValue },
  {
    name: 'visit limit: 1,999,999 scalar elements / 2,000,000 visited values',
    value: nearVisitLimit,
  },
];

for (const { name, value } of workloads) {
  test(`Artificial data: ${name}`, async ({ bench }) => {
    await bench(name, () => {
      inferContract([value]);
    }).run({ time: 500, iterations: 10 });
  });
}
