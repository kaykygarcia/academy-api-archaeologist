import { formatDate } from '../../lib/format';
import Dexie, { type Table } from 'dexie';
import { ENGINE_VERSION, type InferredContract } from '@api-archaeologist/core';

export type ContractSnapshot = {
  id: string;
  name: string;
  method?: string;
  endpoint?: string;
  createdAt: string;
  engineVersion: string;
  schemaVersion: number;
  sampleCount: number;
  contract: InferredContract;
};

export const db = new Dexie('api-archaeologist');

db.version(1).stores({ snapshots: 'id, createdAt, name' });

const snapshots: Table<ContractSnapshot, string> = db.table('snapshots');

export function isCompatibleSnapshot(record: unknown): boolean {
  return (
    typeof record === 'object' &&
    record !== null &&
    'schemaVersion' in record &&
    record.schemaVersion === 1 &&
    'contract' in record &&
    typeof record.contract === 'object' &&
    record.contract !== null &&
    'formatVersion' in record.contract &&
    record.contract.formatVersion === 1
  );
}

export async function saveSnapshot(input: {
  name: string;
  method?: string;
  endpoint?: string;
  contract: InferredContract;
}): Promise<ContractSnapshot> {
  if (!input.name.trim())
    throw new Error('É necessário informar um nome para o snapshot.');
  const record: ContractSnapshot = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    method: input.method,
    endpoint: input.endpoint,
    contract: input.contract,
    createdAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    schemaVersion: 1,
    sampleCount: input.contract.sampleCount,
  };
  await snapshots.add(record);
  return record;
}

export function listSnapshots(): Promise<ContractSnapshot[]> {
  return snapshots.orderBy('createdAt').reverse().toArray();
}

export async function renameSnapshot(id: string, name: string) {
  if (!name.trim())
    throw new Error('É necessário informar um nome para o snapshot.');
  if (!(await snapshots.update(id, { name: name.trim() })))
    throw new Error('O snapshot não existe mais.');
}

export function deleteSnapshot(id: string) {
  return snapshots.delete(id);
}

function isQuotaError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'QuotaExceededError'
  );
}

export function storageError(error: unknown): string {
  if (
    isQuotaError(error) ||
    (typeof error === 'object' &&
      error !== null &&
      'inner' in error &&
      isQuotaError(error.inner))
  )
    return 'O armazenamento local está cheio. Exclua um snapshot antigo e tente novamente.';
  return 'O armazenamento local de snapshots está indisponível ou a operação falhou. Verifique as permissões de armazenamento do navegador e o espaço disponível e tente novamente.';
}

export function suggestedName(
  dataset: string,
  method: string,
  endpoint: string,
): string {
  const today = new Date();
  const date = formatDate(today);
  return `${[method, endpoint].filter(Boolean).join(' ') || dataset.replace(/ — \d{4}-\d{2}-\d{2}$/, '') || 'Conjunto sem nome'} — ${date}`;
}
