import {
  isIdentifier,
  isNullable,
  isOptional,
  observedKinds,
} from '../normalization';
import type { InferredContract, ValueStats } from '../types';

function printSchema(slot: ValueStats, depth: number): string {
  const variants = observedKinds(slot)
    .filter((kind) => kind !== 'null')
    .map((kind) => {
      if (kind === 'object') {
        const properties = slot.object?.properties ?? [];
        if (properties.length === 0) return 'z.looseObject({})';
        const fields = properties
          .map((property) => {
            // A literal __proto__ key would set the shape's prototype.
            const key =
              isIdentifier(property.name) && property.name !== '__proto__'
                ? property.name
                : `[${JSON.stringify(property.name)}]`;
            const value = printSchema(property.value, depth + 1);
            const optional = isOptional(property, slot) ? '.optional()' : '';
            return `${'  '.repeat(depth + 1)}${key}: ${value}${optional},`;
          })
          .join('\n');
        return `z.looseObject({\n${fields}\n${'  '.repeat(depth)}})`;
      }
      if (kind === 'array') {
        const element = slot.array?.element
          ? printSchema(slot.array.element, depth)
          : 'z.unknown()';
        return `z.array(${element})`;
      }
      return `z.${kind}()`;
    });
  if (variants.length === 0) return 'z.null()';
  const schema =
    variants.length === 1 ? variants[0] : `z.union([${variants.join(', ')}])`;
  return `${schema}${isNullable(slot) ? '.nullable()' : ''}`;
}

export function generateZod(contract: InferredContract): string {
  const schema = printSchema(contract.root, 0);
  return [
    'import { z } from "zod";',
    '',
    `export const ApiResponseSchema = ${schema};`,
    '',
    'export type ApiResponse = z.infer<typeof ApiResponseSchema>;',
    '',
  ].join('\n');
}
