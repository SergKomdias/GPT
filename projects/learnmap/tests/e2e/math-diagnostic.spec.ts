import { test, expect } from '@playwright/test';
import { mathQuestion } from '../../server/math-content';

test('Ukrainian grade-10 diagnostic increases cognitive difficulty and renders at mobile width', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Демо учня', exact: true }).click();
  await expect(page).toHaveURL(/today/);
  const start = page.waitForResponse(
    (r) => r.url().endsWith('/api/diagnostic') && r.request().method() === 'POST',
  );
  await page.goto('/diagnostic/math');
  let question = (await (await start).json()).question;
  for (const level of [2, 3, 4]) {
    expect(question.difficulty).toBe(level);
    await expect(page.getByText(`Рівень складності ${level}/5`, { exact: false })).toBeVisible();
    const authored = Array.from({ length: 8 }, (_, i) => mathQuestion(question.skill_id, i)!).find(
      (q) => q.id === question.id,
    )!;
    await page.getByLabel(authored.options[authored.answer], { exact: false }).check();
    const next = page.waitForResponse(
      (r) => r.url().includes('/diagnostic/') && r.url().endsWith('/answer'),
    );
    await page.getByRole('button', { name: 'Далі', exact: true }).click();
    const data = await (await next).json();
    expect(data.correct).toBe(true);
    question = data.question;
  }
  expect(question.difficulty).toBe(5);
  await expect(page.getByText('Міркування / поглиблений рівень', { exact: false })).toBeVisible();
  await page.screenshot({ path: 'test-results/math-level-5-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/math-level-5-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});
