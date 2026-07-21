'use client'

import { useState } from 'react'
import { CountdownTimer } from './CountdownTimer'

type ClassStatus = {
  status: 'not_started' | 'in_progress' | 'on_drag' | 'course_walk' | 'complete'
} | null

type Timing = {
  minutes_remaining: number
  time_to_round: string
  time_to_mount: string
}

export type EntryWithTiming = {
  id: string
  ride_position: number
  notifications_enabled: boolean
  manual_horse_count: number | null
  completed: boolean
  classes: { name: string; ring: string | null; division: string | null } | null
  class_status: ClassStatus
  timing: Timing
}

const STATUS_LABEL: Record<NonNullable<ClassStatus>['status'], string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  on_drag: 'On drag',
  course_walk: 'Course walk',
  complete: 'Complete',
}

type Props = {
  entry: EntryWithTiming
  onRefresh: () => void
}

export function EntryCard({ entry, onRefresh }: Props) {
  const [loading, setLoading] = useState<'advance' | 'complete' | null>(null)

  async function advance() {
    setLoading('advance')
    await fetch(`/api/user/entries/${entry.id}/advance`, { method: 'POST' })
    setLoading(null)
    onRefresh()
  }

  async function complete() {
    setLoading('complete')
    await fetch(`/api/user/entries/${entry.id}/complete`, { method: 'POST' })
    setLoading(null)
    onRefresh()
  }

  const status = entry.class_status?.status ?? 'not_started'
  const isActive = status !== 'complete'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{entry.classes?.name ?? 'Unknown class'}</p>
          {entry.classes?.ring && (
            <p className="text-sm text-gray-500">Ring {entry.classes.ring}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {STATUS_LABEL[status]}
        </span>
      </div>

      <CountdownTimer
        minutesRemaining={entry.timing.minutes_remaining}
        timeToMount={entry.timing.time_to_mount}
        timeToRound={entry.timing.time_to_round}
      />

      <p className="mt-2 text-xs text-gray-400">
        Ride #{entry.ride_position}
        {entry.manual_horse_count !== null && ' · manual count active'}
      </p>

      {isActive && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={advance}
            disabled={loading !== null}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {loading === 'advance' ? '…' : 'That horse went'}
          </button>
          <button
            onClick={complete}
            disabled={loading !== null}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {loading === 'complete' ? '…' : "I've shown"}
          </button>
        </div>
      )}
    </div>
  )
}
