export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

/**
 * POST /api/loyalty/redeem
 * Confirms a redemption code and resets the customer's stamps.
 * Used by staff to confirm a reward.
 * Body: { code: string, businessId: string }
 */
export async function POST(req: Request) {
  try {
    const { code, businessId } = await req.json();

    if (!code || !businessId) {
      return NextResponse.json({ error: 'Missing code or businessId' }, { status: 400 });
    }

    if (!/^\d{3}$/.test(code)) {
      return NextResponse.json({ error: 'Code must be a 3-digit number' }, { status: 400 });
    }

    const supabase = getServerSupabase();

    // Find pending redemption
    const { data: redemption, error: redeemError } = await supabase
      .from('redemptions')
      .select('id, customer_id, confirmed_at')
      .eq('business_id', businessId)
      .eq('code', code)
      .is('confirmed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (redeemError || !redemption) {
      return NextResponse.json({ error: 'Code not found or already used' }, { status: 404 });
    }

    // Get customer and business details
    const [custResult, bizResult] = await Promise.all([
      supabase
        .from('customers')
        .select('name, stamps')
        .eq('id', redemption.customer_id)
        .single(),
      supabase
        .from('businesses')
        .select('reward_stamps_needed, reward_description')
        .eq('id', businessId)
        .single(),
    ]);

    const customer = custResult.data;
    const business = bizResult.data;

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const newStamps = Math.max(0, (customer?.stamps || 0) - business.reward_stamps_needed);

    // Confirm redemption and reset stamps
    await Promise.all([
      supabase
        .from('redemptions')
        .update({ confirmed_at: new Date().toISOString() })
        .eq('id', redemption.id),
      supabase
        .from('customers')
        .update({ stamps: newStamps, updated_at: new Date().toISOString() })
        .eq('id', redemption.customer_id),
    ]);

    return NextResponse.json({
      success: true,
      customerName: customer?.name || 'Customer',
      reward: business.reward_description,
      newStamps,
    });
  } catch (error: unknown) {
    console.error('Redeem error:', error);
    const message = error instanceof Error ? error.message : 'Failed to redeem reward';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
