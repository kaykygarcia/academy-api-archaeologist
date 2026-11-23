import {
  validateContract,
  pluralize,
  hasOwnField,
} from '@api-archaeologist/core';
import type { ContractSnapshot } from './db';

function optionalText(
  value: unknown,
  key: string,
  limit: number,
): string | undefined {
  if (!hasOwnField(value, key)) return undefined;
  if (typeof value[key] !== 'string' || value[key].length > limit)
    throw new Error(`${key} deve ser texto com até ${limit} caracteres.`);
  return value[key];
}

function record(
  value: unknown,
): Omit<ContractSnapshot, 'id'> & { id?: string } {
  const id = optionalText(value, 'id', 200);
  if (id !== undefined && !id.trim())
    throw new Error('id deve ser um texto não vazio de até 200 caracteres.');
  if (
    !hasOwnField(value, 'name') ||
    typeof value.name !== 'string' ||
    !value.name.trim() ||
    value.name.length > 200 ||
    value.name !== value.name.trim()
  )
    throw new Error(
      'nome deve ser texto sem espaços nas extremidades, com 1 a 200 caracteres.',
    );
  const method = optionalText(value, 'method', 2000);
  const endpoint = optionalText(value, 'endpoint', 2000);
  if (
    !hasOwnField(value, 'createdAt') ||
    typeof value.createdAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d))?$/.test(
      value.createdAt,
    ) ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    new Date(`${value.createdAt.slice(0, 10)}T00:00:00.000Z`)
      .toISOString()
      .slice(0, 10) !== value.createdAt.slice(0, 10)
  )
    throw new Error('createdAt deve ser uma data ISO válida.');
  if (
    !hasOwnField(value, 'engineVersion') ||
    typeof value.engineVersion !== 'string'
  )
    throw new Error('engineVersion deve ser texto.');
  if (!hasOwnField(value, 'schemaVersion') || value.schemaVersion !== 1)
    throw new Error('versão do snapshot incompatível.');
  if (
    !hasOwnField(value, 'sampleCount') ||
    typeof value.sampleCount !== 'number' ||
    !Number.isInteger(value.sampleCount) ||
    value.sampleCount < 0
  )
    throw new Error('sampleCount deve ser um inteiro não negativo.');
  const result = validateContract(
    hasOwnField(value, 'contract') ? value.contract : undefined,
  );
  if (!result.ok) throw new Error(`contrato inválido (${result.reason})`);
  return {
    id,
    name: value.name,
    method,
    endpoint,
    createdAt: value.createdAt,
    engineVersion: value.engineVersion,
    schemaVersion: 1,
    sampleCount: value.sampleCount,
    contract: result.contract,
  };
}

export function parseSnapshotFile(text: string) {
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new Error(
      'Não foi possível importar: o arquivo não contém JSON válido.',
    );
  }
  if (
    !hasOwnField(input, 'format') ||
    input.format !== 'api-archaeologist-snapshots' ||
    !hasOwnField(input, 'formatVersion') ||
    input.formatVersion !== 1 ||
    !hasOwnField(input, 'snapshots') ||
    !Array.isArray(input.snapshots)
  )
    throw new Error(
      'Formato de arquivo de snapshots inválido ou incompatível.',
    );
  const entries: unknown[] = input.snapshots;
  if (entries.length > 500)
    throw new Error('O arquivo excede o limite de 500 snapshots.');
  const records: ReturnType<typeof record>[] = [];
  const reasons: string[] = [];
  let skipped = 0;
  for (const [index, value] of entries.entries()) {
    try {
      records.push(record(value));
    } catch (error) {
      skipped++;
      if (reasons.length < 5)
        reasons.push(
          `Registro ${index + 1}: ${error instanceof Error ? error.message : 'registro inválido.'}`,
        );
    }
  }
  const message = `${records.length} ${pluralize(records.length, 'snapshot importado', 'snapshots importados')}, ${skipped} ${pluralize(skipped, 'ignorado', 'ignorados')}.`;
  return { records, reasons, message };
}

export function serializeSnapshots(
  snapshots: ContractSnapshot[],
  exportedAt: string,
): string {
  return JSON.stringify(
    {
      format: 'api-archaeologist-snapshots',
      formatVersion: 1,
      exportedAt,
      snapshots,
    },
    null,
    2,
  );
}
