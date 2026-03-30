export const runtime = 'edge';
import { NextResponse } from 'next/server';

export async function GET() {
  const sid = process.env.TWILIO_ACCOUNT_SID ?? '';
  const token = process.env.TWILIO_AUTH_TOKEN ?? '';
  const phone = process.env.TWILIO_PHONE_NUMBER ?? '';

  return NextResponse.json({
    twilio: {
      sidPresent: !!sid,
      sidLength: sid.length,
      sidPrefix: sid.slice(0, 4),
      sidSuffix: sid.slice(-4),
      tokenPresent: !!token,
      tokenLength: token.length,
      tokenSuffix: token.slice(-4),
      phonePresent: !!phone,
      phoneLength: phone.length,
    },
    supabase: {
      urlPresent: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceKeyPresent: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    ts: new Date().toISOString(),
  });
}
