import { test, expect, loadExample } from './helpers';

test('example exposes optional and nullable evidence from three responses', async ({
  page,
}) => {
  await loadExample(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(
    'Entenda sua API pelas evidências que ela deixa.',
  );
  const coupon = page.getByRole('button', { name: /^coupon\?/ });
  await expect(coupon).toContainText('opcional');
  await expect(coupon).toContainText('nullable');
  await coupon.click();
  await expect(
    page.getByRole('complementary', { name: 'Evidências do campo' }),
  ).toContainText('Observado em 2/3 objetos pai');
});
