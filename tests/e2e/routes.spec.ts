import { test, expect } from '@playwright/test';

const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

test.describe('core route smoke tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/AlignEDU/i);
    await expect(page.getByText(/request demo/i).first()).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /login to your account/i })).toBeVisible();
  });

  test('analysis alias redirects to analyze', async ({ page }) => {
    await page.goto('/analysis');
    await expect(page).toHaveURL(/\/analyze$/);
  });

  test.describe('protected route redirects', () => {
    test.skip(!hasSupabaseEnv, 'Supabase public env vars are required for local auth redirect smoke tests.');

    test('teacher dashboard redirects unauthenticated users to login', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/login$/);
    });

    test('admin dashboard redirects unauthenticated users to login', async ({ page }) => {
      await page.goto('/admin');
      await expect(page).toHaveURL(/\/login$/);
    });

    test('admin observe redirects unauthenticated users to login', async ({ page }) => {
      await page.goto('/admin/observe');
      await expect(page).toHaveURL(/\/login$/);
    });

    test('district dashboard redirects unauthenticated users to login', async ({ page }) => {
      await page.goto('/admin/district');
      await expect(page).toHaveURL(/\/login$/);
    });
  });
});
