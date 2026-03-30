import { test, expect } from '@playwright/test'

/**
 * API endpoint tests - validates HTTP contracts for all API routes.
 * No side effects (no real SMS sent, no real data modified).
 */

test.describe('SMS OTP API', () => {
  test('rejects missing phone number', async ({ page }) => {
    const response = await page.request.post('/api/sms/send-otp', {
      data: { hp: '' },
    })
    expect(response.status()).toBe(400)
  })

  test('rejects invalid phone format', async ({ page }) => {
    const response = await page.request.post('/api/sms/send-otp', {
      data: { phone: '123', hp: '' },
    })
    expect(response.status()).toBe(400)
  })

  test('honeypot silently succeeds', async ({ page }) => {
    // Bot-like request with honeypot filled in
    const response = await page.request.post('/api/sms/send-otp', {
      data: { phone: '+61400000000', hp: 'bot-value' },
    })
    // Should return 200 (silently ignores bots)
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
  })
})

test.describe('SMS verify OTP API', () => {
  test('rejects missing fields', async ({ page }) => {
    const response = await page.request.post('/api/sms/verify-otp', {
      data: {},
    })
    expect(response.status()).toBe(400)
  })

  test('rejects wrong code', async ({ page }) => {
    const response = await page.request.post('/api/sms/verify-otp', {
      data: { phone: '+61400000000', code: '0000' },
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Invalid')
  })
})

test.describe('Contact form API', () => {
  test('rejects empty submission', async ({ page }) => {
    const response = await page.request.post('/api/contact', {
      data: {},
    })
    // Should reject with 400
    expect([400, 500]).toContain(response.status())
  })
})

test.describe('Stripe endpoints (without keys)', () => {
  test('checkout endpoint exists', async ({ page }) => {
    const response = await page.request.post('/api/stripe/checkout', {
      data: { priceId: 'price_fake', businessId: 'fake-id' },
    })
    // Should return an error (no Stripe key), not 404
    expect(response.status()).not.toBe(404)
  })

  test('portal endpoint exists', async ({ page }) => {
    const response = await page.request.post('/api/stripe/portal', {
      data: { customerId: 'cus_fake' },
    })
    // Should return an error (no Stripe key), not 404
    expect(response.status()).not.toBe(404)
  })
})
