export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type JsonKind =
  'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';

export type ValueStats = {
  observations: number;
  kindCounts: Record<JsonKind, number>;
  object: ObjectStats | null;
  array: ArrayStats | null;
};

export type ObjectStats = { properties: PropertyStats[] };

export type PropertyStats = {
  name: string;
  presentCount: number;
  value: ValueStats;
};

export type ArrayStats = {
  emptyCount: number;
  elementCount: number;
  element: ValueStats | null;
};

export type InferredContract = {
  formatVersion: 1;
  sampleCount: number;
  root: ValueStats;
};

export type ContractSummary = {
  sampleCount: number;
  propertyPathCount: number;
  conflictPathCount: number;
};

export type InferenceErrorCode =
  | 'no-samples'
  | 'too-many-samples'
  | 'sample-too-large'
  | 'session-too-large'
  | 'depth-exceeded'
  | 'too-many-values'
  | 'invalid-json';

export class InferenceError extends Error {
  readonly code: InferenceErrorCode;
  readonly path?: string;
  constructor(
    code: InferenceErrorCode,
    message: string,
    context: { path?: string } = {},
  ) {
    super(message);
    this.name = 'InferenceError';
    this.code = code;
    this.path = context.path;
  }
}

export type SampleInput = { name: string; text: string };

export type SampleError = {
  name: string;
  code: InferenceErrorCode;
  message: string;
  line?: number;
  column?: number;
};

export type ParseResult =
  { ok: true; values: JsonValue[] } | { ok: false; errors: SampleError[] };
