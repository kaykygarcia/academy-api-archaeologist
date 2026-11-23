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
  const header = page.locator('.site-header');
  await expect(header).toHaveCSS('position', 'static');
  expect(
    await header.evaluate((element) => element.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(100);
  await expect(header.getByRole('status')).toHaveAttribute(
    'aria-live',
    'polite',
  );
  await expect(header.getByRole('status')).toHaveAttribute('tabindex', '-1');
  await expect(
    header.getByRole('button', { name: 'Snapshots salvos', exact: true }),
  ).toHaveCount(0);
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
  const search = page.locator('.contract-search input');
  await expect(search).toBeVisible();
  expect(
    await search.evaluate((element) => element.getBoundingClientRect().width),
  ).toBeGreaterThanOrEqual(300);
  expect(
    await page
      .locator('.field-button')
      .first()
      .evaluate((element) => element.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(40);
  const exportButton = page.getByRole('button', {
    name: 'Exportar',
    exact: true,
  });
  await exportButton.scrollIntoViewIfNeeded();
  await expect(exportButton).toBeInViewport();
  await exportButton.tap();
  await expect(
    page.getByRole('menuitem', { name: 'Copiar TypeScript' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Código', exact: true }).tap();
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

test('Portuguese tabs, badges and drift headers fit at 390 pixels', async ({
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
  await page.getByRole('tab', { name: 'Snapshots (1)', exact: true }).tap();
  await expect(
    page.getByRole('list', { name: /^Snapshots salvos \(\d+\)$/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('tab', { name: 'Contrato', exact: true }).tap();
  await page
    .getByRole('button', { name: 'Carregar novas observações', exact: true })
    .click();
  await expectSamples(page, 2);
  await page.getByRole('tab', { name: 'Comparar', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Baseline', exact: true })
    .selectOption({ label: 'Orders baseline' });
  await page
    .getByRole('combobox', { name: 'Novas observações', exact: true })
    .selectOption('current');
  const compare = page.getByRole('button', { name: 'Comparar', exact: true });
  await compare.scrollIntoViewIfNeeded();
  await expect(compare).toBeInViewport();
  await compare.tap();
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

test('side-by-side long property names wrap without page overflow at 390 pixels', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const propertyName = 'a'.repeat(60);
  await page
    .getByLabel('Amostra JSON', { exact: true })
    .fill(JSON.stringify({ [propertyName]: 1 }));
  await page
    .getByRole('button', { name: 'Adicionar amostra', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Analisar amostras', exact: true })
    .click();
  await expectSamples(page, 1);
  await saveBaseline(page);
  await page.getByRole('tab', { name: 'Comparar', exact: true }).click();
  await page.getByRole('button', { name: 'Comparar', exact: true }).click();
  await expect(
    page.getByLabel('Resumo da comparação', { exact: true }),
  ).toHaveText('0 alterações');
  await page.getByRole('tab', { name: 'Lado a lado', exact: true }).click();
  const rowHeader = page.getByRole('rowheader', {
    name: `$.${propertyName}`,
    exact: true,
  });
  await expect(rowHeader).toBeVisible();
  await expect(rowHeader).toHaveCSS('overflow-wrap', 'break-word');
  await expect(rowHeader.locator('.diff-path')).toHaveCSS(
    'overflow-wrap',
    'break-word',
  );
  await expect(rowHeader.locator('code')).toHaveCSS(
    'overflow-wrap',
    'break-word',
  );
  expect(
    await rowHeader.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
