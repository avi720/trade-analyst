import type { Lesson, Track } from './types'
import { jsTrack } from './tracks/js'
import { tsTrack } from './tracks/ts'
import { reactTrack } from './tracks/react'
import { pythonTrack } from './tracks/python'

// Suggested order: JS → TS → React → Python. Python is last because its
// lessons translate code the earlier tracks already explained.
export const TRACKS: readonly Track[] = [jsTrack, tsTrack, reactTrack, pythonTrack]

export interface LessonLocation {
  track: Track
  lesson: Lesson
  index: number
  prev: Lesson | null
  next: Lesson | null
}

export function findLesson(slug: string): LessonLocation | null {
  for (const track of TRACKS) {
    const index = track.lessons.findIndex(l => l.slug === slug)
    if (index >= 0) {
      return {
        track,
        lesson: track.lessons[index],
        index,
        prev: track.lessons[index - 1] ?? null,
        next: track.lessons[index + 1] ?? null,
      }
    }
  }
  return null
}
