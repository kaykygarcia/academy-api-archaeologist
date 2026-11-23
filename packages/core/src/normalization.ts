import type {
  ContractSummary,
  InferredContract,
  JsonKind,
  PropertyStats,
  ValueStats,
} from './types';

const KIND_ORDER: readonly JsonKind[] = [
  'object',
  'array',
  'string',
  'number',
  'boolean',
  'null',
];

export function compareNames(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isIdentifier(key: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);
}

export function propertyPath(parent: string, key: string): string {
  return isIdentifier(key)
    ? `${parent}.${key}`
    : `${parent}[${JSON.stringify(key)}]`;
}

export function elementPath(parent: string): string {
  return `${parent}[*]`;
}

export function observedKinds(slot: ValueStats): JsonKind[] {
  return KIND_ORDER.filter((kind) => slot.kindCounts[kind] > 0);
}

export function isOptional(
  property: PropertyStats,
  parent: ValueStats,
): boolean {
  return property.presentCount < parent.kindCounts.object;
}

export function isNullable(slot: ValueStats): boolean {
  return slot.kindCounts.null > 0;
}

export function hasTypeConflict(slot: ValueStats): boolean {
  return observedKinds(slot).filter((kind) => kind !== 'null').length > 1;
}

export function describeType(slot: ValueStats): string {
  return observedKinds(slot)
    .map((kind) =>
      kind === 'array'
        ? `array<${slot.array?.element ? describeType(slot.array.element) : 'unknown'}>`
        : kind,
    )
    .join(' | ');
}

export function summarizeContract(contract: InferredContract): ContractSummary {
  let propertyPathCount = 0;
  let conflictPathCount = 0;
  function count(slot: ValueStats): void {
    if (hasTypeConflict(slot)) conflictPathCount++;
    for (const property of slot.object?.properties ?? []) {
      propertyPathCount++;
      count(property.value);
    }
    if (slot.array?.element) count(slot.array.element);
  }
  count(contract.root);
  return {
    sampleCount: contract.sampleCount,
    propertyPathCount,
    conflictPathCount,
  };
}

export function formatKindCounts(slot: ValueStats): string {
  return observedKinds(slot)
    .map((kind) => `${kind} ${slot.kindCounts[kind]}`)
    .join(', ');
}

export function pathFromSegments(segments: readonly (string | null)[]): string {
  return segments.reduce<string>(
    (path, segment) =>
      segment === null ? elementPath(path) : propertyPath(path, segment),
    '$',
  );
}
