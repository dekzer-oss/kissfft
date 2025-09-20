import { test, expect } from '@playwright/test';

test('UMD sets the expected global and API surface', async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/umd-basic.html');

  const hasGlobal = await page.evaluate(() => !!(window as any).DekzerKissfft);
  expect(hasGlobal).toBe(true);

  const missing = await page.evaluate(() => {
    const g = (window as any).DekzerKissfft;
    const expected = [
      'createKissFft',
      'createKissRealFft',
      'createKissNdFft',
      'createKissNdRealFft',
      'cleanupKissFft',
      'getCacheStats',
      'nextFastSize',
      'nextFastShape',
      'loadKissFft',
    ];
    return expected.filter((k) => !(k in g));
  });

  expect(missing, 'UMD global missing exports').toEqual([]);
});
