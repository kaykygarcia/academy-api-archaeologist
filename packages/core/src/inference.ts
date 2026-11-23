import { LIMITS } from './limits';
import { compareNames, pathFromSegments } from './normalization';
import { InferenceError } from './types';
import type { InferredContract, JsonValue, ValueStats } from './types';

type AccumulatedSlot = {
  observations: number;
  kindCounts: ValueStats['kindCounts'];
  properties: Map<string, AccumulatedSlot>;
  emptyCount: number;
  elementCount: number;
  element: AccumulatedSlot | null;
};

function emptySlot(): AccumulatedSlot {
  return {
    observations: 0,
    kindCounts: {
      object: 0,
      array: 0,
      string: 0,
      number: 0,
      boolean: 0,
      null: 0,
    },
    properties: new Map(),
    emptyCount: 0,
    elementCount: 0,
    element: null,
  };
}

function finish(slot: AccumulatedSlot): ValueStats {
  return {
    observations: slot.observations,
    kindCounts: slot.kindCounts,
    object:
      slot.kindCounts.object > 0
        ? {
            properties: [...slot.properties]
              .sort(([a], [b]) => compareNames(a, b))
              .map(([name, value]) => ({
                name,
                presentCount: value.observations,
                value: finish(value),
              })),
          }
        : null,
    array:
      slot.kindCounts.array > 0
        ? {
            emptyCount: slot.emptyCount,
            elementCount: slot.elementCount,
            element: slot.element ? finish(slot.element) : null,
          }
        : null,
  };
}

export function inferContract(samples: readonly JsonValue[]): InferredContract {
  const { MAX_SAMPLES, MAX_DEPTH, MAX_VISITED_VALUES } = LIMITS;
  const segments: (string | null)[] = [];
  if (samples.length === 0)
    throw new InferenceError('no-samples', 'At least 1 sample is required.');
  if (samples.length > MAX_SAMPLES)
    throw new InferenceError(
      'too-many-samples',
      `Maximum sample count is ${MAX_SAMPLES}.`,
    );
  let visited = 0;
  function observe(
    slot: AccumulatedSlot,
    value: JsonValue,
    depth: number,
  ): void {
    if (depth > MAX_DEPTH) {
      const path = pathFromSegments(segments);
      throw new InferenceError(
        'depth-exceeded',
        `Maximum depth is ${MAX_DEPTH} at ${path}.`,
        { path },
      );
    }
    if (++visited > MAX_VISITED_VALUES) {
      const path = pathFromSegments(segments);
      throw new InferenceError(
        'too-many-values',
        `Maximum visited values is ${MAX_VISITED_VALUES} at ${path}.`,
        { path },
      );
    }
    slot.observations++;
    if (value === null) slot.kindCounts.null++;
    else if (typeof value === 'string') slot.kindCounts.string++;
    else if (typeof value === 'number') slot.kindCounts.number++;
    else if (typeof value === 'boolean') slot.kindCounts.boolean++;
    else if (Array.isArray(value)) {
      slot.kindCounts.array++;
      if (value.length === 0) slot.emptyCount++;
      slot.elementCount += value.length;
      for (const item of value) {
        slot.element ??= emptySlot();
        segments.push(null);
        observe(slot.element, item, depth + 1);
        segments.pop();
      }
    } else {
      slot.kindCounts.object++;
      // JSON.parse yields own enumerable data properties; entries is safe for __proto__.
      for (const [key, child] of Object.entries(value)) {
        let property = slot.properties.get(key);
        if (!property) {
          property = emptySlot();
          slot.properties.set(key, property);
        }
        segments.push(key);
        observe(property, child, depth + 1);
        segments.pop();
      }
    }
  }
  const root = emptySlot();
  for (const sample of samples) observe(root, sample, 0);
  return { formatVersion: 1, sampleCount: samples.length, root: finish(root) };
}
