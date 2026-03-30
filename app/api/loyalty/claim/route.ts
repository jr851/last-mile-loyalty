export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

/**
 * POST /api/loyalty/claim
 * Creates a redemption code for a customer who has enough stamps.
 * Body: { customerId: string, businessId: string }
 */
export async function POST(req: Request) {
  try {
    const { customerId, businessId } = await req.json();

    if (!customerId || !businessId) {
      return NextResponse.json({ error: 'Missing customerId or businessId' }, { status: 400 });
    }

    const supabase = getServerSupabase();

    // Verify customer belongs to business and has enough stamps
    const { data: customer, error: custError } = await supabase
      .from('customers')
      .select('id, stamps, business_id')
      .eq('id', customerId)
      .eq('business_id', businessId)
      .single();

    if (custError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('reward_stamps_needed')
      .eq('id', businessId)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    if (customer.stamps < business.reward_stamps_needed) {
      return NextResponse.json({ error: 'Not enough stamps to claim reward' }, { status: 400 });
    }

    // Generate a unique 3-digit code
    const code = String(Math.floor(Math.random() * 900) + 100);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from('redemptions')
      .insert({
        customer_id: customerId,
        business_id: businessId,
        code,
        expires_at: expiresAt,
        confirmed_at: null,
      });

    if (insertError) {
      console.error('Redemption insert error:', insertError);
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
    }

    return NextResponse.json({ success: true, code });
  } catch (error: unknown) {
    console.error('Claim error:', error);
    const message = error instanceof Error ? error.message : 'Failed to claim reward';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
