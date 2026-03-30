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

async function getPlanIdFromPriceId(priceId: string): Promise<string> {
  const supabase = getSupabase();

  // Look up the plan by matching either monthly or annual Stripe price ID
  const { data: monthlyMatch } = await supabase
    .from('plans')
    .select('id')
    .eq('stripe_price_id', priceId)
    .single();

  if (monthlyMatch) return monthlyMatch.id;

  const { data: annualMatch } = await supabase
    .from('plans')
    .select('id')
    .eq('stripe_annual_price_id', priceId)
    .single();

  if (annualMatch) return annualMatch.id;

  return 'free';
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const error = err as Error;
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const businessId = session.metadata?.business_id;

        if (businessId && session.customer) {
          // Get subscription to determine plan
          let planId = 'free';
          if (session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription as string
            );
            const priceId = subscription.items.data[0]?.price.id;
            if (priceId) {
              planId = await getPlanIdFromPriceId(priceId);
            }
          }

          const { error } = await supabase
            .from('businesses')
            .update({
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              subscription_status: 'active',
              plan_id: planId,
            })
            .eq('id', businessId);

          if (error) {
            console.error('Error updating business after checkout:', error);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        // Find the business by stripe_customer_id
        const { data: business } = await supabase
          .from('businesses')
          .select('id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single();

        if (business) {
          const priceId = subscription.items.data[0]?.price.id;
          const planId = priceId ? await getPlanIdFromPriceId(priceId) : 'free';
          const subscriptionStatus = subscription.status === 'active' ? 'active' : 'past_due';

          const { error } = await supabase
            .from('businesses')
            .update({
              plan_id: planId,
              subscription_status: subscriptionStatus,
              stripe_subscription_id: subscription.id,
            })
            .eq('id', business.id);

          if (error) {
            console.error('Error updating business subscription:', error);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Find the business by stripe_customer_id
        const { data: business } = await supabase
          .from('businesses')
          .select('id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single();

        if (business) {
          const { error } = await supabase
            .from('businesses')
            .update({
              plan_id: 'free',
              subscription_status: 'cancelled',
              stripe_subscription_id: null,
            })
            .eq('id', business.id);

          if (error) {
            console.error('Error updating business after cancellation:', error);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;

        // Find the business by stripe_customer_id
        const { data: business } = await supabase
          .from('businesses')
          .select('id')
          .eq('stripe_customer_id', invoice.customer as string)
          .single();

        if (business) {
          const { error } = await supabase
            .from('businesses')
            .update({
              subscription_status: 'past_due',
            })
            .eq('id', business.id);

          if (error) {
            console.error('Error updating business after payment failure:', error);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    const error = err as Error;
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
