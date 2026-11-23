import { LIMITS, formatMiB } from './limits';
import type { JsonValue, ParseResult, SampleError, SampleInput } from './types';

function utf8Size(text: string): number {
  let bytes = 0;
  for (const character of text) {
    const point = character.codePointAt(0) ?? 0;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function jsonError(input: SampleInput, error: unknown): SampleError {
  const message = error instanceof Error ? error.message : '';
  const position = /position (\d+)/.exec(message)?.[1];
  const location = /line (\d+) column (\d+)/.exec(message);
  const result: SampleError = {
    name: input.name,
    code: 'invalid-json',
    message: `Invalid JSON in ${input.name}. Fix the sample and try again.`,
  };
  // Engine messages can quote sample content, so only retain their location.
  if (position !== undefined) {
    const prefix = input.text.slice(0, Number(position));
    result.line = prefix.split('\n').length;
    result.column = prefix.length - prefix.lastIndexOf('\n');
  } else if (location?.[1] && location[2]) {
    result.line = Number(location[1]);
    result.column = Number(location[2]);
  }
  if (error instanceof RangeError)
    result.message = `JSON nesting in ${input.name} exceeds parser capacity; maximum inference depth is ${LIMITS.MAX_DEPTH}.`;
  return result;
}

export function parseSamples(inputs: readonly SampleInput[]): ParseResult {
  if (inputs.length === 0)
    return {
      ok: false,
      errors: [
        {
          name: '',
          code: 'no-samples',
          message: 'At least 1 sample is required.',
        },
      ],
    };
  if (inputs.length > LIMITS.MAX_SAMPLES)
    return {
      ok: false,
      errors: [
        {
          name: '',
          code: 'too-many-samples',
          message: `Maximum sample count is ${LIMITS.MAX_SAMPLES}.`,
        },
      ],
    };
  const errors: SampleError[] = [];
  let total = 0;
  const oversized = new Set<number>();
  for (const [index, input] of inputs.entries()) {
    const size = utf8Size(input.text);
    total += size;
    if (size > LIMITS.MAX_SAMPLE_BYTES) oversized.add(index);
  }
  if (total > LIMITS.MAX_SESSION_BYTES)
    return {
      ok: false,
      errors: [
        {
          name: '',
          code: 'session-too-large',
          message: `Maximum session size is ${formatMiB(LIMITS.MAX_SESSION_BYTES)}.`,
        },
      ],
    };
  const values: JsonValue[] = [];
  for (const [index, input] of inputs.entries()) {
    if (oversized.has(index)) {
      errors.push({
        name: input.name,
        code: 'sample-too-large',
        message: `Maximum sample size is ${formatMiB(LIMITS.MAX_SAMPLE_BYTES)} in ${input.name}.`,
      });
      continue;
    }
    try {
      const value: JsonValue = JSON.parse(input.text);
      values.push(value);
    } catch (error) {
      errors.push(jsonError(input, error));
    }
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, values };
}
