import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
async function onboard(page: Page, subjects: string[]) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByLabel('Name or nickname').fill('Subject QA');
  await page.getByLabel('Email', { exact: true }).fill(randomUUID() + '@example.test');
  await page.getByLabel('Password', { exact: true }).fill(randomUUID());
  await page.getByRole('button', { name: 'Create account', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Let’s make this your map.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose a subject' })).toBeDisabled();
  for (const subject of subjects)
    await page.getByRole('checkbox', { name: subject, exact: true }).check();
  await page.getByLabel('Timezone', { exact: true }).fill('Europe/Kyiv');
  await page.getByRole('button', { name: 'Choose a subject' }).click();
  await expect(page.locator('.subject-section')).toHaveCount(subjects.length);
}
test('English-only onboarding, map, add, pause, resume and mobile coverage', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await onboard(page, ['English']);
  await page.screenshot({ path: 'docs/screenshots/v2-english-subjects.png' });
  await page.goto('/today');
  await expect(page.locator('.subject-summary>a')).toHaveCount(1);
  await expect(page.locator('.learning-row')).toHaveCount(1);
  await expect(page.locator('.subject-summary')).toContainText('English');
  await expect(page.locator('.subject-summary')).not.toContainText('Physics');
  await expect(page.locator('.coverage')).toContainText('0/26');
  await page.screenshot({ path: 'docs/screenshots/v2-english-today.png' });
  await page.goto('/map');
  await expect(page.locator('.subject-tabs button')).toHaveCount(1);
  await expect(page.locator('.strand-tabs button')).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Present Perfect', exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/v2-english-map.png' });
  await page.goto('/subjects');
  const physics = page
    .locator('.subject-manager>div')
    .filter({ has: page.getByText('Physics', { exact: true }) });
  await physics.getByRole('button', { name: 'Add subject' }).click();
  await expect(page.locator('.subject-section')).toHaveCount(2);
  await physics.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('.subject-section')).toHaveCount(1);
  await expect(physics).toContainText('Paused');
  await physics.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.subject-section')).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/screenshots/v2-subjects-mobile.png' });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test('Mathematics + Physics show only selected subjects and honest parent summaries', async ({
  page,
  browser,
}) => {
  await onboard(page, ['Mathematics', 'Physics']);
  await page.goto('/today');
  await expect(page.locator('.subject-summary>a')).toHaveCount(2);
  await expect(page.locator('.subject-summary')).not.toContainText('English');
  await page.screenshot({ path: 'docs/screenshots/v2-math-physics.png' });
  await page.goto('/family');
  await page.getByRole('button', { name: 'Generate invitation' }).click();
  const code = await page.locator('.invite-code code').innerText();
  const context = await browser.newContext({ baseURL: new URL(page.url()).origin }),
    parent = await context.newPage();
  await parent.goto('/');
  await parent.getByRole('button', { name: 'Create account', exact: true }).click();
  await parent.getByLabel('Name or nickname').fill('Parent subject QA');
  await parent.getByLabel('I am a').selectOption('parent');
  await parent.getByLabel('Email', { exact: true }).fill(randomUUID() + '@example.test');
  await parent.getByLabel('Password', { exact: true }).fill(randomUUID());
  await parent.getByRole('button', { name: 'Create account', exact: true }).last().click();
  await parent.getByText('Link a child with an invitation', { exact: true }).click();
  await parent.getByLabel('Invitation code').fill(code);
  await parent.getByRole('button', { name: 'Link child', exact: true }).click();
  await expect(parent.locator('.analytics-subject')).toHaveCount(2);
  await expect(parent.locator('.subject-manager')).toContainText('Not selected');
  expect((await parent.locator('.analytics-subject').allTextContents()).join(' ')).not.toContain(
    'English',
  );
  await parent.screenshot({ path: 'docs/screenshots/v2-parent.png' });
  await context.close();
});
