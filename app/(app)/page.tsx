'use client'

import { useCallback, useEffect, useState } from 'react'
import { EntryCard, type EntryWithTiming } from '@/components/EntryCard'

export default function HomePage() {
  const [entries, setEntries] = useState<EntryWithTiming[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEntries = useCallback(async () => {
    const res = await fetch('/api/user/entries')
    if (res.ok) {
      const data = await res.json()
      setEntries(data.entries ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEntries()
    // Poll every 30 seconds for fresh timing data from the SGL cron
    const interval = setInterval(fetchEntries, 30_000)
    return () => clearInterval(interval)
  }, [fetchEntries])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg font-semibold">No classes added yet</p>
        <p className="text-sm text-gray-500">
          Select your show, then browse classes to add the ones you&apos;re competing in.
        </p>
        <a
          href="/show/select"
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Select a show
        </a>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-semibold">My Classes</h1>
      <div className="space-y-3">
        {entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} onRefresh={fetchEntries} />
        ))}
      </div>
    </div>
  )
}
