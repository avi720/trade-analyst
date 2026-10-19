// Lesson model for the admin-only learning platform (/admin/learn).
//
// Lessons teach JS / TS / React / Python through this repo's own code. A
// `source` block never copies code — it points at a real file plus a text
// anchor, and the excerpt is read from disk at render time, so lessons follow
// the code as it changes. `__tests__/learn-lessons.test.ts` fails the build
// when an anchor stops resolving.

export type CodeLang = 'ts' | 'tsx' | 'js' | 'python' | 'sql' | 'bash' | 'json'

export interface SourceRef {
  /** Repo-relative path, forward slashes: `lib/trade/fifo.ts`. */
  file: string
  /** Substring of the first excerpt line. The first matching line wins. */
  start: string
  /**
   * Substring of the last excerpt line (inclusive), searched from `start` on.
   * Without `end` / `lines`, the excerpt runs to the first line at the start
   * line's indentation that opens with `}` or `)` — i.e. the end of the block.
   */
  end?: string
  /** Fixed excerpt length, counted from the start line. */
  lines?: number
}

export interface SourceNote {
  /** Substring of an excerpt line; the note attaches to the first match. */
  match: string
  text: string
}

export interface CodeSample {
  lang: CodeLang
  code: string
  title?: string
}

export type Block =
  /** Hebrew prose. Blank line = paragraph, `- ` = bullet, `code` and **bold** inline. */
  | { kind: 'text'; body: string }
  | { kind: 'callout'; tone: 'tip' | 'warn'; body: string }
  | { kind: 'source'; ref: SourceRef; title?: string; notes?: SourceNote[] }
  | ({ kind: 'snippet' } & CodeSample)
  | { kind: 'compare'; left: CodeSample; right: CodeSample }
  | {
      kind: 'quiz'
      question: string
      options: string[]
      /** Index into `options`. */
      answer: number
      explanation: string
    }
  | { kind: 'exercise'; prompt: string; hint?: string; solution: CodeSample }

export interface Lesson {
  /** Globally unique, prefixed with the track id: `ts-discriminated-unions`. */
  slug: string
  title: string
  summary: string
  minutes: number
  blocks: Block[]
}

export type TrackId = 'js' | 'ts' | 'react' | 'python'

export interface Track {
  id: TrackId
  title: string
  description: string
  lessons: Lesson[]
}
