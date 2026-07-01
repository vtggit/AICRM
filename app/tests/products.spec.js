const { test, expect } = require('@playwright/test');
const path = require('path');

test('products_data_source', async ({ page }) => {
  await page.goto('file://' + path.resolve(__dirname, 'harness.html'));
  const out = await page.evaluate(async () => {
    const got = await ProductsDataSource.getProducts();
    const created = await ProductsDataSource.createProduct({ name: 'n' });
    return { got, created, calls: window.__calls };
  });
  expect(Array.isArray(out.got) && out.got.length === 1).toBe(true);
  expect(out.got[0].createdAt).toBe('2025-01-01T00:00:00Z');
  expect(out.created.createdAt).toBe('2025-01-03T00:00:00Z');
  expect(out.calls).toEqual(['get', 'create']);
});
