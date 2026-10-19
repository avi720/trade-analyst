import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { TRACKS } from '@/lib/learn/curriculum'
import { extractExcerpt } from '@/lib/learn/excerpt'

// Lessons point at real code by text anchors. When a refactor moves or renames
// an anchored line, this test fails instead of the lesson silently showing a
// "snippet not found" box in /admin/learn.

const lessons = TRACKS.flatMap(t => t.lessons.map(l => ({ track: t, lesson: l })))

describe('extractExcerpt', () => {
  const text = [
    'const a = 1',
    'export function foo(x: number) {',
    '  if (x > 0) {',
    '    return 1',
    '  }',
    '  return 0',
    '}',
    'const b = 2',
  ].join('\n')

  it('runs to the end of the block when no end is given', () => {
    const r = extractExcerpt(text, { file: 'f.ts', start: 'function foo(' })
    expect(r).toEqual({ ok: true, startLine: 2, code: text.split('\n').slice(1, 7).join('\n') })
  })

  it('treats a reopening closer as part of the block', () => {
    const src = ['function bar(', '  x: number,', '): number {', '  if (x) {', '    return 1', '  } else {', '    return 2', '  }', '}', 'const c = 3'].join('\n')
    const r = extractExcerpt(src, { file: 'f.ts', start: 'function bar(' })
    expect(r.ok && r.code).toBe(src.split('\n').slice(0, 9).join('\n'))
  })

  it('honours an explicit end anchor and dedents', () => {
    const r = extractExcerpt(text, { file: 'f.ts', start: 'if (x > 0)', end: 'return 1' })
    expect(r).toEqual({ ok: true, startLine: 3, code: 'if (x > 0) {\n  return 1' })
  })

  it('honours a fixed line count', () => {
    const r = extractExcerpt(text, { file: 'f.ts', start: 'const a', lines: 2 })
    expect(r.ok && r.code).toBe('const a = 1\nexport function foo(x: number) {')
  })

  it('reports a missing anchor', () => {
    expect(extractExcerpt(text, { file: 'f.ts', start: 'nope' }).ok).toBe(false)
  })
})

describe('curriculum', () => {
  it('has unique slugs prefixed with their track id', () => {
    const slugs = lessons.map(x => x.lesson.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const { track, lesson } of lessons) {
      expect(lesson.slug.startsWith(`${track.id}-`), lesson.slug).toBe(true)
    }
  })

  it.each(lessons.map(x => [x.lesson.slug, x.lesson] as const))('%s: anchors resolve, quizzes are valid', (_, lesson) => {
    for (const block of lesson.blocks) {
      if (block.kind === 'source') {
        const text = readFileSync(path.join(process.cwd(), block.ref.file), 'utf8')
        const r = extractExcerpt(text, block.ref)
        expect(r.ok, r.ok ? '' : r.error).toBe(true)
        if (!r.ok) continue
        expect(r.code.split('\n').length, `${block.ref.file}: ${block.ref.start}`).toBeLessThanOrEqual(80)
        for (const note of block.notes ?? []) {
          expect(r.code.includes(note.match), `note anchor "${note.match}" in ${block.ref.file}`).toBe(true)
        }
      }
      if (block.kind === 'quiz') {
        expect(block.answer).toBeGreaterThanOrEqual(0)
        expect(block.answer).toBeLessThan(block.options.length)
      }
    }
  })
})
