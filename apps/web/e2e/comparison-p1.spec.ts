import { inferContract } from '@api-archaeologist/core';
import type { Download, Page } from '@playwright/test';
import {
  test,
  expect,
  loadExample,
  saveBaseline,
  expectSamples,
} from './helpers';

async function contents(download: Download): Promise<string> {
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Missing download stream');
  stream.setEncoding('utf8');
  let text = '';
  for await (const chunk of stream) {
    if (typeof chunk !== 'string') throw new Error('Unexpected download chunk');
    text += chunk;
  }
  return text;
}

function record(name: string, id: string) {
  return {
    id,
    name,
    createdAt: '2026-11-23T12:00:00.000Z',
    schemaVersion: 1,
    engineVersion: '0.1.0',
    sampleCount: 1,
    contract: inferContract([
      Object.fromEntries([
        ['__proto__', 'safe'],
        ['id', 1],
      ]),
    ]),
  };
}
function file(snapshots: unknown[]) {
  return JSON.stringify({
    format: 'api-archaeologist-snapshots',
    formatVersion: 1,
    snapshots,
  });
}
async function upload(page: Page, text: string) {
  await page.getByLabel('Importar snapshots', { exact: true }).setInputFiles({
    name: 'snapshots.json',
    mimeType: 'application/json',
    buffer: Buffer.from(text),
  });
}
async function exportAll(page: Page) {
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Exportar todos', exact: true })
    .click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(
    /^api-archaeologist-snapshots-\d{4}-\d{2}-\d{2}\.json$/,
  );
  return contents(download);
}

test('exports all, clears through the UI, restores names and special keys, then compares', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Snapshots (0)', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Exportar todos' }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Exportar todos' }),
  ).toHaveAttribute('aria-describedby', 'snapshot-export-reason');
  await upload(
    page,
    file([record('Primeiro', 'first'), record('Segundo', 'second')]),
  );
  await expect(
    page
      .getByText('2 snapshots importados, 0 ignorados.', { exact: true })
      .last(),
  ).toBeFocused();
  const exported = await exportAll(page);
  const list = page.getByRole('list', { name: /^Snapshots salvos/ });
  for (let index = 0; index < 2; index++) {
    await list
      .getByRole('button', { name: 'Excluir', exact: true })
      .first()
      .click();
    await list.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect(list.getByRole('listitem')).toHaveCount(1 - index);
  }
  await upload(page, exported);
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await expect(list.getByText('Primeiro', { exact: true })).toBeVisible();
  await expect(list.getByText('Segundo', { exact: true })).toBeVisible();
  const restored: unknown = JSON.parse(await exportAll(page));
  const original: unknown = JSON.parse(exported);
  expect(restored).toMatchObject({
    snapshots: expect.arrayContaining([
      expect.objectContaining({
        name: 'Primeiro',
        contract: record('Primeiro', 'first').contract,
      }),
    ]),
  });
  if (
    typeof original !== 'object' ||
    original === null ||
    !('snapshots' in original)
  )
    throw new Error('Invalid export');
  expect(restored).toMatchObject({ snapshots: original.snapshots });
  await page.getByRole('tab', { name: 'Comparar', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Baseline', exact: true })
    .selectOption({ label: 'Primeiro' });
  await page
    .getByRole('combobox', { name: 'Novas observações', exact: true })
    .selectOption({ label: 'Segundo' });
  await page.getByRole('button', { name: 'Comparar', exact: true }).click();
  await expect(
    page.getByLabel('Resumo da comparação', { exact: true }),
  ).toHaveText('0 alterações');
  await page.getByRole('tab', { name: 'Lado a lado', exact: true }).click();
  await expect(
    page.getByRole('rowheader', { name: '$.__proto__', exact: true }),
  ).toBeVisible();
});

test('imports valid records while explaining malformed contracts', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Snapshots (0)', exact: true }).click();
  await upload(
    page,
    file([
      record('Válido', 'valid'),
      { ...record('Inválido', 'invalid'), contract: {} },
    ]),
  );
  await expect(
    page.getByText('1 snapshot importado, 1 ignorado.', { exact: true }).last(),
  ).toBeFocused();
  await expect(
    page.getByRole('list', { name: 'Registros ignorados' }),
  ).toContainText('Registro 2: contrato inválido');
  await expect(
    page.getByRole('list', { name: /^Snapshots salvos/ }).getByRole('listitem'),
  ).toHaveCount(1);
});

for (const [name, text, message] of [
  [
    'non-JSON',
    'not json',
    'Não foi possível importar: o arquivo não contém JSON válido.',
  ],
  [
    'bad format',
    '{}',
    'Formato de arquivo de snapshots inválido ou incompatível.',
  ],
]) {
  test(`rejects ${name} without writing`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Snapshots (0)', exact: true }).click();
    await upload(page, text ?? '');
    await expect(page.getByText(message ?? '', { exact: true })).toBeFocused();
    await expect(
      page.getByRole('tab', { name: 'Snapshots (0)', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('list', { name: /^Snapshots salvos/ }),
    ).toHaveCount(0);
  });
}

test('downloads the five-change Markdown report and expands aligned details with Enter', async ({
  page,
}) => {
  await loadExample(page);
  await saveBaseline(page);
  await page
    .getByRole('button', { name: 'Carregar novas observações', exact: true })
    .click();
  await expectSamples(page, 2);
  await page.getByRole('tab', { name: 'Comparar', exact: true }).click();
  await page.getByRole('button', { name: 'Comparar', exact: true }).click();
  await expect(
    page.getByLabel('Resumo da comparação', { exact: true }),
  ).toContainText('5 alterações');
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Baixar relatório .md', exact: true })
    .click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe(
    'drift-orders-baseline-vs-analise-atual.md',
  );
  const markdown = await contents(download);
  for (const path of [
    '$.coupon',
    '$.currency',
    '$.customer.fullName',
    '$.customer.name',
    '$.id',
  ])
    expect(markdown).toContain(path);
  expect(markdown).toContain(
    'O drift observado indica possível impacto; não comprova compatibilidade. As evidências descrevem apenas as amostras fornecidas.',
  );
  await page.getByRole('tab', { name: 'Lado a lado', exact: true }).click();
  const table = page.getByRole('table', { name: 'Contratos lado a lado' });
  const row = table.getByRole('row').filter({
    has: page.getByRole('button', { name: '$.customer.name', exact: true }),
  });
  await expect(row.getByRole('cell')).toHaveText(['string', 'Não observado']);
  await page.getByLabel('Somente alterações', { exact: true }).check();
  await expect(table.locator('tbody > tr:visible')).toHaveCount(5);
  const trigger = row.getByRole('button', {
    name: '$.customer.name',
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const detailId = await trigger.getAttribute('aria-controls');
  expect(detailId).toBeTruthy();
  await expect(
    table.locator('tr[id]').filter({ visible: true }),
  ).toHaveAttribute('id', detailId ?? '');
  await expect(row.getByRole('rowheader')).toHaveAttribute(
    'title',
    '$.customer.name',
  );
  await expect(
    table.getByText(/Propriedade não observada nas novas amostras;/),
  ).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(table.locator('tbody > tr:visible')).toHaveCount(5);
});

test('import button owns keyboard access and storage failures focus the result', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Snapshots (0)', exact: true }).click();
  await expect(
    page.getByLabel('Importar snapshots', { exact: true }),
  ).toHaveAttribute('tabindex', '-1');
  const chooser = page.waitForEvent('filechooser');
  await page
    .getByRole('button', { name: 'Importar .json', exact: true })
    .click();
  const selected = await chooser;
  await page.evaluate(() => {
    IDBObjectStore.prototype.add = function () {
      throw new DOMException('Storage full', 'QuotaExceededError');
    };
  });
  await selected.setFiles({
    name: 'snapshots.json',
    mimeType: 'application/json',
    buffer: Buffer.from(file([record('Válido', 'valid')])),
  });
  await expect(
    page.getByText(
      'Não foi possível importar os snapshots. Consulte o erro de armazenamento abaixo.',
      { exact: true },
    ),
  ).toBeFocused();
  await expect(
    page.getByText(/O armazenamento local está cheio/).last(),
  ).toBeVisible();
  await expect(
    page.getByRole('tab', { name: 'Snapshots (0)', exact: true }),
  ).toBeVisible();
});

test('save and rename show input validation messages instead of storage errors', async ({
  page,
}) => {
  await loadExample(page);
  await page
    .getByRole('button', { name: 'Salvar snapshot', exact: true })
    .click();
  const name = page.getByLabel('Nome do snapshot', { exact: true });
  await expect(name).toHaveAttribute('maxlength', '200');
  await name.evaluate((element) => element.removeAttribute('maxlength'));
  await name.fill('x'.repeat(201));
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  const message = 'O nome do snapshot deve ter até 200 caracteres.';
  await expect(
    page.getByRole('list', { name: 'Resumo de erros' }),
  ).toContainText(message);
  await expect(
    page.getByText(/O armazenamento local de snapshots está indisponível/),
  ).toHaveCount(0);
  await name.fill('Baseline');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await page.getByRole('tab', { name: 'Snapshots (1)', exact: true }).click();
  await page.getByRole('button', { name: 'Renomear', exact: true }).click();
  const renamed = page.getByLabel('Novo nome', { exact: true });
  await renamed.evaluate((element) => element.removeAttribute('maxlength'));
  await renamed.fill('y'.repeat(201));
  await page.getByRole('button', { name: 'Salvar nome', exact: true }).click();
  await expect(page.locator('.error-box')).toContainText(message);
  await expect(
    page.getByText(/O armazenamento local de snapshots está indisponível/),
  ).toHaveCount(0);
});
