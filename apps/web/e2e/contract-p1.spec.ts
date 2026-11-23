import type { Page } from '@playwright/test';
import { test, expect, expectSamples, loadExample } from './helpers';

async function dropFile(
  page: Page,
  name: string,
  text: string,
  type = name.endsWith('.json') ? 'application/json' : 'text/plain',
) {
  const dataTransfer = await page.evaluateHandle(
    ({ name, text, type }) => {
      const transfer = new DataTransfer();
      transfer.items.add(
        new File([text], name, {
          type,
        }),
      );
      return transfer;
    },
    { name, text, type },
  );
  const samples = page.getByRole('region', { name: /^Amostras/ });
  await samples.dispatchEvent('dragenter', { dataTransfer });
  await expect(
    samples.getByText('Solte os arquivos JSON para adicionar'),
  ).toBeVisible();
  await samples.dispatchEvent('dragover', { dataTransfer });
  const prevented = await samples.evaluate((element, transfer) => {
    const event = new DragEvent('drop', {
      dataTransfer: transfer,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  }, dataTransfer);
  expect(prevented).toBe(true);
  await expect(
    samples.getByText('Solte os arquivos JSON para adicionar'),
  ).toHaveCount(0);
  await dataTransfer.dispose();
}

test('drops files through the upload path and ignores text drags', async ({
  page,
}) => {
  await page.goto('/');
  const samples = page.getByRole('region', { name: /^Amostras/ });
  const textTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.setData('text/plain', 'selected text');
    return transfer;
  });
  for (const event of ['dragenter', 'dragover', 'drop']) {
    await samples.dispatchEvent(event, { dataTransfer: textTransfer });
  }
  await expect(
    samples.getByText('Solte os arquivos JSON para adicionar'),
  ).toHaveCount(0);
  await textTransfer.dispose();
  await dropFile(page, 'dropped.json', '{"id":1}');
  await expect(
    page.getByRole('button', { name: 'Remover dropped.json' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Analisar amostras', exact: true })
    .click();
  await expectSamples(page, 1);
});

test('invalid dropped JSON reports the same validation error as upload', async ({
  page,
}) => {
  await page.goto('/');
  await dropFile(page, 'invalid.json', '{');
  await page
    .getByRole('button', { name: 'Analisar amostras', exact: true })
    .click();
  const errors = page.getByRole('list', { name: 'Resumo de erros' });
  await expect(errors).toBeVisible();
  const droppedError = await errors.innerText();
  await page.getByRole('button', { name: 'Remover invalid.json' }).click();
  await page.getByRole('tab', { name: 'Enviar arquivos' }).click();
  await page.getByLabel('Escolher arquivos JSON').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{'),
  });
  await expect(
    page.getByRole('button', { name: 'Remover invalid.json' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Analisar amostras', exact: true })
    .click();
  await expect(errors).toHaveText(droppedError);
});

test('editor shortcuts add, then add and analyze the complete sample set', async ({
  page,
}) => {
  await page.goto('/');
  const editor = page.getByLabel('Amostra JSON', { exact: true });
  await editor.fill('{"a":1}');
  await editor.press('ControlOrMeta+Enter');
  await expect(editor).toHaveText('');
  await expect(editor.locator('.cm-line')).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Remover amostra-1.json' }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('listitem')
      .filter({
        has: page.getByRole('button', { name: 'Remover amostra-1.json' }),
      })
      .getByText('7 bytes', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel('Resumo do contrato', { exact: true }),
  ).toHaveCount(0);
  await editor.fill('{"second":2}');
  await editor.press('ControlOrMeta+Shift+Enter');
  await expectSamples(page, 2);
  await expect(page.getByRole('button', { name: /^a\?/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^second\?/ })).toBeVisible();
});

test('searches names and array paths, clears with Escape and restores expansion', async ({
  page,
}) => {
  await loadExample(page);
  await page
    .getByRole('button', { name: 'Recolher $.customer', exact: true })
    .click();
  const search = page.getByRole('searchbox', { name: 'Buscar campo' });
  const tree = page.getByRole('list', {
    name: 'Campos do contrato',
    exact: true,
  });
  await search.fill('NAME');
  await expect(
    page.getByText('1 campo encontrado', { exact: true }),
  ).toBeVisible();
  await expect(tree.locator('.search-match')).toHaveCount(1);
  await tree.getByRole('button', { name: /^name/ }).click();
  const evidence = page.getByRole('complementary', {
    name: 'Evidências do campo',
  });
  await expect(evidence.getByRole('heading')).toHaveText('$.customer.name');
  await expect(evidence).toContainText('Observado em 3/3 objetos pai');
  await search.fill('$.items[*].sku');
  await expect(tree.getByRole('button', { name: /^sku/ })).toBeVisible();
  await expect(tree.getByRole('button', { name: /^name/ })).toHaveCount(0);
  await search.fill('absent');
  await expect(page.getByText('Nenhum campo encontrado')).toBeVisible();
  await expect(tree.locator('.tree-row')).toHaveCount(0);
  await search.press('Escape');
  await expect(search).toHaveValue('');
  await expect(
    page.getByRole('button', { name: 'Expandir $.customer', exact: true }),
  ).toBeVisible();
  await expect(tree.getByRole('button', { name: /^name/ })).toHaveCount(0);
});

test('renders wide objects in batches of 200, including search results', async ({
  page,
}) => {
  await page.goto('/');
  const value = Object.fromEntries(
    Array.from({ length: 450 }, (_, index) => [
      `field${String(index).padStart(3, '0')}`,
      index,
    ]),
  );
  const editor = page.getByLabel('Amostra JSON', { exact: true });
  await editor.fill(JSON.stringify(value));
  await editor.press('ControlOrMeta+Shift+Enter');
  await expectSamples(page, 1);
  const rows = page
    .getByRole('list', { name: 'Campos do contrato', exact: true })
    .locator('.tree-row');
  await expect(rows).toHaveCount(201);
  await page
    .getByRole('button', { name: 'Mostrar mais 200 (de 250 restantes)' })
    .click();
  await expect(rows).toHaveCount(401);
  await page
    .getByRole('button', { name: 'Mostrar mais 50 (de 50 restantes)' })
    .click();
  await expect(rows).toHaveCount(451);
  await expect(page.getByRole('button', { name: /^field400/ })).toBeFocused();
  await expect(page.getByRole('button', { name: /^Mostrar mais/ })).toHaveCount(
    0,
  );
  await page.getByRole('searchbox', { name: 'Buscar campo' }).fill('field');
  await expect(page.getByText('450 campos encontrados')).toBeVisible();
  await expect(rows).toHaveCount(201);
  await page
    .getByRole('button', { name: 'Mostrar mais 200 (de 250 restantes)' })
    .click();
  await expect(rows).toHaveCount(401);
  const search = page.getByRole('searchbox', { name: 'Buscar campo' });
  await search.fill('field0');
  await expect(rows).toHaveCount(101);
  await search.fill('field');
  await expect(rows).toHaveCount(201);
  await search.press('Escape');
  await expect(rows).toHaveCount(201);
});

test('rejects a non-JSON text file with the same message as upload', async ({
  page,
}) => {
  await page.goto('/');
  await dropFile(page, 'notes.txt', 'plain text');
  const status = page.getByRole('status');
  await expect(status).toHaveText(
    'Selecione apenas arquivos .json. Nenhuma amostra foi adicionada.',
  );
  const message = await status.innerText();
  await expect(
    page.getByRole('button', { name: 'Remover notes.txt' }),
  ).toHaveCount(0);
  await page.getByRole('tab', { name: 'Enviar arquivos' }).click();
  await page.getByLabel('Escolher arquivos JSON').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('plain text'),
  });
  await expect(status).toHaveText(message);
  await expect(
    page.getByRole('button', { name: 'Remover notes.txt' }),
  ).toHaveCount(0);
});

test('accepts an extensionless application/json file', async ({ page }) => {
  await page.goto('/');
  await dropFile(page, 'response', '{"id":1}', 'application/json');
  await expect(
    page.getByRole('button', { name: 'Remover response', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Analisar amostras', exact: true })
    .click();
  await expectSamples(page, 1);
});

async function failNextSnapshotRefresh(page: Page) {
  await page.evaluate(() => {
    const state = Object.assign(window, {
      snapshotRefreshFailureInjected: false,
    });
    const prototype = IDBIndex.prototype;
    const originals: Record<string, unknown> = {
      getAll: prototype.getAll,
      openCursor: prototype.openCursor,
    };
    if ('getAllRecords' in prototype)
      originals.getAllRecords = prototype.getAllRecords;
    for (const [name, original] of Object.entries(originals)) {
      if (typeof original !== 'function') continue;
      Object.defineProperty(prototype, name, {
        value: function (this: IDBIndex, ...args: unknown[]) {
          if (this.objectStore.name === 'snapshots') {
            for (const [method, implementation] of Object.entries(originals)) {
              Object.defineProperty(prototype, method, {
                value: implementation,
              });
            }
            state.snapshotRefreshFailureInjected = true;
            throw new DOMException('Synthetic read failure', 'UnknownError');
          }
          return Reflect.apply(original, this, args);
        },
      });
    }
  });
}

test('closes a saved form after refresh failure and preserves error focus', async ({
  page,
}) => {
  await loadExample(page);
  await page
    .getByRole('button', { name: 'Salvar snapshot', exact: true })
    .click();
  await page.getByLabel('Nome do snapshot', { exact: true }).fill('Saved once');
  await failNextSnapshotRefresh(page);
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  const errors = page.getByRole('list', { name: 'Resumo de erros' });
  await expect(errors).toContainText(
    'Não foi possível atualizar a lista de snapshots.',
  );
  await expect(errors).toBeFocused();
  expect(
    await page.evaluate(
      () =>
        'snapshotRefreshFailureInjected' in window &&
        window.snapshotRefreshFailureInjected === true,
    ),
  ).toBe(true);
  await expect(
    page.getByLabel('Nome do snapshot', { exact: true }),
  ).toHaveCount(0);
  await errors.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(
    page.getByRole('tab', { name: 'Snapshots (1)', exact: true }),
  ).toBeVisible();
});

test('continues the example after a saved baseline fails to refresh without stealing error focus', async ({
  page,
}) => {
  await loadExample(page);
  await failNextSnapshotRefresh(page);
  await page
    .getByRole('button', { name: 'Salvar e carregar novas observações' })
    .click();
  await expect(
    page.getByRole('tab', { name: 'Comparar', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  const errors = page.getByRole('list', { name: 'Resumo de erros' });
  await expect(errors).toBeFocused();
  expect(
    await page.evaluate(
      () =>
        'snapshotRefreshFailureInjected' in window &&
        window.snapshotRefreshFailureInjected === true,
    ),
  ).toBe(true);
  await errors.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(
    page
      .getByRole('combobox', { name: 'Baseline', exact: true })
      .locator('option:checked'),
  ).toHaveText('Baseline de pedidos');
  await expect(
    page.getByRole('combobox', { name: 'Novas observações', exact: true }),
  ).toHaveValue('current');
  await page.getByRole('button', { name: 'Comparar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(
    '5 alterações observadas',
  );
});
