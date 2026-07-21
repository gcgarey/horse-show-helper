import { createClient } from '@/lib/supabase/server'

// params is a Promise in Next.js 16 — must be awaited
type Params = Promise<{ id: string }>

export async function PATCH(request: Request, { params }: { params: Params }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  // Only allow patching these three fields
  const allowed = ['ride_position', 'warmup_override_minutes', 'notifications_enabled'] as const
  type AllowedKey = typeof allowed[number]
  const updates: Partial<Record<AllowedKey, unknown>> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('user_entries')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id) // scopes update to the requesting user's rows only
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ entry: data })
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { error } = await supabase
    .from('user_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return new Response(null, { status: 204 })
}
