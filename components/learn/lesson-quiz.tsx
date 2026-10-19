'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { RichText } from './rich-text'

interface Props {
  question: string
  options: string[]
  answer: number
  explanation: string
}

export function LessonQuiz({ question, options, answer, explanation }: Props) {
  const [picked, setPicked] = useState<number | null>(null)
  const answered = picked !== null
  const correct = picked === answer

  return (
    <section className="rounded-md border border-border bg-panel p-5 space-y-4">
      <p className="text-xs font-semibold text-amber tracking-widest">שאלה</p>
      <RichText body={question} />
      <div className="grid gap-2" role="radiogroup" aria-label="תשובות">
        {options.map((opt, i) => {
          const isPicked = picked === i
          const isAnswer = i === answer
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={isPicked}
              disabled={answered}
              onClick={() => setPicked(i)}
              className={cn(
                'text-start rounded-md border px-4 py-2.5 text-sm transition-colors',
                !answered && 'border-border hover:border-shade-2 hover:bg-panel-3',
                answered && isAnswer && 'border-green bg-green-tint',
                answered && isPicked && !isAnswer && 'border-red bg-red-tint',
                answered && !isPicked && !isAnswer && 'border-border opacity-60',
              )}
            >
              <RichText body={opt} className="text-sm leading-6" />
            </button>
          )
        })}
      </div>
      {answered && (
        <div className="space-y-3 border-t border-border pt-4">
          <p className={cn('flex items-center gap-2 text-sm font-semibold', correct ? 'text-green' : 'text-red')}>
            {correct ? <CheckCircle2 size={16} aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}
            {correct ? 'נכון!' : 'לא בדיוק.'}
          </p>
          <RichText body={explanation} className="space-y-2 text-sm leading-6 text-text-dim" />
          {!correct && (
            <button type="button" onClick={() => setPicked(null)} className="text-xs text-amber hover:underline">
              לנסות שוב
            </button>
          )}
        </div>
      )}
    </section>
  )
}
