import { test, expect, tabTo, expectSamples, loadExample } from './helpers';

test('editor shortcuts add a sample, then analyze the complete set', async ({
  page,
}) => {
  await page.goto('/');
  const editor = page.getByLabel('Amostra JSON', { exact: true });
  await tabTo(page, editor);
  await page.keyboard.insertText('{"a":1}');
  await page.keyboard.press('ControlOrMeta+Shift+Enter');
  await expect(editor.locator('.cm-placeholder')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'amostra-1.json', exact: true }),
  ).toHaveAttribute('title', '7 bytes');
  await expect(
    page.getByLabel('Resumo do contrato', { exact: true }),
  ).toHaveCount(0);
  await page.keyboard.insertText('{"second":2}');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expectSamples(page, 2);
  await expect(editor).toBeFocused();
  await page.getByRole('tab', { name: 'Estrutura', exact: true }).click();
  await expect(page.getByRole('button', { name: /^a\?/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^second\?/ })).toBeVisible();
});

test('contract tabs support arrows, Home and End', async ({ page }) => {
  await loadExample(page);
  const tabs = page.getByRole('tablist', { name: 'Visualização do contrato' });
  const typescript = tabs.getByRole('tab', { name: 'TypeScript', exact: true });
  const zod = tabs.getByRole('tab', { name: 'Zod', exact: true });
  const structure = tabs.getByRole('tab', { name: 'Estrutura', exact: true });
  await typescript.focus();
  await page.keyboard.press('ArrowRight');
  await expect(zod).toBeFocused();
  await expect(zod).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('Código Zod', { exact: true })).toBeVisible();
  await expect(page.locator('#contract-panel-0')).toBeHidden();
  await page.keyboard.press('End');
  await expect(structure).toBeFocused();
  await expect(page.getByRole('button', { name: /^coupon\?/ })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(typescript).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(structure).toBeFocused();
  await page.keyboard.press('Home');
  await expect(typescript).toHaveAttribute('aria-selected', 'true');
});
