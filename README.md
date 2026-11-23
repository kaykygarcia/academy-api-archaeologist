# API Archaeologist

A browser-only tool that infers TypeScript, Zod and JSON Schema contracts from multiple JSON responses, keeps the observed evidence, and compares contracts for drift. It runs locally in the browser without an API connection or backend.

![Contract and observed evidence](docs/screenshots/contract.png)
![Side-by-side comparison of baseline and new observations](docs/screenshots/drift.png)
![Mobile analysis and export](docs/screenshots/mobile.png)

The interface is in Brazilian Portuguese (pt-BR).

## How it works

1. In `Contrato`, paste JSON responses, upload or drag and drop `.json` files onto the samples panel, or select `Carregar exemplo` to analyze the three fictional order fixtures. One document is one response sample, including a root array. In the editor, Ctrl/Cmd+Enter adds a sample; Ctrl/Cmd+Shift+Enter adds it and analyzes the samples.
2. Inspect the inferred fields and their evidence. In the example, `coupon` is shown as `Observado em 2/3 objetos pai` and has one null observation, making it optional and nullable for separate reasons. Search the tree by property name or a path starting with `$`, such as `$.items[*].sku`. Matching ancestors remain visible. Expanded nodes render 200 children per batch, including search results, with a control to show more.
3. Use the `Exportar` menu to copy or download TypeScript, Zod 4 or JSON Schema 2020-12 generated from the same contract tree. The `Código` view also provides a preview, copy and download controls.
4. Save a baseline as a local snapshot, then load new observations. The example's `Salvar e carregar novas observações` action performs both steps and opens `Comparar`. Compare the saved baseline with `Análise atual` to see five changes, including an expanded `id` type and an unobserved `customer.name`. Inspect `Lista` or `Lado a lado`, use `Somente alterações` in the side-by-side view, and download the Markdown drift report.
5. In `Snapshots`, open, compare, rename or delete saved snapshots, export all as JSON, or import a snapshot JSON file. Imported files are validated as untrusted input; invalid records are skipped with a report. The three app tabs preserve their mounted panels when switching views.

## Design decisions

The core is pure TypeScript. A Web Worker runs parsing, inference, generation and comparison; React presents its output. Vite builds a static application, so neither an application server nor a remote database is needed. Dexie stores snapshots in IndexedDB when explicitly saved or imported.

Tools such as quicktype already address type generation from JSON. This project's focus is preserving evidence across multiple samples and explaining observed drift. Presence is counted per parent object, nullability is separate from absence, and comparison labels describe potential consumer impact.

## Privacy and security

- Samples, contracts and snapshots are processed and stored only in the browser and are never sent anywhere. There is no remote inference or API fetching. Fonts and application assets are bundled.
- The public deployment at https://academy-api-archaeologist.kaykygarcia.dev uses Cloudflare Web Analytics. Its beacon records the page URL path, referrer, browser and device data derived from the user agent, and performance timings; Cloudflare derives approximate location from the IP address. It sets no cookies and does not read page content or samples. The app has no routes or query strings, so its URL carries no user data. Self-hosted builds (Docker or your own static hosting) include no analytics.
- Snapshots contain aggregated contracts and metadata, not raw response bodies. Property names can still disclose API information.
- Input is parsed as JSON and rendered as text. Generated code is exported, never executed by the application.
- Production headers restrict resources to the app origin, with a Cloudflare Pages exception for the Web Analytics script and beacon. Remove tokens, personal data and secrets before sharing screenshots or exports.

## Limitations

Samples do not prove the full API contract. A field observed in every parent may still be optional in unseen responses, and no observed drift does not guarantee compatibility. The engine does not infer enums, formats or discriminated unions. Generated schemas allow additional properties. Browser storage may be cleared or evicted.

Inputs are bounded to 200 samples, 5 MiB per sample, 20 MiB per session, depth 50 and 2,000,000 visited values. The contract tree renders 200 children per batch; in one local measurement a sample with 50,000 properties at one level was painted about 0.9 s after Analyze, compared with 7.9 s before incremental rendering. Imported snapshot files are limited to 20 MiB and 500 records and are validated as untrusted input. The CSP allows inline styles because the code editor injects them.

## Local use

`VITE_REPOSITORY_URL` is an optional build-time variable for the repository URL, for example `VITE_REPOSITORY_URL=https://github.com/<owner>/<repo> pnpm build`. The GitHub and `Documentação` links are hidden when it is unset. The Docker images do not pass it, so those links are hidden there.

Use Node 24.21.0 from `.nvmrc`. pnpm 12.23.0 is declared in `packageManager`; make it available through Corepack (`corepack enable`) or a manual installation of that version.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:5173`. For a local production build and preview:

```sh
pnpm build
pnpm --filter @api-archaeologist/web preview
```

The preview listens on `http://127.0.0.1:4173`. It does not apply Cloudflare's `_headers`; use the production container to check the Docker headers and CSP, and the live Pages deployment to check its analytics exception.

For development in Docker, run `docker compose up --build` and open `http://127.0.0.1:5173`. The container runs as `node`, mounts source for hot reload and keeps its three dependency directories and pnpm store in named volumes. Stop it with `docker compose down`. Restarting preserves those volumes and does not affect browser snapshots.

Docker dev creates the `node_modules` mount points, so use either the local pnpm workflow or Docker dev in a checkout, or delete those root-owned `node_modules` directories before switching back to local.

For production preview:

```sh
docker compose -f compose.prod.yaml up --build -d
# Open http://127.0.0.1:8080
docker compose -f compose.prod.yaml down
```

If dependency volumes need renewal, stop the dev service, identify the exact volumes for this Compose project with `docker volume ls` and `docker volume inspect`, and remove only its `root_node_modules`, `web_node_modules`, `core_node_modules` and `pnpm_store` volumes. Recreate the dev service afterward. Do not prune unrelated volumes. Snapshots belong to the browser origin and profile, not these volumes; different ports have separate storage.

Run checks and install the E2E browser when setting up a development machine:

```sh
pnpm lint
pnpm typecheck
pnpm format:check
pnpm test
pnpm build
pnpm --filter @api-archaeologist/core bench
pnpm --filter @api-archaeologist/web exec playwright install --with-deps chromium
pnpm test:e2e
```

E2E builds and launches Vite preview automatically. The Chromium project runs desktop specs; the Pixel 7 project runs only the mobile spec. To run the same suite against an already running production container:

```sh
E2E_BASE_URL=http://127.0.0.1:8080 pnpm test:e2e
```

With `E2E_BASE_URL` set, Playwright does not launch a server. Each test rejects requests outside the app origin except for the exact Cloudflare Web Analytics hostnames `static.cloudflareinsights.com` and `cloudflareinsights.com`, and uses fictional data. Console errors and page errors still fail. Failure reports are written to `apps/web/playwright-report`.

## Cloudflare Pages

The application is deployed at https://academy-api-archaeologist.kaykygarcia.dev on Cloudflare Pages, with build command `pnpm build` and output directory `apps/web/dist`. Pages reads Node from `.nvmrc` but ignores `packageManager`, so the project sets the environment variable `PNPM_VERSION=12.23.0`. Security headers come from `apps/web/public/_headers`. To check the live site, run `E2E_BASE_URL=https://academy-api-archaeologist.kaykygarcia.dev pnpm test:e2e`.

## License

[MIT](LICENSE).

## Implementation references

- [Evidence model](packages/core/src/types.ts) and [inference](packages/core/src/inference.ts)
- [Normalization and evidence counts](packages/core/src/normalization.ts)
- [Contract comparison](packages/core/src/comparison.ts), [aligned rows](packages/core/src/align.ts) and [drift labels](packages/core/src/labels.ts)
- [Tree search](packages/core/src/search.ts), [contract validation](packages/core/src/validate.ts) and [own-field checks](packages/core/src/own.ts)
- [Markdown drift report](packages/core/src/report.ts)
- [Generators](packages/core/src/generators)
- [Worker adapter](apps/web/src/workers/analysis.worker.ts)
- [App state and focus](apps/web/src/App.tsx) and [tabs](apps/web/src/components/Tabs.tsx)
- [Sample input and drop zone](apps/web/src/features/samples/SamplesPanel.tsx)
- [Contract toolbar](apps/web/src/features/contract/ContractSection.tsx), [incremental tree](apps/web/src/features/contract/ContractTree.tsx) and [export menu](apps/web/src/components/ExportMenu.tsx)
- [Comparison panel](apps/web/src/features/comparison/ComparisonPanel.tsx) and [side-by-side view](apps/web/src/features/comparison/SideBySide.tsx)
- [Snapshot transfer UI](apps/web/src/features/snapshots/SnapshotTransfer.tsx), [interchange validation](apps/web/src/features/snapshots/transfer.ts) and [storage](apps/web/src/features/snapshots/db.ts)
- [Responsive styles](apps/web/src/styles/index.css)
- [E2E specs](apps/web/e2e) and [Playwright configuration](apps/web/playwright.config.ts)
- [Docker stages](Dockerfile) and [Nginx configuration](nginx.conf)
- [Production headers](apps/web/public/_headers)
- [CI workflow](.github/workflows/ci.yml)
