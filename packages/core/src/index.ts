export const ENGINE_VERSION = '0.1.0';

export * from './types';

export { LIMITS, formatMiB } from './limits';

export { parseSamples } from './parse';

export { inferContract } from './inference';

export {
  summarizeContract,
  describeType,
  propertyPath,
  elementPath,
  observedKinds,
  isOptional,
  isNullable,
  hasTypeConflict,
} from './normalization';

export { compareContracts, summarizeChanges } from './comparison';

export { generateTypeScript } from './generators/typescript';

export { generateZod } from './generators/zod';

export { generateJsonSchema } from './generators/json-schema';

export { pluralize } from './pluralize';

export { searchContract, type SearchResult } from './search';

export { changeLabel, severityLabel } from './labels';
export { validateContract } from './validate';
export { driftReportMarkdown } from './report';
export { alignContracts, type AlignedRow } from './align';

export { hasOwnField } from './own';
