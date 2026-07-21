import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  // Verify the caller is authenticated before touching the database
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''

  if (!phone) {
    return Response.json({ error: 'Phone number is required' }, { status: 400 })
  }

  // Admin client bypasses RLS — appropriate here since we're writing the user's
  // own row immediately after sign-up, before session cookies are fully propagated.
  const admin = createAdminClient()
  const { error } = await admin.from('users').upsert({
    id: user.id,
    phone,
    warmup_minutes: 20,
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
