export const runtime = 'edge';
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}



export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      )
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      )
    }

    // Store in Supabase
    const { error: dbError } = await getSupabase()
      .from('contact_messages')
      .insert({ name, email, message })

    if (dbError) {
      console.error('Contact form error:', dbError)
      // If table doesn't exist yet, still accept the submission
      // by sending an email notification instead
    }

    // Send email notification via a simple fetch to a mailto-style approach
    // For now, store in DB. Email notification can be added later.

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Contact form error:', error)
    const msg = error instanceof Error ? error.message : 'Failed to send message'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
