import {
  test as base,
  expect,
  type Page,
  type Locator,
} from '@playwright/test';

export const test = base.extend<{ networkGuard: undefined }>({
  networkGuard: [
    async ({ context, baseURL }, use) => {
      if (!baseURL) throw new Error('E2E baseURL is required');
      const origin = new URL(baseURL).origin;
      // The public Cloudflare Pages deployment enables Web Analytics: exact hostnames over HTTPS only.
      const analyticsHosts = new Set([
        'static.cloudflareinsights.com',
        'cloudflareinsights.com',
      ]);
      const isForbiddenRequest = (requestUrl: string) => {
        const url = new URL(requestUrl);
        return (
          url.origin !== origin &&
          !(url.protocol === 'https:' && analyticsHosts.has(url.hostname))
        );
      };
      const external = new Set<string>();
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      context.on('page', (page) => {
        page.on('pageerror', (error) => pageErrors.push(error.message));
      });
      context.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      context.on('request', (request) => {
        if (isForbiddenRequest(request.url())) external.add(request.url());
      });
      await context.route('**/*', async (route) => {
        if (isForbiddenRequest(route.request().url())) {
          external.add(route.request().url());
          await route.abort();
        } else await route.continue();
      });
      await use(undefined);
      expect(
        { externalRequests: [...external], pageErrors, consoleErrors },
        'No unapproved external requests, page errors or console errors are allowed',
      ).toEqual({ externalRequests: [], pageErrors: [], consoleErrors: [] });
    },
    { auto: true },
  ],
});

export { expect };

export async function expectSamples(page: Page, count: number) {
  const stats = page.getByRole('region', { name: 'Contrato inferido' });
  await expect(
    stats
      .locator('dl.stats > div')
      .filter({ hasText: 'Amostras analisadas' })
      .locator('dd'),
  ).toHaveText(count.toLocaleString('pt-BR'));
}

export async function loadExample(page: Page) {
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Carregar exemplo', exact: true })
    .click();
  await expectSamples(page, 3);
  await expect(
    page.getByRole('list', { name: 'Campos do contrato', exact: true }),
  ).toBeVisible();
}

export async function saveBaseline(page: Page) {
  await page
    .getByRole('button', { name: 'Salvar snapshot', exact: true })
    .click();
  await page
    .getByLabel('Nome do snapshot', { exact: true })
    .fill('Orders baseline');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(
    page
      .getByRole('list', { name: 'Snapshots salvos', exact: true })
      .getByText('Orders baseline', { exact: true }),
  ).toBeVisible();
}

export async function tabTo(page: Page, target: Locator) {
  for (let step = 0; step < 40; step++) {
    if (await target.evaluate((element) => element === document.activeElement))
      return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}
