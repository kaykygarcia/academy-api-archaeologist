import 'fake-indexeddb/auto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { ENGINE_VERSION, inferContract } from '@api-archaeologist/core';
import {
  db,
  importSnapshots,
  storageError,
  SnapshotInputError,
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
    await expect(renameSnapshot('missing', 'New')).rejects.toMatchObject({
      name: 'SnapshotInputError',
      message: 'O snapshot não existe mais.',
    });
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

it('imports atomically and replaces missing, stored and repeated ids', async () => {
  const saved = await saveSnapshot({ name: 'Existing', contract });
  const { id, ...withoutId } = saved;
  await importSnapshots([
    { ...saved, name: 'Collision' },
    { ...saved, id: 'fresh', name: 'First' },
    { ...saved, id: 'fresh', name: 'Repeated' },
    { ...withoutId, name: 'Missing' },
  ]);
  const records = await listSnapshots();
  expect(records).toHaveLength(5);
  expect(new Set(records.map((record) => record.id)).size).toBe(5);
  expect(records.find((record) => record.name === 'Existing')?.id).toBe(id);
  expect(records.find((record) => record.name === 'First')?.id).toBe('fresh');
});

it('rolls back the entire transaction if the second insert fails', async () => {
  const saved = await saveSnapshot({ name: 'Existing', contract });
  let inserts = 0;
  const hook = () => {
    if (++inserts === 2) throw new Error('Storage failure');
  };
  db.table('snapshots').hook('creating', hook);
  try {
    await expect(
      importSnapshots([
        { ...saved, id: 'new' },
        { ...saved, id: 'second' },
      ]),
    ).rejects.toThrow();
  } finally {
    db.table('snapshots').hook('creating').unsubscribe(hook);
  }
  expect(await listSnapshots()).toEqual([saved]);
});

it('enforces import-compatible limits on every save and rename', async () => {
  await expect(
    saveSnapshot({ name: 'x'.repeat(201), contract }),
  ).rejects.toThrow('até 200 caracteres');
  await expect(
    saveSnapshot({ name: 'Valid', method: 'x'.repeat(2001), contract }),
  ).rejects.toThrow('até 2.000 caracteres');
  await expect(
    saveSnapshot({ name: 'Valid', endpoint: 'x'.repeat(2001), contract }),
  ).rejects.toThrow('até 2.000 caracteres');
  expect(await listSnapshots()).toEqual([]);
  const saved = await saveSnapshot({
    name: 'x'.repeat(200),
    method: 'x'.repeat(2000),
    endpoint: 'x'.repeat(2000),
    contract,
  });
  await expect(renameSnapshot(saved.id, 'y'.repeat(201))).rejects.toThrow(
    'até 200 caracteres',
  );
  expect(await listSnapshots()).toEqual([saved]);
  await renameSnapshot(saved.id, 'y'.repeat(200));
  expect((await listSnapshots())[0]?.name).toBe('y'.repeat(200));
});

it('distinguishes invalid snapshot input from storage failures', async () => {
  await expect(
    saveSnapshot({ name: 'x'.repeat(201), contract }),
  ).rejects.toBeInstanceOf(SnapshotInputError);
  await expect(
    renameSnapshot('missing', 'x'.repeat(201)),
  ).rejects.toBeInstanceOf(SnapshotInputError);
  await expect(
    saveSnapshot({ name: 'Valid', endpoint: 'x'.repeat(2001), contract }),
  ).rejects.toBeInstanceOf(SnapshotInputError);
});
