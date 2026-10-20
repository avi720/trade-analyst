'use client'

import { useMemo, useSyncExternalStore } from 'react'

// Completed-lesson set, per browser. Admin-only and single-owner, so
// localStorage is enough — no table, no migration. Exposed as an external
// store so every mounted badge updates the moment a lesson is marked done,
// including from another tab (the `storage` event).
const KEY = 'learn:completed'
const CHANGE_EVENT = 'learn:progress-change'

function readRaw(): string {
  try {
    return localStorage.getItem(KEY) ?? '[]'
  } catch {
    return '[]'
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

function parse(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Slugs of completed lessons. Empty on the server and during hydration. */
export function useCompletedLessons(): ReadonlySet<string> {
  // The snapshot is the raw string, not a parsed Set: useSyncExternalStore
  // compares snapshots with Object.is, so it must be stable between reads.
  const raw = useSyncExternalStore(subscribe, readRaw, () => '[]')
  return useMemo(() => new Set(parse(raw)), [raw])
}

export function setLessonCompleted(slug: string, done: boolean): void {
  const next = new Set(parse(readRaw()))
  if (done) next.add(slug)
  else next.delete(slug)
  try {
    localStorage.setItem(KEY, JSON.stringify([...next]))
  } catch {
    return
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}
