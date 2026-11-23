import { hasOwnField } from './own';
import { LIMITS } from './limits';
import type { InferredContract, ValueStats, PropertyStats } from './types';

function field(value: unknown, key: string): unknown {
  if (!hasOwnField(value, key))
    throw new Error(`Campo obrigatório ausente: ${key}.`);
  return value[key];
}

function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new Error('Contagem deve ser um inteiro seguro não negativo.');
  return value;
}

export function validateContract(
  value: unknown,
): { ok: true; contract: InferredContract } | { ok: false; reason: string } {
  let visited = 0;
  function slot(input: unknown, depth: number): ValueStats {
    if (depth > LIMITS.MAX_DEPTH + 1)
      throw new Error('Profundidade máxima do contrato excedida.');
    if (++visited > LIMITS.MAX_VISITED_VALUES)
      throw new Error('Limite de nós do contrato excedido.');
    const observations = count(field(input, 'observations'));
    const kinds = field(input, 'kindCounts');
    if (
      typeof kinds !== 'object' ||
      kinds === null ||
      Object.keys(kinds).length !== 6
    )
      throw new Error('kindCounts deve conter exatamente os seis tipos JSON.');
    const kindCounts = {
      string: count(field(kinds, 'string')),
      number: count(field(kinds, 'number')),
      boolean: count(field(kinds, 'boolean')),
      null: count(field(kinds, 'null')),
      object: count(field(kinds, 'object')),
      array: count(field(kinds, 'array')),
    };
    if (
      Object.values(kindCounts).reduce(
        (sum, kindCount) => sum + kindCount,
        0,
      ) !== observations
    )
      throw new Error(
        'A soma dos tipos deve ser igual à contagem de observações.',
      );
    const objectInput = field(input, 'object');
    if ((objectInput !== null) !== kindCounts.object > 0)
      throw new Error(
        'A estrutura de objeto deve corresponder à contagem de objetos.',
      );
    let object: ValueStats['object'] = null;
    if (objectInput !== null) {
      const propertiesInput: unknown = field(objectInput, 'properties');
      if (!Array.isArray(propertiesInput))
        throw new Error('properties deve ser uma lista.');
      const entries: unknown[] = propertiesInput;
      const properties: PropertyStats[] = [];
      const names = new Set<string>();
      for (const entry of entries) {
        const name = field(entry, 'name');
        if (typeof name !== 'string')
          throw new Error('Nome de propriedade deve ser texto.');
        if (names.has(name)) throw new Error('Nome de propriedade duplicado.');
        names.add(name);
        const presentCount = count(field(entry, 'presentCount'));
        if (presentCount > kindCounts.object)
          throw new Error(
            'A presença da propriedade não pode exceder a contagem de objetos pai.',
          );
        properties.push({
          name,
          presentCount,
          value: slot(field(entry, 'value'), depth + 1),
        });
      }
      object = { properties };
    }
    const arrayInput = field(input, 'array');
    if ((arrayInput !== null) !== kindCounts.array > 0)
      throw new Error(
        'A estrutura de array deve corresponder à contagem de arrays.',
      );
    let array: ValueStats['array'] = null;
    if (arrayInput !== null) {
      const emptyCount = count(field(arrayInput, 'emptyCount'));
      const elementCount = count(field(arrayInput, 'elementCount'));
      const element = field(arrayInput, 'element');
      if (emptyCount > kindCounts.array)
        throw new Error(
          'A contagem de arrays vazios não pode exceder a contagem de arrays.',
        );
      if (element !== null && elementCount === 0)
        throw new Error(
          'Um elemento observado exige uma contagem de elementos maior que zero.',
        );
      array = {
        emptyCount,
        elementCount,
        element: element === null ? null : slot(element, depth + 1),
      };
    }
    return { observations, kindCounts, object, array };
  }
  try {
    if (field(value, 'formatVersion') !== 1)
      throw new Error('Versão do contrato incompatível.');
    const sampleCount = count(field(value, 'sampleCount'));
    const root = slot(field(value, 'root'), 0);
    if (root.observations !== sampleCount)
      throw new Error(
        'A contagem de observações da raiz deve ser igual à contagem de amostras.',
      );
    return {
      ok: true,
      contract: {
        formatVersion: 1,
        sampleCount,
        root,
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Contrato inválido.',
    };
  }
}
