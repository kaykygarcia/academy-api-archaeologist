# Limitations

## Observations are not an API specification

The contract describes supplied samples only. A field seen in every parent is emitted as required, which can overestimate the actual API requirement. Missing fields and unobserved nulls may occur in other responses. Counts are per parent object occurrence, not confidence scores or probabilities. A root array is one response body, although its object elements contribute separately to field presence.

There is no enum, date, UUID, email, pattern or integer inference. Object variants merge at the same path, losing correlations between properties. Arrays whose elements were never observed become `unknown[]`. JSONL is unsupported: each sample must be one JSON document. There is no API fetching, OpenAPI generation, CLI, snapshot import/export or server storage.

Zod generation uses `z.looseObject`, which accepts and preserves additional unknown properties. JSON Schema omits `additionalProperties`, leaving extra keys allowed. These outputs are deliberately open and do not establish exact API boundaries. The app exports generated text without executing it.

## Known parser and validator behaviour

The tests pin the following behaviour of Zod 4.6.7 and Ajv 8.20.0:

- An optional property named `constructor`, `toString`, `valueOf`, `hasOwnProperty` or `isPrototypeOf` can cause both validators to reject an object that omits it, because they read the inherited function. The generators still emit the intended optional property.
- Neither validator enforces a `__proto__` property: absent or wrongly typed values can pass. Zod also drops it as an own key in its output. The generators escape this key, but do not patch library internals.
- `JSON.parse` can turn a number such as `1e999` into `Infinity`, which the generated validators reject.
- Common V8 JSON parse errors lack a position. The UI shows line and column only when the engine provides them.

Core imports are extensionless and consumed by bundler-aware tooling. A future Node CLI needs bundling; Node's TypeScript stripping alone does not resolve these imports.

## Processing limits and measured workloads

[`LIMITS`](../packages/core/src/limits.ts) is the source of truth:

| Limit          | Value                                    |
| -------------- | ---------------------------------------- |
| Sample size    | 5 MiB (5,242,880 UTF-8 bytes)            |
| Session size   | 20 MiB (20,971,520 UTF-8 bytes)          |
| Samples        | 200                                      |
| Depth          | 50, with root at depth 0; depth 51 fails |
| Visited values | 2,000,000 across inference input         |

Uploads check `File.size` before reading and decoded UTF-8 text size afterward. These bounds do not guarantee low memory use: parsing, structured cloning, aggregation, generated strings and editor rendering allocate additional memory. Limits also do not imply that every structurally permitted input fits within the byte limits.

The contract tree renders all children of an expanded object, and the first two levels are expanded by default, so very wide objects with tens of thousands of properties at one level can render slowly.

One measurement on the Docker production build (headless Chromium bundled with Playwright 1.65.1, same machine as the benchmark below), from the `Analisar amostras` click until the last property row was in the DOM, for one sample with N number properties at depth 1: 1,000 properties took 258 ms, 10,000 took 889 ms and 50,000 took 4,887 ms. These are single runs, not a benchmark.

On 2026-11-23, `pnpm --filter @api-archaeologist/core bench` ran with Node v24.21.0 on Ubuntu 26.04.1 LTS, x86_64, AMD Ryzen 7 4800H with Radeon Graphics (8 cores, 16 logical processors). The installed Vitest 5.1.1 measured the following artificial workloads:

| Artificial inference workload                        | Mean (ms) | Min (ms) | Max (ms) | Relative margin of error | Iterations |
| ---------------------------------------------------- | --------- | -------- | -------- | ------------------------ | ---------- |
| 100,000 objects / 400,001 visited values             | 32.1647   | 31.3163  | 35.2292  | ±1.76%                   | 16         |
| 50,000 properties / 50,001 visited values            | 53.6940   | 40.2010  | 68.5906  | ±16.08%                  | 10         |
| Depth 50 / 51 visited values                         | 0.0268    | 0.0162   | 8.6817   | ±11.21%                  | 18,662     |
| 1,999,999 scalar elements / 2,000,000 visited values | 32.3313   | 31.9536  | 32.9507  | ±0.65%                   | 16         |

These are Vitest-measured artificial workloads, not browser or production benchmarks. They invoke inference on already constructed values and exclude file reading, parsing, worker transfer, generation and rendering. Each case requests 500 ms of measurement and at least ten iterations. Vitest warned that the wide-object case accesses the `compareNames` module export getter frequently; runner overhead can make those results unreliable. The provisional visited-value limit is not a measured memory ceiling or latency guarantee.

## Local storage and security

Raw samples remain in session memory. Explicitly saved snapshots keep aggregated contracts and metadata in IndexedDB; browser eviction, private browsing or clearing site data can remove them. They are not a backup. Property names, endpoint paths and snapshot names may still be sensitive. Remove tokens, personal data and secrets before sharing screenshots or exports.

The production CSP permits `style-src 'self' 'unsafe-inline'` because CodeMirror injects styles. Scripts remain restricted to self; inline scripts and evaluation are not enabled. Fonts and assets are bundled locally. The policy must be served by the host: Vite preview does not interpret Cloudflare's `_headers` file. Nginx and Cloudflare headers therefore require validation on the actual production serving path, including checking the browser console for CSP violations.

## Drift boundaries

Drift classifications reflect potential impact on HTTP response consumers. They cannot prove a breaking change, compatibility, a rename, field removal or a complete schema. Different sample coverage can cause apparent changes. Value changes within the same kind and changed frequencies with unchanged optional status produce no drift. Arrays with no new elements give a review signal, not evidence that previous element fields were deleted. A result with no observed drift is not a compatibility guarantee.
