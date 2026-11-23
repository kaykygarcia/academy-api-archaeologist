import { test, expect, expectSamples } from './helpers';

test('mobile can reach and activate Analyze and Copy without horizontal scrolling', async ({
  page,
  context,
  baseURL,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: baseURL,
  });
  await page.goto('/');
  await page.getByLabel('JSON sample', { exact: true }).fill('{"id":1}');
  await page.getByRole('button', { name: 'Add sample', exact: true }).tap();
  const analyze = page.getByRole('button', {
    name: 'Analyze samples',
    exact: true,
  });
  await analyze.scrollIntoViewIfNeeded();
  await expect(analyze).toBeInViewport();
  await analyze.tap();
  await expectSamples(page, 1);
  const copy = page.getByRole('button', { name: 'Copy', exact: true });
  await copy.scrollIntoViewIfNeeded();
  await expect(copy).toBeInViewport();
  await copy.tap();
  await expect(
    page.getByRole('button', { name: 'Copied', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    'id: number;',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
