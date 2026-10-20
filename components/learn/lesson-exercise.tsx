'use client'

import { useState } from 'react'
import { Lightbulb, Eye, EyeOff } from 'lucide-react'
import { RichText } from './rich-text'
import { CodeBlock } from './code-block'

interface Props {
  prompt: string
  hint?: string
  solutionHtml: string
  solutionTitle?: string
}

export function LessonExercise({ prompt, hint, solutionHtml, solutionTitle }: Props) {
  const [showHint, setShowHint] = useState(false)
  const [showSolution, setShowSolution] = useState(false)

  return (
    <section className="rounded-md border border-amber/40 bg-amber-tint/40 p-5 space-y-4">
      <p className="text-xs font-semibold text-amber tracking-widest">תרגיל</p>
      <RichText body={prompt} />
      <p className="text-xs text-text-mute">
        כתוב את הפתרון בעורך שלך (או על דף) לפני שאתה מציץ.
      </p>
      <div className="flex flex-wrap gap-2">
        {hint && (
          <button
            type="button"
            onClick={() => setShowHint(v => !v)}
            aria-expanded={showHint}
            className="btn-ghost inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm"
          >
            <Lightbulb size={14} aria-hidden="true" />
            {showHint ? 'הסתר רמז' : 'רמז'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowSolution(v => !v)}
          aria-expanded={showSolution}
          className="btn-ghost inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm"
        >
          {showSolution ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
          {showSolution ? 'הסתר פתרון' : 'הצג פתרון'}
        </button>
      </div>
      {hint && showHint && <RichText body={hint} className="text-sm leading-6 text-text-dim" />}
      {showSolution && <CodeBlock html={solutionHtml} title={solutionTitle ?? 'פתרון אפשרי'} />}
    </section>
  )
}
