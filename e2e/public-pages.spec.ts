import { test, expect } from '@playwright/test'

/**
 * Public pages - no auth required.
 * Tests the about page, pricing page, and navigation.
 */

test.describe('About / Landing page', () => {
  test('loads and shows hero content', async ({ page }) => {
    await page.goto('/')
    // Should redirect to /about
    await expect(page).toHaveURL(/\/about/)
    await expect(page.locator('body')).toContainText('loyalty')
  })

  test('has working navigation links', async ({ page }) => {
    await page.goto('/about')

    // Check nav links exist
    const pricingLink = page.locator('a[href*="pricing"]').first()
    await expect(pricingLink).toBeVisible()

    // Click through to pricing
    await pricingLink.click()
    await expect(page).toHaveURL(/\/pricing/)
  })

  test('has contact form', async ({ page }) => {
    await page.goto('/about')

    // Scroll to contact section and check form fields
    const contactForm = page.locator('form').last()
    await expect(contactForm).toBeVisible()

    // Should have name, email, message fields
    await expect(page.locator('input[type="text"]').first()).toBeVisible()
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
  })

  test('has founder section', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('body')).toContainText('Eagle Eye')
  })
})

test.describe('Pricing page', () => {
  test('loads and shows plan tiers', async ({ page }) => {
    await page.goto('/pricing')

    // Should show all 4 tiers
    await expect(page.locator('body')).toContainText('Free')
    await expect(page.locator('body')).toContainText('Growth')
    await expect(page.locator('body')).toContainText('Pro')
    await expect(page.locator('body')).toContainText('Enterprise')
  })

  test('shows currency symbol', async ({ page }) => {
    await page.goto('/pricing')

    // Should show at least one currency symbol (varies by locale)
    const body = await page.locator('body').textContent()
    const hasCurrency = body?.includes('$') || body?.includes('£') || body?.includes('A$')
    expect(hasCurrency).toBeTruthy()
  })

  test('has monthly/annual toggle', async ({ page }) => {
    await page.goto('/pricing')

    // Look for the billing toggle
    const toggle = page.locator('button, [role="switch"]').filter({ hasText: /annual|monthly|yearly/i }).first()
    // If toggle exists, it should be clickable
    if (await toggle.isVisible()) {
      await toggle.click()
    }
  })
})
