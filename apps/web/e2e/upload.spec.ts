import { test, expect, expectSamples, analyzeButton } from './helpers';

test('uploads two synthetic files, removes one and reanalyzes', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Arquivos', { exact: true }).setInputFiles([
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
  await expect(page.locator('.toast')).toHaveText('2 amostras adicionadas');
  await expect(
    page.getByRole('button', { name: 'first.json', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Amostra JSON', { exact: true })).toHaveText(
    '{"id":1}',
  );
  await analyzeButton(page).click();
  await expectSamples(page, 2);
  await page.getByRole('button', { name: 'Remover second.json' }).click();
  await expect(
    page.getByRole('button', { name: 'Remover second.json' }),
  ).toHaveCount(0);
  await analyzeButton(page).click();
  await expectSamples(page, 1);
});
