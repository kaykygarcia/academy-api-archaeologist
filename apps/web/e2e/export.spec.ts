import { test, expect, loadExample } from './helpers';

const formats = [
  { label: 'TypeScript', extension: '.ts' },
  { label: 'Zod', extension: '.zod.ts' },
  { label: 'JSON Schema', extension: '.schema.json' },
];

test('each format copies its own code and downloads a named file', async ({
  page,
  context,
  baseURL,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: baseURL,
  });
  await loadExample(page);
  for (const { label, extension } of formats) {
    await page.getByRole('tab', { name: label, exact: true }).click();
    await expect(
      page.getByLabel(`Código ${label}`, { exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: `Copiar ${label}`, exact: true })
      .click();
    await expect(page.locator('.toast')).toHaveText(`${label} copiado`);
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    if (label === 'TypeScript')
      expect(clipboard).toContain('coupon?: string | null;');
    else if (label === 'Zod')
      expect(clipboard).toContain('z.string().nullable().optional()');
    else
      expect(JSON.parse(clipboard)).toMatchObject({
        type: 'object',
        required: ['customer', 'id', 'items', 'status'],
      });
    const downloadPromise = page.waitForEvent('download');
    await page
      .getByRole('button', { name: `Baixar ${extension}`, exact: true })
      .click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`contrato${extension}`);
  }
  await page.getByRole('tab', { name: 'Estrutura', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Copiar/ })).toHaveCount(0);
});

test('a denied clipboard reports the failure without claiming success', async ({
  page,
}) => {
  await loadExample(page);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: () => Promise.reject(new Error('Synthetic denial')),
      },
    });
  });
  await page
    .getByRole('button', { name: 'Copiar TypeScript', exact: true })
    .click();
  await expect(page.locator('.toast.error')).toContainText(
    'Não foi possível copiar',
  );
  await expect(
    page.getByRole('button', { name: 'Copiado', exact: true }),
  ).toHaveCount(0);
});
