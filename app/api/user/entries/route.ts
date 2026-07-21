import { createClient } from '@/lib/supabase/server'
import { calculateTimes } from '@/lib/timing'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch in parallel: entries (with class + class_status), user profile, timing config
  const [entriesResult, profileResult, configResult] = await Promise.all([
    supabase
      .from('user_entries')
      .select(`
        *,
        classes (id, name, ring, division, show_id),
        class_status (current_horse_number, status, drag_started_at, course_walk_started_at)
      `)
      .eq('user_id', user.id)
      .eq('completed', false)
      .order('created_at'),
    supabase.from('users').select('warmup_minutes').eq('id', user.id).single(),
    supabase.from('timing_config').select('*').single(),
  ])

  if (entriesResult.error) {
    return Response.json({ error: entriesResult.error.message }, { status: 500 })
  }

  const warmupDefault = profileResult.data?.warmup_minutes ?? 20
  const config = configResult.data ?? { minutes_per_round: 2, drag_minutes: 20, course_walk_minutes: 15 }
  const now = new Date()

  const entries = (entriesResult.data ?? []).map((entry) => {
    const warmupMinutes = entry.warmup_override_minutes ?? warmupDefault
    const timing = calculateTimes(entry, entry.class_status, config, warmupMinutes, now)
    return { ...entry, timing }
  })

  return Response.json({ entries })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { class_id, ride_position } = body

  if (!class_id || typeof ride_position !== 'number' || ride_position < 1) {
    return Response.json({ error: 'class_id and ride_position (≥1) are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('user_entries')
    .insert({ user_id: user.id, class_id, ride_position })
    .select()
    .single()

  if (error) {
    const status = error.code === '23505' ? 409 : 500 // 23505 = unique_violation
    return Response.json({ error: error.message }, { status })
  }

  return Response.json({ entry: data }, { status: 201 })
}
