import { createHighlighter, type Highlighter } from 'shiki'
import type { CodeLang } from './types'

const THEME = 'github-dark-default'
const LANGS: CodeLang[] = ['ts', 'tsx', 'js', 'python', 'sql', 'bash', 'json', 'yaml']

// One highlighter per server instance — creating it loads every grammar.
let highlighterPromise: Promise<Highlighter> | null = null
function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({ themes: [THEME], langs: LANGS })
  return highlighterPromise
}

/**
 * Render code to HTML on the server. Each line carries `data-line` (the real
 * file line number when `startLine` is given) for the CSS gutter, and lines in
 * `marked` (1-based, relative to `code`) get the `is-marked` class.
 */
export async function highlight(
  code: string,
  lang: CodeLang,
  opts: { startLine?: number; marked?: ReadonlySet<number> } = {},
): Promise<string> {
  const highlighter = await getHighlighter()
  const startLine = opts.startLine ?? 1
  return highlighter.codeToHtml(code, {
    lang,
    theme: THEME,
    transformers: [
      {
        line(node, line) {
          node.properties['data-line'] = startLine + line - 1
          if (opts.marked?.has(line)) this.addClassToHast(node, 'is-marked')
        },
      },
    ],
  })
}
