import { expect, test } from 'vitest';
import { inferContract } from '@api-archaeologist/core';
import { parseSnapshotFile, serializeSnapshots } from './transfer';

const record = {
  id: 'one',
  name: 'Baseline',
  createdAt: '2026-11-23T12:00:00.000Z',
  engineVersion: '0.1.0',
  schemaVersion: 1,
  sampleCount: 1,
  contract: inferContract([Object.fromEntries([['__proto__', 1]])]),
};
function file(snapshots: unknown[]) {
  return JSON.stringify({
    format: 'api-archaeologist-snapshots',
    formatVersion: 1,
    snapshots,
  });
}

test('exports and imports special keys without raw or unknown fields', () => {
  expect(
    parseSnapshotFile(serializeSnapshots([record], record.createdAt)).records,
  ).toEqual([record]);
  expect(
    parseSnapshotFile(file([{ ...record, raw: 'ignored' }])).records[0],
  ).not.toHaveProperty('raw');
});

test('skips invalid contracts and gives singular feedback', () => {
  const result = parseSnapshotFile(file([record, { ...record, contract: {} }]));
  expect(result.message).toBe('1 snapshot importado, 1 ignorado.');
  expect(result.reasons).toEqual([
    expect.stringContaining('Registro 2: contrato inválido'),
  ]);
});

test.each([
  { name: '' },
  { name: ' padded ' },
  { name: 'a'.repeat(201) },
  { id: null },
  { id: '' },
  { id: '   ' },
  { id: 'x'.repeat(201) },
  { method: 1 },
  { endpoint: 'a'.repeat(2001) },
  { createdAt: 'today' },
  { createdAt: '2026-02-30T12:00:00.000Z' },
  { engineVersion: 1 },
  { schemaVersion: 2 },
  { sampleCount: -1 },
  { sampleCount: 0.5 },
])('validates metadata %#', (invalid) => {
  expect(parseSnapshotFile(file([{ ...record, ...invalid }])).records).toEqual(
    [],
  );
});

test('accepts missing ids and optional metadata', () => {
  const { id, ...withoutId } = record;
  expect(id).toBe('one');
  expect(parseSnapshotFile(file([withoutId])).records).toEqual([withoutId]);
});

test('caps reasons and rejects invalid files before import', () => {
  expect(
    parseSnapshotFile(file(Array.from({ length: 8 }, () => ({})))).reasons,
  ).toHaveLength(5);
  for (const input of [
    'bad',
    '{}',
    file(Array.from({ length: 501 }, () => record)),
    '{"format":"api-archaeologist-snapshots","formatVersion":2,"snapshots":[]}',
  ])
    expect(() => parseSnapshotFile(input)).toThrow();
});

test('accepts ids at the length limit and reports finite limits', () => {
  expect(
    parseSnapshotFile(file([{ ...record, id: 'x'.repeat(200) }])).records,
  ).toHaveLength(1);
  const result = parseSnapshotFile(file([{ ...record, id: null }]));
  expect(result.reasons[0]).toContain('até 200 caracteres');
  expect(result.reasons[0]).not.toContain('Infinity');
});
