import { test, expect, tabTo, expectSamples } from './helpers';

test('keyboard reaches tabs, switches them with arrows and analyzes with Enter', async ({
  page,
}) => {
  await page.goto('/');
  const paste = page.getByRole('tab', { name: 'Colar JSON' });
  await tabTo(page, paste);
  await page.keyboard.press('ArrowRight');
  const upload = page.getByRole('tab', { name: 'Enviar arquivos' });
  await expect(upload).toBeFocused();
  await expect(upload).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(paste).toBeFocused();
  await expect(paste).toHaveAttribute('aria-selected', 'true');
  const editor = page.getByLabel('Amostra JSON', { exact: true });
  await tabTo(page, editor);
  await page.keyboard.insertText('{"id":1}');
  await tabTo(
    page,
    page.getByRole('button', { name: 'Adicionar amostra', exact: true }),
  );
  await page.keyboard.press('Enter');
  await tabTo(
    page,
    page.getByRole('button', { name: 'Analisar amostras', exact: true }),
  );
  await page.keyboard.press('Enter');
  await expectSamples(page, 1);
  await expect(
    page.getByLabel('Resumo do contrato', { exact: true }),
  ).toBeFocused();
});
