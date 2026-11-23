# Project invariants

Read `README.md`, `docs/architecture.md` and `docs/limitations.md` before implementation. Make no scope changes without approval. Record any deviation in the final report instead of faking a feature.

- Keep core pure TypeScript, independent of DOM and React. Workers are thin adapters; UI never reimplements inference or counts.
- Distinguish missing from null. Count presence per parent object occurrence; never present counts as probabilities.
- Keep TypeScript strict. No `any`, non-null assertions or casts that silence errors. Use `Map` and `Object.hasOwn` for user keys.
- No `eval`, `new Function` or `dangerouslySetInnerHTML`. Never log sample content.
- Keep processing local: no network calls, analytics, CDN fonts or external assets.
- Prefer simple functions and local state. No managers, factories, registries, service layers, global state libraries or gratuitous memoization.
- Comment only non-obvious decisions. No emojis anywhere. No boilerplate JSDoc.
- Every visible control must work. No hardcoded results or invented metrics.
- Pin exact dependency versions; add no dependencies without approval. Codex must not run network installs because Codex has no network; Claude performs installs.
- Do not commit or run destructive Docker commands such as `down -v` or `system prune`.
- Keep code, identifiers, comments, generated code and repository documentation in English. All user-visible text, including core messages and drift explanations, is in Brazilian Portuguese. Communicate with the maintainer in Brazilian Portuguese.
