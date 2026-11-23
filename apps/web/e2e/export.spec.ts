import { test, expect, loadExample } from './helpers';

test('export menu keyboard, clipboard contents and all download filenames', async ({
  page,
  context,
  baseURL,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: baseURL,
  });
  await loadExample(page);
  const trigger = page.getByRole('button', { name: 'Exportar', exact: true });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(
    page.getByRole('menuitem', { name: 'Copiar TypeScript', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(
    page.getByRole('menuitem', { name: 'Baixar .schema.json', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await expect(
    page.getByRole('menuitem', { name: 'Copiar Zod', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('End');
  await expect(
    page.getByRole('menuitem', { name: 'Baixar .schema.json', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  for (const format of ['TypeScript', 'Zod', 'JSON Schema']) {
    await page.getByRole('tab', { name: 'Código', exact: true }).click();
    await page.getByRole('tab', { name: format, exact: true }).click();
    await expect(
      page.getByLabel('Código gerado', { exact: true }),
    ).toBeVisible();
    await trigger.click();
    await page
      .getByRole('menuitem', { name: `Copiar ${format}`, exact: true })
      .focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toBeFocused();
    await expect(page.getByRole('status')).toHaveText(`${format} copiado.`);
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    if (format === 'TypeScript')
      expect(clipboard).toContain('coupon?: string | null;');
    else if (format === 'Zod')
      expect(clipboard).toContain('z.string().nullable().optional()');
    else
      expect(JSON.parse(clipboard)).toMatchObject({
        type: 'object',
        required: ['customer', 'id', 'items', 'status'],
      });
  }
  for (const extension of ['.ts', '.zod.ts', '.schema.json']) {
    await trigger.click();
    const downloadPromise = page.waitForEvent('download');
    await page
      .getByRole('menuitem', { name: `Baixar ${extension}`, exact: true })
      .click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`exemplo-de-pedidos${extension}`);
    await expect(trigger).toBeFocused();
  }
  await trigger.focus();
  await page.keyboard.press('ArrowUp');
  await expect(
    page.getByRole('menuitem', { name: 'Baixar .schema.json', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('menu')).toHaveCount(0);
});

test('outside pointer closes the export menu without copying', async ({
  page,
  context,
  baseURL,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: baseURL,
  });
  await loadExample(page);
  await page.evaluate(() =>
    navigator.clipboard.writeText('Conteúdo preservado'),
  );
  const trigger = page.getByRole('button', { name: 'Exportar', exact: true });
  await trigger.click();
  await expect(page.getByRole('menu')).toBeVisible();
  await expect(page.getByRole('menuitem').first()).toBeFocused();
  await page
    .getByRole('heading', { level: 1 })
    .dispatchEvent('pointerdown', { bubbles: true });
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'Conteúdo preservado',
  );
  await expect(page.getByRole('status')).toHaveText('Contrato pronto.');
});

test('trigger dismisses the menu before its animation-frame focus transfer', async ({
  page,
}) => {
  await loadExample(page);
  const trigger = page.getByRole('button', { name: 'Exportar', exact: true });
  for (const key of ['Escape', 'Tab']) {
    await trigger.focus();
    await trigger.evaluate(async (element, key) => {
      element.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      await Promise.resolve();
      element.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true }),
      );
    }, key);
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
  }
});
