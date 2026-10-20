import type { Lesson, Track } from './types'
import { jsTrack } from './tracks/js'
import { tsTrack } from './tracks/ts'
import { reactTrack } from './tracks/react'
import { pythonTrack } from './tracks/python'
import { aiTrack } from './tracks/ai'
import { apiTrack } from './tracks/api'

// Suggested order: JS → TS → React → Python, then the applied tracks. Python
// comes after the web tracks because its lessons translate code they explained;
// AI and APIs assume all of them.
export const TRACKS: readonly Track[] = [jsTrack, tsTrack, reactTrack, pythonTrack, aiTrack, apiTrack]

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
