import {
  test,
  expect,
  loadExample,
  saveBaseline,
  expectSamples,
} from './helpers';

test('baseline to current reports exactly the five expected changes and severities', async ({
  page,
}) => {
  await loadExample(page);
  await saveBaseline(page);
  await page
    .getByRole('button', { name: 'Load new observations', exact: true })
    .click();
  await expectSamples(page, 2);
  await page
    .getByRole('combobox', { name: 'Baseline', exact: true })
    .selectOption({ label: 'Orders baseline' });
  await page
    .getByRole('combobox', { name: 'New observations', exact: true })
    .selectOption('current');
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  const changes = page
    .getByRole('list', { name: /Drift changes:/ })
    .getByRole('listitem');
  await expect(changes).toHaveCount(5);
  const expected = [
    {
      path: '$.coupon',
      label: 'Type narrowed',
      severity: 'Review',
      transition: 'string | null → null',
      explanation: /narrower/i,
    },
    {
      path: '$.currency',
      label: 'Added',
      severity: 'Informational',
      transition: 'Not observed → string',
      explanation: /added|new/i,
    },
    {
      path: '$.customer.fullName',
      label: 'Added',
      severity: 'Informational',
      transition: 'Not observed → string',
      explanation: /added|new/i,
    },
    {
      path: '$.customer.name',
      label: 'Not observed',
      severity: 'Potentially breaking',
      transition: 'string → Not observed',
      explanation: /not observed/i,
    },
    {
      path: '$.id',
      label: 'Type expanded',
      severity: 'Potentially breaking',
      transition: 'number → string | number',
      explanation: /Non-null kinds gained: string/i,
    },
  ];
  for (const change of expected) {
    const row = changes.filter({
      has: page.getByRole('heading', { name: change.path, exact: true }),
    });
    await expect(row).toHaveCount(1);
    const header = row.locator('.change-header');
    await expect(header).toHaveText(`${change.severity}: ${change.label}`);
    await expect(header.getByText(change.label, { exact: true })).toBeVisible();
    await expect(header.locator('.badge')).toHaveText(change.severity);
    await expect(row.locator('.mono')).toHaveText(change.transition);
    await expect(row.locator('p').last()).toContainText(change.explanation);
  }
});
