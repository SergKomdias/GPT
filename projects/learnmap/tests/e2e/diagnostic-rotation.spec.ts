import { test, expect } from '@playwright/test';
test('displayed option preserves server answer index and a repeat diagnostic picks a fresh question', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Student demo', exact: true }).click();
  await expect(page).toHaveURL(/today/);
  const start = page.waitForResponse(
    (r) => r.url().endsWith('/api/diagnostic') && r.request().method() === 'POST',
  );
  await page.goto('/diagnostic/math');
  const first = await (await start).json();
  const label = page.locator('.answer-options label').first();
  const shown = await label.locator('span').last().innerText();
  await label.click();
  const answer = page.waitForRequest(
    (r) => r.url().endsWith('/answer') && r.url().includes('/diagnostic/'),
  );
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/answer') && r.url().includes('/diagnostic/'),
  );
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  expect((await answer).postDataJSON().answer).toBe(first.question.options.indexOf(shown));
  await response;
  const second = await page.request.post('/api/diagnostic', { data: { subject: 'math' } });
  expect(second.ok()).toBe(true);
  expect((await second.json()).question.id).not.toBe(first.question.id);
  await page.goto('/progress');
  await expect(page.getByText('Evidence strength', { exact: false }).first()).toBeVisible();
});
