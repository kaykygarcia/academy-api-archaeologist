import type { Page } from '@playwright/test';
import {
  test,
  expect,
  expectSamples,
  loadExample,
  analyzeButton,
  openStructure,
} from './helpers';

async function expectNoHorizontalScroll(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test('mobile can reach Analyze and Copy without horizontal scrolling', async ({
  page,
  context,
  baseURL,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: baseURL,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  expect(
    await page
      .locator('.topbar')
      .evaluate((element) => element.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(60);
  await page.getByLabel('Amostra JSON', { exact: true }).fill('{"id":1}');
  const analyze = analyzeButton(page);
  await expect(analyze).toBeInViewport();
  await analyze.tap();
  await expectSamples(page, 1);
  const tabs = page.getByRole('tablist', { name: 'Visualização do contrato' });
  expect(
    await tabs.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  const copy = page.getByRole('button', {
    name: 'Copiar TypeScript',
    exact: true,
  });
  await copy.scrollIntoViewIfNeeded();
  await expect(copy).toBeInViewport();
  await copy.tap();
  await expect(
    page.getByRole('button', { name: 'Copiado', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    'id: number;',
  );
  await expectNoHorizontalScroll(page);
});

test('structure rows are touch-sized and long names wrap at 390 pixels', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loadExample(page);
  await openStructure(page);
  await expect(page.getByRole('button', { name: /^coupon\?/ })).toContainText(
    'opcional',
  );
  expect(
    await page
      .locator('.field-button')
      .first()
      .evaluate((element) => element.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(40);
  await expectNoHorizontalScroll(page);
  await page.getByRole('button', { name: 'Nova', exact: true }).tap();
  const propertyName = 'a'.repeat(80);
  await page
    .getByLabel('Amostra JSON', { exact: true })
    .fill(JSON.stringify({ [propertyName]: 1 }));
  await analyzeButton(page).tap();
  await expectSamples(page, 4);
  const field = page.getByRole('button', {
    name: new RegExp(`^${propertyName}`),
  });
  await expect(field).toBeVisible();
  expect(
    await field.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await expectNoHorizontalScroll(page);
});
