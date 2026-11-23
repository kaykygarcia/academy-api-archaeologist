import { test, expect, loadExample, saveBaseline } from './helpers';

test('app tabs use arrows, Home and End with mounted hidden panels and no URL changes', async ({
  page,
}) => {
  await page.goto('/');
  const url = page.url();
  const tabs = page.getByRole('tablist', { name: 'Navegação principal' });
  const contract = tabs.getByRole('tab', { name: 'Contrato', exact: true });
  const compare = tabs.getByRole('tab', { name: 'Comparar', exact: true });
  const snapshots = tabs.getByRole('tab', {
    name: 'Snapshots (0)',
    exact: true,
  });
  await contract.focus();
  await page.keyboard.press('ArrowRight');
  await expect(compare).toBeFocused();
  await expect(compare).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#app-panel-0')).toHaveAttribute('hidden', '');
  await expect(page.getByLabel('Amostra JSON', { exact: true })).toBeAttached();
  await page.keyboard.press('End');
  await expect(snapshots).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(contract).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(snapshots).toBeFocused();
  await page.keyboard.press('Home');
  await expect(contract).toBeFocused();
  await expect(contract).toHaveAttribute('tabindex', '0');
  await expect(compare).toHaveAttribute('tabindex', '-1');
  await compare.click();
  await expect(
    page.getByText(
      'Salve um snapshot na aba Contrato para usá-lo como baseline.',
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Ir para Contrato', exact: true })
    .click();
  await expect(contract).toBeFocused();
  expect(page.url()).toBe(url);
});

test('switching tabs preserves the draft, field selection, code and comparison', async ({
  page,
}) => {
  await loadExample(page);
  const editor = page.getByLabel('Amostra JSON', { exact: true });
  await editor.fill('{"draft":true}');
  await page.getByRole('button', { name: /^coupon\?/ }).click();
  await saveBaseline(page);
  await page.getByRole('tab', { name: 'Comparar', exact: true }).click();
  await page.getByRole('button', { name: 'Comparar', exact: true }).click();
  const summary = page.getByLabel('Resumo da comparação', { exact: true });
  await expect(summary).toHaveText('0 alterações');
  await expect(summary).toBeFocused();
  await page.getByRole('tab', { name: 'Contrato', exact: true }).click();
  await expect(editor).toHaveText('{"draft":true}');
  await expect(
    page.getByRole('complementary', { name: 'Evidências do campo' }),
  ).toContainText('Observado em 2/3 objetos pai');
  await page.getByRole('tab', { name: 'Código', exact: true }).click();
  await page.getByRole('tab', { name: 'Zod', exact: true }).click();
  await page.getByRole('tab', { name: 'Snapshots (1)', exact: true }).click();
  await page.getByRole('tab', { name: 'Contrato', exact: true }).click();
  await expect(
    page.getByRole('tab', { name: 'Zod', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('Código gerado', { exact: true })).toContainText(
    'z.',
  );
  await page.getByRole('tab', { name: 'Comparar', exact: true }).click();
  await expect(summary).toHaveText('0 alterações');
});

test('one-click example saves a baseline and selects both comparison sides', async ({
  page,
}) => {
  await loadExample(page);
  await page
    .getByRole('button', {
      name: 'Salvar e carregar novas observações',
      exact: true,
    })
    .click();
  const compare = page.getByRole('button', { name: 'Comparar', exact: true });
  await expect(compare).toBeFocused();
  await expect(
    page.getByRole('tab', { name: 'Comparar', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    page
      .getByRole('combobox', { name: 'Baseline', exact: true })
      .locator('option:checked'),
  ).toHaveText('Baseline de pedidos');
  await expect(
    page.getByRole('combobox', { name: 'Novas observações', exact: true }),
  ).toHaveValue('current');
  await compare.click();
  await expect(
    page
      .getByRole('list', { name: /Alterações de drift:/ })
      .getByRole('listitem'),
  ).toHaveCount(5);
  await expect(
    page.getByLabel('Resumo da comparação', { exact: true }),
  ).toBeFocused();
});

test('snapshot actions preserve focus and Comparar chooses its baseline', async ({
  page,
}) => {
  await loadExample(page);
  await saveBaseline(page);
  await page.getByRole('tab', { name: 'Snapshots (1)', exact: true }).click();
  const row = page
    .getByRole('list', { name: /^Snapshots salvos \(\d+\)$/ })
    .getByRole('listitem');
  await row.getByRole('button', { name: 'Renomear', exact: true }).click();
  await expect(page.getByLabel('Novo nome', { exact: true })).toBeFocused();
  await page
    .getByLabel('Novo nome', { exact: true })
    .fill('Baseline renomeado');
  await page.getByRole('button', { name: 'Salvar nome', exact: true }).click();
  await expect(
    row.getByRole('button', { name: 'Renomear', exact: true }),
  ).toBeFocused();
  await row.getByRole('button', { name: 'Comparar', exact: true }).click();
  await expect(
    page.getByRole('tab', { name: 'Comparar', exact: true }),
  ).toBeFocused();
  await expect(
    page
      .getByRole('combobox', { name: 'Baseline', exact: true })
      .locator('option:checked'),
  ).toHaveText('Baseline renomeado');
  await page.getByRole('tab', { name: 'Snapshots (1)', exact: true }).click();
  await row.getByRole('button', { name: 'Excluir', exact: true }).click();
  await row.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(
    row.getByRole('button', { name: 'Excluir', exact: true }),
  ).toBeFocused();
  await row.getByRole('button', { name: 'Excluir', exact: true }).click();
  await row.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Snapshots salvos (0)', exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole('tab', { name: 'Snapshots (0)', exact: true }),
  ).toBeVisible();
});

test('save cancellation returns focus and comparison defaults to the latest snapshot', async ({
  page,
}) => {
  await loadExample(page);
  await saveBaseline(page);
  const save = page.getByRole('button', {
    name: 'Salvar snapshot',
    exact: true,
  });
  await save.click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(save).toBeFocused();
  await save.click();
  await page
    .getByLabel('Nome do snapshot', { exact: true })
    .fill('Baseline mais recente');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(save).toBeFocused();
  await page.getByRole('tab', { name: 'Comparar', exact: true }).click();
  const baseline = page.getByRole('combobox', {
    name: 'Baseline',
    exact: true,
  });
  await expect(
    page
      .getByRole('combobox', { name: 'Novas observações', exact: true })
      .locator('option:checked'),
  ).toHaveText('Análise atual');
  await expect(baseline.locator('option:checked')).toHaveText(
    'Baseline mais recente',
  );
  await expect(
    page.getByRole('combobox', { name: 'Novas observações', exact: true }),
  ).toHaveValue('current');
  await baseline.selectOption('');
  const compare = page.getByRole('button', { name: 'Comparar', exact: true });
  await expect(compare).toBeDisabled();
  await expect(compare).toHaveAccessibleDescription(
    'Escolha um baseline e novas observações para comparar.',
  );
});

test('structure and code tabs support keyboard navigation', async ({
  page,
}) => {
  await loadExample(page);
  const tabs = page.getByRole('tablist', { name: 'Visualização do contrato' });
  const structure = tabs.getByRole('tab', { name: 'Estrutura', exact: true });
  const code = tabs.getByRole('tab', { name: 'Código', exact: true });
  await structure.focus();
  await page.keyboard.press('ArrowRight');
  await expect(code).toBeFocused();
  await expect(code).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('Código gerado', { exact: true })).toBeVisible();
  await expect(page.locator('#contract-panel-0')).toBeHidden();
  await page.keyboard.press('ArrowLeft');
  await expect(structure).toBeFocused();
  await expect(structure).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#contract-panel-1')).toBeHidden();
  await expect(page.getByRole('button', { name: /^coupon\?/ })).toBeVisible();
  await page.keyboard.press('End');
  await expect(code).toBeFocused();
  await page.keyboard.press('Home');
  await expect(structure).toBeFocused();
});
