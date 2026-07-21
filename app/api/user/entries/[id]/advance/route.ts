import { createClient } from '@/lib/supabase/server'

type Params = Promise<{ id: string }>

export async function POST(_request: Request, { params }: { params: Params }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Fetch the entry and its class_status so we can compute the effective horse count
  const { data: entry, error: fetchError } = await supabase
    .from('user_entries')
    .select('manual_horse_count, class_status(current_horse_number)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !entry) {
    return Response.json({ error: 'Entry not found' }, { status: 404 })
  }

  // Effective count is the manual override if set, otherwise the latest polled value
  const classStatus = Array.isArray(entry.class_status)
    ? entry.class_status[0]
    : entry.class_status
  const polledCount = classStatus?.current_horse_number ?? 0
  const effectiveCount = entry.manual_horse_count ?? polledCount
  const newManualCount = effectiveCount + 1

  const { data: updated, error: updateError } = await supabase
    .from('user_entries')
    .update({
      manual_horse_count: newManualCount,
      manual_count_set_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({ entry: updated })
}
