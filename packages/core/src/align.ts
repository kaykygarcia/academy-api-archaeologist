import { describeType, elementPath, propertyPath } from './normalization';
import type { ContractChange, InferredContract, ValueStats } from './types';

export type AlignedRow = {
  path: string;
  segment: string;
  depth: number;
  previous: string | null;
  current: string | null;
  changes: ContractChange[];
};

export function alignContracts(
  previous: InferredContract,
  current: InferredContract,
  changes: ContractChange[],
): AlignedRow[] {
  const byPath = new Map<string, ContractChange[]>();
  for (const change of changes) {
    const group = byPath.get(change.path) ?? [];
    group.push(change);
    byPath.set(change.path, group);
  }
  const rows: AlignedRow[] = [];
  function walk(
    before: ValueStats | null,
    after: ValueStats | null,
    path: string,
    depth: number,
    segment: string,
  ) {
    rows.push({
      path,
      segment,
      depth,
      previous: before ? describeType(before) : null,
      current: after ? describeType(after) : null,
      changes: byPath.get(path) ?? [],
    });
    const oldProperties = new Map(
      (before?.object?.properties ?? []).map((property) => [
        property.name,
        property.value,
      ]),
    );
    const newProperties = new Map(
      (after?.object?.properties ?? []).map((property) => [
        property.name,
        property.value,
      ]),
    );
    for (const name of new Set([
      ...oldProperties.keys(),
      ...newProperties.keys(),
    ])) {
      walk(
        oldProperties.get(name) ?? null,
        newProperties.get(name) ?? null,
        propertyPath(path, name),
        depth + 1,
        name,
      );
    }
    const oldElement = before?.array?.element ?? null;
    const newElement = after?.array?.element ?? null;
    if (oldElement || newElement)
      walk(oldElement, newElement, elementPath(path), depth + 1, '[*]');
  }
  walk(previous.root, current.root, '$', 0, '$');
  return rows;
}
