import type { Track } from '../types'

export const tsTrack: Track = {
  id: 'ts',
  title: 'TypeScript',
  description: 'טיפוסים שמונעים באגים לפני שהקוד רץ — מהטיפוסים של טרייד ועד ה-union של פעולות FIFO.',
  lessons: [
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Basic types
    // ─────────────────────────────────────────────────────────────────────────
    {
      slug: 'ts-basic-types',
      title: 'טיפוסים בסיסיים: annotations, null ו-union של מחרוזות',
      summary: 'איך `calcActualR` ו-`OpenTradeSnapshot` מתארים R, סטופ וכיוון פוזיציה — `number | null`, `\'Long\' | \'Short\'`, interface ו-type.',
      minutes: 14,
      blocks: [
        {
          kind: 'text',
          body: `TypeScript הוא JavaScript עם **טיפוסים**. כותבים אחרי שם של משתנה, פרמטר או פונקציה נקודתיים וטיפוס (\`: number\`), והקומפיילר בודק לפני שהקוד רץ שכל השימושים מתאימים. בזמן ריצה הטיפוסים **נמחקים** — הדפדפן ו-Node מריצים JavaScript רגיל. כל התועלת היא בזמן הכתיבה: העורך והקומפיילר (\`npm run build\`) צועקים עליך לפני שהבאג מגיע לטרייד אמיתי.

נתחיל מהפונקציה שמחשבת את ה-R בפועל של טרייד סגור — כמה פעמים הרווח גדול מהסיכון שתכננת:`,
        },
        {
          kind: 'source',
          title: 'חישוב R בפועל',
          ref: { file: 'lib/trade/fifo.ts', start: 'export function calcActualR(', lines: 11 },
          notes: [
            { match: 'totalRealizedPnl: number', text: 'annotation של פרמטר: `totalRealizedPnl` חייב להיות מספר. קריאה כמו `calcActualR(\'100\', ...)` לא תעבור קומפילציה — מחרוזת אינה `number`.' },
            { match: 'stopPrice: number | null', text: '**union**: הסטופ הוא מספר **או** `null`. טרייד בלי סטופ הוא מצב לגיטימי באתר, והטיפוס אומר את זה במפורש — מי שקורא לפונקציה יודע שמותר להעביר `null`.' },
            { match: '): number | null {', text: 'טיפוס ההחזרה. גם התוצאה יכולה להיות `null` — ומי שמשתמש בה (למשל `resultFromR`) חייב להתמודד עם זה.' },
            { match: 'if (stopPrice === null) return null', text: 'כאן קורה **narrowing**: אחרי השורה הזו הקומפיילר יודע ש-`stopPrice` הוא `number` בלבד, ולכן מותר לחסר אותו בשורה הבאה. בלי הבדיקה הזו — שגיאת קומפילציה.' },
          ],
        },
        {
          kind: 'text',
          body: `למה \`null\` ולא פשוט \`0\`? כי \`0\` הוא R אמיתי — טרייד שנסגר בדיוק באיזון. אם טרייד בלי סטופ היה מקבל \`actualR = 0\`, הוא היה נכנס לממוצע ה-R בדשבורד המחקר ומושך אותו לאפס. \`null\` אומר "אין R לטרייד הזה", והטיפוס \`number | null\` מכריח כל מי שמשתמש בערך להחליט מה לעשות במקרה הזה.

אותו רעיון בשורה השנייה של ה-guard: \`riskPerShare < MIN_RISK_PER_SHARE\` מחזיר \`null\` כדי שחלוקה במרחק סטופ כמעט-אפס לא תייצר \`Infinity\`.`,
        },
        {
          kind: 'quiz',
          question: 'מוחקים מ-`calcActualR` את השורה `if (stopPrice === null) return null`. מה יגיד הקומפיילר על `Math.abs(avgEntryPrice - stopPrice)`?',
          options: [
            'כלום — `null` הופך ל-`0` בחיסור, אז זה תקין',
            "`'stopPrice' is possibly 'null'.`",
            "`Cannot find name 'stopPrice'.`",
            'הקוד יתקמפל, אבל `npm run build` ייכשל רק בזמן ריצה',
          ],
          answer: 1,
          explanation: 'במצב `strict` (מופעל ב-`tsconfig.json` של האתר) TypeScript לא מרשה לבצע חשבון על ערך שעלול להיות `null`. ב-JS נקי `100 - null` הוא `100` — כלומר R שגוי בשקט. TS הופך את זה לשגיאה גלויה.',
        },
        {
          kind: 'text',
          body: `**interface** מתאר צורה של אובייקט: אילו שדות יש לו ומה הטיפוס של כל אחד. הנה התמונה המינימלית של פוזיציה פתוחה שמנוע ה-FIFO מקבל:`,
        },
        {
          kind: 'source',
          title: 'פוזיציה פתוחה, כפי ש-FIFO רואה אותה',
          ref: { file: 'types/trade.ts', start: 'export interface OpenTradeSnapshot {' },
          notes: [
            { match: "direction: 'Long' | 'Short'", text: '**union של מחרוזות ליטרליות**: לא כל `string`, אלא בדיוק אחת משתי המילים האלה. `\'long\'` באות קטנה, `\'Buy\'` או `\'\'` — כולם שגיאת קומפילציה.' },
            { match: 'totalQuantity: number', text: 'ההערה "positive" היא חוזה שהטיפוס לא יכול לבטא — ל-TS אין טיפוס של "מספר חיובי". מה שהטיפוסים לא תופסים, תופסת ולידציה בזמן ריצה (שיעור zod).' },
            { match: 'openedAt: Date', text: 'גם מחלקות מובנות הן טיפוסים. כאן זה `Date` ולא מחרוזת ISO — `processExecutions` ממיר את המחרוזת שחוזרת מהמסד עם `new Date(...)` לפני שהוא בונה את ה-snapshot.' },
          ],
        },
        {
          kind: 'compare',
          left: {
            lang: 'js',
            title: 'JavaScript — הטעות מתגלה בזמן ריצה (או לעולם לא)',
            code: `function calcPnl(direction, avgEntry, exitPrice, qty) {
  return direction === 'Lnog'          // typo
    ? (exitPrice - avgEntry) * qty
    : (avgEntry - exitPrice) * qty
}
// Every Long is silently computed as a Short`,
          },
          right: {
            lang: 'ts',
            title: 'TypeScript — הטעות לא עוברת קומפילציה',
            code: `function calcPnl(direction: 'Long' | 'Short', avgEntry: number, exitPrice: number, qty: number): number {
  return direction === 'Lnog'
  //     ~~~~~~~~~~~~~~~~~~~~
  // This comparison appears to be unintentional because the types
  // '"Long" | "Short"' and '"Lnog"' have no overlap.
    ? (exitPrice - avgEntry) * qty
    : (avgEntry - exitPrice) * qty
}`,
          },
        },
        {
          kind: 'source',
          title: 'שדות אופציונליים — עדכון חלקי של טרייד',
          ref: { file: 'types/trade.ts', start: 'export interface TradeUpdate {' },
          notes: [
            { match: 'avgEntryPrice?: number', text: 'סימן השאלה אומר שהשדה **אופציונלי** — מותר שלא יופיע בכלל. עדכון של REDUCE מכיל רק כמות, רווח ועמלה; אין טעם לשלוח את כל הטרייד מחדש.' },
            { match: "status?: 'Open' | 'Closed'", text: 'אופציונלי + union: אם השדה קיים, הוא חייב להיות אחד משני הסטטוסים. רק CLOSE ו-REVERSAL שולחים `status: \'Closed\'`.' },
            { match: "result?: 'Win' | 'Loss' | 'Breakeven' | null", text: 'שלושה מצבים שונים: השדה חסר (לא נוגעים בו), `null` (אין סיווג), או אחת משלוש התוצאות — אותן מחרוזות בדיוק ש-`resultFromR` מחזירה.' },
          ],
        },
        {
          kind: 'text',
          body: `**interface או type?** שניהם יכולים לתאר אובייקט, וב-repo תראו את שניהם. ההבדל המעשי: \`type\` (type alias) יכול לתת שם לכל טיפוס — כולל union כמו \`type Direction = 'Long' | 'Short'\` — ו-interface מתאר רק צורת אובייקט. לכן \`FifoAction\` (השיעור הבא) הוא \`type\`: הוא union של חמש צורות, ואת זה interface לא יודע לבטא.

עכשיו מקרה שבו הטיפוסים פוגשים את המציאות — שורה גולמית מהמסד נתונים, שבה \`direction\` הוא סתם \`string\`:`,
        },
        {
          kind: 'source',
          title: 'משורה גולמית ל-ClosedTrade',
          ref: { file: 'components/research/lib.ts', start: 'export function toClosedTrade(' },
          notes: [
            { match: 'ClosedTrade | null {', text: 'הפונקציה מחזירה `null` כשחסרים שדות חובה — במקום לזרוק שגיאה או להחזיר אובייקט חצי-תקין.' },
            { match: 'if (t.realizedPnl == null || !t.closedAt) return null', text: 'ב-`RawClosedTrade` השדה `realizedPnl` הוא `number | null`, אבל ב-`ClosedTrade` הוא `number`. הבדיקה הזו (narrowing) היא מה שמאפשר לשים אותו בשדה בהמשך. `== null` תופס גם `null` וגם `undefined`.' },
            { match: "direction: t.direction as 'Long' | 'Short'", text: '`as` הוא **הבטחה** לקומפיילר, לא בדיקה. העמודה במסד היא `text`, אז הטיפוס שנוצר ממנה הוא `string`; ה-`as` אומר "סמוך עליי, זה תמיד Long או Short". אם תיכנס שורה עם ערך אחר — TS לא יעצור אותה.' },
            { match: 'tags: t.tags ?? []', text: '`string[] | null` הופך ל-`string[]` עם `??`. הטיפוס של התוצאה מתאים ל-`tags: string[]` ב-`ClosedTrade`.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: 'כל `as` הוא מקום שבו ויתרתם על הבדיקה. הוא לגיטימי כשאתם **יודעים** משהו שהקומפיילר לא יודע (כאן: האתר כותב לעמודה רק `Long`/`Short`), אבל כשאתם רואים `as` בקוד ששיניתם — תשאלו מה יקרה אם ההנחה לא נכונה. בשיעור 3 נראה איך מחליפים `as` כזה ב-type guard אמיתי.',
        },
        {
          kind: 'quiz',
          question: "יש `const t: OpenTradeSnapshot = { ...snapshot, direction: 'long' }`. מה קורה?",
          options: [
            'עובר — TS לא מבחין בין אותיות גדולות לקטנות',
            "שגיאה: `Type '\"long\"' is not assignable to type '\"Long\" | \"Short\"'.`",
            'עובר, אבל `direction` יהפוך ל-`string`',
            'שגיאה רק אם מפעילים את הקוד',
          ],
          answer: 1,
          explanation: 'union של ליטרלים מתיר רק את הערכים המדויקים. `\'long\'` הוא ליטרל אחר לגמרי מ-`\'Long\'`, וההשמה נדחית כבר בעורך. זה בדיוק הבאג שב-JS היה הופך כל לונג לשורט בחישוב הרווח.',
        },
        {
          kind: 'exercise',
          prompt: 'כתבו ב-TypeScript `type Direction` לכיוון פוזיציה, ופונקציה `riskPerShare(direction, entry, stop)` שמחזירה את הסיכון למניה. `stop` יכול להיות `null` (אין סטופ) — ואז מחזירים `null`. גם סטופ בצד הלא נכון (סיכון אפס או שלילי) מחזיר `null`. תנו annotation לכל פרמטר ולערך ההחזרה.',
          hint: 'בלונג הסיכון הוא כניסה פחות סטופ, בשורט ההפך. בדקו `stop === null` לפני החיסור — אחרת הקומפיילר לא ייתן לחסר.',
          solution: {
            lang: 'ts',
            code: `type Direction = 'Long' | 'Short'

function riskPerShare(direction: Direction, entry: number, stop: number | null): number | null {
  if (stop === null) return null
  // stop is narrowed to number from here on
  const risk = direction === 'Long' ? entry - stop : stop - entry
  return risk > 0 ? risk : null
}

riskPerShare('Long', 100, 95)    // 5
riskPerShare('Short', 50, 52)    // 2
riskPerShare('Long', 100, null)  // null
riskPerShare('long', 100, 95)    // compile error`,
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Discriminated unions
    // ─────────────────────────────────────────────────────────────────────────
    {
      slug: 'ts-discriminated-unions',
      title: 'Discriminated unions: חמש הפעולות של FIFO',
      summary: 'איך `FifoAction` מתאר `OPEN | SCALE_IN | REDUCE | CLOSE | REVERSAL`, איך `switch (action.type)` מצמצם אותו, ומתי הקומפיילר תופס case חסר.',
      minutes: 16,
      blocks: [
        {
          kind: 'text',
          body: `\`matchExecution\` מקבלת ביצוע מהברוקר ומחליטה מה הוא עושה לפוזיציה: פותח חדשה, מוסיף, מקטין, סוגר — או סוגר והופך כיוון. לכל מקרה יש **מידע שונה**: פתיחה צריכה ליצור טרייד חדש (אין עדיין \`tradeId\`), סגירה צריכה לעדכן טרייד קיים, והיפוך צריך את שניהם.

איך מתארים ערך שיכול להיות אחת מכמה צורות שונות? עם **discriminated union** — union של אובייקטים, שלכל אחד מהם שדה משותף עם ערך ליטרלי שונה. השדה הזה (כאן \`type\`) נקרא ה-**discriminant**:`,
        },
        {
          kind: 'source',
          title: 'FifoAction',
          ref: { file: 'types/trade.ts', start: 'export type FifoAction =', lines: 10 },
          notes: [
            { match: "type: 'OPEN';", text: 'ה-discriminant: ליטרל `\'OPEN\'`, לא `string`. ל-OPEN יש `tradeCreate` ואין `tradeId` — עוד אין טרייד במסד.' },
            { match: "type: 'SCALE_IN'; tradeId", text: 'SCALE_IN, REDUCE ו-CLOSE חולקים את אותה צורה (`tradeId` + `tradeUpdate`), אבל כל אחד עם ליטרל משלו — כדי שהקוד שמבצע את הכתיבה ידע בדיוק מה לעדכן.' },
            { match: "type: 'REVERSAL'", text: 'היפוך מכיל שני חלקים מקוננים: `close` לטרייד הקיים ו-`open` לטרייד ההפוך. שתי כתיבות שחייבות לקרות ביחד — ולכן נשלחות ל-RPC אחד (`reverse_position`) בטרנזקציה אחת.' },
          ],
        },
        {
          kind: 'compare',
          left: {
            lang: 'ts',
            title: 'בלי union — "שק" של שדות אופציונליים',
            code: `interface LooseAction {
  type: string
  tradeId?: string
  tradeCreate?: TradeCreate
  tradeUpdate?: TradeUpdate
  close?: { tradeId: string; tradeUpdate: TradeUpdate }
}

// Nothing stops { type: 'CLOSE' } with no tradeId,
// and every read needs a "!" or an if:
update(action.tradeId!, action.tradeUpdate!)`,
          },
          right: {
            lang: 'ts',
            title: 'עם discriminated union',
            code: `type Action =
  | { type: 'OPEN'; tradeCreate: TradeCreate }
  | { type: 'CLOSE'; tradeId: string; tradeUpdate: TradeUpdate }

// { type: 'CLOSE' } without tradeId -> compile error.
if (action.type === 'CLOSE') {
  update(action.tradeId, action.tradeUpdate) // both guaranteed
}`,
          },
        },
        {
          kind: 'text',
          body: `הקסם קורה כשבודקים את ה-discriminant: בתוך \`case "OPEN"\` הקומפיילר יודע ש-\`action\` הוא **רק** הווריאנט של OPEN, ונותן לגשת ל-\`action.tradeCreate\`. בתוך \`case "SCALE_IN"\` — רק ל-\`tradeId\` ו-\`tradeUpdate\`. זה נקרא **narrowing**, והנה זה בפעולה בקוד ששומר את הפעולות במסד:`,
        },
        {
          kind: 'source',
          title: 'persistAction — switch על הסוג',
          ref: { file: 'lib/ibkr/process-executions.ts', start: 'async function persistAction(', end: 'case "SCALE_IN": {' },
          notes: [
            { match: 'action: FifoAction,', text: 'הפרמטר הוא ה-union כולו — בשלב הזה TS לא יודע איזה מהחמישה הגיע, ולכן מרשה לגשת רק ל-`action.type` (השדה היחיד שקיים בכולם).' },
            { match: '): Promise<string> {', text: 'הפונקציה מבטיחה להחזיר `string` (ה-id של הטרייד) בכל מסלול. נחזור לזה בעוד רגע — ההבטחה הזו היא מה שהופך את ה-switch לבדיקת שלמות.' },
            { match: 'switch (action.type) {', text: 'switch על ה-discriminant. כל `case` מצמצם את `action` לווריאנט אחד.' },
            { match: 'buildTradeInsert(action.tradeCreate, userId)', text: 'כאן `action` כבר מצומצם ל-`{ type: \'OPEN\'; tradeCreate; orderCreate }`, ולכן `action.tradeCreate` מתקמפל — בלי `!` ובלי `as`.' },
          ],
        },
        {
          kind: 'source',
          title: 'בתוך case של REVERSAL',
          ref: { file: 'lib/ibkr/process-executions.ts', start: 'case "REVERSAL": {', end: 'const u = close.tradeUpdate;' },
          notes: [
            { match: 'const { close, open } = action;', text: 'destructuring של `close` ו-`open` עובר רק כאן — אלה שדות שקיימים אך ורק בווריאנט REVERSAL.' },
            { match: 'const u = close.tradeUpdate;', text: '`close` מוקלד במלואו (`{ tradeId; tradeUpdate; orderCreate }`), אז גם `u` הוא `TradeUpdate` — והשלמה אוטומטית בעורך עובדת עד הסוף.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'בתוך `case "SCALE_IN"` מישהו כותב `action.tradeCreate.ticker`. מה קורה?',
          options: [
            'מחזיר `undefined` בזמן ריצה',
            "שגיאת קומפילציה: `Property 'tradeCreate' does not exist on type '{ type: \"SCALE_IN\"; tradeId: string; ... }'`",
            'עובר, כי `tradeCreate` קיים בווריאנט OPEN',
            'שגיאה רק אם `strict` כבוי',
          ],
          answer: 1,
          explanation: 'אחרי ה-narrowing, `action` הוא רק הווריאנט של SCALE_IN — ואין בו `tradeCreate`. העובדה שהשדה קיים בווריאנט אחר לא עוזרת: TS יודע שבענף הזה זה לא OPEN. ב-JS היה כאן `TypeError: Cannot read properties of undefined` בזמן סנכרון.',
        },
        {
          kind: 'text',
          body: `**שלמות (exhaustiveness).** שימו לב של-\`persistAction\` אין \`default\` ואין \`return\` אחרי ה-switch, ובכל זאת היא מבטיחה \`Promise<string>\`. זה עובר כי TS מבין שה-switch מכסה את כל חמשת הערכים של \`action.type\`, ולכן אי אפשר להגיע לסוף הפונקציה.

עכשיו נניח שמחר מוסיפים ל-\`FifoAction\` ווריאנט שישי, \`{ type: 'SPLIT'; ... }\`. פתאום יש מסלול שבו אף \`case\` לא תופס, הפונקציה "נופלת" לסוף ומחזירה \`undefined\` — והקומפיילר מסמן את החתימה שלה:

\`Function lacks ending return statement and return type does not include 'undefined'.\`

כלומר: הטיפוס מצביע לך בדיוק על המקום שצריך לעדכן. כשהפונקציה לא מחזירה ערך, משיגים את אותה הגנה בעזרת \`never\` — טיפוס שאין לו אף ערך:`,
        },
        {
          kind: 'snippet',
          lang: 'ts',
          title: 'בדיקת שלמות מפורשת עם never',
          code: `function logAction(action: FifoAction): void {
  switch (action.type) {
    case 'OPEN':     console.log('open', action.tradeCreate.ticker); break
    case 'SCALE_IN':
    case 'REDUCE':
    case 'CLOSE':    console.log(action.type, action.tradeId); break
    case 'REVERSAL': console.log('flip', action.close.tradeId); break
    default: {
      // If every case is handled, action is 'never' here.
      // Add a 6th variant and this line fails:
      // Type '{ type: "SPLIT"; ... }' is not assignable to type 'never'.
      const unreachable: never = action
      throw new Error('Unhandled action: ' + JSON.stringify(unreachable))
    }
  }
}`,
        },
        {
          kind: 'text',
          body: `אותו דפוס בדיוק מניע את פלטפורמת הלמידה הזו. כל בלוק בשיעור — טקסט, קוד, חידון — הוא ווריאנט של \`Block\`, וה-discriminant נקרא כאן \`kind\` (השם לא משנה, רק שיהיה משותף לכולם וליטרלי):`,
        },
        {
          kind: 'source',
          title: 'Block — הבלוקים של שיעור',
          ref: { file: 'lib/learn/types.ts', start: 'export type Block =', end: "kind: 'exercise'" },
          notes: [
            { match: "{ kind: 'text'; body: string }", text: 'הווריאנט הפשוט ביותר: רק טקסט.' },
            { match: "kind: 'source'; ref: SourceRef", text: 'בלוק `source` לא מכיל קוד — רק הפניה (`ref`) לקובץ ולעוגן. הקוד נקרא מהדיסק בזמן הרינדור.' },
            { match: "({ kind: 'snippet' } & CodeSample)", text: '`&` הוא **intersection**: האובייקט הוא גם `{ kind: \'snippet\' }` וגם `CodeSample` (`lang`, `code`, `title`). דרך לשלב טיפוס קיים בתוך ווריאנט בלי להעתיק את השדות שלו.' },
          ],
        },
        {
          kind: 'source',
          title: 'renderBlock — switch על kind',
          ref: { file: 'app/(dashboard)/admin/learn/[slug]/page.tsx', start: 'async function renderBlock(', end: "case 'callout':" },
          notes: [
            { match: 'Promise<React.ReactNode>', text: 'טיפוס ההחזרה הוא `ReactNode` — וזה חשוב לשאלה הבאה: `ReactNode` **כולל** את `undefined`.' },
            { match: 'switch (block.kind) {', text: 'אותו narrowing כמו ב-`persistAction`: בכל case, `block` הוא ווריאנט אחד.' },
            { match: 'body={block.body}', text: '`block.body` מתקמפל רק כי ב-case הזה `block` מצומצם ל-`{ kind: \'text\'; body: string }`.' },
          ],
        },
        {
          kind: 'quiz',
          question: "מוסיפים ל-`Block` ווריאנט חדש `{ kind: 'video'; url: string }` ולא נוגעים ב-`renderBlock`. מה קורה?",
          options: [
            'שגיאת קומפילציה ב-`renderBlock`: חסר case',
            'הקוד מתקמפל, ובלוקי וידאו פשוט לא מוצגים — `renderBlock` מחזירה `undefined`',
            'שגיאת קומפילציה ב-`lib/learn/types.ts`',
            'React זורק שגיאה בזמן ריצה',
          ],
          answer: 1,
          explanation: 'בשונה מ-`persistAction` (שמבטיחה `string`), כאן טיפוס ההחזרה `ReactNode` כולל `undefined` — אז "ליפול" לסוף הפונקציה זה חוקי, ו-React מרנדר `undefined` כלום. כדי שהקומפיילר יתפוס את זה צריך `default` עם `const unreachable: never = block`. ההגנה מגיעה מהטיפוסים רק כשמבקשים אותה.',
        },
        {
          kind: 'exercise',
          prompt: 'כתבו `existingTradeId(action: FifoAction): string | null` שמחזירה את ה-id של הטרייד **הקיים** שהפעולה נוגעת בו: `null` ל-OPEN, `tradeId` ל-SCALE_IN/REDUCE/CLOSE, ו-`close.tradeId` ל-REVERSAL. הוסיפו `default` עם בדיקת `never`.',
          hint: 'אפשר לשרשר כמה `case` ברצף בלי `break` ביניהם — TS מצמצם ל-union של שלושתם, ולכולם יש `tradeId`.',
          solution: {
            lang: 'ts',
            code: `import type { FifoAction } from '@/types/trade'

function existingTradeId(action: FifoAction): string | null {
  switch (action.type) {
    case 'OPEN':
      return null
    case 'SCALE_IN':
    case 'REDUCE':
    case 'CLOSE':
      return action.tradeId          // narrowed to the 3 variants
    case 'REVERSAL':
      return action.close.tradeId
    default: {
      const unreachable: never = action
      throw new Error('Unhandled FifoAction: ' + JSON.stringify(unreachable))
    }
  }
}`,
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Narrowing & type guards
    // ─────────────────────────────────────────────────────────────────────────
    {
      slug: 'ts-narrowing-type-guards',
      title: 'Narrowing ו-type guards: מ-unknown למשהו שאפשר לסמוך עליו',
      summary: '`typeof`, truthiness, `instanceof`, `in` ו-type predicates (`x is string`) — דרך הכלים של חנן, דף הבריאות, ה-Excerpt של פלטפורמת הלמידה.',
      minutes: 16,
      blocks: [
        {
          kind: 'text',
          body: `**Narrowing** הוא היכולת של TS לעקוב אחרי הקוד ולצמצם טיפוס לפי הבדיקות שעשית. כבר ראינו שתי צורות: \`if (stopPrice === null) return null\` ו-\`switch (action.type)\`. יש עוד כמה, וכולן עונות על אותה שאלה: "מה אני **יודע** על הערך הזה בשורה הזו?"

המקום שבו זה הכי חשוב הוא גבול המערכת — נתונים שמגיעים מבחוץ. הכלים של חנן מקבלים ארגומנטים שהמודל (Gemini) כתב כ-JSON, ואין שום הבטחה שהם בצורה הנכונה. לכן הם מוקלדים כ-\`unknown\`:`,
        },
        {
          kind: 'source',
          title: 'המרת ארגומנטים של המודל',
          ref: { file: 'lib/chat/tools/query-trades.ts', start: 'function asString(v: unknown)', lines: 16 },
          notes: [
            { match: 'function asString(v: unknown)', text: '`unknown` אומר "יכול להיות כל דבר — ואסור לך לגעת בו עד שתבדוק". אי אפשר לקרוא ל-`v.trim()` ישירות.' },
            { match: "typeof v === 'string' && v.trim()", text: '`typeof` מצמצם: בצד הימני של `&&` הקומפיילר כבר יודע ש-`v` הוא `string`, ולכן `.trim()` מותר.' },
            { match: "if (typeof v === 'number' && Number.isFinite(v))", text: 'מודל יכול להחזיר `"5"` במקום `5`. הפונקציה מקבלת את שניהם, אבל רק מספר סופי — `NaN` ו-`Infinity` נופלים ל-`undefined`.' },
            { match: "v !== null && typeof v === 'object'", text: 'מלכודת קלאסית: `typeof null === \'object\'` ב-JavaScript. בלי הבדיקה `v !== null`, ערך `null` היה עובר את התנאי.' },
          ],
        },
        {
          kind: 'compare',
          left: {
            lang: 'ts',
            title: 'any — מכבה את הבדיקה',
            code: `function asString(v: any): string | undefined {
  return v.trim() !== '' ? v : undefined
}

asString(5)
// Compiles fine.
// Runtime: TypeError: v.trim is not a function`,
          },
          right: {
            lang: 'ts',
            title: 'unknown — מכריח לבדוק',
            code: `function asString(v: unknown): string | undefined {
  return v.trim() !== '' ? v : undefined
  //     ~
  // 'v' is of type 'unknown'.
}

// Fix: check first, then use.
// typeof v === 'string' && v.trim() !== ''`,
          },
        },
        {
          kind: 'quiz',
          question: 'ב-`asRecord`, למה לא מספיק לכתוב `typeof v === \'object\' && !Array.isArray(v)`?',
          options: [
            'כי `typeof` לא עובד על `unknown`',
            'כי `typeof null` מחזיר `\'object\'`, ובלי `v !== null` גם `null` היה מוחזר כ-record',
            'כי מערכים הם לא אובייקטים',
            'זה כן מספיק — `v !== null` שם רק לקריאות',
          ],
          answer: 1,
          explanation: 'זה באג היסטורי של JavaScript ש-TS מכיר: אחרי `typeof v === \'object\'` הטיפוס הוא `object | null`. רק הבדיקה `v !== null` מוציאה את ה-`null`.',
        },
        {
          kind: 'text',
          body: `\`instanceof\` מצמצם למחלקה. משתנה ה-\`catch\` הוא \`unknown\` במצב \`strict\` — כי אפשר לזרוק כל דבר, לא רק \`Error\`. כך ה-API של האדמין ממפה שגיאות הרשאה לתשובת HTTP:`,
        },
        {
          kind: 'source',
          title: 'instanceof על שגיאה',
          ref: { file: 'lib/auth/require-admin.ts', start: 'export function adminAuthErrorResponse(' },
          notes: [
            { match: 'err: unknown', text: 'הפרמטר מגיע ישר מ-`catch (err)`, ולכן `unknown` — לא `any` ולא `Error`.' },
            { match: 'if (err instanceof AdminAuthError) {', text: 'בתוך ה-if, `err` הוא `AdminAuthError`, ומותר לגשת ל-`err.message` ול-`err.status`.' },
            { match: '{ status: err.status }', text: '`status` מוגדר במחלקה כ-`401 | 403` — union של **מספרים** ליטרליים. אי אפשר בטעות לבנות `AdminAuthError` עם סטטוס 500.' },
          ],
        },
        {
          kind: 'text',
          body: `לפעמים הבדיקה מורכבת מדי ש-TS יבין אותה לבד. **type predicate** הוא פונקציה שטיפוס ההחזרה שלה הוא \`x is T\`: היא מחזירה \`boolean\`, וכשהיא מחזירה \`true\` — הקומפיילר מתייחס לערך כ-\`T\`.

המקום הנפוץ ביותר: \`.filter\`. בלי predicate, סינון \`null\`-ים ממערך של \`(string | null)[]\` עדיין מחזיר \`(string | null)[]\`. בדף הבריאות של האדמין, \`AuditEvent.userId\` הוא nullable (אירועי התחברות נרשמים לפני שיש שורת User), וצריך רשימה נקייה של מזהים:`,
        },
        {
          kind: 'source',
          title: 'predicate בתוך filter',
          ref: { file: 'app/(dashboard)/admin/health/page.tsx', start: 'const failureUserIds = Array.from(' },
          notes: [
            { match: 'r => r.userId', text: '`r.userId` מגיע מהטיפוס שנוצר מהמסד: `string | null`. אחרי ה-`map` יש `(string | null)[]`.' },
            { match: '.filter((x): x is string => Boolean(x))', text: '`(x): x is string` הוא ה-predicate. בזכותו `filter` מחזירה `string[]`, ו-`failureUserIds` מתאים ל-`.in(\'id\', failureUserIds)` בהמשך. בלעדיו — `(string | null)[]`.' },
          ],
        },
        {
          kind: 'source',
          title: 'predicate על נתונים מ-localStorage',
          ref: { file: 'lib/learn/progress.ts', start: 'function parse(raw: string): string[]' },
          notes: [
            { match: 'const value: unknown = JSON.parse(raw)', text: '`JSON.parse` מחזירה `any`. ה-annotation `: unknown` הוא בחירה מכוונת — להחזיר את הבדיקה. ב-localStorage יכול להיות כל דבר: גרסה ישנה, עריכה ידנית, זבל.' },
            { match: 'Array.isArray(value)', text: '`Array.isArray` מצמצם `unknown` ל-`any[]`. עדיין לא יודעים מה יש **בתוך** המערך.' },
            { match: "(x): x is string => typeof x === 'string'", text: 'כאן ה-predicate גם בודק באמת (`typeof`) וגם מספר ל-TS מה נבדק. התוצאה: `string[]` אמיתי, בלי `as`.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: 'TS **לא בודק** שגוף ה-predicate נכון. `(x): x is string => true` מתקמפל בלי שום תלונה — ומשקר. predicate הוא `as` בתחפושת: כתבו אותו קצר ופשוט מספיק כדי שאפשר לראות במבט שהוא נכון. **מאז TS 5.5** הקומפיילר מסיק predicate לבד לפונקציות כמו `x => x !== null`, אבל לא ל-`Boolean(x)` — כי `false` שם יכול לנבוע גם ממחרוזת ריקה, לא רק מ-`null`.',
        },
        {
          kind: 'text',
          body: `**discriminant בוליאני.** ה-discriminant לא חייב להיות מחרוזת. כך פלטפורמת הלמידה מתארת תוצאה של חיתוך קטע קוד — הצלחה עם קוד, או כישלון עם הודעת שגיאה:`,
        },
        {
          kind: 'source',
          title: 'Excerpt — תוצאה שהיא הצלחה או כישלון',
          ref: { file: 'lib/learn/excerpt.ts', start: 'export type Excerpt =', lines: 3 },
          notes: [
            { match: '{ ok: true; code: string; startLine: number }', text: 'ווריאנט ההצלחה: `ok` הוא הליטרל `true`, ורק לו יש `code` ו-`startLine`.' },
            { match: '{ ok: false; error: string }', text: 'ווריאנט הכישלון: רק `error`. אי אפשר בטעות לרנדר `code` של ניסיון שנכשל.' },
          ],
        },
        {
          kind: 'text',
          body: `בדף השיעור כתוב \`if (!excerpt.ok) { return ... excerpt.error ... }\`, ואחרי ה-if הקוד ניגש ל-\`excerpt.code\` בלי שום בדיקה נוספת — כי הענף של \`ok: false\` כבר יצא. זו אותה צורה ש-zod מחזיר מ-\`safeParse\` (\`success: true | false\`), כפי שנראה בשיעור האחרון.

ולבסוף, האופרטור \`in\` מצמצם לפי **קיום** של שדה:`,
        },
        {
          kind: 'snippet',
          lang: 'ts',
          title: 'in על FifoAction',
          code: `function openedTicker(action: FifoAction): string | null {
  if ('tradeCreate' in action) {
    // Only the OPEN variant has a top-level tradeCreate
    return action.tradeCreate.ticker
  }
  if (action.type === 'REVERSAL') {
    return action.open.tradeCreate.ticker
  }
  return null
}`,
        },
        {
          kind: 'quiz',
          question: 'נתון `function f(x: string | null)`. בתוך `if (x) { ... } else { /* כאן */ }` — מה הטיפוס של `x` בענף ה-else?',
          options: ['`null`', '`string | null`', '`never`', '`undefined`'],
          answer: 1,
          explanation: 'בדיקת truthiness לא מוציאה את `string` מהענף השקרי, כי `\'\'` (מחרוזת ריקה) הוא falsy. לכן ב-else נשאר `string | null`. אם רוצים `null` בלבד — `if (x !== null)`. זו בדיוק הסיבה ש-TS לא מסיק predicate מ-`Boolean(x)`.',
        },
        {
          kind: 'exercise',
          prompt: 'ב-`toClosedTrade` (שיעור 1) יש `t.direction as \'Long\' | \'Short\'`. כתבו type guard בשם `isDirection(v: unknown)` שמחזיר `v is \'Long\' | \'Short\'`, והראו איך הוא מחליף את ה-`as`: שורה עם כיוון לא חוקי תחזיר `null` במקום להיכנס לדשבורד.',
          hint: 'גוף ה-predicate יכול להיות השוואה פשוטה לשני הערכים. אחרי `if (!isDirection(t.direction)) return null`, השדה מצומצם.',
          solution: {
            lang: 'ts',
            code: `type Direction = 'Long' | 'Short'

function isDirection(v: unknown): v is Direction {
  return v === 'Long' || v === 'Short'
}

export function toClosedTrade(t: RawClosedTrade): ClosedTrade | null {
  if (t.realizedPnl == null || !t.closedAt) return null
  if (!isDirection(t.direction)) return null
  return {
    id: t.id,
    ticker: t.ticker,
    direction: t.direction, // narrowed to Direction, no cast
    // ...rest unchanged
  }
}`,
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Generics & utility types
    // ─────────────────────────────────────────────────────────────────────────
    {
      slug: 'ts-generics-utility-types',
      title: 'Generics ו-utility types: מ-Promise<T> ועד טיפוס ה-Database',
      summary: '`Promise<T>`, `Record`, `Pick`, `Partial`, `Omit`, `ReadonlySet` — ואיך `SupabaseClient<Database>` מקליד כל שאילתה מהמסד ועד המסך.',
      minutes: 16,
      blocks: [
        {
          kind: 'text',
          body: `**Generic** הוא טיפוס עם "פרמטר" — חור שממלאים בטיפוס אחר, בסוגריים משולשים. כבר השתמשתם בכזה: \`string[]\` זה קיצור של \`Array<string>\`. אותו \`Array\` עובד לכל טיפוס, ומה שבתוך \`<>\` קובע מה יוצא ממנו.

\`Promise<T>\` הוא הדוגמה הכי נפוצה: הבטחה שבסוף תניב ערך מטיפוס \`T\`. כל פונקציה \`async\` מחזירה \`Promise\`, ו-\`await\` "פותח" אותו ל-\`T\`. הנה הבדיקה שמגינה על כל ה-API של האדמין:`,
        },
        {
          kind: 'source',
          title: 'requireAdmin',
          ref: { file: 'lib/auth/require-admin.ts', start: 'export async function requireAdmin()', end: 'if (!row?.isAdmin) {' },
          notes: [
            { match: 'Promise<{', text: 'הפונקציה `async`, אז טיפוס ההחזרה חייב להיות `Promise<...>`. ה-`T` כאן הוא אובייקט עם שני שדות — מי שכותב `const { user, supabase } = await requireAdmin()` מקבל את שניהם מוקלדים.' },
            { match: 'supabase: SupabaseClient<Database>', text: 'generic שמקבל את **כל סכמת המסד** כפרמטר. מכאן הלקוח יודע אילו טבלאות קיימות, אילו עמודות יש בכל אחת ומה הטיפוס שלהן.' },
            { match: ".select('isAdmin')", text: 'ספריית Supabase מנתחת את המחרוזת `\'isAdmin\'` **ברמת הטיפוסים**. התוצאה: `row` מוקלד כ-`{ isAdmin: boolean } | null` — לא `any`.' },
            { match: 'if (!row?.isAdmin) {', text: '`maybeSingle()` מחזיר `null` כשאין שורה, ולכן `row?.` — הטיפוס מכריח לטפל במשתמש שאין לו שורת User.' },
          ],
        },
        {
          kind: 'text',
          body: `מאיפה \`SupabaseClient\` יודע ש-\`isAdmin\` הוא \`boolean\`? מהקובץ \`lib/db/types.ts\`, שנוצר **אוטומטית** מהסכמה של Postgres (לא כותבים אותו ביד — מייצרים מחדש אחרי כל מיגרציה). זה טיפוס ענק ומקונן, \`Database\`, ובתוכו לכל טבלה שלושה טיפוסים:`,
        },
        {
          kind: 'source',
          title: 'טבלת User כפי ש-TS רואה אותה',
          ref: { file: 'lib/db/types.ts', start: '      User: {', lines: 20 },
          notes: [
            { match: 'Row: {', text: '`Row` — מה שחוזר מ-SELECT. יש גם `Insert` (מה שמותר לשלוח ב-INSERT — עמודות עם default או nullable הופכות לאופציונליות `?`) ו-`Update` (הכל אופציונלי).' },
            { match: 'isAdmin: boolean', text: 'עמודת `boolean NOT NULL` הופכת ל-`boolean`. מכאן הגיע הטיפוס של `row.isAdmin` ב-`requireAdmin`.' },
            { match: 'subscriptionStatus: string | null', text: 'עמודה nullable הופכת ל-`string | null` — אותו דפוס כמו `stopPrice` בשיעור 1, הפעם נגזר אוטומטית.' },
          ],
        },
        {
          kind: 'text',
          body: `הקובץ גם מייצא **generic helpers** לגישה נוחה: \`Tables<'Trade'>\` הוא ה-Row של Trade, ו-\`TablesUpdate<'ExcelImportJob'>\` הוא ה-Update של טבלת עבודות הייבוא (תראו אותו בשיעור zod). הפרמטר שלהם מוגבל לשמות טבלאות קיימים — \`Tables<'Trades'>\` לא יתקמפל.

שימו לב גם ש-\`direction\` ב-Row של Trade הוא \`string\`, לא \`'Long' | 'Short'\` — כי בעמודת \`text\` של Postgres אין union. זו בדיוק הסיבה ל-\`as\` שראינו ב-\`toClosedTrade\`.`,
        },
        {
          kind: 'quiz',
          question: "ב-`requireAdmin`, מה הטיפוס של `row` אחרי `.from('User').select('isAdmin').eq(...).maybeSingle()`?",
          options: [
            '`any`',
            '`{ isAdmin: boolean } | null`',
            'כל ה-Row של User',
            '`boolean`',
          ],
          answer: 1,
          explanation: 'ה-select מצמצם את התוצאה רק לעמודות שביקשת, ו-`maybeSingle` מוסיף `| null` לשורה שאולי לא קיימת. אילו היית כותב `row.email` — שגיאת קומפילציה, כי לא בחרת את העמודה הזו.',
        },
        {
          kind: 'text',
          body: `מעבר ל-generics שאתם **משתמשים** בהם, ל-TS יש **utility types** מובנים שבונים טיפוס חדש מטיפוס קיים. ארבעה שמופיעים באתר:`,
        },
        {
          kind: 'source',
          title: 'Record — מפה עם מפתחות ידועים',
          ref: { file: 'lib/trade/position-notes.ts', start: 'export type PositionNoteKind', lines: 7 },
          notes: [
            { match: "export type PositionNoteKind = 'add' | 'reduce'", text: 'union של שני סוגי ההערות שהאתר מוסיף לטרייד: הוספה לפוזיציה ומכירה חלקית.' },
            { match: 'Record<PositionNoteKind, string>', text: '`Record<K, V>` = אובייקט שהמפתחות שלו הם בדיוק `K` והערכים מטיפוס `V`. אם תשכחו את `reduce` — `Property \'reduce\' is missing`. אם תוסיפו סוג שלישי ל-union בלי ניסוח — אותה שגיאה.' },
          ],
        },
        {
          kind: 'source',
          title: 'Pick — רק השדות שצריך',
          ref: { file: 'lib/utils/position-calc.ts', start: 'export function exposure(', lines: 3 },
          notes: [
            { match: "Pick<OpenPositionTrade, 'avgEntryPrice' | 'totalQuantity'>", text: '`Pick<T, Keys>` = טיפוס חדש עם השדות שבחרת בלבד. חשיפה (עלות הפוזיציה) צריכה רק מחיר וכמות — אז הפונקציה מקבלת כל אובייקט שיש לו את שני אלה, גם אם אין לו `direction` או `stopPrice`.' },
            { match: 'return trade.avgEntryPrice * trade.totalQuantity', text: 'ניסיון לגשת כאן ל-`trade.stopPrice` ייכשל — הוא לא חלק מה-Pick. החתימה מתעדת בדיוק במה הפונקציה תלויה.' },
          ],
        },
        {
          kind: 'source',
          title: 'Partial — עדכון חלקי בטופס',
          ref: { file: 'components/trade-entry-form.tsx', start: 'function updateLeg(i: number, patch: Partial<ManualLeg>)' },
          notes: [
            { match: 'patch: Partial<ManualLeg>', text: '`Partial<T>` הופך כל שדה לאופציונלי. כשמשנים רק את המחיר בטופס, שולחים `{ price: 101 }` — ועדיין אי אפשר לשלוח `{ pric: 101 }` או `{ price: \'abc\' }`.' },
            { match: '{ ...l, ...patch }', text: 'spread של הרגל הקיימת ואחריה ה-patch: השדות שב-patch דורסים, השאר נשמרים. התוצאה היא `ManualLeg` מלא.' },
          ],
        },
        {
          kind: 'snippet',
          lang: 'ts',
          title: 'Omit ו-ReadonlySet מתוך הקוד',
          code: `// lib/db/types.ts — everything except the internal metadata key
type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

// lib/learn/progress.ts — callers can read, but not mutate
export function useCompletedLessons(): ReadonlySet<string> { /* ... */ }

const done = useCompletedLessons()
done.has('ts-basic-types')   // ok
done.add('ts-basic-types')   // error — mutate via setLessonCompleted() instead`,
        },
        {
          kind: 'quiz',
          question: "קומפוננטה כותבת `useCompletedLessons().add('ts-basic-types')`. מה קורה?",
          options: [
            'השיעור מסומן כהושלם',
            "שגיאת קומפילציה: `Property 'add' does not exist on type 'ReadonlySet<string>'`",
            'עובר בקומפילציה, נכשל בזמן ריצה',
            'עובר, אבל השינוי לא נשמר ב-localStorage',
          ],
          answer: 1,
          explanation: 'בזמן ריצה זה `Set` רגיל, אבל הטיפוס `ReadonlySet` מסתיר את `add`/`delete`/`clear`. ככה החתימה מכוונת את המפתח לדרך היחידה שבאמת שומרת: `setLessonCompleted`, שכותבת ל-localStorage ומודיעה לכל הקומפוננטות. שינוי ישיר של ה-Set היה "עובד" על המסך ונעלם ברענון.',
        },
        {
          kind: 'callout',
          tone: 'tip',
          body: 'זה הערך של **טיפוסים מקצה לקצה**: Postgres → `lib/db/types.ts` → `SupabaseClient<Database>` → התוצאה של כל שאילתה → props של קומפוננטה. כשמיגרציה משנה עמודה ומייצרים את הטיפוסים מחדש, `npm run build` מצביע על רוב המקומות שצריך לעדכן — `insert`/`update` עם עמודה שלא קיימת נכשלים מיד, ו-select של עמודה שנמחקה מחזיר טיפוס שגיאה, כך שהגישה לשדה בהמשך כבר לא מתקמפלת. בלי זה, הבאג מתגלה רק כשמשתמש לוחץ על הכפתור.',
        },
        {
          kind: 'exercise',
          prompt: 'כתבו `type TradeRow` בעזרת `Pick` מתוך `ClosedTrade` (שדות: `ticker`, `realizedPnl`, `actualR`). אחר כך כתבו פונקציה generic `sumBy<T>(items: T[], pick: (item: T) => number): number`, ופונקציה `pnlByTicker(trades: TradeRow[]): Record<string, number>` שמסכמת רווח לפי טיקר.',
          hint: 'ב-`sumBy` לא צריך לדעת כלום על `T` — רק להעביר כל פריט ל-`pick`. כשקוראים `sumBy(rows, t => t.realizedPnl)`, TS מסיק ש-`T` הוא `TradeRow` לבד.',
          solution: {
            lang: 'ts',
            code: `import type { ClosedTrade } from '@/types/trade'

type TradeRow = Pick<ClosedTrade, 'ticker' | 'realizedPnl' | 'actualR'>

function sumBy<T>(items: T[], pick: (item: T) => number): number {
  let total = 0
  for (const item of items) total += pick(item)
  return total
}

function pnlByTicker(trades: TradeRow[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const t of trades) {
    out[t.ticker] = (out[t.ticker] ?? 0) + t.realizedPnl
  }
  return out
}

const rows: TradeRow[] = [
  { ticker: 'AAPL', realizedPnl: 120, actualR: 1.2 },
  { ticker: 'AAPL', realizedPnl: -40, actualR: -0.4 },
  { ticker: 'NVDA', realizedPnl: 300, actualR: null },
]
sumBy(rows, t => t.realizedPnl)  // 380 — T inferred as TradeRow
pnlByTicker(rows)                // { AAPL: 80, NVDA: 300 }`,
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 5. as const + typeof
    // ─────────────────────────────────────────────────────────────────────────
    {
      slug: 'ts-as-const-typeof',
      title: 'as const ו-typeof: לגזור טיפוסים מערכים',
      summary: 'איך `TABS ... as const` ו-`(typeof TABS)[number][\'id\']` הופכים רשימה אחת גם לנתונים וגם לטיפוס — בלי לכתוב כל ערך פעמיים.',
      minutes: 13,
      blocks: [
        {
          kind: 'text',
          body: `בתפריט הצד של אזור המנהל יש רשימת טאבים. הרשימה הזו משמשת פעמיים: פעם כ**נתונים** (מרנדרים לכל טאב קישור ואייקון) ופעם כ**טיפוס** (איזה id של טאב הוא חוקי). הדרך הנאיבית היא לכתוב את שניהם — מערך, ובנפרד \`type TabId = 'users' | 'jobs' | ...\`. אבל אז כל טאב חדש צריך להיכנס לשני מקומות, ומתישהו מישהו שוכח.

הפתרון באתר: לכתוב את הרשימה פעם אחת, ו**לגזור** ממנה את הטיפוס:`,
        },
        {
          kind: 'source',
          title: 'טאבים של אזור המנהל',
          ref: { file: 'components/admin/admin-layout.tsx', start: 'const TABS = [', end: "type TabId = (typeof TABS)[number]['id']" },
          notes: [
            { match: "{ id: 'learn'", text: 'הטאב של פלטפורמת הלמידה. כשהוסיפו אותו, `TabId` התרחב אוטומטית — אף שורת טיפוס לא נגעה.' },
            { match: '] as const', text: '`as const` אומר ל-TS: "אל תרחיב". בלעדיו `id: \'users\'` מוסק כ-`string`; איתו הוא נשאר הליטרל `\'users\'`, וכל המערך הופך ל-tuple שהוא `readonly`.' },
            { match: "type TabId = (typeof TABS)[number]['id']", text: 'שלושה צעדים: `typeof TABS` — הטיפוס של הערך. `[number]` — הטיפוס של **איבר כלשהו** במערך (union של כל ששת האובייקטים). `[\'id\']` — הטיפוס של השדה `id` שלהם. התוצאה: `\'users\' | \'jobs\' | \'ibkr\' | \'broker-events\' | \'health\' | \'learn\'`.' },
          ],
        },
        {
          kind: 'compare',
          left: {
            lang: 'ts',
            title: 'בלי as const',
            code: `const TABS = [
  { id: 'users', href: '/admin/users' },
  { id: 'jobs',  href: '/admin/jobs' },
]
// typeof TABS: { id: string; href: string }[]

type TabId = (typeof TABS)[number]['id']
// TabId = string   <- useless, any string fits`,
          },
          right: {
            lang: 'ts',
            title: 'עם as const',
            code: `const TABS = [
  { id: 'users', href: '/admin/users' },
  { id: 'jobs',  href: '/admin/jobs' },
] as const
// typeof TABS: readonly [
//   { readonly id: 'users'; readonly href: '/admin/users' },
//   { readonly id: 'jobs';  readonly href: '/admin/jobs' },
// ]

type TabId = (typeof TABS)[number]['id']
// TabId = 'users' | 'jobs'`,
          },
        },
        {
          kind: 'callout',
          tone: 'tip',
          body: 'ל-`typeof` יש שתי משמעויות שונות לגמרי. **בקוד** (`typeof v === \'string\'`) זה אופרטור של JavaScript שרץ בזמן ריצה ומחזיר מחרוזת. **בטיפוס** (`type X = typeof TABS`) זה אופרטור של TS שלוקח משתנה ומחזיר את הטיפוס שלו — ונמחק בקומפילציה. TS יודע איזה מהם התכוונתם לפי המקום: אחרי `type X =` או אחרי נקודתיים זה תמיד הגרסה של הטיפוסים.',
        },
        {
          kind: 'source',
          title: 'TabId בשימוש',
          ref: { file: 'components/admin/admin-layout.tsx', start: 'const [pendingId, setPendingId] = useState<TabId | null>(null)', end: "?? 'users'" },
          notes: [
            { match: 'useState<TabId | null>(null)', text: 'generic מפורש ל-`useState`: עם ערך התחלתי `null` בלבד TS היה מסיק טיפוס `null` ולא היה מרשה אחר כך `setPendingId(\'jobs\')`.' },
            { match: 'TABS.find(t => ', text: '`find` מחזיר איבר או `undefined`, ולכן `?.id`. הטיפוס של `t` נגזר מ-`TABS` — אין צורך ב-annotation.' },
            { match: "?? 'users'", text: 'ברירת המחדל חייבת להיות `TabId` חוקי, כי `activeTab` מוצהר כ-`TabId`. טעות הקלדה כמו `\'user\'` היא שגיאת קומפילציה.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'מוחקים את `as const` מ-`TABS`. מה יהיה `TabId`?',
          options: [
            'עדיין `\'users\' | \'jobs\' | ...`',
            '`string`',
            '`never`',
            'שגיאת קומפילציה בשורת ה-`type`',
          ],
          answer: 1,
          explanation: 'בלי `as const`, כל `id` מורחב ל-`string`, ולכן `(typeof TABS)[number][\'id\']` הוא `string`. הקוד ממשיך להתקמפל — ובדיוק בזה הסכנה: `setPendingId(\'whatever\')` כבר לא נתפס.',
        },
        {
          kind: 'text',
          body: `אותו דפוס חוזר בדשבורד המחקר, והפעם הוא משתלב עם \`Record\` מהשיעור הקודם. רשימת הגרפים היא מערך מחרוזות, וממנה נגזרים גם הטיפוס \`ChartId\` וגם הדרישה שלכל גרף תהיה כותרת:`,
        },
        {
          kind: 'source',
          title: 'גרפים בדשבורד המחקר',
          ref: { file: 'components/research/lib.ts', start: 'export const CHART_IDS', end: "dayhour:  'P&L" },
          notes: [
            { match: "'dayhour'] as const", text: 'מערך של מחרוזות עם `as const` — tuple של ליטרלים, לא `string[]`.' },
            { match: 'export type ChartId = typeof CHART_IDS[number]', text: 'כמו `TabId`, רק בלי `[\'id\']` — האיברים הם המחרוזות עצמן. (`typeof X[number]` ו-`(typeof X)[number]` זהים; הסוגריים רק לקריאות.)' },
            { match: 'Record<ChartId, string>', text: '`Record` עם מפתחות שנגזרו מהמערך: הוספת גרף ל-`CHART_IDS` בלי כותרת כאן היא שגיאת קומפילציה.' },
          ],
        },
        {
          kind: 'quiz',
          question: "מוסיפים `'weekday'` ל-`CHART_IDS` ולא נוגעים ב-`CHART_LABELS`. מה קורה?",
          options: [
            'הגרף מופיע בלי כותרת',
            "שגיאת קומפילציה: `Property 'weekday' is missing in type ... but required in type 'Record<...>'`",
            'שום דבר — `Record` לא בודק מפתחות חסרים',
            'שגיאה רק בזמן ריצה, כשמנסים להציג את הגרף',
          ],
          answer: 1,
          explanation: '`Record<ChartId, string>` דורש מפתח לכל ערך ב-union. ברגע ש-`ChartId` כולל `\'weekday\'`, האובייקט חסר מפתח — והקומפיילר מפנה בדיוק למקום שצריך להשלים.',
        },
        {
          kind: 'source',
          title: 'מקור אמת אחד לנתונים, לטיפוס ולולידציה',
          ref: { file: 'lib/constants/trade-options.ts', start: 'export const CURRENCIES = [', lines: 9 },
          notes: [
            { match: "'USD', 'EUR', 'ILS'", text: 'רשימת המטבעות — מוצגת ב-dropdown של טופס ההזנה הידנית.' },
            { match: 'export type Currency = typeof CURRENCIES[number]', text: 'הטיפוס נגזר מהרשימה. ואותו מערך עצמו מועבר ל-`z.enum(CURRENCIES)` ב-`lib/trade/manual-entry.ts` — כך גם הולידציה בשרת משתמשת באותה רשימה. שלושה שימושים, הגדרה אחת.' },
            { match: 'export type Broker = typeof BROKERS[number]', text: 'אותו דבר לברוקרים. להוספת ברוקר חדש משנים שורה אחת, והטופס, הטיפוס והולידציה מתעדכנים יחד.' },
          ],
        },
        {
          kind: 'quiz',
          question: "מה קורה בשורה `CURRENCIES.push('BTC')`?",
          options: [
            'עובר, ו-BTC מתווסף לרשימה',
            "שגיאת קומפילציה: `Property 'push' does not exist on type 'readonly [\"USD\", ...]'`",
            'עובר בקומפילציה, נכשל בזמן ריצה כי המערך קפוא',
            'עובר, אבל `Currency` לא מתעדכן',
          ],
          answer: 1,
          explanation: '`as const` הופך את המערך ל-`readonly` ברמת הטיפוס, אז מתודות שמשנות אותו (`push`, `splice`) לא קיימות עליו. שימו לב: זה לא `Object.freeze` — בזמן ריצה זה מערך רגיל, ההגנה היא רק בקומפילציה.',
        },
        {
          kind: 'exercise',
          prompt: "כתבו `const RESULTS` עם שלוש התוצאות של טרייד (`'Win'`, `'Loss'`, `'Breakeven'`), גזרו ממנו `type TradeResult`, כתבו `RESULT_LABEL: Record<TradeResult, string>` עם תוויות בעברית, ו-type guard `isTradeResult(v: string): v is TradeResult`.",
          hint: "`RESULTS.includes(v)` עם `v: string` לא יתקמפל — `includes` של tuple ליטרלי מצפה לאחד הליטרלים. ראו איך `isFreeText` ב-`lib/chat/tools/query-trades.ts` פותר את זה: `(LIST as readonly string[]).includes(v)`.",
          solution: {
            lang: 'ts',
            code: `const RESULTS = ['Win', 'Loss', 'Breakeven'] as const
type TradeResult = (typeof RESULTS)[number]
// 'Win' | 'Loss' | 'Breakeven'

const RESULT_LABEL: Record<TradeResult, string> = {
  Win: 'רווח',
  Loss: 'הפסד',
  Breakeven: 'איזון',
}

function isTradeResult(v: string): v is TradeResult {
  return (RESULTS as readonly string[]).includes(v)
}

// Trade.result comes from the DB as string | null
function resultLabel(result: string | null): string {
  if (result !== null && isTradeResult(result)) {
    return RESULT_LABEL[result]  // result is TradeResult here
  }
  return '—'
}`,
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 6. zod — runtime validation
    // ─────────────────────────────────────────────────────────────────────────
    {
      slug: 'ts-zod-runtime-validation',
      title: 'zod: ולידציה בזמן ריצה ו-z.infer',
      summary: 'הטיפוסים נמחקים בזמן ריצה — אז מי בודק את מה שהדפדפן או ה-worker שלחו? `safeParse`, `z.infer` ו-`z.discriminatedUnion` בנתיבי ה-API של האתר.',
      minutes: 15,
      blocks: [
        {
          kind: 'text',
          body: `כל מה שראינו עד עכשיו קורה **בזמן קומפילציה**. אחרי \`npm run build\` הטיפוסים נמחקים, והשרת מריץ JavaScript. זה בסדר לגבי הקוד שלנו — אבל לא לגבי נתונים שמגיעים **מבחוץ**: גוף בקשת HTTP, תשובה של מודל AI, תוכן של localStorage.

\`request.json()\` מוקלדת כ-\`Promise<any>\`. כל אחד יכול לשלוח ל-\`/api/billing/checkout\` כל JSON שירצה — גם בלי לעבור דרך הטופס שלנו. annotation לא עוזר כאן, כי הוא רק **מספר** לקומפיילר מה יש שם, בלי לבדוק:`,
        },
        {
          kind: 'compare',
          left: {
            lang: 'ts',
            title: 'annotation — הבטחה בלי בדיקה',
            code: `const body: { plan: 'monthly' | 'annual' } = await request.json()
// Compiles: json() returns any, and any fits everything.

// Runtime, attacker sends { "plan": "lifetime-free" }:
body.plan  // 'lifetime-free' — the type lied`,
          },
          right: {
            lang: 'ts',
            title: 'zod — בדיקה אמיתית, ואז טיפוס',
            code: `const schema = z.object({
  plan: z.enum(['monthly', 'annual']),
})

const parsed = schema.safeParse(await request.json())
if (!parsed.success) return badRequest()

parsed.data.plan  // 'monthly' | 'annual' — checked at runtime`,
          },
        },
        {
          kind: 'source',
          title: 'הסכמה של בקשת התשלום',
          ref: { file: 'app/api/billing/checkout/route.ts', start: 'const schema = z.object({' },
          notes: [
            { match: 'const schema = z.object({', text: 'סכמת zod היא **ערך** רגיל של JavaScript — היא קיימת בזמן ריצה (בניגוד ל-interface) ויודעת לבדוק נתונים.' },
            { match: "plan: z.enum(['monthly', 'annual'])", text: '`z.enum` בודק שהערך הוא אחת המחרוזות — ובמקביל גוזר את הטיפוס `\'monthly\' | \'annual\'`, בדיוק כמו `as const` מהשיעור הקודם.' },
          ],
        },
        {
          kind: 'source',
          title: 'safeParse ו-narrowing על התוצאה',
          ref: { file: 'app/api/billing/checkout/route.ts', start: 'const body = await request.json().catch(() => null)', end: 'const plan: BillingPlan = parsed.data.plan' },
          notes: [
            { match: '.catch(() => null)', text: 'JSON לא תקין (או גוף ריק) הופך ל-`null` במקום לזרוק. `null` ייכשל בבדיקה בשורה הבאה ויחזיר 400 — מסלול אחד לכל הקלטים הגרועים.' },
            { match: 'schema.safeParse(body)', text: '`safeParse` לא זורק שגיאה. הוא מחזיר `{ success: true; data }` או `{ success: false; error }` — discriminated union עם discriminant בוליאני, כמו `Excerpt` בשיעור 3.' },
            { match: 'if (!parsed.success) {', text: 'הענף של הכישלון יוצא עם `return`. מכאן והלאה `parsed` מצומצם להצלחה.' },
            { match: 'parsed.data.plan', text: 'הטיפוס של `parsed.data.plan` הוא `\'monthly\' | \'annual\'`, ולכן ההשמה ל-`BillingPlan` מתקמפלת. אילו הסכמה הייתה `z.string()` — שגיאת קומפילציה כאן.' },
          ],
        },
        {
          kind: 'quiz',
          question: "מישהו כותב `const body: { plan: BillingPlan } = await request.json()` ומוחק את ה-schema. מה קורה?",
          options: [
            'שגיאת קומפילציה — `any` לא ניתן להשמה ל-`BillingPlan`',
            'מתקמפל, וגוף עם `plan` לא חוקי ימשיך הלאה לקוד התשלום',
            'מתקמפל, ו-TS יזרוק שגיאה בזמן ריצה אם `plan` לא חוקי',
            'Next.js בודק את הטיפוס אוטומטית לפני שהבקשה מגיעה ל-handler',
          ],
          answer: 1,
          explanation: '`any` ניתן להשמה לכל טיפוס, אז הקומפיילר מרוצה. ובזמן ריצה אין שום שכבה שבודקת טיפוסים — הם כבר נמחקו. רק קוד שרץ (כמו `safeParse`) יכול לבדוק נתונים שמגיעים מבחוץ.',
        },
        {
          kind: 'text',
          body: `**\`z.infer\`** סוגר את המעגל: במקום לכתוב גם schema וגם interface, כותבים schema ו**גוזרים** ממנה את הטיפוס — \`type Body = z.infer<typeof schema>\`. שימו לב ל-\`typeof\`: הסכמה היא ערך, ו-\`z.infer\` צריך את הטיפוס שלה — אותו טריק כמו \`typeof TABS\`.

הדוגמה העשירה ביותר באתר היא ה-endpoint שה-worker של ייבוא ה-AI קורא לו בסיום. ה-worker רץ ב-GitHub Actions, מחוץ ל-Vercel — הוא "מבחוץ" כמו כל לקוח, ושולח אחת משתי תשובות:`,
        },
        {
          kind: 'source',
          title: 'שתי צורות אפשריות לתוצאת ה-worker',
          ref: { file: 'app/api/cron/ai-import-result/route.ts', start: 'const legErrorSchema', end: 'const bodySchema = z.discriminatedUnion' },
          notes: [
            { match: 'jobId: z.string().uuid()', text: 'zod בודק דברים שאין להם טיפוס ב-TS: "מחרוזת בפורמט UUID". הטיפוס הנגזר הוא סתם `string`, אבל הבדיקה בזמן ריצה מחמירה יותר.' },
            { match: "status: z.literal('AWAITING_CONFIRMATION')", text: '`z.literal` — ליטרל בודד. זה ה-discriminant של ווריאנט ההצלחה.' },
            { match: 'errorMessage: z.string().max(2000)', text: 'רק בווריאנט הכישלון יש `errorMessage`, ואורכו מוגבל — כדי ש-worker תקול לא יכתוב מגה של טקסט לשורה במסד.' },
            { match: "z.discriminatedUnion('status', [successSchema, failSchema])", text: 'הגרסה של zod ל-`FifoAction`: union לפי השדה `status`. zod בודק קודם את `status`, ואז מאמת את הגוף מול הווריאנט המתאים בלבד.' },
          ],
        },
        {
          kind: 'source',
          title: 'z.infer ו-narrowing על תוצאה מאומתת',
          ref: { file: 'app/api/cron/ai-import-result/route.ts', start: 'let body: z.infer<typeof bodySchema>', end: ": { status: 'FAILED', errorMessage: body.errorMessage }" },
          notes: [
            { match: 'let body: z.infer<typeof bodySchema>', text: 'הטיפוס של `body` נגזר מהסכמה: union של שני הווריאנטים. אין interface נפרד שאפשר לשכוח לעדכן.' },
            { match: 'details: parsed.error.flatten()', text: 'כישלון ולידציה מחזיר 422 עם פירוט השדות שנכשלו (`flatten()`), ו-JSON שבור מחזיר 400 — לפי החוזה של כל ה-routes באתר.' },
            { match: "body.status === 'AWAITING_CONFIRMATION'", text: 'narrowing על ה-discriminant, בדיוק כמו `action.type`. בענף הזה מותר `body.aiMapping`; בענף השני — `body.errorMessage`.' },
            { match: "const update: TablesUpdate<'ExcelImportJob'>", text: 'שני העולמות נפגשים: נתונים שאומתו ב-zod נכנסים לטיפוס שנוצר מהמסד (שיעור 4). ה-`as Json` בשורות הבאות קיים כי `Record<string, unknown>` של zod רחב יותר מ-`Json` של Supabase.' },
          ],
        },
        {
          kind: 'quiz',
          question: "ה-worker שולח `{ jobId: '<uuid>', status: 'FAILED' }` — בלי `errorMessage`. מה התגובה?",
          options: [
            '200, וה-job מסומן FAILED עם הודעה ריקה',
            '422 עם `details`, כי ווריאנט `FAILED` דורש `errorMessage`',
            '400, כי ה-JSON לא תקין',
            '500 מהמסד',
          ],
          answer: 1,
          explanation: 'ה-JSON תקין, אז `req.json()` מצליח ולא מגיעים ל-400. `discriminatedUnion` בוחר את `failSchema` לפי `status`, מגלה ש-`errorMessage` חסר, ו-`safeParse` מחזיר `success: false` — 422 עם הפירוט מ-`flatten()`. שום דבר לא נכתב למסד.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: 'לא כל מקום באתר משתמש ב-`z.infer`. ב-`lib/trade/manual-entry.ts` יש גם `manualLegSchema` וגם `interface ManualLeg` שנכתבו בנפרד, וה-route של ההזנה הידנית עושה `parsed.data as ManualLeg[]`. ה-`as` נדרש כי הצורות שונות: בסכמה `setupType` הוא nullable, ב-interface הוא `string` אופציונלי בלבד; בסכמה `currency` הוא enum, ב-interface `string`. זה עובד היום — אבל אם מישהו יוסיף שדה חובה ל-interface וישכח את הסכמה, ה-`as` יסתיר את זה. שני מקורות אמת = סיכון לסטייה.',
        },
        {
          kind: 'text',
          body: `**למה צריך את שניהם?** TypeScript מגן על הקוד **שלנו** מפני עצמו: פונקציה שמקבלת \`FifoAction\` לא תקבל בטעות משהו אחר. zod מגן על הקוד שלנו מפני **העולם**: דפדפן, worker, מודל AI, localStorage. הכלל באתר: בכל גבול שבו נכנס \`any\` או \`unknown\` — \`safeParse\` (או type guard כמו בשיעור 3), ומשם פנימה סומכים על הטיפוסים.`,
        },
        {
          kind: 'exercise',
          prompt: 'דמיינו endpoint שמקבל בקשה למכירה חלקית של פוזיציה: `quantity` ו-`price` (מספרים חיוביים וסופיים), `date` במבנה `YYYY-MM-DD`, ו-`reason` אופציונלי (עד 500 תווים). כתבו סכמת zod, גזרו ממנה טיפוס עם `z.infer`, וכתבו handler שמחזיר 400 על JSON שבור ו-422 עם `flatten()` על ולידציה שנכשלה.',
          hint: 'העתיקו את המבנה של `ai-import-result`: `try` סביב `req.json()` + `safeParse`, ו-`catch` שמחזיר 400. `.optional()` הופך שדה לאופציונלי גם בטיפוס הנגזר.',
          solution: {
            lang: 'ts',
            code: `import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const reduceSchema = z.object({
  quantity: z.number().finite().positive(),
  price: z.number().finite().positive(),
  date: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
  reason: z.string().max(500).optional(),
})

type ReduceBody = z.infer<typeof reduceSchema>
// { quantity: number; price: number; date: string; reason?: string | undefined }

export async function POST(req: NextRequest) {
  let body: ReduceBody
  try {
    const parsed = reduceSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 422 },
      )
    }
    body = parsed.data
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // From here on, body is fully typed AND verified.
  return NextResponse.json({ ok: true, quantity: body.quantity })
}`,
          },
        },
      ],
    },
  ],
}
