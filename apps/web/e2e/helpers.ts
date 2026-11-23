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
        if (new URL(request.url()).origin !== origin)
          external.add(request.url());
      });
      await context.route('**/*', async (route) => {
        if (new URL(route.request().url()).origin !== origin) {
          external.add(route.request().url());
          await route.abort();
        } else await route.continue();
      });
      await use(undefined);
      expect(
        { externalRequests: [...external], pageErrors, consoleErrors },
        'No external requests, page errors or console errors are allowed',
      ).toEqual({ externalRequests: [], pageErrors: [], consoleErrors: [] });
    },
    { auto: true },
  ],
});

export { expect };

export async function expectSamples(page: Page, count: number) {
  const stats = page.getByRole('region', { name: 'Inferred contract' });
  await expect(
    stats
      .locator('dl.stats > div')
      .filter({ hasText: 'Samples analyzed' })
      .locator('dd'),
  ).toHaveText(String(count));
}

export async function loadExample(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load example', exact: true }).click();
  await expectSamples(page, 3);
  await expect(
    page.getByRole('list', { name: 'Contract fields', exact: true }),
  ).toBeVisible();
}

export async function saveBaseline(page: Page) {
  await page
    .getByRole('button', { name: 'Save snapshot', exact: true })
    .click();
  await page
    .getByLabel('Snapshot name', { exact: true })
    .fill('Orders baseline');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    page
      .getByRole('list', { name: 'Saved snapshots', exact: true })
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
