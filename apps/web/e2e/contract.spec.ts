import type { Page } from '@playwright/test';
import {
  test,
  expect,
  expectSamples,
  loadExample,
  analyzeButton,
  openStructure,
} from './helpers';

async function dropFile(
  page: Page,
  name: string,
  text: string,
  type = name.endsWith('.json') ? 'application/json' : 'text/plain',
) {
  const dataTransfer = await page.evaluateHandle(
    ({ name, text, type }) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([text], name, { type }));
      return transfer;
    },
    { name, text, type },
  );
  const samples = page.getByRole('region', { name: 'Amostras', exact: true });
  await samples.dispatchEvent('dragenter', { dataTransfer });
  await expect(samples.getByText('Solte para adicionar')).toBeVisible();
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
  await expect(samples.getByText('Solte para adicionar')).toHaveCount(0);
  await dataTransfer.dispose();
}

test('drops files through the upload path and ignores text drags', async ({
  page,
}) => {
  await page.goto('/');
  const samples = page.getByRole('region', { name: 'Amostras', exact: true });
  const textTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.setData('text/plain', 'selected text');
    return transfer;
  });
  for (const event of ['dragenter', 'dragover', 'drop']) {
    await samples.dispatchEvent(event, { dataTransfer: textTransfer });
  }
  await expect(samples.getByText('Solte para adicionar')).toHaveCount(0);
  await textTransfer.dispose();
  await dropFile(page, 'dropped.json', '{"id":1}');
  await expect(
    page.getByRole('button', { name: 'Remover dropped.json' }),
  ).toBeVisible();
  await analyzeButton(page).click();
  await expectSamples(page, 1);
});

test('invalid dropped JSON reports the same validation error as upload', async ({
  page,
}) => {
  await page.goto('/');
  await dropFile(page, 'invalid.json', '{');
  await analyzeButton(page).click();
  const errors = page.getByRole('list', { name: 'Resumo de erros' });
  await expect(errors).toBeVisible();
  const droppedError = await errors.innerText();
  await page.getByRole('button', { name: 'Remover invalid.json' }).click();
  await page.getByLabel('Arquivos', { exact: true }).setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{'),
  });
  await expect(
    page.getByRole('button', { name: 'Remover invalid.json' }),
  ).toBeVisible();
  await analyzeButton(page).click();
  await expect(errors).toHaveText(droppedError);
});

test('rejects a non-JSON text file with the same message as upload', async ({
  page,
}) => {
  await page.goto('/');
  await dropFile(page, 'notes.txt', 'plain text');
  const toast = page.locator('.toast.error');
  await expect(toast).toHaveText(
    'Use apenas arquivos .json. Nada foi adicionado.',
  );
  await expect(
    page.getByRole('button', { name: 'Remover notes.txt' }),
  ).toHaveCount(0);
  await page.getByLabel('Arquivos', { exact: true }).setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('plain text'),
  });
  await expect(toast).toHaveText(
    'Use apenas arquivos .json. Nada foi adicionado.',
  );
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
  await analyzeButton(page).click();
  await expectSamples(page, 1);
});

test('searches names and array paths, clears with Escape and restores expansion', async ({
  page,
}) => {
  await loadExample(page);
  await openStructure(page);
  await page
    .getByRole('button', { name: 'Recolher $.customer', exact: true })
    .click();
  const search = page.getByRole('searchbox', { name: 'Buscar campo' });
  const tree = page.getByRole('list', {
    name: 'Campos do contrato',
    exact: true,
  });
  await search.fill('NAME');
  await expect(page.getByText('1 campo', { exact: true })).toBeVisible();
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
  await expect(page.getByText('Nenhum campo', { exact: true })).toBeVisible();
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
  await editor.press('ControlOrMeta+Enter');
  await expectSamples(page, 1);
  await openStructure(page);
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
  const search = page.getByRole('searchbox', { name: 'Buscar campo' });
  await search.fill('field');
  await expect(page.getByText('450 campos', { exact: true })).toBeVisible();
  await expect(rows).toHaveCount(201);
  await page
    .getByRole('button', { name: 'Mostrar mais 200 (de 250 restantes)' })
    .click();
  await expect(rows).toHaveCount(401);
  await search.fill('field0');
  await expect(rows).toHaveCount(101);
  await search.fill('field');
  await expect(rows).toHaveCount(201);
  await search.press('Escape');
  await expect(rows).toHaveCount(201);
});
