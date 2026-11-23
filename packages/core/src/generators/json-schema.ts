import { isOptional, observedKinds } from '../normalization';
import type { InferredContract, JsonValue, ValueStats } from '../types';

function schemaFor(slot: ValueStats): { [key: string]: JsonValue } {
  const kinds = observedKinds(slot);
  const variants = kinds.map((kind) => {
    if (kind === 'object') {
      const properties: { [key: string]: JsonValue } = {};
      const required: string[] = [];
      for (const property of slot.object?.properties ?? []) {
        Object.defineProperty(properties, property.name, {
          value: schemaFor(property.value),
          enumerable: true,
          configurable: true,
          writable: true,
        });
        if (!isOptional(property, slot)) required.push(property.name);
      }
      const schema: { [key: string]: JsonValue } = {
        type: 'object',
        properties,
      };
      if (required.length > 0) schema.required = required;
      return schema;
    }
    if (kind === 'array')
      return {
        type: 'array',
        items: slot.array?.element ? schemaFor(slot.array.element) : {},
      };
    return { type: kind };
  });
  const [first, ...rest] = variants;
  if (first === undefined) return {};
  if (rest.length === 0) return first;
  const nonNullKinds = kinds.filter((kind) => kind !== 'null');
  if (nonNullKinds.length === 1) return { ...first, type: kinds };
  return { anyOf: variants };
}

export function generateJsonSchema(contract: InferredContract): string {
  return JSON.stringify(
    {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      ...schemaFor(contract.root),
    },
    null,
    2,
  );
}
