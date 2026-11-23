import {
  test,
  expect,
  loadExample,
  saveBaseline,
  expectSamples,
} from './helpers';

test('saved contract survives reload and opens without raw samples', async ({
  page,
}) => {
  await loadExample(page);
  await saveBaseline(page);
  await page.reload();
  await page.getByRole('tab', { name: 'Snapshots (1)', exact: true }).click();
  const row = page
    .getByRole('list', { name: /^Snapshots salvos \(\d+\)$/ })
    .getByRole('listitem')
    .filter({ hasText: 'Orders baseline' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Abrir', exact: true }).click();
  await expectSamples(page, 3);
  await expect(
    page.getByText(
      'Aberto a partir de um snapshot — as amostras originais não são armazenadas',
      {
        exact: true,
      },
    ),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /^coupon\?/ })).toContainText(
    'nullable',
  );
  await expect(
    page.getByRole('button', { name: 'Exportar', exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole('button', { name: 'Analisar amostras', exact: true }),
  ).toBeDisabled();
});
