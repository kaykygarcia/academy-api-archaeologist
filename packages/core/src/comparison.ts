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
  const evidence = `Baseline: ${formatKindCounts(before)}. New samples: ${formatKindCounts(after)}.`;
  const oldKinds = observedKinds(before).filter((kind) => kind !== 'null');
  const newKinds = observedKinds(after).filter((kind) => kind !== 'null');
  const gained = newKinds.filter((kind) => !oldKinds.includes(kind));
  const lost = oldKinds.filter((kind) => !newKinds.includes(kind));
  if (gained.length > 0) {
    const code =
      oldKinds.length > 0 && !newKinds.some((kind) => oldKinds.includes(kind))
        ? 'type-changed'
        : 'type-expanded';
    const gainedEvidence = `Non-null kinds gained: ${gained.join(', ')}.`;
    const lostEvidence =
      lost.length > 0
        ? ` Non-null kinds not observed: ${lost.join(', ')}.`
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
    const lostEvidence = `Non-null kinds not observed: ${lost.join(', ')}.`;
    const caveat =
      'A narrower observation does not prove the previous behaviour was removed.';
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
  const oldNulls = `${before.kindCounts.null}/${before.observations}`;
  const newNulls = `${after.kindCounts.null}/${after.observations}`;
  const evidence = `Null observed ${oldNulls} times in the baseline, ${newNulls} in the new samples`;
  const caveat = 'this does not prove null is no longer possible.';
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
      const oldPresence = `${oldProperty?.presentCount ?? 0}/${before.kindCounts.object} parent objects`;
      const newPresence = `${newProperty?.presentCount ?? 0}/${after.kindCounts.object} parent objects`;
      const presence = `Observed in ${oldPresence} in the baseline, ${newPresence} in the new samples.`;
      if (!oldProperty && newProperty)
        changes.push(
          change(
            'property-added',
            pathToProperty,
            null,
            describeType(newProperty.value),
            `New property observed. ${presence}`,
          ),
        );
      else if (oldProperty && !newProperty) {
        const absence =
          'Property not observed in the new samples; it may have been removed or the samples may not cover the case.';
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
          ? 'Presence is no longer observed in every parent.'
          : 'This does not prove it is now required.';
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
    const oldEvidence = `${before.array.elementCount} elements across ${before.kindCounts.array} arrays`;
    const newEvidence = `${after.array.elementCount} across ${after.kindCounts.array} arrays`;
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
          `Observed ${oldEvidence} in the baseline, ${newEvidence} in the new samples.`,
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
      'Both contracts must use formatVersion 1.',
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
