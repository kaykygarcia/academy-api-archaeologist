import { test, expect, loadExample } from './helpers';

test('invalid JSON names its sample and clears the previous contract', async ({
  page,
}) => {
  await loadExample(page);
  await page.getByLabel('Amostra JSON', { exact: true }).fill('{"broken":');
  await page
    .getByRole('button', { name: 'Adicionar amostra', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Analisar amostras', exact: true })
    .click();
  await expect(
    page.getByRole('list', { name: 'Resumo de erros' }),
  ).toContainText('amostra-1.json');
  await expect(page.getByRole('status')).toContainText('Falha na validação');
  await expect(
    page.getByRole('list', { name: 'Campos do contrato', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText('Adicione amostras e analise-as para examinar o contrato.'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Exportar', exact: true }),
  ).toHaveCount(0);
});
