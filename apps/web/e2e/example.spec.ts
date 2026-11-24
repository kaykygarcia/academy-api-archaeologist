import { test, expect, loadExample, openStructure } from './helpers';

test('example shows TypeScript first and keeps optional and nullable evidence', async ({
  page,
}) => {
  await loadExample(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'API Archaeologist',
  );
  await expect(
    page.getByRole('tab', { name: 'TypeScript', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByLabel('Código TypeScript', { exact: true }),
  ).toContainText('coupon?: string | null;');
  await expect(
    page.getByRole('button', { name: 'order-101.json', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await openStructure(page);
  const coupon = page.getByRole('button', { name: /^coupon\?/ });
  await expect(coupon).toContainText('opcional');
  await expect(coupon).toContainText('nullable');
  await coupon.click();
  await expect(
    page.getByRole('complementary', { name: 'Evidências do campo' }),
  ).toContainText('Observado em 2/3 objetos pai');
});
