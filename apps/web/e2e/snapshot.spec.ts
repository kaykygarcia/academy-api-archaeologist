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
  const row = page
    .getByRole('list', { name: 'Saved snapshots', exact: true })
    .getByRole('listitem')
    .filter({ hasText: 'Orders baseline' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Open', exact: true }).click();
  await expectSamples(page, 3);
  await expect(
    page.getByText('Opened from snapshot — original samples are not stored', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /^coupon\?/ })).toContainText(
    'nullable',
  );
  await expect(
    page.getByRole('button', { name: 'Copy', exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole('button', { name: 'Analyze samples', exact: true }),
  ).toBeDisabled();
});
