import 'fake-indexeddb/auto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { ENGINE_VERSION, inferContract } from '@api-archaeologist/core';
import {
  db,
  storageError,
  saveSnapshot,
  listSnapshots,
  renameSnapshot,
  deleteSnapshot,
  isCompatibleSnapshot,
} from './db';

const contract = inferContract([{ id: 1 }]);

beforeEach(async () => {
  await db.table('snapshots').clear();
});

afterAll(async () => {
  await db.delete();
});

describe('local snapshot store', () => {
  it('stores only metadata and aggregated evidence', async () => {
    const record = await saveSnapshot({
      name: ' Orders ',
      method: 'GET',
      endpoint: '/orders',
      contract,
    });
    expect(await listSnapshots()).toEqual([record]);
    expect(record).toMatchObject({
      name: 'Orders',
      schemaVersion: 1,
      engineVersion: ENGINE_VERSION,
      sampleCount: 1,
      contract,
    });
    expect(Object.keys(record).sort()).toEqual(
      [
        'id',
        'name',
        'method',
        'endpoint',
        'createdAt',
        'engineVersion',
        'schemaVersion',
        'sampleCount',
        'contract',
      ].sort(),
    );
    expect(isCompatibleSnapshot(record)).toBe(true);
  });
  it('lists newest first regardless of insertion order', async () => {
    const newer = await saveSnapshot({ name: 'New', contract });
    const older = await saveSnapshot({ name: 'Old', contract });
    await db
      .table('snapshots')
      .update(newer.id, { createdAt: '2026-11-23T12:00:00.000Z' });
    await db
      .table('snapshots')
      .update(older.id, { createdAt: '2026-11-22T12:00:00.000Z' });
    expect((await listSnapshots()).map((record) => record.name)).toEqual([
      'New',
      'Old',
    ]);
  });
  it('renames without replacing evidence and deletes only the selected record', async () => {
    const first = await saveSnapshot({ name: 'First', contract });
    const second = await saveSnapshot({ name: 'Second', contract });
    await renameSnapshot(first.id, ' Renamed ');
    expect(
      (await listSnapshots()).find((record) => record.id === first.id),
    ).toEqual({ ...first, name: 'Renamed' });
    await deleteSnapshot(first.id);
    expect(await listSnapshots()).toEqual([second]);
  });
  it('keeps incompatible records listed but flags both version mismatches', async () => {
    const first = await saveSnapshot({ name: 'Future schema', contract });
    const second = await saveSnapshot({ name: 'Future format', contract });
    await db.table('snapshots').update(first.id, { schemaVersion: 2 });
    await db
      .table('snapshots')
      .update(second.id, { contract: { ...contract, formatVersion: 2 } });
    const records = await listSnapshots();
    expect(records).toHaveLength(2);
    expect(records.every((record) => !isCompatibleSnapshot(record))).toBe(true);
  });
  it.each([{}, { contract: null }, { contract: 'invalid' }])(
    'keeps a corrupted contract listed as incompatible: %j',
    async (corruption) => {
      const record = await saveSnapshot({ name: 'Corrupted', contract });
      const metadata = Object.fromEntries(
        Object.entries(record).filter(([key]) => key !== 'contract'),
      );
      await db.table('snapshots').put({ ...metadata, ...corruption });
      const records = await listSnapshots();
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({ id: record.id, name: 'Corrupted' });
      expect(isCompatibleSnapshot(records[0])).toBe(false);
    },
  );
  it('rejects a snapshot with a missing schemaVersion', () => {
    expect(isCompatibleSnapshot({ contract })).toBe(false);
  });
  it('rejects blank names and renaming a missing record', async () => {
    await expect(saveSnapshot({ name: ' ', contract })).rejects.toThrow('nome');
    await expect(renameSnapshot('missing', 'New')).rejects.toThrow(
      'não existe mais',
    );
  });
});

it('maps plain and wrapped quota errors without misclassifying unknown errors', () => {
  const quota = new DOMException('Full', 'QuotaExceededError');
  expect(storageError(quota)).toBe(
    'O armazenamento local está cheio. Exclua um snapshot antigo e tente novamente.',
  );
  expect(storageError({ name: 'AbortError', inner: quota })).toBe(
    storageError(quota),
  );
  expect(storageError(new Error('Unknown'))).toBe(
    'O armazenamento local de snapshots está indisponível ou a operação falhou. Verifique as permissões de armazenamento do navegador e o espaço disponível e tente novamente.',
  );
});
