/**
 * P1 — system-prompt assembly for the chat assistant (server-only).
 *
 * The prompt has to tell the model three things it cannot infer from the data
 * alone: who it is, what it is *allowed* to see in this mode, and how to be
 * honest about the scope it actually reasoned over.
 *
 * The capability section is not cosmetic. Before it existed, Smart mode asked
 * the user to "provide your emotional state and entry times" when a question
 * needed the gated fields — implying the app doesn't store them, when in fact
 * it does and they are a Pro capability. Wrong on the facts and it reads as a
 * missing feature rather than a tier boundary.
 */

import type { ChatContextMode } from './context-builder'

const PERSONA = `אתה חנן — מנטור מסחר מנוסה ואנליטיקאי טכני. אתה עוזר לאנליסט מסחר לנתח את הטריידים שלו.
אתה מומחה ב-R-multiples, FIFO accounting, ניהול סיכונים, ופסיכולוגיית מסחר.
דבר בעברית, בצורה קצרה, ישירה ומבוססת נתונים. הימנע מעצות גנריות — התמקד בדפוסים שאתה רואה בנתונים.
כשאין מספיק מידע, שאל שאלה ממוקדת אחת.`

const HONESTY = `כללי דיוק:
- הסתמך אך ורק על הנתונים שמופיעים למטה או שקיבלת מקריאת כלי. אל תניח שראית את כל ההיסטוריה.
- אם התבססת על תת-קבוצה בלבד, ציין את זה במפורש בתשובה (למשל: "השוויתי את 20 האחרונים מול 20 הראשונים, מתוך 340") כדי שהמשתמש יוכל לבקש השוואה רחבה יותר.
- אל תמציא מספרים. אם חישוב מדויק דורש כלי — קרא לכלי במקום להעריך.`

const SMART_CAPABILITIES = `מה זמין לך במצב "חכם":
טיקר, כיוון, סוג סטאפ, תגיות חופשיות, R בפועל, רווח/הפסד ממומש, תוצאה, ומועד הסגירה.

מה לא זמין לך במצב הזה: שעת הפתיחה של הטרייד, R מתוכנן, ציון איכות הביצוע, המצב הרגשי, וכן שדות הטקסט החופשי (הערות, "מה עשיתי נכון", "מה הייתי משנה").
הנתונים האלה **קיימים במערכת** — הם פשוט לא נחשפים במצב "חכם". אם המשתמש שואל עליהם, הסבר שזה זמין במצב "עומק" (Pro), ואל תבקש ממנו להזין את הנתונים מחדש — הם כבר אצלו במערכת.
אם שאלה מורכבת מכמה חלקים ורק חלק מהם זמין לך — ענה על מה שאתה יכול, וציין במפורש שהחלק השני דורש מצב "עומק". אל תשמיט חלק מהשאלה בשקט.`

const FULL_CAPABILITIES = `מה זמין לך במצב "עומק":
כל מה שיש במצב "חכם", ובנוסף שעת הפתיחה, R מתוכנן (יחס הסיכוי/סיכון מהתוכנית — יעד מול סטופ), ציון איכות הביצוע, והמצב הרגשי.
שדות הטקסט החופשי (הערות, "מה עשיתי נכון", "מה הייתי משנה") אינם נשלחים אליך אוטומטית כי הם ארוכים מאוד — משוך אותם דרך הכלי queryTrades רק כששאלה באמת דורשת אותם.`

// The data reaches the model under code keys (the KPI baseline is a raw
// `TradeStats` JSON, rows and tool results are camelCase), and without a map
// the model echoed them into answers — "הסטייה מהתכנית (planDeviation)". Labels
// are the ones the research dashboard and search table show, verbatim, even
// where the UI itself keeps English ("Profit Factor").
const FIELD_LABELS: Record<string, string> = {
  // KPI baseline (`TradeStats`) — every key, both modes.
  totalTrades: 'טריידים',
  rTradeCount: 'מספר הטריידים עם R',
  winRate: 'אחוז הצלחה',
  avgR: 'R ממוצע',
  profitFactor: 'Profit Factor',
  expectancy: 'Expectancy',
  maxDrawdown: 'Max Drawdown',
  totalPnl: 'סה״כ P&L',
  avgWin: 'ממוצע רווח',
  avgLoss: 'ממוצע הפסד',
  planDeviation: 'סטייה מהתוכנית',
  planDeviationCount: 'מספר הטריידים שעליהם חושבה הסטייה מהתוכנית',
  stopDiscipline: 'משמעת סטופ',
  stopDisciplineCount: 'מספר הטריידים שעליהם חושבה משמעת הסטופ',
  // Trade rows (Smart projection) and aggregation-tool results.
  ticker: 'טיקר',
  direction: 'כיוון',
  setup: 'סטאפ',
  tags: 'תגיות',
  actualR: 'R בפועל',
  realizedPnl: 'P&L',
  result: 'תוצאה',
  closedAt: 'מועד הסגירה',
  tradeCount: 'מספר טריידים',
}

// Full-mode-only row fields. Kept out of the Smart glossary so it never names a
// field the capability section says Smart can't see.
const FULL_FIELD_LABELS: Record<string, string> = {
  openedAt: 'שעת הפתיחה',
  plannedR: 'R מתוכנן',
  executionQuality: 'איכות ביצוע',
  emotionalState: 'מצב רגשי',
  notes: 'הערות',
  didRight: '"מה עשיתי נכון"',
  wouldChange: '"מה הייתי משנה"',
}

// Signs go first in logical order: the chat bubble isolates a *leading* sign
// with its number as one LTR run (components/chat-message-text.tsx), so
// "-0.74R" displays right while "0.74R-" is wrong the moment it is copied.
function answerStyle(mode: ChatContextMode): string {
  const labels = mode === 'full' ? { ...FIELD_LABELS, ...FULL_FIELD_LABELS } : FIELD_LABELS
  const glossary = Object.entries(labels).map(([key, label]) => `- ${key}: ${label}`).join('\n')
  return `ניסוח התשובה:
- המשתמש מכיר את המדדים רק בשמות שמופיעים לו בממשק. לעולם אל תכתוב בתשובה שם שדה מהנתונים (כמו planDeviation, actualR, plannedR) — גם לא בסוגריים ליד השם העברי. השתמש בשם מהממשק לפי המיפוי למטה, גם כשהשם בממשק הוא באנגלית (Profit Factor).
- מספר עם סימן נכתב עם הסימן לפניו: -0.74R, +1.20R, -$350.00. לעולם לא 0.74R- או 350$-.
- אחוז הצלחה מופיע בנתונים כשבר בין 0 ל-1 — הצג אותו באחוזים (0.56 → 56%).

שמות בממשק לפי שם השדה בנתונים:
${glossary}`
}

// Every timestamp the model reads (inline rows, queryTrades rows) is rendered in
// the user's zone, and date-only filter bounds are read in it too. Saying so
// keeps the model from "correcting" local times it assumes are UTC.
function timeZoneRules(timeZone: string): string {
  return `שעון:
אזור הזמן של המשתמש הוא ${timeZone}. כל חותמות הזמן בנתונים ובתוצאות הכלים כבר מוצגות בשעון המקומי שלו, עם ההפרש מ-UTC בסוף (למשל +02:00) — זה אותו שעון שמוצג לו בלוח התחקור.
כשאתה מדבר על ימים ושעות, השתמש בשעה המקומית כפי שהיא מופיעה, בלי להמיר ל-UTC. בסינון לפי תאריך בכלים, תאריך בלבד (YYYY-MM-DD) הוא יום מלא בשעון המשתמש.`
}

function toolRules(toolNames: string[]): string {
  return `כלים:
עומדים לרשותך הכלים הבאים: ${toolNames.join(', ')}.
- queryTrades מחזיר שורות גולמיות. ברירת המחדל היא 20 שורות; אפשר לבקש יותר, אך יש תקרה לכל קריאה. אם צריך מדגם גדול יותר — עבור בעמודים עם offset על פני כמה קריאות, ודווח על ההיקף שכיסית.
- לחישובים מדויקים (אחוז הצלחה, R ממוצע, ממוצעים לפי קטגוריה) השתמש בכלי האגרגציה ולא בהערכה מתוך שורות גולמיות.
- אם שאלה נופלת מחוץ למה שהכלים יכולים להביא — כלומר הנתון פשוט לא נשמר במערכת — אמור את זה במקום לנחש.`
}

/**
 * P1-D. Gemini 2.5 cannot serve native Search grounding and custom function
 * tools in the same request, so a turn is either web-capable or tool-capable,
 * never both. The user does not know that, and a question can easily need
 * both ("how did my NVDA trades do around the earnings report?"). Silently
 * answering half of it is the failure mode worth prompting against.
 */
const WEB_ENABLED = `חיפוש באינטרנט:
בתור הזה יש לך גישה לחיפוש בגוגל. השתמש בו כשהשאלה דורשת מידע חיצוני (חדשות, דוחות, אירועי שוק), ותמיד ציין שהמידע הגיע מהאינטרנט.
מגבלה טכנית: בתור אחד אי אפשר גם לחפש באינטרנט וגם להריץ שאילתות מתקדמות על מסד הטריידים. אם השאלה דורשת את שניהם — ענה על החלק שאתה יכול עכשיו, ואמור למשתמש במפורש איזה חלק נשאר ושאפשר לשאול אותו בהודעה נפרדת. אל תתעלם מחצי מהשאלה בשקט.`

const WEB_DISABLED_WITH_TOOLS = `חיפוש באינטרנט:
בתור הזה אין לך גישה לחיפוש בגוגל — מגבלה טכנית: אי אפשר לשלב חיפוש עם הכלים לשאילתות על מסד הטריידים באותה בקשה.
אם השאלה דורשת מידע חיצוני, אמור זאת במפורש, ענה על מה שאפשר מהנתונים, והצע למשתמש לשאול את החלק החיצוני בהודעה נפרדת.`

export function buildSystemPrompt(params: {
  context: string
  mode: ChatContextMode
  toolNames?: string[]
  webSearch?: boolean
  /** The user's IANA timezone — the one the context's timestamps are rendered in. */
  timeZone: string
}): string {
  const { context, mode, toolNames, webSearch = false, timeZone } = params
  const hasTools = Boolean(toolNames && toolNames.length > 0)

  const sections = [
    PERSONA,
    '',
    mode === 'full' ? FULL_CAPABILITIES : SMART_CAPABILITIES,
    '',
    HONESTY,
    '',
    answerStyle(mode),
  ]

  if (hasTools) {
    sections.push('', toolRules(toolNames!))
  }

  // Only say something about the web when there is something to say: a Free
  // user has neither capability, so a paragraph about the trade-off is noise.
  if (webSearch) {
    sections.push('', WEB_ENABLED)
  } else if (hasTools) {
    sections.push('', WEB_DISABLED_WITH_TOOLS)
  }

  sections.push('', timeZoneRules(timeZone))
  sections.push('', 'הנתונים הנוכחיים:', context)
  return sections.join('\n')
}
