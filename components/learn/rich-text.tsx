import { Fragment, type ReactNode } from 'react'

// Minimal lesson-prose renderer — the lesson bodies are our own strings, so
// this only needs the handful of constructs they use: blank line = paragraph,
// lines starting with `- ` = bullet list, `code` and **bold** inline.
// No hooks, so it renders in both server and client components.
export function RichText({ body, className }: { body: string; className?: string }) {
  const paragraphs = body.trim().split(/\n\s*\n/)
  return (
    <div className={className ?? 'space-y-3 text-[15px] leading-7 text-text-main'}>
      {paragraphs.map((para, i) => {
        const lines = para.split('\n')
        if (lines.every(l => l.trimStart().startsWith('- '))) {
          return (
            <ul key={i} className="list-disc ps-6 space-y-1">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.trimStart().slice(2))}</li>
              ))}
            </ul>
          )
        }
        return <p key={i}>{inline(lines.join(' '))}</p>
      })}
    </div>
  )
}

function inline(text: string): ReactNode {
  // Split on `code` first so ** inside code stays literal.
  return text.split(/(`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      return (
        <code
          key={i}
          dir="ltr"
          className="font-mono text-[13px] text-amber bg-panel-3 border border-border rounded px-1 py-0.5"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return (
      <Fragment key={i}>
        {part.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
          seg.startsWith('**') && seg.endsWith('**') && seg.length > 4 ? (
            <strong key={j} className="font-semibold text-white">
              {seg.slice(2, -2)}
            </strong>
          ) : (
            <Fragment key={j}>{seg}</Fragment>
          ),
        )}
      </Fragment>
    )
  })
}
