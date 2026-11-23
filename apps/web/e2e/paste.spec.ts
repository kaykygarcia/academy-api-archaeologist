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
  const editor = page.getByLabel('JSON sample', { exact: true });
  await editor.fill('{"id":1,"coupon":"SAMPLE"}');
  await page.getByRole('button', { name: 'Add sample', exact: true }).click();
  await editor.fill('{"id":2}');
  await page.getByRole('button', { name: 'Add sample', exact: true }).click();
  await page
    .getByRole('button', { name: 'Analyze samples', exact: true })
    .click();
  await expectSamples(page, 2);
  await expect(page.getByRole('button', { name: /^coupon\?/ })).toContainText(
    'optional',
  );
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Copied', exact: true }),
  ).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(
    'export type ApiResponse = {\n  coupon?: string;\n  id: number;\n};\n',
  );
});
