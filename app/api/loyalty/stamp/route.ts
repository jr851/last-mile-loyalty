export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

/**
 * POST /api/loyalty/stamp
 * Adds a stamp to a customer. Used by staff pages after PIN verification.
 * Body: { customerId: string, businessId: string, staffPin: string }
 */
export async function POST(req: Request) {
  try {
    const { customerId, businessId, staffPin } = await req.json();

    if (!customerId || !businessId) {
      return NextResponse.json({ error: 'Missing customerId or businessId' }, { status: 400 });
    }

    const supabase = getServerSupabase();

    // Verify the business exists and the staff PIN matches (if provided)
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, staff_pin, double_stamps_active, reward_stamps_needed')
      .eq('id', businessId)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // If staffPin is provided, verify it
    if (staffPin && staffPin !== business.staff_pin) {
      return NextResponse.json({ error: 'Invalid staff PIN' }, { status: 403 });
    }

    // Get current customer
    const { data: customer, error: custError } = await supabase
      .from('customers')
      .select('id, stamps, name, business_id')
      .eq('id', customerId)
      .eq('business_id', businessId)
      .single();

    if (custError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Calculate new stamps
    const stampsToAdd = business.double_stamps_active ? 2 : 1;
    const newStamps = customer.stamps + stampsToAdd;

    // Update stamps
    const { error: updateError } = await supabase
      .from('customers')
      .update({ stamps: newStamps, updated_at: new Date().toISOString() })
      .eq('id', customerId);

    if (updateError) {
      console.error('Stamp update error:', updateError);
      return NextResponse.json({ error: 'Failed to add stamp' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      stampsAdded: stampsToAdd,
      newStamps,
      isComplete: newStamps >= business.reward_stamps_needed,
      customerName: customer.name,
    });
  } catch (error: unknown) {
    console.error('Stamp error:', error);
    const message = error instanceof Error ? error.message : 'Failed to add stamp';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
