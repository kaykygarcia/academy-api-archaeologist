# Cloudflare Pages deployment

Deployment has not been performed. There is no verified public URL. The maintainer must connect the repository and authorize deployment in their own Cloudflare account.

Create a Pages project using Git integration. Use the repository root as the root directory (leave the subdirectory field empty), `main` as the production branch, `pnpm build` as the build command, and `apps/web/dist` as the output directory relative to the repository root. Serve the static build, not the Docker container.

Use Node 24.21.0 from [`.nvmrc`](../.nvmrc) and pnpm 12.23.0 from `packageManager` in [package.json](../package.json). Ensure pnpm is available through Corepack or an explicit installation in the build environment, set `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`, and let Pages install dependencies from `pnpm-lock.yaml` during its automatic dependency installation step. The build command is only `pnpm build`; do not include a second install command. Do not add runtime secrets; this application has no backend.

`VITE_REPOSITORY_URL` is an optional build-time variable for the repository URL; the GitHub and Documentation links are hidden when it is unset.

Vite copies [public/_headers](../apps/web/public/_headers) into `apps/web/dist/_headers`. Cloudflare Pages uses it to serve the CSP, content-type protection, referrer policy and permissions policy. Confirm this file is present in the uploaded output and verify the response headers after deployment. No top-level `404.html` is supplied, so Pages can use its default SPA fallback.

Before recording a URL, verify the deployed page, fixture analysis, clipboard, snapshots after reload and the five-change drift example. Inspect requests for external origins and the browser console for CSP violations, including worker and editor loading. The Playwright suite can target the deployment with `E2E_BASE_URL=https://your-verified-host pnpm test:e2e`; this skips the local preview server. Clipboard access requires a secure context. Record only a URL that has actually been deployed and checked.
