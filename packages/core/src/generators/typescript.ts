import { isIdentifier, isOptional, observedKinds } from '../normalization';
import type { InferredContract, ValueStats } from '../types';

function printType(slot: ValueStats, depth: number): string {
  return observedKinds(slot)
    .map((kind) => {
      if (kind === 'object') {
        const properties = slot.object?.properties ?? [];
        if (properties.length === 0) return 'Record<string, unknown>';
        return `{\n${properties
          .map((property) => {
            const key = isIdentifier(property.name)
              ? property.name
              : JSON.stringify(property.name);
            return `${'  '.repeat(depth + 1)}${key}${isOptional(property, slot) ? '?' : ''}: ${printType(property.value, depth + 1)};`;
          })
          .join('\n')}\n${'  '.repeat(depth)}}`;
      }
      if (kind === 'array') {
        const element = slot.array?.element;
        if (!element) return 'unknown[]';
        const type = printType(element, depth);
        return `${observedKinds(element).length > 1 ? `(${type})` : type}[]`;
      }
      return kind;
    })
    .join(' | ');
}

export function generateTypeScript(contract: InferredContract): string {
  return `export type ApiResponse = ${printType(contract.root, 0)};\n`;
}
