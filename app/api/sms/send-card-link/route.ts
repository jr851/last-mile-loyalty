export const runtime = 'edge';
import { NextResponse } from 'next/server'

/** Send SMS via Twilio REST API (no SDK needed in edge runtime) */
async function sendTwilioSms(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials not configured')
  }

  const credentials = btoa(`${accountSid}:${authToken}`)
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

  const params = new URLSearchParams()
  params.set('Body', body)
  params.set('From', fromNumber)
  params.set('To', to)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Twilio error ${res.status}: ${text}`)
  }
}

export async function POST(req: Request) {
  try {
    const { phone, businessSlug, customerId, businessName } = await req.json()

    if (!phone || !businessSlug || !customerId) {
      return NextResponse.json(
        { error: 'Missing required fields: phone, businessSlug, customerId' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lastmileloyalty.com'
    const cardUrl = `${baseUrl}/card/?b=${businessSlug}&c=${customerId}`

    const message = businessName
      ? `Welcome to ${businessName}'s loyalty programme! You've earned your first stamp. Add your card to Apple Wallet or Google Wallet for easy access. If you'd rather not use a wallet, save this link to check your stamps anytime: ${cardUrl}`
      : `Welcome! You've earned your first stamp. Add your card to Apple Wallet or Google Wallet for easy access, or save this link to check your stamps anytime: ${cardUrl}`

    await sendTwilioSms(phone, message)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('SMS send error:', error)
    const message = error instanceof Error ? error.message : 'Failed to send SMS'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
