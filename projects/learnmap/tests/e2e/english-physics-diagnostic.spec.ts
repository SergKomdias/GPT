import { test, expect } from '@playwright/test';
import { englishTaskById } from '../../server/english-placement-content';
import { englishProfiles, syntheticCorrect } from '../fixtures/diagnostic-profiles';
import { physicsQuestion } from '../../server/physics-content';
import { publicQuestion } from '../../server/learning';
for (const profile of englishProfiles)
  test(`English ${profile}: placement, productive tasks, honest map and mobile`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.getByRole('button', { name: 'Демо учня', exact: true }).click();
    await expect(page).toHaveURL(/today/);
    const start = page.waitForResponse(
      (r) => r.url().endsWith('/api/english-diagnostic') && r.request().method() === 'POST',
    );
    await page.goto('/diagnostic/english');
    let data = await (await start).json();
    for (let i = 0; i < 18; i++) {
      const task = englishTaskById(data.task.id)!;
      const correct = syntheticCorrect(profile, task);
      if (task.kind === 'short')
        await page
          .getByLabel('Відповідь англійською')
          .fill(correct ? task.accepted![0] : 'invalid fixture response');
      else
        await page
          .getByRole('radio', {
            name: new RegExp(
              '^[A-D] ' +
                task.options![correct ? task.answer! : (task.answer! + 1) % 4].replace(
                  /[.*+?^${}()|[\]\\]/g,
                  '\\$&',
                ) +
                '$',
            ),
          })
          .check();
      const next = page.waitForResponse(
        (r) => r.url().endsWith('/answer') && r.url().includes('/english-diagnostic/'),
      );
      await page.getByRole('button', { name: 'Надіслати відповідь', exact: true }).click();
      data = await (await next).json();
    }
    expect(data.placement_count).toBe(12);
    expect(data.task.kind).toBe('writing');
    await expect(page.getByRole('heading', { name: 'Writing Assessment' })).toBeVisible();
    // Mock provider cannot establish productive proficiency. Skip all five modalities honestly.
    for (let i = 0; i < 5; i++) {
      if (i === 1) {
        await expect(page.locator('audio')).toHaveCount(0);
        await expect(
          page.getByText('Показати транскрипт — підказка, вага відповіді 25%'),
        ).toBeVisible();
      }
      const next = page.waitForResponse(
        (r) => r.url().endsWith('/skip') && r.url().includes('/english-diagnostic/'),
      );
      await page
        .getByRole('button', { name: 'Пропустити — залишити навичку неоціненою', exact: true })
        .click();
      data = await (await next).json();
    }
    const expected = profile === 'B2' ? 'B2' : profile === 'A2' ? 'A2' : 'B1';
    expect(data.map.placement_cefr).toBe(expected);
    expect(data.map.estimated_cefr).toBeNull();
    await expect(page.getByLabel('Карта CEFR')).toContainText(`Попередній placement: ${expected}`);
    await expect(page.getByLabel('Карта CEFR').getByText(/Недостатньо оцінено/)).toHaveCount(3);
    await page.screenshot({ path: `test-results/english-${profile}-map.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('link', { name: 'Відкрити карту English' }).click();
    await expect(page.getByLabel('Карта CEFR')).toBeVisible();
    expect(errors).toEqual([]);
  });
test('physics L3→L4→L5; actual graph and mixed circuit render without overflow', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Демо учня', exact: true }).click();
  await expect(page).toHaveURL(/today/);
  const start = page.waitForResponse(
    (r) => r.url().endsWith('/api/diagnostic') && r.request().method() === 'POST',
  );
  await page.goto('/diagnostic/physics');
  let data = await (await start).json();
  for (const level of [3, 4]) {
    expect(data.question.difficulty).toBe(level);
    const q = physicsQuestion(data.question.skill_id, level)!;
    const target = q.options[q.answer];
    const labels = await page
      .getByRole('radio')
      .evaluateAll((inputs) => inputs.map((input) => input.closest('label')!.textContent!.trim()));
    const index = labels.findIndex((label) => label.slice(1).trim() === target);
    expect(index).toBeGreaterThanOrEqual(0);
    await page.getByRole('radio').nth(index).check();
    const next = page.waitForResponse((r) => r.url().endsWith('/answer'));
    await page.getByRole('button', { name: 'Далі', exact: true }).click();
    data = await (await next).json();
  }
  expect(data.question.difficulty).toBe(5);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const skill of ['motion-graphs', 'mixed-circuits']) {
    // Render a representative authored visual through the same public API shape.
    await page.route('**/api/diagnostic', (route) =>
      route.fulfill({ json: { ...data, question: publicQuestion(physicsQuestion(skill, 3)!) } }),
    );
    await page.goto('/diagnostic/physics');
    await expect(page.locator('.physics-graph svg')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/physics-${skill}.png`, fullPage: true });
    await page.unroute('**/api/diagnostic');
  }
});
