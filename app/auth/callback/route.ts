import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Handles the OAuth redirect after Google/Apple sign-in.
// Supabase sends ?code=... here; we exchange it for a session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/`)
}
