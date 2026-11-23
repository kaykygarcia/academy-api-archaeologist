import { test, expect, expectSamples } from './helpers';

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
  await page
    .getByRole('button', { name: 'Adicionar amostra', exact: true })
    .click();
  await editor.fill('{"id":2}');
  await page
    .getByRole('button', { name: 'Adicionar amostra', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Analisar amostras', exact: true })
    .click();
  await expectSamples(page, 2);
  await expect(page.getByRole('button', { name: /^coupon\?/ })).toContainText(
    'opcional',
  );
  await page.getByRole('tab', { name: 'Código', exact: true }).click();
  await page.getByRole('button', { name: 'Copiar', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Copiado', exact: true }),
  ).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(
    'export type ApiResponse = {\n  coupon?: string;\n  id: number;\n};\n',
  );
});
