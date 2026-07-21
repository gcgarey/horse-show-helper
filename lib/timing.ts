export type ClassStatusType = 'not_started' | 'in_progress' | 'on_drag' | 'course_walk' | 'complete'

export type EntryInput = {
  ride_position: number
  manual_horse_count: number | null
}

export type ClassStatusInput = {
  current_horse_number: number
  status: ClassStatusType
  drag_started_at: string | null
  course_walk_started_at: string | null
}

export type TimingConfigInput = {
  minutes_per_round: number
  drag_minutes: number
  course_walk_minutes: number
}

export type TimingResult = {
  minutes_remaining: number
  time_to_round: Date
  time_to_mount: Date
}

// Pure function — no DB calls. Called on every read; timing is never stored.
// warmupMinutes is pre-resolved: entry.warmup_override_minutes ?? user.warmup_minutes
export function calculateTimes(
  entry: EntryInput,
  classStatus: ClassStatusInput | null,
  config: TimingConfigInput,
  warmupMinutes: number,
  now: Date = new Date()
): TimingResult {
  // Fall back to safe defaults if no poll has run for this class yet
  const status = classStatus?.status ?? 'not_started'
  const currentHorseNumber = classStatus?.current_horse_number ?? 0

  const effectiveHorseCount = entry.manual_horse_count ?? currentHorseNumber
  const horsesRemaining = Math.max(0, entry.ride_position - effectiveHorseCount - 1)

  let minutesRemaining = horsesRemaining * Number(config.minutes_per_round)

  if (status === 'on_drag' && classStatus?.drag_started_at) {
    const elapsed = (now.getTime() - new Date(classStatus.drag_started_at).getTime()) / 60_000
    minutesRemaining += Math.max(0, Number(config.drag_minutes) - elapsed)
  }

  if (status === 'course_walk' && classStatus?.course_walk_started_at) {
    const elapsed = (now.getTime() - new Date(classStatus.course_walk_started_at).getTime()) / 60_000
    minutesRemaining += Math.max(0, Number(config.course_walk_minutes) - elapsed)
  }

  const timeToRound = new Date(now.getTime() + minutesRemaining * 60_000)
  const timeToMount = new Date(timeToRound.getTime() - warmupMinutes * 60_000)

  return { minutes_remaining: minutesRemaining, time_to_round: timeToRound, time_to_mount: timeToMount }
}
