import {
  test,
  expect,
  expectSamples,
  loadExample,
  saveBaseline,
} from './helpers';

test('mobile can reach and activate Analyze and Copy without horizontal scrolling', async ({
  page,
  context,
  baseURL,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: baseURL,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('Amostra JSON', { exact: true }).fill('{"id":1}');
  await page
    .getByRole('button', { name: 'Adicionar amostra', exact: true })
    .tap();
  const analyze = page.getByRole('button', {
    name: 'Analisar amostras',
    exact: true,
  });
  await analyze.scrollIntoViewIfNeeded();
  await expect(analyze).toBeInViewport();
  await analyze.tap();
  await expectSamples(page, 1);
  const copy = page.getByRole('button', { name: 'Copiar', exact: true });
  await copy.scrollIntoViewIfNeeded();
  await expect(copy).toBeInViewport();
  await copy.tap();
  await expect(
    page.getByRole('button', { name: 'Copiado', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    'id: number;',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('Portuguese hero, tabs, badges and drift headers fit at 390 pixels', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loadExample(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.locator('footer')).toContainText(
    '2.000.000 valores visitados',
  );
  await expect(page.getByRole('button', { name: /^coupon\?/ })).toContainText(
    'opcional',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await saveBaseline(page);
  await page
    .getByRole('button', { name: 'Carregar novas observações', exact: true })
    .click();
  await expectSamples(page, 2);
  await page
    .getByRole('combobox', { name: 'Baseline', exact: true })
    .selectOption({ label: 'Orders baseline' });
  await page
    .getByRole('combobox', { name: 'Novas observações', exact: true })
    .selectOption('current');
  await page.getByRole('button', { name: 'Comparar', exact: true }).click();
  await expect(
    page
      .locator('.change-header')
      .filter({ hasText: 'Potencialmente incompatível: Não observado' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator('.change-header')
      .evaluateAll((headers) =>
        headers.every((header) => header.scrollWidth <= header.clientWidth),
      ),
  ).toBe(true);
});
