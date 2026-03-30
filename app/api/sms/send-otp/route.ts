export const runtime = 'edge';
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

const PHONE_LIMIT = 3
const IP_LIMIT = 10
const WINDOW_MINUTES = 60

async function checkRateLimit(key: string, keyType: 'phone' | 'ip', limit: number): Promise<boolean> {
  const supabase = getSupabase();
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('sms_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('key', key)
    .eq('key_type', keyType)
    .gte('requested_at', windowStart)
  if (error) {
    console.error('Rate limit check error:', error)
    return false
  }
  return (count || 0) >= limit
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}

/** Send SMS via Twilio REST API — no Twilio SDK needed in edge runtime */
async function sendTwilioSms(to: string, body: string): Promise<void> {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID ?? '').trim()
  const authToken = (process.env.TWILIO_AUTH_TOKEN ?? '').trim()
  const fromNumber = (process.env.TWILIO_PHONE_NUMBER ?? '').trim()

  if (!accountSid || !authToken || !fromNumber) {
    console.error(`[Twilio] Missing creds — sid:${!!accountSid} token:${!!authToken} from:${!!fromNumber}`)
    throw new Error('Twilio credentials not configured')
  }

  console.log(`[Twilio] Sending — sid len:${accountSid.length} token len:${authToken.length} from len:${fromNumber.length} sid prefix:${accountSid.slice(0,4)}`)
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
    const { phone, hp } = await req.json()

    if (hp) {
      return NextResponse.json({ success: true })
    }

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\s/g, '')
    if (!/^\+?[0-9]{8,15}$/.test(cleanPhone)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
    }

    const clientIp = getClientIp(req)

    const phoneLimited = await checkRateLimit(cleanPhone, 'phone', PHONE_LIMIT)
    if (phoneLimited) {
      return NextResponse.json(
        { error: 'Too many code requests for this number. Please wait an hour before trying again.' },
        { status: 429 }
      )
    }

    const ipLimited = await checkRateLimit(clientIp, 'ip', IP_LIMIT)
    if (ipLimited) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a while before trying again.' },
        { status: 429 }
      )
    }

    const supabase = getSupabase()

    await Promise.all([
      supabase.from('sms_rate_limits').insert({ key: cleanPhone, key_type: 'phone' }),
      supabase.from('sms_rate_limits').insert({ key: clientIp, key_type: 'ip' }),
    ])

    // Fire-and-forget cleanup of old rate limit rows
    void (supabase.rpc('cleanup_old_rate_limits') as unknown as Promise<unknown>).then(() => {}).catch(() => {})

    const code = String(Math.floor(1000 + Math.random() * 9000))
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: dbError } = await supabase
      .from('phone_otps')
      .upsert(
        { phone: cleanPhone, code, expires_at: expiresAt, verified: false },
        { onConflict: 'phone' }
      )

    if (dbError) {
      console.error('OTP store error:', dbError)
      return NextResponse.json({ error: 'Could not generate code' }, { status: 500 })
    }

    await sendTwilioSms(cleanPhone, `Your Last Mile Loyalty verification code is: ${code}`)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('OTP send error:', error)
    const message = error instanceof Error ? error.message : 'Failed to send code'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
