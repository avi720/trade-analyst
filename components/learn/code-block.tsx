// Frame for server-highlighted code (see lib/learn/highlight.ts). `html` is
// Shiki output for code that lives in this repo or in our own lesson files,
// never user input. No hooks, so client components can render it too.
export function CodeBlock({ html, title, meta }: { html: string; title?: string; meta?: string }) {
  return (
    <figure className="rounded-md border border-border bg-panel-2 overflow-hidden">
      {(title || meta) && (
        <figcaption className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border bg-panel-3 text-xs">
          {title && <span className="text-text-dim">{title}</span>}
          {meta && (
            <span dir="ltr" className="font-mono text-text-mute truncate">
              {meta}
            </span>
          )}
        </figcaption>
      )}
      <div dir="ltr" className="learn-code" dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  )
}
