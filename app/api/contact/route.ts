export const runtime = 'edge';
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

async function sendEmailNotification(name: string, email: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // Skip if not configured

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Last Mile Loyalty <notifications@lastmileloyalty.com>',
        to: ['jonathan.reeve@eagleeye.com'],
        subject: `New contact form: ${name}`,
        html: `
          <h2>New contact form submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr>
          <p style="color: #999; font-size: 12px;">Sent from lastmileloyalty.com contact form</p>
        `,
      }),
    });
  } catch (err) {
    console.error('Email notification failed:', err);
    // Don't fail the request if email fails
  }
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

    // Length limits to prevent abuse
    if (name.length > 200 || email.length > 200 || message.length > 5000) {
      return NextResponse.json(
        { error: 'Input too long.' },
        { status: 400 }
      )
    }

    // Store in Supabase
    const { error: dbError } = await getSupabase()
      .from('contact_messages')
      .insert({ name, email, message })

    if (dbError) {
      console.error('Contact form error:', dbError)
    }

    // Send email notification (non-blocking)
    sendEmailNotification(name, email, message);

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Contact form error:', error)
    const msg = error instanceof Error ? error.message : 'Failed to send message'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
