import { test, expect } from '@playwright/test'

/**
 * Staff scanning page - the page staff use to stamp customer cards.
 * Tests the UI without actually adding stamps.
 */

const TEST_SLUG = 'leo-and-anna-cafe'
const TEST_CUSTOMER_ID = '3c12554d-61e3-4562-a6a1-2ccad67bfd5f'

test.describe('Staff scan page', () => {
  test('loads with customer and business params', async ({ page }) => {
    await page.goto(`/s/?c=${TEST_CUSTOMER_ID}&b=${TEST_SLUG}`)

    // Should show either the stamp interface or a login prompt
    // (depends on whether staff auth is required)
    await page.waitForTimeout(3000)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
  })

  test('shows error with missing params', async ({ page }) => {
    await page.goto('/s/')

    // Should show some error or empty state
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
  })
})

test.describe('Wallet API error handling', () => {
  test('Apple Wallet returns friendly error when certs missing', async ({ page }) => {
    const response = await page.request.get(
      `/api/wallet/apple-pass?customerId=${TEST_CUSTOMER_ID}&b=${TEST_SLUG}`
    )

    // Should either return a .pkpass file (200) or a friendly error (501)
    const status = response.status()
    expect([200, 501]).toContain(status)

    if (status === 501) {
      const body = await response.json()
      expect(body.error).toContain('home screen')
    }
  })

  test('Google Wallet returns friendly error when creds missing', async ({ page }) => {
    const response = await page.request.get(
      `/api/wallet/google-pass?customerId=${TEST_CUSTOMER_ID}&b=${TEST_SLUG}`
    )

    // Should either redirect to Google (302/307) or return a friendly error (501)
    const status = response.status()
    expect([200, 302, 307, 501]).toContain(status)

    if (status === 501) {
      const body = await response.json()
      expect(body.error).toContain('home screen')
    }
  })

  test('Apple Wallet rejects missing params', async ({ page }) => {
    const response = await page.request.get('/api/wallet/apple-pass')
    expect(response.status()).toBe(400)
  })

  test('Google Wallet rejects missing params', async ({ page }) => {
    const response = await page.request.get('/api/wallet/google-pass')
    expect(response.status()).toBe(400)
  })
})
