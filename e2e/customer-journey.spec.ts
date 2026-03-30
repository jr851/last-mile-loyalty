import { test, expect } from '@playwright/test'

/**
 * Customer journey - the core flow from joining to viewing the stamp card.
 * Uses the existing test business: leo-and-anna-cafe
 *
 * NOTE: Tests that require real SMS (OTP) are marked as smoke tests
 * and skipped by default. They can be run manually with --grep @smoke.
 * All other tests validate UI rendering and navigation without side effects.
 */

const TEST_SLUG = 'leo-and-anna-cafe'

test.describe('Customer join page', () => {
  test('loads join page for a valid business', async ({ page }) => {
    await page.goto(`/join/?b=${TEST_SLUG}`)

    // Should show business name
    await expect(page.locator('h1')).toBeVisible()

    // Should show "Loyalty Programme" subtitle
    await expect(page.locator('body')).toContainText('Loyalty Programme')

    // Should show the stamp preview
    await expect(page.locator('body')).toContainText('stamps')

    // Should show "Join for free" heading
    await expect(page.locator('body')).toContainText('Join for free')
  })

  test('shows country code dropdown with auto-detection', async ({ page }) => {
    await page.goto(`/join/?b=${TEST_SLUG}`)

    // Country code select should exist
    const select = page.locator('select')
    await expect(select).toBeVisible()

    // Should have multiple country options
    const options = select.locator('option')
    const count = await options.count()
    expect(count).toBeGreaterThan(10)

    // First option should be Australia (+61)
    const firstOption = await options.first().textContent()
    expect(firstOption).toContain('+61')
  })

  test('shows placeholder that matches selected country', async ({ page }) => {
    await page.goto(`/join/?b=${TEST_SLUG}`)

    // Default is AU - placeholder should be AU format
    const phoneInput = page.locator('input[type="tel"]')
    await expect(phoneInput).toBeVisible()

    // Select UK
    await page.locator('select').selectOption('+44')

    // Placeholder should change to UK format
    const placeholder = await phoneInput.getAttribute('placeholder')
    expect(placeholder).toContain('7911')
  })

  test('shows validation error for empty phone', async ({ page }) => {
    await page.goto(`/join/?b=${TEST_SLUG}`)

    // Submit button should be disabled without phone input
    const submitBtn = page.locator('button[type="submit"]')
    await expect(submitBtn).toBeDisabled()
  })

  test('shows error for invalid business slug', async ({ page }) => {
    await page.goto('/join/?b=nonexistent-business-12345')

    // Should show error message
    await expect(page.locator('body')).toContainText('not found', { timeout: 10000 })
  })

  test('shows error when no slug is provided', async ({ page }) => {
    await page.goto('/join/')
    await expect(page.locator('body')).toContainText('No loyalty programme specified')
  })

  test('name field is optional', async ({ page }) => {
    await page.goto(`/join/?b=${TEST_SLUG}`)

    // Name field should show (optional) label
    await expect(page.locator('body')).toContainText('optional')
  })

  test('honeypot field is hidden from users', async ({ page }) => {
    await page.goto(`/join/?b=${TEST_SLUG}`)

    // Honeypot should exist in DOM but be invisible
    const honeypot = page.locator('#website')
    await expect(honeypot).toBeHidden()
  })

  test('stamp preview shows reward info', async ({ page }) => {
    await page.goto(`/join/?b=${TEST_SLUG}`)

    // Should show stamp count needed and reward description
    await expect(page.locator('body')).toContainText('stamp')
    await expect(page.locator('body')).toContainText('earn')
  })

  test('first stamp dot is filled in preview', async ({ page }) => {
    await page.goto(`/join/?b=${TEST_SLUG}`)

    // Should show "You'll get your first stamp when you join!"
    await expect(page.locator('body')).toContainText('first stamp')
  })
})

test.describe('Customer card page', () => {
  test('redirects to join if no customer ID stored', async ({ page }) => {
    // Clear any stored data
    await page.goto(`/card/?b=${TEST_SLUG}`)

    // Should redirect to join page
    await expect(page).toHaveURL(/\/join/, { timeout: 10000 })
  })

  test('loads card when customer ID is in URL param', async ({ page }) => {
    // Use the known test customer ID
    const customerId = '3c12554d-61e3-4562-a6a1-2ccad67bfd5f'
    await page.goto(`/card/?b=${TEST_SLUG}&c=${customerId}`)

    // Should show the stamp card (not redirect to join)
    await expect(page.locator('body')).toContainText('stamps collected', { timeout: 10000 })
  })

  test('shows QR code for staff scanning', async ({ page }) => {
    const customerId = '3c12554d-61e3-4562-a6a1-2ccad67bfd5f'
    await page.goto(`/card/?b=${TEST_SLUG}&c=${customerId}`)

    // QR code section should be visible
    await expect(page.locator('body')).toContainText('Get stamped', { timeout: 10000 })
    await expect(page.locator('body')).toContainText('Show this QR to staff')

    // QR SVG should be rendered
    const qrSvg = page.locator('svg').first()
    await expect(qrSvg).toBeVisible()
  })

  test('shows wallet buttons section', async ({ page }) => {
    const customerId = '3c12554d-61e3-4562-a6a1-2ccad67bfd5f'
    await page.goto(`/card/?b=${TEST_SLUG}&c=${customerId}`)

    // Wallet section
    await expect(page.locator('body')).toContainText('Save your card', { timeout: 10000 })

    // Should show at least one wallet button
    const walletBtns = page.locator('button').filter({ hasText: /Wallet/i })
    const count = await walletBtns.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('shows home screen fallback tip', async ({ page }) => {
    const customerId = '3c12554d-61e3-4562-a6a1-2ccad67bfd5f'
    await page.goto(`/card/?b=${TEST_SLUG}&c=${customerId}`)

    await expect(page.locator('body')).toContainText('Add to Home Screen', { timeout: 10000 })
  })

  test('refresh button works', async ({ page }) => {
    const customerId = '3c12554d-61e3-4562-a6a1-2ccad67bfd5f'
    await page.goto(`/card/?b=${TEST_SLUG}&c=${customerId}`)

    // Find and click refresh
    const refreshBtn = page.locator('button').filter({ hasText: 'Refresh' })
    await expect(refreshBtn).toBeVisible({ timeout: 10000 })
    await refreshBtn.click()

    // Should still show the card after refresh
    await expect(page.locator('body')).toContainText('stamps collected')
  })

  test('stamp grid displays correctly', async ({ page }) => {
    const customerId = '3c12554d-61e3-4562-a6a1-2ccad67bfd5f'
    await page.goto(`/card/?b=${TEST_SLUG}&c=${customerId}`)

    // Should show stamp circles
    await expect(page.locator('body')).toContainText('stamps', { timeout: 10000 })

    // Stamp dots should be visible
    const stampDots = page.locator('.rounded-full')
    const count = await stampDots.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('Legacy SMS link redirect', () => {
  test('old format URL redirects to card page', async ({ page }) => {
    const customerId = '3c12554d-61e3-4562-a6a1-2ccad67bfd5f'
    await page.goto(`/${TEST_SLUG}/${customerId}`)

    // Should redirect to /card?b=...&c=... (Next.js may strip trailing slash)
    await expect(page).toHaveURL(/\/card\??b=.*&c=/, { timeout: 10000 })

    // Card should load
    await expect(page.locator('body')).toContainText('stamps collected', { timeout: 10000 })
  })
})
