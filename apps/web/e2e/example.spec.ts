import { test, expect, loadExample } from './helpers';

test('example exposes optional and nullable evidence from three responses', async ({
  page,
}) => {
  await loadExample(page);
  const coupon = page.getByRole('button', { name: /^coupon\?/ });
  await expect(coupon).toContainText('optional');
  await expect(coupon).toContainText('nullable');
  await coupon.click();
  await expect(
    page.getByRole('complementary', { name: 'Field evidence' }),
  ).toContainText('Observed in 2/3 parent objects');
});
