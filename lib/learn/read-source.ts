import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { extractExcerpt, type Excerpt } from './excerpt'
import type { SourceRef } from './types'

// Lesson pages read repo files at request time. On Vercel those files reach
// the function only because next.config.mjs lists them under
// `outputFileTracingIncludes` for the /admin/learn routes.
export async function readExcerpt(ref: SourceRef): Promise<Excerpt> {
  // turbopackIgnore: without it the dynamic path makes Turbopack trace the whole
  // project into the function; the includes list above ships exactly what's needed.
  const abs = path.join(/*turbopackIgnore: true*/ process.cwd(), ref.file)
  let text: string
  try {
    text = await readFile(abs, 'utf8')
  } catch {
    return { ok: false, error: `file not readable: ${ref.file}` }
  }
  return extractExcerpt(text, ref)
}
