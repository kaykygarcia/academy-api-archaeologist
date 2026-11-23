import { elementPath, propertyPath } from './normalization';
import type { InferredContract, ValueStats } from './types';

export type SearchResult = { matches: string[]; visible: Set<string> };

export function searchContract(
  contract: InferredContract,
  query: string,
): SearchResult {
  const needle = query.trim().toLowerCase();
  const matches: string[] = [];
  const visible = new Set<string>();
  if (!needle) return { matches, visible };
  const pathQuery = needle.startsWith('$');
  function visit(value: ValueStats, path: string, name?: string): boolean {
    const matched = pathQuery
      ? path.toLowerCase().includes(needle)
      : name !== undefined && name.toLowerCase().includes(needle);
    if (matched) matches.push(path);
    let included = matched;
    for (const property of value.object?.properties ?? []) {
      if (
        visit(property.value, propertyPath(path, property.name), property.name)
      )
        included = true;
    }
    if (value.array?.element && visit(value.array.element, elementPath(path)))
      included = true;
    if (included) visible.add(path);
    return included;
  }
  visit(contract.root, '$');
  return { matches, visible };
}
