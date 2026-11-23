import { test, expect, expectSamples } from './helpers';

test('uploads two synthetic files, removes one and reanalyzes', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Enviar arquivos' }).click();
  await page.getByLabel('Escolher arquivos JSON').setInputFiles([
    {
      name: 'first.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"id":1}'),
    },
    {
      name: 'second.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"id":2}'),
    },
  ]);
  await expect(
    page.getByRole('button', { name: 'Remover second.json' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Analisar amostras', exact: true })
    .click();
  await expectSamples(page, 2);
  await page.getByRole('button', { name: 'Remover second.json' }).click();
  await expect(
    page.getByRole('button', { name: 'Remover second.json' }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Analisar amostras', exact: true })
    .click();
  await expectSamples(page, 1);
});
