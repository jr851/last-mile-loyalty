export const runtime = 'edge';
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

// GET /api/integrations/square/callback
// Square redirects here after the merchant authorises the app.
// We exchange the code for tokens and store them in pos_integrations.

const SQUARE_APP_ID = process.env.SQUARE_APP_ID!;
const SQUARE_APP_SECRET = process.env.SQUARE_APP_SECRET!;
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT ?? "production";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

const SQUARE_TOKEN_URL =
  SQUARE_ENVIRONMENT === "sandbox"
    ? "https://connect.squareupsandbox.com/oauth2/token"
    : "https://connect.squareup.com/oauth2/token";

const SQUARE_API_BASE =
  SQUARE_ENVIRONMENT === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";

/** Generate a random hex string using Web Crypto API */
function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Decode a base64url-encoded string */
function decodeBase64url(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return atob(padded);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  // Square declined or error
  if (errorParam) {
    return NextResponse.redirect(`${APP_URL}/dashboard?square_error=${errorParam}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/dashboard?square_error=missing_params`);
  }

  // Decode state to get businessId
  let businessId: string;
  try {
    const decoded = JSON.parse(decodeBase64url(state));
    businessId = decoded.businessId;
  } catch {
    return NextResponse.redirect(`${APP_URL}/dashboard?square_error=invalid_state`);
  }

  // Exchange code for access token
  const redirectUri = `${APP_URL}/api/integrations/square/callback`;

  const tokenRes = await fetch(SQUARE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Square-Version": "2024-01-17",
    },
    body: JSON.stringify({
      client_id: SQUARE_APP_ID,
      client_secret: SQUARE_APP_SECRET,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error("Square token exchange failed:", body);
    return NextResponse.redirect(`${APP_URL}/dashboard?square_error=token_exchange`);
  }

  const tokenData = await tokenRes.json();
  const {
    access_token,
    refresh_token,
    expires_at,
    merchant_id,
  } = tokenData;

  // Fetch the merchant's primary location ID
  let locationId: string | null = null;
  try {
    const locRes = await fetch(`${SQUARE_API_BASE}/v2/locations`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Square-Version": "2024-01-17",
      },
    });
    if (locRes.ok) {
      const locData = await locRes.json();
      const activeLoc = locData.locations?.find(
        (l: { status: string; id: string }) => l.status === "ACTIVE"
      );
      locationId = activeLoc?.id ?? locData.locations?.[0]?.id ?? null;
    }
  } catch {
    // Non-fatal — locationId stays null
  }

  // Generate a webhook signature secret for verifying incoming events
  const webhookSecret = randomHex(32);

  // Upsert into pos_integrations
  const supabase = getSupabase();
  const { error: upsertError } = await supabase
    .from("pos_integrations")
    .upsert(
      {
        business_id: businessId,
        provider: "square",
        access_token,
        refresh_token: refresh_token ?? null,
        token_expires_at: expires_at ? new Date(expires_at).toISOString() : null,
        merchant_id,
        location_id: locationId,
        webhook_secret: webhookSecret,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "business_id,provider" }
    );

  if (upsertError) {
    console.error("Failed to save Square integration:", upsertError);
    return NextResponse.redirect(`${APP_URL}/dashboard?square_error=save_failed`);
  }

  return NextResponse.redirect(`${APP_URL}/dashboard?square_connected=1`);
}
