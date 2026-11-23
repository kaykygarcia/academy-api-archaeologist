import { expect, test } from 'vitest';
import {
  alignContracts,
  compareContracts,
  inferContract,
  propertyPath,
  type JsonValue,
} from '../src';
import { special } from './helpers';

function rows(before: JsonValue[], after: JsonValue[]) {
  const previous = inferContract(before);
  const current = inferContract(after);
  return alignContracts(previous, current, compareContracts(previous, current));
}

test('aligns arrays of arrays including their elements', () => {
  expect(
    rows([[[1]]], [[['a']]]).map(({ path, previous, current }) => ({
      path,
      previous,
      current,
    })),
  ).toEqual([
    {
      path: '$',
      previous: 'array<array<number>>',
      current: 'array<array<string>>',
    },
    { path: '$[*]', previous: 'array<number>', current: 'array<string>' },
    { path: '$[*][*]', previous: 'number', current: 'string' },
  ]);
});

test('uses core paths for special keys and never matches inherited keys', () => {
  const result = rows([special], [{}]);
  for (const key of Object.keys(special)) {
    expect(
      result.find((row) => row.path === propertyPath('$', key)),
    ).toMatchObject({
      previous: 'string',
      current: null,
      depth: 1,
      segment: key,
    });
  }
});

test('retains all absent descendants and keeps previous properties first', () => {
  expect(
    rows([{ z: { nested: [{ a: true }] } }], [{ a: 1 }]).map(
      ({ path, current }) => [path, current],
    ),
  ).toEqual([
    ['$', 'object'],
    ['$.z', null],
    ['$.z.nested', null],
    ['$.z.nested[*]', null],
    ['$.z.nested[*].a', null],
    ['$.a', 'number'],
  ]);
  expect(
    rows([{}], [{ a: { b: 1 } }])
      .slice(1)
      .every((row) => row.previous === null),
  ).toBe(true);
});

test('attaches exact-path changes for conflicts and preserves absent branches', () => {
  const result = rows([{ a: { b: 1 } }], [{ a: 1 }, { a: 'x' }]);
  expect(result[1]).toMatchObject({
    path: '$.a',
    previous: 'object',
    current: 'string | number',
    changes: [{ code: 'type-changed', path: '$.a' }],
  });
  expect(result[2]).toMatchObject({
    path: '$.a.b',
    current: null,
    changes: [],
  });
});

test('identical contracts have no changed rows', () => {
  expect(
    rows([special], [special]).every((row) => row.changes.length === 0),
  ).toBe(true);
});

test('provides display segments without parsing paths in the UI', () => {
  const result = rows([{ 'a.b': [[1]] }], [{}]);
  expect(result.map((row) => row.segment)).toEqual(['$', 'a.b', '[*]', '[*]']);
});
