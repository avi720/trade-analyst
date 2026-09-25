import { Fragment, type ReactNode } from 'react'

// Gemini answers in light markdown (`**bold**`, `* ` bullets) and the bubble used to render it
// raw. This renders just that subset — no HTML injection, no markdown dependency — and isolates
// numbers as LTR runs so a leading minus doesn't jump to the wrong side inside RTL text
// ("-802$" rendering as "802$-").

// A number token: ISO date, clock time, or an amount with an optional sign / $ / R / %.
// The sign is only taken when not glued to a letter, so the Hebrew prefix in "ב-1.22R" stays a
// hyphen instead of turning the value negative.
const NUMBER_RE =
  /(\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}|(?:(?<![\p{L}\p{N}])[-−+])?\$?\d[\d,]*(?:\.\d+)?(?:R|%|\$)?)/u

const BULLET_RE = /^\s*[*\-•]\s+/

function renderNumbers(text: string, keyPrefix: string): ReactNode[] {
  return text.split(NUMBER_RE).map((part, i) =>
    i % 2 === 1 ? (
      <span key={`${keyPrefix}-${i}`} dir="ltr" className="font-mono">
        {part}
      </span>
    ) : (
      <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>
    ),
  )
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // `code` spans: odd segments sit between a pair of backticks.
  return text.split('`').map((part, i) =>
    i % 2 === 1 ? (
      <span key={`${keyPrefix}-c${i}`} dir="ltr" className="font-mono">
        {part}
      </span>
    ) : (
      <Fragment key={`${keyPrefix}-c${i}`}>{renderBold(part, `${keyPrefix}-c${i}`)}</Fragment>
    ),
  )
}

function renderBold(text: string, keyPrefix: string): ReactNode[] {
  // Odd segments sit between a pair of `**`. An unpaired `**` is dropped rather than shown.
  return text.split('**').map((part, i) =>
    i % 2 === 1 ? (
      <strong key={`${keyPrefix}-${i}`} className="font-semibold">
        {renderNumbers(part, `${keyPrefix}-${i}`)}
      </strong>
    ) : (
      <Fragment key={`${keyPrefix}-${i}`}>{renderNumbers(part, `${keyPrefix}-${i}`)}</Fragment>
    ),
  )
}

export function ChatMessageText({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, '\n').trim().split('\n')

  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, i) => {
        if (line.trim() === '') return <div key={i} className="h-1" aria-hidden />

        if (BULLET_RE.test(line)) {
          const indented = /^\s{2,}/.test(line)
          return (
            <div key={i} className={`flex gap-2 ${indented ? 'ps-4' : ''}`}>
              <span className="text-text-dim" aria-hidden>
                •
              </span>
              <span className="min-w-0">{renderInline(line.replace(BULLET_RE, ''), `l${i}`)}</span>
            </div>
          )
        }

        return <p key={i}>{renderInline(line, `l${i}`)}</p>
      })}
    </div>
  )
}
