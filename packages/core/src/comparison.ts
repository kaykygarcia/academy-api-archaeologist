import { pluralize } from './pluralize';
import {
  compareNames,
  describeType,
  elementPath,
  formatKindCounts,
  isNullable,
  isOptional,
  observedKinds,
  propertyPath,
} from './normalization';
import { InferenceError } from './types';
import type {
  ChangeCode,
  ChangeSeverity,
  ContractChange,
  InferredContract,
  ValueStats,
} from './types';

const codeOrder: readonly ChangeCode[] = [
  'property-added',
  'property-not-observed',
  'type-changed',
  'type-expanded',
  'type-narrowed',
  'became-nullable',
  'null-not-observed',
  'presence-reduced',
  'presence-increased',
  'elements-not-observed',
  'elements-observed',
];

const SEVERITY: Record<ChangeCode, ChangeSeverity> = {
  'property-added': 'informational',
  'property-not-observed': 'potentially-breaking',
  'type-changed': 'potentially-breaking',
  'type-expanded': 'potentially-breaking',
  'type-narrowed': 'review',
  'became-nullable': 'potentially-breaking',
  'null-not-observed': 'informational',
  'presence-reduced': 'potentially-breaking',
  'presence-increased': 'informational',
  'elements-not-observed': 'review',
  'elements-observed': 'informational',
};

function change(
  code: ChangeCode,
  path: string,
  previous: string | null,
  current: string | null,
  explanation: string,
): ContractChange {
  return {
    code,
    path,
    severity: SEVERITY[code],
    previous,
    current,
    explanation,
  };
}

function compareKinds(
  before: ValueStats,
  after: ValueStats,
  path: string,
  changes: ContractChange[],
): void {
  const previous = describeType(before);
  const next = describeType(after);
  const evidence = `Baseline: ${formatKindCounts(before)}. Novas amostras: ${formatKindCounts(after)}.`;
  const oldKinds = observedKinds(before).filter((kind) => kind !== 'null');
  const newKinds = observedKinds(after).filter((kind) => kind !== 'null');
  const gained = newKinds.filter((kind) => !oldKinds.includes(kind));
  const lost = oldKinds.filter((kind) => !newKinds.includes(kind));
  if (gained.length > 0) {
    const code =
      oldKinds.length > 0 && !newKinds.some((kind) => oldKinds.includes(kind))
        ? 'type-changed'
        : 'type-expanded';
    const gainedEvidence = `Novos tipos não nulos: ${gained.join(', ')}.`;
    const lostEvidence =
      lost.length > 0
        ? ` Tipos não nulos não observados: ${lost.join(', ')}.`
        : '';
    changes.push(
      change(
        code,
        path,
        previous,
        next,
        `${gainedEvidence}${lostEvidence} ${evidence}`,
      ),
    );
  } else if (lost.length > 0) {
    const lostEvidence = `Tipos não nulos não observados: ${lost.join(', ')}.`;
    const caveat =
      'Uma observação mais restrita não comprova que o comportamento anterior foi removido.';
    changes.push(
      change(
        'type-narrowed',
        path,
        previous,
        next,
        `${lostEvidence} ${caveat} ${evidence}`,
      ),
    );
  }
}

function compareNullability(
  before: ValueStats,
  after: ValueStats,
  path: string,
  changes: ContractChange[],
): void {
  const previous = describeType(before);
  const next = describeType(after);
  const oldNulls = `${before.kindCounts.null.toLocaleString('pt-BR')}/${before.observations.toLocaleString('pt-BR')}`;
  const newNulls = `${after.kindCounts.null.toLocaleString('pt-BR')}/${after.observations.toLocaleString('pt-BR')}`;
  const evidence = `Null observado ${oldNulls} ${pluralize(before.kindCounts.null, 'vez', 'vezes')} no baseline, ${newNulls} ${pluralize(after.kindCounts.null, 'vez', 'vezes')} nas novas amostras`;
  const caveat = 'isso não comprova que null deixou de ser possível.';
  if (!isNullable(before) && isNullable(after))
    changes.push(
      change('became-nullable', path, previous, next, `${evidence}.`),
    );
  if (isNullable(before) && !isNullable(after))
    changes.push(
      change(
        'null-not-observed',
        path,
        previous,
        next,
        `${evidence}; ${caveat}`,
      ),
    );
}

function compareProperties(
  before: ValueStats,
  after: ValueStats,
  path: string,
  changes: ContractChange[],
): void {
  if (before.object && after.object) {
    const oldProperties = new Map(
      before.object.properties.map((property) => [property.name, property]),
    );
    const newProperties = new Map(
      after.object.properties.map((property) => [property.name, property]),
    );
    const names = new Set([...oldProperties.keys(), ...newProperties.keys()]);
    for (const name of names) {
      const oldProperty = oldProperties.get(name);
      const newProperty = newProperties.get(name);
      const pathToProperty = propertyPath(path, name);
      const oldPresence = `${(oldProperty?.presentCount ?? 0).toLocaleString('pt-BR')}/${before.kindCounts.object.toLocaleString('pt-BR')} ${pluralize(before.kindCounts.object, 'objeto pai', 'objetos pai')}`;
      const newPresence = `${(newProperty?.presentCount ?? 0).toLocaleString('pt-BR')}/${after.kindCounts.object.toLocaleString('pt-BR')} ${pluralize(after.kindCounts.object, 'objeto pai', 'objetos pai')}`;
      const presence = `Observado em ${oldPresence} no baseline, ${newPresence} nas novas amostras.`;
      if (!oldProperty && newProperty)
        changes.push(
          change(
            'property-added',
            pathToProperty,
            null,
            describeType(newProperty.value),
            `Nova propriedade observada. ${presence}`,
          ),
        );
      else if (oldProperty && !newProperty) {
        const absence =
          'Propriedade não observada nas novas amostras; pode ter sido removida ou as amostras podem não cobrir o caso.';
        changes.push(
          change(
            'property-not-observed',
            pathToProperty,
            describeType(oldProperty.value),
            null,
            `${absence} ${presence}`,
          ),
        );
      } else if (oldProperty && newProperty) {
        const wasOptional = isOptional(oldProperty, before);
        const nowOptional = isOptional(newProperty, after);
        const caveat = nowOptional
          ? 'A presença não é mais observada em todos os objetos pai.'
          : 'Isso não comprova que a propriedade agora é obrigatória.';
        if (wasOptional !== nowOptional)
          changes.push(
            change(
              nowOptional ? 'presence-reduced' : 'presence-increased',
              pathToProperty,
              oldPresence,
              newPresence,
              `${presence} ${caveat}`,
            ),
          );
        walk(oldProperty.value, newProperty.value, pathToProperty, changes);
      }
    }
  }
}

function compareElements(
  before: ValueStats,
  after: ValueStats,
  path: string,
  changes: ContractChange[],
): void {
  const previous = describeType(before);
  const next = describeType(after);
  if (before.array && after.array) {
    const oldEvidence = `${before.array.elementCount.toLocaleString('pt-BR')} ${pluralize(before.array.elementCount, 'elemento', 'elementos')} em ${before.kindCounts.array.toLocaleString('pt-BR')} ${pluralize(before.kindCounts.array, 'array', 'arrays')}`;
    const newEvidence = `${after.array.elementCount.toLocaleString('pt-BR')} ${pluralize(after.array.elementCount, 'elemento', 'elementos')} em ${after.kindCounts.array.toLocaleString('pt-BR')} ${pluralize(after.kindCounts.array, 'array', 'arrays')}`;
    const oldElement = before.array.element;
    const newElement = after.array.element;
    if (oldElement && newElement)
      walk(oldElement, newElement, elementPath(path), changes);
    else if (Boolean(oldElement) !== Boolean(newElement))
      changes.push(
        change(
          oldElement ? 'elements-not-observed' : 'elements-observed',
          path,
          previous,
          next,
          `Contagem: ${oldEvidence} no baseline, ${newEvidence} nas novas amostras.`,
        ),
      );
  }
}

export function compareContracts(
  baseline: InferredContract,
  current: InferredContract,
): ContractChange[] {
  if (baseline.formatVersion !== 1 || current.formatVersion !== 1)
    throw new InferenceError(
      'incompatible-contract',
      'Os dois contratos devem usar formatVersion 1.',
    );
  const changes: ContractChange[] = [];
  walk(baseline.root, current.root, '$', changes);
  return changes.sort(
    (a, b) =>
      compareNames(a.path, b.path) ||
      codeOrder.indexOf(a.code) - codeOrder.indexOf(b.code),
  );
}

function walk(
  before: ValueStats,
  after: ValueStats,
  path: string,
  changes: ContractChange[],
): void {
  compareKinds(before, after, path, changes);
  compareNullability(before, after, path, changes);
  compareProperties(before, after, path, changes);
  compareElements(before, after, path, changes);
}
