export const runtime = 'edge';
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}


// GET /api/integrations/square/connect?businessId=xxx
// Redirects the owner to Square's OAuth authorisation page.

const SQUARE_APP_ID = process.env.SQUARE_APP_ID!;
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT ?? "production"; // 'sandbox' | 'production'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

const SQUARE_OAUTH_BASE =
  SQUARE_ENVIRONMENT === "sandbox"
    ? "https://connect.squareupsandbox.com/oauth2/authorize"
    : "https://connect.squareup.com/oauth2/authorize";

// Supabase service-role client — used server-side to verify the owner session
// supabaseAdmin now lazily created via getSupabase()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }

  // Verify the business exists
  const { data: biz, error } = await getSupabase()
    .from("businesses")
    .select("id, slug")
    .eq("id", businessId)
    .single();

  if (error || !biz) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // state param: base64-encode businessId so we can recover it in the callback
  const state = Buffer.from(JSON.stringify({ businessId })).toString("base64url");

  const redirectUri = `${APP_URL}/api/integrations/square/callback`;

  const params = new URLSearchParams({
    client_id: SQUARE_APP_ID,
    response_type: "code",
    scope: "MERCHANT_PROFILE_READ PAYMENTS_READ ORDERS_READ",
    redirect_uri: redirectUri,
    state,
  });

  const authUrl = `${SQUARE_OAUTH_BASE}?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
