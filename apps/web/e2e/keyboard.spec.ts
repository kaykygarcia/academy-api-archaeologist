import { test, expect, tabTo, expectSamples } from './helpers';

test('keyboard reaches tabs, switches them with arrows and analyzes with Enter', async ({
  page,
}) => {
  await page.goto('/');
  const paste = page.getByRole('tab', { name: 'Paste JSON' });
  await tabTo(page, paste);
  await page.keyboard.press('ArrowRight');
  const upload = page.getByRole('tab', { name: 'Upload files' });
  await expect(upload).toBeFocused();
  await expect(upload).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(paste).toBeFocused();
  await expect(paste).toHaveAttribute('aria-selected', 'true');
  const editor = page.getByLabel('JSON sample', { exact: true });
  await tabTo(page, editor);
  await page.keyboard.insertText('{"id":1}');
  await tabTo(
    page,
    page.getByRole('button', { name: 'Add sample', exact: true }),
  );
  await page.keyboard.press('Enter');
  await tabTo(
    page,
    page.getByRole('button', { name: 'Analyze samples', exact: true }),
  );
  await page.keyboard.press('Enter');
  await expectSamples(page, 1);
  await expect(
    page.getByRole('heading', { name: 'Inferred contract', exact: true }),
  ).toBeFocused();
});
