import { test, expect, loadExample, analyzeButton } from './helpers';

test('invalid JSON names its sample and clears the previous contract', async ({
  page,
}) => {
  await loadExample(page);
  await page.getByRole('button', { name: 'Nova', exact: true }).click();
  await page.getByLabel('Amostra JSON', { exact: true }).fill('{"broken":');
  await analyzeButton(page).click();
  await expect(
    page.getByRole('list', { name: 'Resumo de erros' }),
  ).toContainText('amostra-1.json');
  await expect(
    page.getByRole('status').filter({ hasText: 'Falha na validação' }),
  ).toHaveCount(1);
  await expect(
    page.getByRole('tablist', { name: 'Visualização do contrato' }),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Copiar/ })).toHaveCount(0);
  await expect(
    page.getByLabel('Resumo do contrato', { exact: true }),
  ).toHaveCount(0);
});
