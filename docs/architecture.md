# Architecture

API Archaeologist is a static React application built with Vite. The TypeScript core is independent of React, the DOM and storage. The web package imports its source through the workspace package export; Vite bundles it into the application and its worker. There is no application server or remote database.

## Evidence before generated types

The intermediate representation has one `ValueStats` slot per observed path. Each slot records observations and counts for all six JSON kinds, plus object properties or aggregated array elements when present. A property records its name, presence count and value slot. Arrays record empty arrays, total elements and an element slot; that slot is absent if all observed arrays were empty.

This representation keeps evidence independent of the printers. TypeScript, Zod and JSON Schema are generated from the same tree, and comparison walks that tree rather than comparing generated text. React displays the core's summary and evidence instead of recalculating them. Original scalar values are not retained in the contract.

Object properties accumulate in a `Map` by iterating own enumerable keys with `Object.entries`. Properties are normalized in code-unit order; variants follow object, array, string, number, boolean, null. Reordering samples therefore leaves the normalized contract and exports unchanged. Special property names are escaped by the generators.

## Presence and nullability

For a property, the denominator is the number of object occurrences at its parent slot. The property is optional when its presence count is smaller than that denominator. It is nullable when its value slot contains at least one null observation. Missing values do not increment any kind count; `0`, `false` and an empty string do. These are evidence counts, not probabilities.

For an array of objects, each element object contributes a parent occurrence. A root array still counts as one response sample. Empty arrays add no element observations. Multiple object shapes at the same path merge into one property set; there is no discriminated-union detection. A type conflict requires at least two non-null kinds, so `string | null` is not a conflict.

## Worked example: three real fixtures

The following steps were obtained by running `parseSamples`, `inferContract` and `summarizeContract` on successive prefixes of the repository's [baseline fixtures](../fixtures/orders/baseline). The final exports were obtained from the three generator functions; the drift below was obtained from `compareContracts` against the [current fixtures](../fixtures/orders/current).

1. Read `order-101.json`. The root has one object observation. `coupon` is a string present in 1/1 root objects. `customer` has one object with `id` and `name`. `items` has one array containing one object with `quantity` and `sku`. The summary is one sample, nine property paths and zero conflicts.
2. Add `order-102.json`. The root now has two object observations. `coupon` is present in 2/2 parents, with one string and one null: it is nullable but not optional. `items` has two arrays, one empty, and still only one element object. Consequently `items[*].sku` remains present in 1/1 element objects, not 1/2 response samples. There are still nine property paths and zero conflicts.
3. Add `order-103.json`. The root has three object observations, but `coupon` remains present only twice: 2/3, with one string and one null. It is now both optional and nullable. `items` has three arrays, one empty, and two element objects; both `quantity` and `sku` are present in 2/2 element objects. `customer.id` and `customer.name` are present in 3/3 customer objects. The final summary is three samples, nine property paths and zero conflicts.

The resulting TypeScript is:

```ts
export type ApiResponse = {
  coupon?: string | null;
  customer: {
    id: number;
    name: string;
  };
  id: number;
  items: {
    quantity: number;
    sku: string;
  }[];
  status: string;
};
```

The Zod output uses `coupon: z.string().nullable().optional()`. JSON Schema emits `"type": ["string", "null"]` for `coupon` and the root `required` list is `["customer", "id", "items", "status"]`. The two item properties are required only relative to the two item objects actually observed.

## Drift direction and classification

Comparison describes observed HTTP responses from baseline to new observations. These are the five engine results for the example, in core output order (`Não observado` is the UI label for an absent side represented by `null` in the comparison result):

| Path                  | Code                    | Severity               | Previous         | Current            |
| --------------------- | ----------------------- | ---------------------- | ---------------- | ------------------ |
| `$.coupon`            | `type-narrowed`         | `review`               | `string \| null` | `null`             |
| `$.currency`          | `property-added`        | `informational`        | `Não observado`  | `string`           |
| `$.customer.fullName` | `property-added`        | `informational`        | `Não observado`  | `string`           |
| `$.customer.name`     | `property-not-observed` | `potentially-breaking` | `string`         | `Não observado`    |
| `$.id`                | `type-expanded`         | `potentially-breaking` | `number`         | `string \| number` |

The UI groups these results by severity, while retaining each group's path order. Missing properties, new or expanded types, newly observed nulls and reduced presence are potentially breaking. Narrower types and arrays whose elements are no longer observed need review. Additions, increased presence, nulls no longer observed and newly observed elements are informational. Nullability is compared separately from non-null kinds to avoid double reporting. Only the topmost added or missing property is reported; object children are compared only where both sides observed objects.

`coupon` remains optional and nullable on both sides, so it produces only the narrowing change. Different ratios with the same optional status produce no extra drift. `status`, `customer.id`, `items` and its descendants produce no changes. `customer.name` disappearing alongside `customer.fullName` appearing does not establish a rename. No result proves compatibility or removal: the samples may omit valid cases, and consumer requirements are unknown.

## Why strings stay strings

A handful of observed statuses cannot define a closed enum. Date-like, email-like and UUID-like strings do not establish a format constraint. The core therefore generates `string` without enums, patterns or formats. Numbers remain `number`, not `integer`. This sacrifices specificity to avoid unsupported claims about future responses.

## Worker and persistence

The worker is a thin adapter around parsing, inference, generation and comparison. Request identifiers let the client ignore stale replies. Analysis reports phases rather than invented percentages. `Cancelar` terminates the worker and creates a replacement, retaining the previous completed result. Invalid analysis clears the previous contract so it cannot appear to describe the invalid input. File text is read on the main thread; parsing and inference run in the worker.

Dexie stores explicitly saved snapshots in IndexedDB. A snapshot contains the versioned contract, aggregated evidence and metadata, not the original JSON bodies. Opening one regenerates exports; it cannot reconstruct the raw samples. Unknown schema or contract versions cannot be opened or compared. Property names and user-entered metadata may still disclose API information, and local storage can be cleared or evicted.

## Trade-offs to revisit

Whole-document parsing and structured cloning keep the implementation small but cost memory and do not support streaming. The fixed limits bound accepted workloads rather than predicting browser latency. A later version could measure browser memory and latency before considering incremental processing. Object merging loses correlations between properties; discriminated unions would need explicit semantics and tests. Snapshot portability and migrations would need a versioned interchange contract. A CLI could reuse the core, but its extensionless imports currently require bundling for Node. These are future decisions, not implemented capabilities.
