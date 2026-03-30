export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

/**
 * POST /api/loyalty/join
 * Creates a new customer for a business after OTP verification.
 * Uses service_role key so clients don't need direct write access to customers table.
 *
 * Body: { businessId, phone, name }
 * Returns: { success, customerId } or { error }
 */
export async function POST(req: Request) {
  try {
    const { businessId, phone, name } = await req.json();

    if (!businessId || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, phone' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();

    // Verify business exists
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .single();

    if (bizError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Check if customer already exists for this business + phone
    const { data: existing } = await supabase
      .from('customers')
      .select('id, stamps')
      .eq('business_id', businessId)
      .eq('phone', phone)
      .single();

    if (existing) {
      // Customer already exists — return their ID
      return NextResponse.json({
        success: true,
        customerId: existing.id,
        existing: true,
      });
    }

    // Create new customer with 1 welcome stamp
    const { data: newCustomer, error: insertError } = await supabase
      .from('customers')
      .insert({
        business_id: businessId,
        phone,
        name: (name || '').trim() || null,
        stamps: 1,
      })
      .select('id')
      .single();

    if (insertError || !newCustomer) {
      console.error('Customer creation error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create customer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      customerId: newCustomer.id,
      existing: false,
    });
  } catch (error: unknown) {
    console.error('Join error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
