'use client'

import { CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { setLessonCompleted, useCompletedLessons } from '@/lib/learn/progress'

export function LessonDoneMark({ slug }: { slug: string }) {
  const done = useCompletedLessons().has(slug)
  return done ? (
    <CheckCircle2 size={16} className="text-green shrink-0" aria-label="הושלם" />
  ) : (
    <Circle size={16} className="text-text-faint shrink-0" aria-hidden="true" />
  )
}

export function TrackProgress({ slugs }: { slugs: string[] }) {
  const completed = useCompletedLessons()
  const done = slugs.filter(s => completed.has(s)).length
  const pct = slugs.length > 0 ? Math.round((done / slugs.length) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-28 rounded-full bg-panel-3 overflow-hidden" aria-hidden="true">
        <div className="h-full bg-amber transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-text-mute" dir="ltr">
        {done}/{slugs.length}
      </span>
    </div>
  )
}

export function CompleteLessonButton({ slug }: { slug: string }) {
  const done = useCompletedLessons().has(slug)
  return (
    <button
      type="button"
      onClick={() => setLessonCompleted(slug, !done)}
      aria-pressed={done}
      className={cn(
        'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors',
        done ? 'border border-green text-green bg-green-tint' : 'bg-amber text-black hover:bg-amber-dark',
      )}
    >
      <CheckCircle2 size={16} aria-hidden="true" />
      {done ? 'הושלם — לחץ לביטול' : 'סמן שיעור כהושלם'}
    </button>
  )
}
