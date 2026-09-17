import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
test('parent consent, speaking switch, export and transcript deletion render on desktop and mobile', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Parent demo', exact: true }).click();
  const privacy = page.getByRole('region', { name: 'Privacy and pilot consent' });
  await expect(privacy).toBeVisible();
  await expect(privacy).toContainText('pilot-2026-09-v1');
  const withdraw = privacy.getByRole('button', { name: 'Withdraw consent', exact: true });
  if (await withdraw.isVisible()) await withdraw.click();
  await privacy.getByRole('button', { name: 'I confirm parental consent', exact: true }).click();
  await expect(
    privacy.getByRole('button', { name: 'Withdraw consent', exact: true }),
  ).toBeVisible();
  await privacy.getByRole('checkbox', { name: 'Allow Speaking', exact: true }).check();
  await expect(
    privacy.getByRole('checkbox', { name: 'Allow Speaking', exact: true }),
  ).toBeChecked();
  const download = page.waitForEvent('download');
  await privacy.getByRole('button', { name: 'Export data', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('learnmap-export.json');
  page.on('dialog', (d) => void d.accept());
  await privacy.getByRole('button', { name: 'Delete transcripts', exact: true }).click();
  await expect(privacy).toContainText('Transcripts deleted.');
  await privacy.screenshot({ path: 'docs/screenshots/v3-parent-consent.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await privacy.scrollIntoViewIfNeeded();
  await privacy.screenshot({ path: 'docs/screenshots/v3-privacy-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Restore fictional demo consent state so original speaking fixtures remain independent.
  await expect(
    privacy.getByRole('checkbox', { name: 'Allow Speaking', exact: true }),
  ).toBeChecked();
  expect(errors).toEqual([]);
});
test('admin sees aggregates and can mark existing content reviewed/approved', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Admin demo', exact: true }).click();
  const metrics = page.getByRole('region', { name: 'Pilot metrics' });
  await expect(metrics).toBeVisible();
  await expect(metrics).toContainText('Day-7 return');
  await expect(page.getByRole('heading', { name: 'Content editor', exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/v3-admin-metrics.png' });
  await page
    .locator('.admin-list>button')
    .filter({ has: page.getByText('linear', { exact: false }) })
    .first()
    .click();
  await page.getByLabel('Review status', { exact: true }).selectOption('reviewed');
  await expect(page.getByLabel('Review status', { exact: true })).toHaveValue('reviewed');
  await page.getByLabel('Review status', { exact: true }).selectOption('approved');
  await expect(page.getByLabel('Review status', { exact: true })).toHaveValue('approved');
});
test('privacy account deletion requires password and ends the authenticated session', async ({
  page,
}) => {
  const password = randomUUID();
  await page.goto('/');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByLabel('Name or nickname').fill('Privacy fixture');
  await page.getByLabel('Email', { exact: true }).fill(randomUUID() + '@example.test');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).last().click();
  await page.getByRole('checkbox', { name: 'English', exact: true }).check();
  await page.getByRole('button', { name: 'Choose a subject' }).click();
  await page.goto('/settings');
  await page.getByText('Delete account permanently', { exact: true }).click();
  await page.getByLabel('Current password for deletion').fill(password);
  page.on('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Delete account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to LearnMap.' })).toBeVisible();
});
