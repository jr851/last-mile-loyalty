export const runtime = 'edge';
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

// POST /api/webhooks/square
// Receives Square webhook events and auto-stamps the matching customer.

/** Verify Square HMAC-SHA256 signature using Web Crypto API */
async function verifySquareSignature(
  payload: string,
  signature: string,
  secret: string,
  webhookUrl: string,
): Promise<boolean> {
  const enc = new TextEncoder();
  const stringToSign = webhookUrl + payload;
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBytes = await crypto.subtle.sign('HMAC', key, enc.encode(stringToSign));
  // Encode to base64
  const arr = new Uint8Array(sigBytes);
  let binary = '';
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  const expected = btoa(binary);

  // Constant-time comparison
  if (signature.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < signature.length; i++) {
    diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature") ?? "";
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/square`;

  let event: {
    type: string;
    merchant_id: string;
    data?: {
      object?: {
        payment?: {
          buyer_email_address?: string;
          card_details?: { card?: { billing_address?: { phone?: string } } };
          customer_id?: string;
          amount_money?: { amount: number; currency: string };
          location_id?: string;
        };
        order?: {
          customer_id?: string;
          location_id?: string;
          tenders?: Array<{ customer_id?: string }>;
        };
      };
    };
  };

  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: integration } = await supabase
    .from("pos_integrations")
    .select("business_id, webhook_secret")
    .eq("merchant_id", event.merchant_id)
    .eq("provider", "square")
    .single();

  if (!integration) {
    return NextResponse.json({ received: true });
  }

  // Verify signature
  if (signature && !(await verifySquareSignature(body, signature, integration.webhook_secret, webhookUrl))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.type !== "payment.completed") {
    return NextResponse.json({ received: true });
  }

  const payment = event.data?.object?.payment;
  if (!payment) return NextResponse.json({ received: true });

  const squareCustomerId = payment.customer_id;
  const businessId = integration.business_id;

  if (!squareCustomerId) return NextResponse.json({ received: true });

  const { data: customer } = await supabase
    .from("customers")
    .select("id, stamps, name")
    .eq("business_id", businessId)
    .eq("wallet_pass_serial", squareCustomerId)
    .single();

  if (!customer) return NextResponse.json({ received: true });

  const { data: biz } = await supabase
    .from("businesses")
    .select("reward_stamps_needed, double_stamps_active, reward_description")
    .eq("id", businessId)
    .single();

  if (!biz) return NextResponse.json({ received: true });

  const stampsToAdd = biz.double_stamps_active ? 2 : 1;
  const newStamps = customer.stamps + stampsToAdd;

  await supabase
    .from("customers")
    .update({ stamps: newStamps, updated_at: new Date().toISOString() })
    .eq("id", customer.id);

  if (newStamps >= biz.reward_stamps_needed && customer.stamps < biz.reward_stamps_needed) {
    const code = String(Math.floor(Math.random() * 900) + 100);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("redemptions").insert({
      customer_id: customer.id,
      business_id: businessId,
      code,
      expires_at: expiresAt,
      confirmed_at: null,
    });
  }

  return NextResponse.json({ received: true, stamped: true, newStamps });
}
