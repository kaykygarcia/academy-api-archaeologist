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

export { compareContracts } from './comparison';

export { generateTypeScript } from './generators/typescript';

export { generateZod } from './generators/zod';

export { generateJsonSchema } from './generators/json-schema';

export { pluralize } from './pluralize';
