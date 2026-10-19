import type { SourceRef } from './types'

export type Excerpt =
  | { ok: true; code: string; startLine: number }
  | { ok: false; error: string }

const MAX_AUTO_LINES = 80

/**
 * Cut the excerpt a `SourceRef` points at out of a file's text. Pure, so the
 * lesson test can resolve every anchor without rendering anything.
 */
export function extractExcerpt(text: string, ref: SourceRef): Excerpt {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const startIdx = lines.findIndex(l => l.includes(ref.start))
  if (startIdx < 0) {
    return { ok: false, error: `start anchor not found in ${ref.file}: ${ref.start}` }
  }

  let endIdx: number
  if (ref.end !== undefined) {
    const end = ref.end
    const rel = lines.slice(startIdx).findIndex(l => l.includes(end))
    if (rel < 0) {
      return { ok: false, error: `end anchor not found in ${ref.file}: ${end}` }
    }
    endIdx = startIdx + rel
  } else if (ref.lines !== undefined) {
    endIdx = Math.min(lines.length, startIdx + ref.lines) - 1
  } else {
    const indent = lines[startIdx].match(/^\s*/)![0].length
    // A closer that reopens — `): Promise<X> {` after a multi-line signature,
    // `} else {` — continues the block rather than ending it.
    const rel = lines
      .slice(startIdx + 1, startIdx + MAX_AUTO_LINES)
      .findIndex(
        l => l.match(/^\s*/)![0].length === indent && /^\s*[})]/.test(l) && !/[{(\[]\s*$/.test(l),
      )
    if (rel < 0) {
      return { ok: false, error: `no block end within ${MAX_AUTO_LINES} lines in ${ref.file}: ${ref.start}` }
    }
    endIdx = startIdx + 1 + rel
  }

  return { ok: true, code: dedent(lines.slice(startIdx, endIdx + 1)).join('\n'), startLine: startIdx + 1 }
}

function dedent(lines: string[]): string[] {
  const widths = lines.filter(l => l.trim() !== '').map(l => l.match(/^\s*/)![0].length)
  const min = widths.length > 0 ? Math.min(...widths) : 0
  return lines.map(l => l.slice(min))
}
