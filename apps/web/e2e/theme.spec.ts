import { test, expect } from './helpers';

test('dark is the default and the light choice survives a reload', async ({
  page,
}) => {
  await page.goto('/');
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await page
    .getByRole('button', { name: 'Ativar modo claro', exact: true })
    .click();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    '#f4f0ea',
  );
  await page.reload();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(
    page.getByRole('button', { name: 'Ativar modo escuro', exact: true }),
  ).toBeVisible();
});

test('reduced motion switches the theme without a transition', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Ativar modo claro', exact: true })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const background = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  expect(background).toBe('rgb(244, 240, 234)');
  await page
    .getByRole('button', { name: 'Ativar modo escuro', exact: true })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
