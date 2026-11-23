import { test, expect, loadExample } from './helpers';

test('invalid JSON names its sample and clears the previous contract', async ({
  page,
}) => {
  await loadExample(page);
  await page.getByLabel('JSON sample', { exact: true }).fill('{"broken":');
  await page.getByRole('button', { name: 'Add sample', exact: true }).click();
  await page
    .getByRole('button', { name: 'Analyze samples', exact: true })
    .click();
  await expect(page.getByRole('list', { name: 'Error summary' })).toContainText(
    'sample-1.json',
  );
  await expect(page.getByRole('status')).toContainText('Validation failed');
  await expect(
    page.getByRole('list', { name: 'Contract fields', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'A contract starts with evidence.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Copy', exact: true }),
  ).toBeDisabled();
});
