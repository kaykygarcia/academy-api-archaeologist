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
    .getByRole('button', { name: 'Carregar novas observações', exact: true })
    .click();
  await expectSamples(page, 2);
  await page.getByRole('tab', { name: 'Comparar', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Baseline', exact: true })
    .selectOption({ label: 'Orders baseline' });
  await page
    .getByRole('combobox', { name: 'Novas observações', exact: true })
    .selectOption('current');
  await page.getByRole('button', { name: 'Comparar', exact: true }).click();
  await expect(
    page.getByLabel('Resumo da comparação', { exact: true }),
  ).toHaveText(
    '5 alterações · 2 potencialmente incompatíveis · 1 revisar · 2 informativas',
  );
  const changes = page
    .getByRole('list', { name: /Alterações de drift:/ })
    .getByRole('listitem');
  await expect(changes).toHaveCount(5);
  const expected = [
    {
      path: '$.coupon',
      label: 'Tipo restringido',
      severity: 'Revisar',
      transition: 'string | null → null',
      explanation: /mais restrita/i,
    },
    {
      path: '$.currency',
      label: 'Adicionado',
      severity: 'Informativo',
      transition: 'Não observado → string',
      explanation: /Nova propriedade/i,
    },
    {
      path: '$.customer.fullName',
      label: 'Adicionado',
      severity: 'Informativo',
      transition: 'Não observado → string',
      explanation: /Nova propriedade/i,
    },
    {
      path: '$.customer.name',
      label: 'Não observado',
      severity: 'Potencialmente incompatível',
      transition: 'string → Não observado',
      explanation: /não observada/i,
    },
    {
      path: '$.id',
      label: 'Tipo ampliado',
      severity: 'Potencialmente incompatível',
      transition: 'number → string | number',
      explanation: /Novos tipos não nulos: string/i,
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
