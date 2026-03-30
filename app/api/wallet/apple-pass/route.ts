export const runtime = 'edge';
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateApplePass } from '@/lib/apple-wallet'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customerId')
  const businessSlug = searchParams.get('b')

  if (!customerId || !businessSlug) {
    return NextResponse.json({ error: 'Missing customerId or business slug' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Fetch customer + business data
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*, businesses(*)')
    .eq('id', customerId)
    .single()

  if (customerError || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  const business = customer.businesses

  if (!business || business.slug !== businessSlug) {
    return NextResponse.json({ error: 'Business mismatch' }, { status: 403 })
  }

  // Check if Apple Wallet certificates are configured
  if (!process.env.APPLE_SIGNER_CERT_B64 || !process.env.APPLE_SIGNER_KEY_B64 || !process.env.APPLE_WWDR_B64) {
    return NextResponse.json(
      { error: 'Apple Wallet passes are not yet available. Please save this page to your home screen instead.' },
      { status: 501 }
    )
  }

  try {
    const passBuffer = await generateApplePass({
      customerId: customer.id,
      businessName: business.name,
      businessSlug: business.slug,
      brandColor: business.brand_color || '#6b4226',
      stampCount: customer.stamps,
      rewardStampsNeeded: business.reward_stamps_needed,
      rewardDescription: business.reward_description,
    })

    return new Response(new Uint8Array(passBuffer), {
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `inline; filename="${business.slug}-loyalty.pkpass"`,
        'Cache-Control': 'no-store, no-cache',
      },
    })
  } catch (error: unknown) {
    console.error('Apple pass generation error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate pass'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
