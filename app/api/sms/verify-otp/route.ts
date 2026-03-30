export const runtime = 'edge';
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json()

    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone and code required' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Look up the OTP
    const { data, error: dbError } = await supabase
      .from('phone_otps')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .single()

    if (dbError || !data) {
      return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 })
    }

    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 })
    }

    // Mark as verified
    await supabase
      .from('phone_otps')
      .update({ verified: true })
      .eq('phone', phone)

    return NextResponse.json({ verified: true })
  } catch (error: unknown) {
    console.error('OTP verify error:', error)
    const message = error instanceof Error ? error.message : 'Verification failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
