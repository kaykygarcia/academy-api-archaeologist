# Cloudflare Pages deployment

The application is deployed at https://academy-api-archaeologist.kaykygarcia.dev. The Pages project is `api-archaeologist`, with a custom domain on Cloudflare DNS. Pages serves the static build, not the Docker container.

## Build settings

- Root directory: empty (repository root).
- Production branch: `main`.
- Framework preset: `None`.
- Build command: `pnpm build`.
- Build output directory: `apps/web/dist`.
- Node version: from [`.nvmrc`](../.nvmrc), which Pages reads.
- Required environment variable: `PNPM_VERSION=12.23.0`. Pages does not read `packageManager` from [package.json](../package.json); the default image ships pnpm 10.

Pages installs dependencies from `pnpm-lock.yaml` during its automatic dependency installation step. The build command is only `pnpm build`; it does not include a second install command. No runtime secrets are needed; this application has no backend.

`VITE_REPOSITORY_URL` is an optional build-time variable for the repository URL; setting it shows the GitHub and Documentation links, which are hidden when it is unset.

## Headers and analytics

Vite copies [public/_headers](../apps/web/public/_headers) into `apps/web/dist/_headers`. Cloudflare Pages uses it to serve the CSP, content-type protection, referrer policy and permissions policy. No top-level `404.html` is supplied, so Pages can use its default SPA fallback.

Cloudflare Web Analytics is enabled on this deployment and allowed by `_headers`. Cloudflare injects the script from `https://static.cloudflareinsights.com`; the beacon connects to `https://cloudflareinsights.com`. It collects cookieless page-view and performance metrics without reading page content or samples. Samples, contracts and snapshots are processed and stored only in the browser and are never sent anywhere.

The only intended CSP difference between `_headers` and [nginx.conf](../nginx.conf) is the two Web Analytics origins: `https://static.cloudflareinsights.com` in `script-src` and `https://cloudflareinsights.com` in `connect-src`. Every other directive is the same. Nginx remains restricted to self for scripts and connections; self-hosted builds (Docker or your own static hosting) include no analytics.

## Post-deploy verification checklist

- Confirm `apps/web/dist/_headers` is present in the uploaded output and verify the response headers on the deployed page.
- Verify the deployed page, fixture analysis, clipboard, snapshots after reload and the five-change drift example. Clipboard access requires a secure context.
- Inspect requests: only the app origin and the exact Web Analytics hostnames `static.cloudflareinsights.com` and `cloudflareinsights.com` are allowed by the E2E network guard.
- Check the browser console for CSP violations, including worker, editor and analytics loading. Console errors and page errors still fail E2E checks.
- Run the Playwright suite against the live URL with `E2E_BASE_URL=https://academy-api-archaeologist.kaykygarcia.dev pnpm test:e2e`. Setting `E2E_BASE_URL` skips the local preview server.
