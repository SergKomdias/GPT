import { test, expect } from '@playwright/test';

test('Ukrainian first visit, public description and saved language choice', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'uk');
  await expect(page.getByRole('heading', { name: 'Вітаємо в LearnMap.' })).toBeVisible();
  await page.getByRole('link', { name: 'Про LearnMap', exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('heading', { name: 'Для учнів', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Як читати оцінки' }).click();
  await expect(page.locator('#knowledge-estimates')).toContainText('18% — це не рівень знань');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about');
  await expect(page.getByRole('heading', { name: 'Про LearnMap', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/about-mobile.png', fullPage: true });
  await page.getByRole('link', { name: 'Увійти / створити акаунт' }).click();
  await page.getByLabel('Interface language').selectOption('en');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Welcome to LearnMap.' })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const role of ['учня', 'батьків']) {
  test(`description is accessible in the ${role} account`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: `Демо ${role}`, exact: true }).click();
    await expect(page).toHaveURL(role === 'учня' ? /\/today$/ : /\/parent$/);
    await page.getByRole('link', { name: 'Про LearnMap', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Для батьків', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Як почати сім’ї' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Про LearnMap', exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/about-${role}.png`, fullPage: false });
  });
}
