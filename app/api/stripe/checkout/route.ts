export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    
    // Get session from Supabase auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await getSupabase().auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { planId, isAnnual } = await req.json();

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
    }

    // Get the business for this user
    const supabase = getSupabase();
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, stripe_customer_id')
      .eq('owner_id', user.id)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Look up the plan and get its Stripe price ID
    const { data: plan } = await getSupabase()
      .from('plans')
      .select('stripe_price_id, stripe_annual_price_id')
      .eq('id', planId)
      .single();

    const priceId = isAnnual ? plan?.stripe_annual_price_id : plan?.stripe_price_id;

    if (!priceId) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Get or create Stripe customer
    let customerId = business.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          business_id: business.id,
        },
      });
      customerId = customer.id;

      // Update business with customer ID
      await getSupabase()
        .from('businesses')
        .update({ stripe_customer_id: customerId })
        .eq('id', business.id);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.nextUrl.origin}/dashboard?upgraded=true`,
      cancel_url: `${req.nextUrl.origin}/dashboard/billing`,
      metadata: {
        business_id: business.id,
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    const error = err as Error;
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
