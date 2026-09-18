import { randomBytes } from 'node:crypto';
const testPassword = randomBytes(24).toString('hex');
import { test, expect } from '@playwright/test';
test('registration, onboarding, diagnostic, lesson, linked parent, and responsive map', async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const suffix = Date.now();
  await page.goto('/');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByLabel('Name or nickname').fill('QA Fictional Student');
  await page.getByLabel('Email', { exact: true }).fill(`qa-${suffix}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill(testPassword);
  await page.getByRole('button', { name: 'Create account', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Let’s make this your map.' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Mathematics', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Physics', exact: true }).check();
  await page.getByRole('checkbox', { name: 'English', exact: true }).check();
  await page.getByRole('button', { name: 'Choose a subject' }).click();
  await page.getByRole('link', { name: 'Start diagnostic', exact: true }).first().click();
  for (let i = 0; i < 24; i++) {
    if (await page.getByText('Your map is taking shape.', { exact: true }).isVisible()) break;
    await expect(page.locator('.practice-meta')).toContainText(`${i + 1} / 24`);
    await page.getByRole('radio').first().check();
    const response = page.waitForResponse(
      (r) => r.url().includes('/diagnostic/') && r.url().endsWith('/answer'),
    );
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    if ((await (await response).json()).completed) break;
  }
  await expect(page.getByRole('heading', { name: 'Your map is taking shape.' })).toBeVisible();
  await page.getByRole('link', { name: 'Explore my LearnMap' }).click();
  await expect(page.getByRole('heading', { name: 'Your knowledge, connected.' })).toBeVisible();
  await page.goto('/lesson/quadratic');
  for (let i = 0; i < 9; i++) {
    await expect(page.locator('.practice-meta')).toContainText(`${i + 1} / 9`);
    if (i === 2) {
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      continue;
    }
    if (i === 0) await page.getByRole('button', { name: 'Hint 0/5' }).click();
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'A step forward.' })).toBeVisible();
  await page.goto('/family');
  await page.getByRole('button', { name: 'Generate invitation' }).click();
  const code = await page.locator('.invite-code code').innerText();
  const ctx = await browser.newContext({ baseURL: new URL(page.url()).origin });
  const parent = await ctx.newPage();
  await parent.goto('/');
  await parent.getByLabel('Interface language').selectOption('en');
  await parent.getByRole('button', { name: 'Create account', exact: true }).click();
  await parent.getByLabel('Name or nickname').fill('QA Fictional Parent');
  await parent.getByLabel('I am a').selectOption('parent');
  await parent.getByLabel('Email', { exact: true }).fill(`parent-${suffix}@example.test`);
  await parent.getByLabel('Password', { exact: true }).fill(testPassword);
  await parent.getByRole('button', { name: 'Create account', exact: true }).last().click();
  await parent.getByText('Link a child with an invitation', { exact: true }).click();
  await parent.getByLabel('Invitation code').fill(code);
  await parent.getByRole('button', { name: 'Link child', exact: true }).click();
  await expect(parent.getByLabel('Select child')).toContainText('QA Fictional Student');
  await expect(
    parent.getByText('A little learning happened today.', { exact: true }),
  ).toBeVisible();
  await parent.getByRole('link', { name: 'Weekly report', exact: true }).first().click();
  await expect(
    parent.getByRole('heading', { name: 'A week of growing confidence.' }),
  ).toBeVisible();
  await ctx.close();
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/map');
    await expect(page.getByRole('heading', { name: 'Your knowledge, connected.' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  expect(errors).toEqual([]);
});
test('synthetic microphone recording, transcription, feedback, finish and listening', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['microphone']);
  await page.goto('/');
  await page.getByRole('button', { name: 'Student demo', exact: true }).click();
  await expect(page).toHaveURL(/\/today$/);
  await page.goto('/speaking');
  await page.getByLabel('Read replies aloud').uncheck();
  await page.getByRole('button', { name: 'Start conversation', exact: true }).click();
  await page.getByRole('button', { name: 'Record', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop recording', exact: true })).toBeVisible();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Stop recording', exact: true }).click();
  await expect(page.getByLabel('Your reply', { exact: true })).toHaveValue(
    'I go to school yesterday.',
  );
  await expect(
    page.getByText('Example transcript — review or replace before sending.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('I went to school yesterday.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Finish conversation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start conversation', exact: true })).toBeVisible();
  await page.goto('/listening');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Stop audio', exact: true }).click();
  await page
    .getByRole('button', { name: 'Show transcript (counts as a hint)', exact: true })
    .click();
  await page.getByRole('radio', { name: /^[A-D] A solar-powered car$/ }).check();
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByText(/Correct! Listening mastery updated/)).toBeVisible();
});
test('permission denied recovers to typed response and Ukrainian mobile remains usable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: () => Promise.reject(new DOMException('Denied in fixture', 'NotAllowedError')),
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Student demo', exact: true }).click();
  await expect(page).toHaveURL(/\/today$/);
  await page.goto('/speaking');
  await page.getByLabel('Read replies aloud').uncheck();
  await page.getByRole('button', { name: 'Start conversation', exact: true }).click();
  await page.getByRole('button', { name: 'Record', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Microphone access denied');
  await page
    .getByLabel('Your reply', { exact: true })
    .fill('Yesterday I studied robotics with my friends.');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.locator('.student-bubble')).toContainText('Yesterday I studied robotics');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('Interface language').selectOption('uk');
  await expect(page.getByRole('heading', { name: 'Знайди свій голос.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('admin can update content and student cannot enter the editor', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Admin demo', exact: true }).click();
  await page.getByRole('button', { name: 'prompts', exact: true }).click();
  await page.locator('.admin-list').getByRole('button').first().click();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('Saved to the database.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'Student demo', exact: true }).click();
  await expect(page).toHaveURL(/\/today$/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/today$/);
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('learnmap-language')) localStorage.setItem('learnmap-language', 'en');
  });
});
