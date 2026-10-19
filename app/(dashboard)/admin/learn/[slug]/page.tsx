import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, ChevronRight, AlertTriangle, Lightbulb } from 'lucide-react'
import { requireAdminPage } from '@/lib/auth/require-admin'
import { findLesson } from '@/lib/learn/curriculum'
import { readExcerpt } from '@/lib/learn/read-source'
import { highlight } from '@/lib/learn/highlight'
import type { Block, CodeLang } from '@/lib/learn/types'
import { RichText } from '@/components/learn/rich-text'
import { CodeBlock } from '@/components/learn/code-block'
import { LessonQuiz } from '@/components/learn/lesson-quiz'
import { LessonExercise } from '@/components/learn/lesson-exercise'
import { CompleteLessonButton } from '@/components/learn/lesson-progress'
import { cn } from '@/lib/utils/cn'

// Reads repo files per request (see lib/learn/read-source.ts).
export const dynamic = 'force-dynamic'

export default async function AdminLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdminPage()

  const { slug } = await params
  const found = findLesson(slug)
  if (!found) notFound()
  const { track, lesson, index, prev, next } = found

  const rendered = await Promise.all(lesson.blocks.map(renderBlock))

  return (
    <article className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <nav className="text-xs text-text-mute">
        <Link href="/admin/learn" className="hover:text-amber">
          למידה
        </Link>
        <span className="mx-2">/</span>
        <span>{track.title}</span>
        <span className="mx-2">/</span>
        <span className="font-mono" dir="ltr">
          {index + 1}/{track.lessons.length}
        </span>
      </nav>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-text-main">{lesson.title}</h1>
        <RichText body={lesson.summary} className="text-sm leading-6 text-text-dim" />
      </header>

      {rendered}

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        <CompleteLessonButton slug={lesson.slug} />
        <div className="flex gap-2">
          {prev && (
            <Link
              href={`/admin/learn/${prev.slug}`}
              className="btn-ghost inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm"
            >
              <ChevronRight size={16} aria-hidden="true" />
              הקודם
            </Link>
          )}
          {next && (
            <Link
              href={`/admin/learn/${next.slug}`}
              className="btn-ghost inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm"
            >
              הבא: {next.title}
              <ChevronLeft size={16} aria-hidden="true" />
            </Link>
          )}
        </div>
      </footer>
    </article>
  )
}

async function renderBlock(block: Block, key: number): Promise<React.ReactNode> {
  switch (block.kind) {
    case 'text':
      return <RichText key={key} body={block.body} />

    case 'callout':
      return (
        <div
          key={key}
          className={cn(
            'flex gap-3 rounded-md border p-4',
            block.tone === 'warn' ? 'border-red/40 bg-red-tint' : 'border-amber/40 bg-amber-tint',
          )}
        >
          {block.tone === 'warn' ? (
            <AlertTriangle size={18} className="text-red shrink-0 mt-1" aria-hidden="true" />
          ) : (
            <Lightbulb size={18} className="text-amber shrink-0 mt-1" aria-hidden="true" />
          )}
          <RichText body={block.body} className="space-y-2 text-sm leading-6 text-text-main" />
        </div>
      )

    case 'source': {
      const excerpt = await readExcerpt(block.ref)
      if (!excerpt.ok) {
        return (
          <div key={key} className="rounded-md border border-red/50 bg-red-tint p-4 text-sm space-y-1">
            <p className="font-semibold text-red">הקטע לא נמצא בקוד — כנראה שהקוד השתנה מאז שהשיעור נכתב.</p>
            <p dir="ltr" className="font-mono text-xs text-text-dim">
              {excerpt.error}
            </p>
          </div>
        )
      }
      const codeLines = excerpt.code.split('\n')
      const notes = (block.notes ?? []).map(n => {
        const idx = codeLines.findIndex(l => l.includes(n.match))
        return { text: n.text, line: idx >= 0 ? idx + 1 : null }
      })
      const marked = new Set(notes.flatMap(n => (n.line ? [n.line] : [])))
      const lang = langForFile(block.ref.file)
      const html = await highlight(excerpt.code, lang, { startLine: excerpt.startLine, marked })
      const endLine = excerpt.startLine + codeLines.length - 1
      return (
        <div key={key} className="space-y-3">
          <CodeBlock html={html} title={block.title} meta={`${block.ref.file}:${excerpt.startLine}-${endLine}`} />
          {notes.length > 0 && (
            <ol className="space-y-2">
              {notes.map((n, i) => (
                <li key={i} className="flex gap-3 rounded-md bg-panel px-4 py-3">
                  <span className="font-mono text-xs text-amber shrink-0 pt-1 w-12" dir="ltr">
                    {n.line ? `L${excerpt.startLine + n.line - 1}` : '—'}
                  </span>
                  <RichText body={n.text} className="space-y-2 text-sm leading-6 text-text-main" />
                </li>
              ))}
            </ol>
          )}
        </div>
      )
    }

    case 'snippet':
      return <CodeBlock key={key} html={await highlight(block.code, block.lang)} title={block.title} />

    case 'compare': {
      const [left, right] = await Promise.all([
        highlight(block.left.code, block.left.lang),
        highlight(block.right.code, block.right.lang),
      ])
      return (
        <div key={key} className="grid gap-3 lg:grid-cols-2">
          <CodeBlock html={left} title={block.left.title} />
          <CodeBlock html={right} title={block.right.title} />
        </div>
      )
    }

    case 'quiz':
      return (
        <LessonQuiz
          key={key}
          question={block.question}
          options={block.options}
          answer={block.answer}
          explanation={block.explanation}
        />
      )

    case 'exercise':
      return (
        <LessonExercise
          key={key}
          prompt={block.prompt}
          hint={block.hint}
          solutionHtml={await highlight(block.solution.code, block.solution.lang)}
          solutionTitle={block.solution.title}
        />
      )
  }
}

function langForFile(file: string): CodeLang {
  if (file.endsWith('.tsx')) return 'tsx'
  if (file.endsWith('.sql')) return 'sql'
  if (file.endsWith('.sh')) return 'bash'
  if (/\.(m?js|cjs)$/.test(file)) return 'js'
  if (file.endsWith('.json')) return 'json'
  return 'ts'
}
