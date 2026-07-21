type Props = {
  minutesRemaining: number
  timeToMount: string  // ISO string
  timeToRound: string  // ISO string
}

function formatMinutes(minutes: number): string {
  if (minutes < 1) return 'Now'
  if (minutes < 60) return `~${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function CountdownTimer({ minutesRemaining, timeToMount, timeToRound }: Props) {
  const mountLabel = minutesRemaining <= 0 ? 'Get on now' : `Get on in ${formatMinutes(minutesRemaining)}`
  const urgent = minutesRemaining <= 5

  return (
    <div className="space-y-1">
      <p className={`text-lg font-semibold ${urgent ? 'text-red-600' : ''}`}>
        {mountLabel}
      </p>
      <p className="text-sm text-gray-500">
        Mount at {formatTime(timeToMount)} · Round at {formatTime(timeToRound)}
      </p>
    </div>
  )
}
