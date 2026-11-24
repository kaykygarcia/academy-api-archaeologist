import { test, expect, expectSamples, analyzeButton } from './helpers';

test('pasted responses infer an optional field and copy the actual TypeScript', async ({
  page,
  context,
  baseURL,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: baseURL,
  });
  await page.goto('/');
  const editor = page.getByLabel('Amostra JSON', { exact: true });
  await editor.fill('{"id":1,"coupon":"SAMPLE"}');
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
  await expect(editor.locator('.cm-placeholder')).toBeVisible();
  await editor.fill('{"id":2}');
  await analyzeButton(page).click();
  await expectSamples(page, 2);
  await expect(
    page.getByRole('button', { name: 'amostra-2.json', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(editor).toHaveText('{"id":2}');
  await page
    .getByRole('button', { name: 'Copiar TypeScript', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Copiado', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.toast')).toHaveText('TypeScript copiado');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'export type ApiResponse = {\n  coupon?: string;\n  id: number;\n};\n',
  );
});

test('editing a sample after analysis feeds the next analysis', async ({
  page,
}) => {
  await page.goto('/');
  const editor = page.getByLabel('Amostra JSON', { exact: true });
  await editor.fill('{"id":1}');
  await analyzeButton(page).click();
  await expectSamples(page, 1);
  await editor.fill('{"id":1,"name":"Ada"}');
  await analyzeButton(page).click();
  await expect(
    page.getByLabel('Código TypeScript', { exact: true }),
  ).toContainText('name: string;');
  await expectSamples(page, 1);
  await page.getByRole('button', { name: 'Nova', exact: true }).click();
  await expect(editor.locator('.cm-placeholder')).toBeVisible();
  await editor.fill('{"id":2}');
  await analyzeButton(page).click();
  await expectSamples(page, 2);
  await expect(
    page.getByLabel('Código TypeScript', { exact: true }),
  ).toContainText('name?: string;');
  await page
    .getByRole('button', { name: 'Remover todas as amostras', exact: true })
    .click();
  await expect(
    page.getByRole('list', { name: 'Amostras adicionadas' }),
  ).toHaveCount(0);
  await expect(analyzeButton(page)).toBeDisabled();
});
