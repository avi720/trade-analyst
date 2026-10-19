import type { Track } from '../types'

export const jsTrack: Track = {
  id: 'js',
  title: 'JavaScript',
  description: 'היסודות של השפה — דרך הפונקציות שמחשבות רווח, R ותוצאה לכל טרייד.',
  lessons: [
    {
      slug: 'js-functions-and-conditions',
      title: 'פונקציות, תנאים ו-ternary',
      summary: 'איך `calcPnl` ו-`resultFromR` מחשבות רווח ותוצאה — פונקציה, פרמטרים, return ו-`? :`.',
      minutes: 12,
      blocks: [
        {
          kind: 'text',
          body: `פונקציה היא יחידת קוד עם שם, שמקבלת **פרמטרים** ומחזירה **ערך**. רוב הלוגיקה החשובה באתר כתובה כפונקציות "טהורות" — הן לא קוראות למסד נתונים ולא משנות שום דבר בחוץ, רק מקבלות מספרים ומחזירות מספר. זה מה שהופך אותן לקלות לבדיקה.

הנה הפונקציה שמחשבת רווח/הפסד של חלק מפוזיציה, מתוך מנוע ה-FIFO של האתר:`,
        },
        {
          kind: 'source',
          title: 'חישוב רווח לפי כיוון הפוזיציה',
          ref: { file: 'lib/trade/fifo.ts', start: 'function calcPnl(' },
          notes: [
            { match: 'function calcPnl(', text: 'הצהרה על פונקציה: שם, ואחריו רשימת פרמטרים בסוגריים. מה שאחרי הנקודתיים (`: number`) זה TypeScript — נגיע לזה במסלול TS. ב-JavaScript נקי פשוט מוחקים את זה.' },
            { match: "direction === 'Long'", text: '`===` היא השוואה קפדנית — גם הערך וגם הסוג צריכים להיות זהים. ב-JS תמיד משתמשים ב-`===` ולא ב-`==`.' },
            { match: '? (exitPrice - avgEntry) * qty', text: 'אופרטור ternary: `תנאי ? ערך-אם-אמת : ערך-אם-שקר`. זה ביטוי שמחזיר ערך, ולכן אפשר לכתוב אותו ישר אחרי `return`.' },
          ],
        },
        {
          kind: 'text',
          body: `שימו לב שבלונג רווח הוא "יציאה פחות כניסה", ובשורט ההפך. במקום שני if-ים עם שני return, ה-ternary מבטא את זה בביטוי אחד.

עכשיו פונקציה שמחליטה אם טרייד סגור הוא Win, Loss או Breakeven:`,
        },
        {
          kind: 'source',
          title: 'סיווג תוצאה',
          ref: { file: 'lib/trade/fifo.ts', start: 'export function resultFromR(' },
          notes: [
            { match: 'export function', text: '`export` חושף את הפונקציה לקבצים אחרים, שמייבאים אותה עם `import { resultFromR } from ...`. בלי `export` הפונקציה פרטית לקובץ (כמו `calcPnl`).' },
            { match: 'actualR ?? realizedPnl', text: '`??` (nullish coalescing): אם הצד השמאלי הוא `null` או `undefined` — קח את הימני. בשונה מ-`||`, הוא **לא** מדלג על `0`. ההערה מעל בדיוק מסבירה למה זה חשוב כאן.' },
            { match: 'if (basis > 0)', text: 'if בלי סוגריים מסולסלים מותר כשיש פקודה אחת. `return` יוצא מהפונקציה מיד — לכן אין צורך ב-`else`.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: 'הבאג הקלאסי: לו היינו כותבים `actualR || realizedPnl`, טרייד עם `actualR = 0` (בדיוק בלי רווח ובלי הפסד ב-R) היה "נופל" ל-`realizedPnl` — שיכול להיות שלילי בגלל עמלות — ומסווג כ-Loss. `||` מתייחס ל-`0`, `""` ו-`false` כאל "ריק"; `??` רק ל-`null` ו-`undefined`.',
        },
        {
          kind: 'snippet',
          lang: 'js',
          title: 'נסו בקונסול של הדפדפן (F12)',
          code: `0 || 5      // 5  — 0 נחשב falsy
0 ?? 5      // 0  — 0 הוא ערך תקין
null ?? 5   // 5
undefined || 'ריק'  // 'ריק'`,
        },
        {
          kind: 'quiz',
          question: 'פוזיציית שורט: כניסה ב-`50`, יציאה ב-`45`, כמות `10`. מה `calcPnl` מחזירה?',
          options: ['`-50`', '`50`', '`500`', '`-5`'],
          answer: 1,
          explanation: 'בשורט מרוויחים כשהמחיר יורד: `(avgEntry - exitPrice) * qty` = `(50 - 45) * 10` = `50`.',
        },
        {
          kind: 'quiz',
          question: 'מה מחזירה `resultFromR(0, -3)`?',
          options: ["`'Win'`", "`'Loss'`", "`'Breakeven'`"],
          answer: 2,
          explanation: '`0 ?? -3` הוא `0`, כי `0` אינו `null`. אף אחד מה-if-ים לא מתקיים, ולכן מגיעים ל-`return \'Breakeven\'`.',
        },
        {
          kind: 'exercise',
          prompt: 'כתבו ב-JavaScript נקי (בלי טיפוסים) פונקציה `pnlPercent(direction, avgEntry, exitPrice)` שמחזירה את אחוז הרווח של הטרייד — למשל לונג מ-`100` ל-`110` מחזיר `10`. השתמשו ב-ternary.',
          hint: 'אפשר לחשב קודם את הרווח למניה לפי הכיוון, ואז לחלק ב-`avgEntry` ולהכפיל ב-100.',
          solution: {
            lang: 'js',
            code: `function pnlPercent(direction, avgEntry, exitPrice) {
  const perShare = direction === 'Long'
    ? exitPrice - avgEntry
    : avgEntry - exitPrice
  return (perShare / avgEntry) * 100
}

pnlPercent('Long', 100, 110)  // 10
pnlPercent('Short', 50, 45)   // 10`,
          },
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 2. Objects, destructuring, spread
    // -----------------------------------------------------------------------
    {
      slug: 'js-objects-destructuring-spread',
      title: 'אובייקטים, destructuring ו-spread',
      summary: 'איך מנוע ה-FIFO בונה פקודות וטריידים כאובייקטים, שולף שדות מפוזיציה פתוחה, ומפצל ביצוע אחד לשניים בהיפוך.',
      minutes: 14,
      blocks: [
        {
          kind: 'text',
          body: `אובייקט ב-JavaScript הוא אוסף של זוגות **מפתח: ערך** בתוך סוגריים מסולסלים. כמעט כל נתון באתר מסתובב כאובייקט: ביצוע שהגיע מ-IBKR, טרייד פתוח שנקרא מהמסד, פקודה שעומדת להיכתב לטבלת \`Order\`.

מנוע ה-FIFO מקבל ביצוע "מנורמל" (\`exec\`) ובונה ממנו את האובייקט שייכתב כשורה בטבלת \`Order\`. זו כל הפונקציה:`,
        },
        {
          kind: 'source',
          title: 'בניית אובייקט פקודה מביצוע',
          ref: { file: 'lib/trade/fifo.ts', start: 'function buildOrderCreate(' },
          notes: [
            { match: 'function buildOrderCreate(', text: 'הטיפוסים אחרי הנקודתיים (`NormalizedExecution`, `\'BUY\' | \'SELL\'`, `OrderCreate`) הם TypeScript — במסלול TS. ב-JS נקי זה פשוט `function buildOrderCreate(exec, side, commission)`.' },
            { match: 'return {', text: '**object literal**: יוצרים אובייקט חדש ישירות בתוך ה-`return`. כל שורה היא `מפתח: ערך`, ופסיק מפריד בין שדות (פסיק אחרי השדה האחרון מותר).' },
            { match: 'side,', text: '**shorthand property**: `side,` זה קיצור של `side: side,` — כשלמשתנה ולמפתח יש אותו שם. אותו דבר `commission,` בשורה הבאה. שימו לב שה-`side` מגיע מהפרמטר ולא מ-`exec.side`: הקורא כבר המיר `SSHORT` ל-`SELL`, וטבלת `Order` מכירה רק `BUY` / `SELL`.' },
            { match: 'quantity: exec.quantity,', text: 'קריאת שדה עם נקודה: `exec.quantity`. מעתיקים שדה-שדה במפורש, כך שרק מה שבאמת שייך לפקודה נכנס לשורה — `exec.ticker` למשל שייך ל-`Trade`, ולכן הוא לא כאן.' },
          ],
        },
        {
          kind: 'text',
          body: `**Destructuring** הוא הכיוון ההפוך: במקום לבנות אובייקט — מפרקים אותו למשתנים. כשמגיע ביצוע על מניה שכבר יש בה פוזיציה פתוחה, \`matchExecution\` צריכה שישה שדות של הטרייד הפתוח שוב ושוב. במקום לכתוב \`openTrade.avgEntryPrice\` בכל שורה, היא שולפת את כולם בשורה אחת:`,
        },
        {
          kind: 'source',
          title: 'שליפת שדות מהפוזיציה הפתוחה + הוספה לפוזיציה (scale-in)',
          ref: { file: 'lib/trade/fifo.ts', start: 'const { direction, avgEntryPrice', end: "return { type: 'SCALE_IN'" },
          notes: [
            { match: 'const { direction', text: 'destructuring של אובייקט: יוצר שישה משתנים בשמות של השדות, עם הערכים מ-`openTrade`. זה שווה ערך לשש שורות של `const direction = openTrade.direction` וכן הלאה.' },
            { match: 'avgEntryPrice: newAvgEntry,', text: 'כאן המפתח (`avgEntryPrice`) והמשתנה (`newAvgEntry`) בשמות שונים, אז אין shorthand. מחיר הכניסה החדש הוא ממוצע משוקלל של הישן והחדש.' },
            { match: 'realizedPnl: realizedPnl - exec.commission,', text: 'אותו שם משני הצדדים, אבל הערך הוא ביטוי — לכן כותבים במלואו. העמלה של ההוספה "ממומשת" מיד כהפסד, בדיוק כמו בפתיחה.' },
            { match: 'tradeId: openTrade.id', text: 'לא חייבים לפרק הכול. `id` משמש פעם אחת, אז ניגשים אליו ישירות. `const update: TradeUpdate` למעלה הוא שוב TypeScript — ב-JS פשוט `const update = {`.' },
          ],
        },
        {
          kind: 'compare',
          left: {
            lang: 'js',
            title: 'בלי destructuring',
            code: `const newQty = openTrade.totalQuantity + exec.quantity
const newOpened = openTrade.totalQuantityOpened + exec.quantity
const newComm = openTrade.totalCommission + exec.commission
const newPnl = openTrade.realizedPnl - exec.commission`,
          },
          right: {
            lang: 'js',
            title: 'עם destructuring',
            code: `const { totalQuantity, totalQuantityOpened, totalCommission, realizedPnl } = openTrade

const newQty = totalQuantity + exec.quantity
const newOpened = totalQuantityOpened + exec.quantity
const newComm = totalCommission + exec.commission
const newPnl = realizedPnl - exec.commission`,
          },
        },
        {
          kind: 'text',
          body: `אפשר גם לפרק אובייקט **מקונן** ולתת למשתנה **שם אחר**. הנה בדיקת המנהל שרצה לפני כל פעולה בפאנל הזה — \`supabase.auth.getUser()\` מחזירה אובייקט בצורה \`{ data: { user }, error }\`:`,
        },
        {
          kind: 'source',
          title: 'destructuring מקונן עם שינוי שם',
          ref: { file: 'lib/auth/require-admin.ts', start: 'const supabase = await createClient()', lines: 8 },
          notes: [
            { match: 'data: { user },', text: 'פירוק מקונן: נכנסים לתוך `data` ושולפים ממנו את `user`. נוצר משתנה בשם `user` בלבד — **לא** נוצר משתנה בשם `data`.' },
            { match: 'error: authError,', text: 'שינוי שם: `מפתח: שם-חדש`. לוקחים את השדה `error` ושומרים אותו במשתנה `authError` — שם ברור יותר, ולא מתנגש עם `error` אחר בהמשך הפונקציה.' },
            { match: 'if (authError || !user)', text: 'מכאן משתמשים בשמות החדשים. אם יש שגיאה או שאין משתמש מחובר — זורקים 401 (על `throw` נדבר בשיעור על async).' },
          ],
        },
        {
          kind: 'quiz',
          question: 'אחרי השורה `const { data: { user }, error: authError } = await supabase.auth.getUser()`, אילו משתנים קיימים?',
          options: ['`data` ו-`error`', '`user` ו-`authError`', '`data`, `user`, `error` ו-`authError`', '`user` ו-`error`'],
          answer: 1,
          explanation: 'מה שמשמאל לנקודתיים הוא **שם השדה** באובייקט; מה שמימין הוא היעד. `data` הוא רק "מסלול" לתוך האובייקט, ו-`error` שונה ל-`authError`. נוצרים רק `user` ו-`authError`.',
        },
        {
          kind: 'text',
          body: `**Spread** (\`...\`) מעתיק את כל השדות של אובייקט לתוך אובייקט חדש. המקום שבו זה הכי חשוב ב-FIFO הוא **היפוך פוזיציה** (REVERSAL): אתם בלונג 100 מניות ומוכרים 150. ביצוע אחד צריך להפוך לשתי פקודות — מכירה של 100 שסוגרת את הלונג, ומכירה של 50 שפותחת שורט. שתיהן זהות ל-\`exec\` בכל השדות, חוץ מהכמות:`,
        },
        {
          kind: 'source',
          title: 'היפוך מלונג לשורט',
          ref: { file: 'lib/trade/fifo.ts', start: '// Reversal: sell more than the open long position', lines: 24 },
          notes: [
            { match: 'const closingCommission = exec.commission * (closingQty / exec.quantity)', text: 'העמלה של הביצוע מתחלקת באופן יחסי: אם 100 מתוך 150 מניות סוגרות, שני שלישים מהעמלה הולכים לטרייד הנסגר ושליש לטרייד החדש.' },
            { match: '{ ...exec, quantity: closingQty }', text: '`{ ...exec, quantity: closingQty }` — אובייקט **חדש** עם כל השדות של `exec`, ואז `quantity` דורס את הכמות. `exec` עצמו לא משתנה, וזה קריטי: בשורה הבאה משתמשים בו שוב כדי לבנות את החלק הפותח עם `newQty`.' },
            { match: "type: 'REVERSAL',", text: 'אובייקט שבתוכו אובייקטים: `close` ו-`open`, כל אחד עם הכתיבות שלו. הקורא שומר את שניהם בטרנזקציה אחת דרך ה-RPC `reverse_position`.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: 'הסדר ב-spread קובע: מה שנכתב **אחרון** מנצח. `{ ...exec, quantity: 50 }` נותן 50, אבל `{ quantity: 50, ...exec }` נותן את `exec.quantity` — ה-spread דרס את מה שכתבנו לפניו. ועוד דבר: spread הוא העתקה **רדודה** — אובייקטים ומערכים פנימיים לא משוכפלים, רק ההפניה אליהם מועתקת.',
        },
        {
          kind: 'snippet',
          lang: 'js',
          title: 'נסו בקונסול',
          code: `const exec = { ticker: 'AAPL', side: 'SELL', quantity: 150, price: 190 }

const closing = { ...exec, quantity: 100 }
const opening = { ...exec, quantity: 50 }

closing.quantity   // 100
opening.quantity   // 50
exec.quantity      // 150 — המקור לא השתנה
closing === exec   // false — אובייקט חדש`,
        },
        {
          kind: 'quiz',
          question: 'אם `exec.quantity` הוא `150`, מה הערך של `{ quantity: 100, ...exec }.quantity`?',
          options: ['`100`', '`150`', '`250`', 'שגיאה — מפתח כפול'],
          answer: 1,
          explanation: 'השדות נכתבים לפי הסדר. קודם `quantity: 100`, ואז ה-spread מעתיק את כל השדות של `exec` — כולל `quantity: 150` — ודורס. לכן ב-FIFO הדריסה תמיד נכתבת **אחרי** ה-spread.',
        },
        {
          kind: 'callout',
          tone: 'tip',
          body: 'אותו דפוס בדיוק מופיע ב-React. בטבלת המשתמשים בפאנל (`components/admin/admin-users-table.tsx`), כפתור Pro/Free מעדכן שורה עם `{ ...r, subscriptionTier: nextTier }` — בונים אובייקט חדש במקום לשנות את הקיים, כי React מזהה שינוי לפי הפניה חדשה. נגיע לזה במסלול React.',
        },
        {
          kind: 'exercise',
          prompt: 'כתבו ב-JS נקי פונקציה `splitExecution(exec, closingQty)` שמחזירה מערך של שני אובייקטים: החלק הסוגר (כמות `closingQty`) והחלק הפותח (שאר הכמות). כל חלק מקבל עמלה יחסית לכמות שלו, ו-`exec` עצמו לא משתנה. השתמשו ב-destructuring וב-spread.',
          hint: 'פרקו את `quantity` ו-`commission` מ-`exec`. לכל חלק: `{ ...exec, quantity: ..., commission: ... }` — הדריסות אחרי ה-spread.',
          solution: {
            lang: 'js',
            code: `function splitExecution(exec, closingQty) {
  const { quantity, commission } = exec
  const openingQty = quantity - closingQty
  return [
    { ...exec, quantity: closingQty, commission: commission * (closingQty / quantity) },
    { ...exec, quantity: openingQty, commission: commission * (openingQty / quantity) },
  ]
}

const [closing, opening] = splitExecution({ ticker: 'AAPL', quantity: 150, commission: 3 }, 100)
// closing: { ticker: 'AAPL', quantity: 100, commission: 2 }
// opening: { ticker: 'AAPL', quantity: 50, commission: 1 }`,
          },
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 3. Arrays
    // -----------------------------------------------------------------------
    {
      slug: 'js-arrays',
      title: 'מערכים: filter, map, find ו-Set',
      summary: 'איך דף התחקור מחשב אחוז הצלחה, Profit Factor והתפלגות R מתוך מערך של טריידים — ואיך מסירים כפילויות עם `Set`.',
      minutes: 15,
      blocks: [
        {
          kind: 'text',
          body: `כל מספר בדף התחקור מתחיל ממערך של טריידים סגורים. ב-JS לא כותבים לולאה ידנית לכל שאלה — יש למערכים מתודות מוכנות שמקבלות **פונקציה** ומפעילות אותה על כל איבר:

- \`filter\` — מערך חדש רק עם האיברים שהפונקציה החזירה עבורם \`true\`
- \`map\` — מערך חדש באותו אורך, כל איבר אחרי טרנספורמציה
- \`find\` / \`findIndex\` — האיבר הראשון שמתאים / המיקום שלו
- \`reduce\` — "מקפל" את כל המערך לערך אחד (למשל סכום)

הפונקציות שמעבירים כתובות כ-**arrow functions**: \`t => t.realizedPnl > 0\` היא פונקציה שמקבלת \`t\` ומחזירה את הביטוי. על פונקציות כערכים נרחיב בשיעור על closures.`,
        },
        {
          kind: 'source',
          title: 'חישוב סטטיסטיקות הטריידים',
          ref: { file: 'lib/utils/calculations.ts', start: 'const winners = trades.filter(', lines: 25 },
          notes: [
            { match: 'const winners = trades.filter(', text: '`filter` מחזיר מערך **חדש** עם הטריידים שבהם `realizedPnl > 0`. המקור (`trades`) לא משתנה. הסיווג כאן לפי כסף, כך שגם טריידים בלי סטופ (בלי R) נספרים.' },
            { match: 'winners.reduce((s, t) => s + t.realizedPnl, 0)', text: '`reduce` מתחיל עם `0` (הארגומנט השני) כ-`s`, ובכל איבר מחזיר את הסכום המצטבר החדש. התוצאה: סך הרווחים בדולרים. אחר כך `profitFactor` מחלק רווחים בהפסדים — ואם אין הפסדים בכלל, מחזיר `999` במקום לחלק באפס.' },
            { match: '[...trades].sort(', text: '`sort` **משנה את המערך עצמו** (בניגוד ל-`filter` / `map`). לכן מעתיקים קודם עם `[...trades]` — spread של מערך — כדי לא לשנות בשקט את סדר המערך של מי שקרא לפונקציה. `a - b` ממיין מהמוקדם למאוחר.' },
            { match: 'for (const t of sortedByClose)', text: 'כשצריך מצב שמתעדכן לאורך הדרך (שיא, רווח מצטבר, ירידה מקסימלית) — לולאת `for...of` פשוטה קריאה יותר משרשרת מתודות.' },
          ],
        },
        {
          kind: 'text',
          body: `גרף התפלגות ה-R מחלק כל טרייד ל"סל" לפי ה-R שלו. כאן נכנסים \`map\` שבונה מערך מונים, ו-\`findIndex\` שמוצא לאיזה סל שייך כל טרייד:`,
        },
        {
          kind: 'source',
          title: 'התפלגות R',
          ref: { file: 'lib/utils/calculations.ts', start: 'export function rDistribution(' },
          notes: [
            { match: 'R_BINS.map(b => ({ label: b.label, count: 0 }))', text: '`map` בונה מערך מונים — אחד לכל סל, מתחיל באפס. הסוגריים העגולים סביב `{ ... }` הכרחיים: בלעדיהם JS חושב שהסוגריים המסולסלים הם גוף פונקציה ולא אובייקט.' },
            { match: 'continue', text: '`continue` מדלג לאיבר הבא בלולאה. טרייד בלי R (בלי סטופ) לא נכנס להתפלגות.' },
            { match: 'R_BINS.findIndex(', text: '`findIndex` מחזיר את **המיקום** של הסל הראשון שמתאים, או `-1` אם אין. הסלים הם `[min, max)` — כולל את המינימום, לא כולל את המקסימום.' },
            { match: 'counts[idx].count++', text: 'גישה לאיבר לפי מיקום (`counts[idx]`) והגדלת המונה. `++` מוסיף 1.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'טרייד נסגר בדיוק ב-`actualR = -1` (נעצר בסטופ, בלי עמלות). לאיזה סל `findIndex` ישייך אותו?',
          options: ["`'-2R–-1R'`", "`'-1R–0R'`", "`'0R–1R'`", 'לאף סל — `idx` יהיה `-1`'],
          answer: 1,
          explanation: 'התנאי הוא `r >= b.min && r < b.max`. בסל `-2R–-1R` המקסימום הוא `-1`, ו-`-1 < -1` שקרי. בסל `-1R–0R` המינימום הוא `-1`, ו-`-1 >= -1` אמיתי — זה הסל הראשון שמתאים.',
        },
        {
          kind: 'text',
          body: `\`find\` דומה ל-\`findIndex\`, אבל מחזיר את **האיבר עצמו** (או \`undefined\`). סרגל הצד של פאנל המנהל משתמש בו כדי לדעת איזו לשונית להדגיש לפי הכתובת הנוכחית:`,
        },
        {
          kind: 'source',
          title: 'הלשונית הפעילה בפאנל המנהל',
          ref: { file: 'components/admin/admin-layout.tsx', start: 'const activeTab: TabId =', end: "?? 'users'" },
          notes: [
            { match: 'const activeTab: TabId =', text: '`: TabId` הוא TypeScript (מגביל את הערך לאחד ממזהי הלשוניות). ב-JS: `const activeTab =`.' },
            { match: 'TABS.find(', text: '`find` עובר על `TABS` ומחזיר את הלשונית הראשונה שהכתובת שווה ל-`href` שלה או מתחילה ב-`href` ועוד `/` — כך `/admin/learn/js-arrays` עדיין מדגיש את "למידה". `?.id` — אם `find` החזיר `undefined`, מקבלים `undefined` במקום קריסה.' },
            { match: "?? 'users'", text: 'ואם לא נמצאה לשונית — ברירת מחדל: משתמשים.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'הכתובת היא `/admin/health/x`. מה יהיה `activeTab`?',
          options: ["`'users'`", "`'health'`", '`undefined`', 'שגיאה, כי `find` לא מצא התאמה מדויקת'],
          answer: 1,
          explanation: 'הכתובת לא שווה ל-`/admin/health`, אבל `startsWith(\'/admin/health/\')` מתקיים. `find` מחזיר את לשונית הבריאות, ו-`?.id` נותן `\'health\'`.',
        },
        {
          kind: 'text',
          body: `**\`Set\`** הוא אוסף שבו כל ערך מופיע פעם אחת בלבד. דף "בריאות המערכת" מציג את 20 השגיאות האחרונות ורוצה להראות את האימייל של המשתמש בכל שורה. אותו משתמש יכול להופיע בכמה שורות — ואין טעם לבקש אותו מהמסד פעמיים. (שימו לב גם ל-\`const { data: users }\` — destructuring עם שינוי שם מהשיעור הקודם.)`,
        },
        {
          kind: 'source',
          title: 'משתמשים ייחודיים ומיפוי מזהה לאימייל',
          ref: { file: 'app/(dashboard)/admin/health/page.tsx', start: 'const failureRows = failuresRes.data ?? []', end: '}))' },
          notes: [
            { match: 'new Set(failureRows.map(r => r.userId)', text: 'שרשרת: `map` שולף את `userId` מכל שורה, `filter` מסנן ערכים ריקים (`null`), ו-`new Set` משאיר כל מזהה פעם אחת. `(x): x is string =>` הוא TypeScript (type guard); ב-JS נקי: `.filter(x => Boolean(x))`.' },
            { match: 'Array.from(', text: '`Array.from` ממיר את ה-`Set` חזרה למערך, כי `.in(\'id\', ...)` של Supabase מצפה למערך. כך כל המשתמשים נשלפים **בשאילתה אחת**.' },
            { match: 'for (const u of users ?? [])', text: 'בונים `Map` ממזהה לאימייל. `users ?? []` — אם השאילתה לא החזירה כלום, עוברים על מערך ריק במקום לקרוס.' },
            { match: 'emailByUserId.get(r.userId) ?? null', text: 'שליפה מ-`Map` לפי מפתח היא מיידית, לעומת `users.find(...)` שסורק את כל המערך מחדש לכל שורה.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'tip',
          body: 'שני הרגלים טובים בקטע הזה: (1) **שאילתה אחת עם `.in`** במקום שאילתה לכל שורה — הבעיה הקלאסית שנקראת N+1. (2) **`Map` לחיפוש** במקום `find` בתוך `map` — עם 20 שורות זה לא מורגש, אבל עם אלפי טריידים ההבדל אמיתי.',
        },
        {
          kind: 'snippet',
          lang: 'js',
          title: 'נסו בקונסול',
          code: `const trades = [
  { ticker: 'AAPL', realizedPnl: 120 },
  { ticker: 'TSLA', realizedPnl: -80 },
  { ticker: 'AAPL', realizedPnl: -30 },
  { ticker: 'NVDA', realizedPnl: 250 },
]

trades.filter(t => t.realizedPnl > 0).length       // 2
trades.map(t => t.ticker)                          // ['AAPL', 'TSLA', 'AAPL', 'NVDA']
Array.from(new Set(trades.map(t => t.ticker)))      // ['AAPL', 'TSLA', 'NVDA']
trades.find(t => t.realizedPnl < 0)                 // { ticker: 'TSLA', realizedPnl: -80 }
trades.findIndex(t => t.ticker === 'MSFT')          // -1
trades.reduce((s, t) => s + t.realizedPnl, 0)       // 260`,
        },
        {
          kind: 'quiz',
          question: 'מה תהיה התוצאה של `Array.from(new Set([\'u1\', null, \'u1\', \'u2\'].filter(x => Boolean(x))))`?',
          options: ["`['u1', 'u2']`", "`['u1', 'u1', 'u2']`", "`['u1', null, 'u2']`", "`['u1', null, 'u1', 'u2']`"],
          answer: 0,
          explanation: '`filter` מסיר את `null` (כי `Boolean(null)` הוא `false`), ו-`Set` משאיר כל ערך פעם אחת. `Array.from` מחזיר מערך לפי סדר ההופעה הראשונה.',
        },
        {
          kind: 'exercise',
          prompt: 'כתבו ב-JS נקי פונקציה `losingTickers(trades)` שמקבלת מערך של טריידים (`{ ticker, realizedPnl }`) ומחזירה מערך של הטיקרים שהיה בהם לפחות טרייד מפסיד אחד — כל טיקר פעם אחת, ממוין לפי האלפבית.',
          hint: '`filter` להפסדים, `map` לטיקר, `new Set` לייחודיות, `Array.from` חזרה למערך, ו-`sort()` בסוף (בלי פונקציית השוואה הוא ממיין מחרוזות לפי האלפבית).',
          solution: {
            lang: 'js',
            code: `function losingTickers(trades) {
  const tickers = trades
    .filter(t => t.realizedPnl < 0)
    .map(t => t.ticker)
  return Array.from(new Set(tickers)).sort()
}

losingTickers([
  { ticker: 'TSLA', realizedPnl: -80 },
  { ticker: 'AAPL', realizedPnl: 120 },
  { ticker: 'AAPL', realizedPnl: -30 },
  { ticker: 'TSLA', realizedPnl: -10 },
])  // ['AAPL', 'TSLA']`,
          },
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 4. async / await
    // -----------------------------------------------------------------------
    {
      slug: 'js-async-await',
      title: 'async, await ו-Promise',
      summary: 'איך דף הבריאות שולף ארבע שאילתות במקביל עם `Promise.all`, ואיך כפתור Pro/Free מטפל בשגיאות של `fetch` עם try/catch/finally.',
      minutes: 15,
      blocks: [
        {
          kind: 'text',
          body: `שאילתה למסד, קריאה ל-API של IBKR, שליחת טופס — כל אלה לוקחים זמן. JavaScript לא "נתקע" ומחכה; במקום זה פונקציה כזו מחזירה מיד **Promise** — הבטחה לערך שיגיע בעתיד (או לשגיאה).

- \`async\` לפני פונקציה — הפונקציה תמיד מחזירה Promise, ומותר להשתמש בתוכה ב-\`await\`.
- \`await promise\` — עוצר **את הפונקציה הזו בלבד** עד שה-Promise מסתיים, ומחזיר את הערך. אם ה-Promise נכשל, \`await\` זורק שגיאה שאפשר לתפוס עם \`try/catch\`.`,
        },
        {
          kind: 'compare',
          left: {
            lang: 'js',
            title: 'בלי await — שרשרת then',
            code: `function loadRate() {
  return fetch('/api/rate')
    .then(res => res.json())
    .then(json => json.rate)
}`,
          },
          right: {
            lang: 'js',
            title: 'עם async / await',
            code: `async function loadRate() {
  const res = await fetch('/api/rate')
  const json = await res.json()
  return json.rate
}`,
          },
        },
        {
          kind: 'source',
          title: 'דף בריאות המערכת: ארבע שאילתות במקביל',
          ref: { file: 'app/(dashboard)/admin/health/page.tsx', start: 'export default async function AdminHealthPage()', end: '  ])' },
          notes: [
            { match: 'export default async function AdminHealthPage()', text: 'קומפוננטת שרת של Next.js יכולה להיות `async` — היא מחכה לנתונים ורק אז מחזירה את ה-HTML.' },
            { match: 'await requireAdminPage()', text: 'קודם כול, **בנפרד**: מוודאים שהגולש הוא מנהל. אם לא, `redirect` של Next.js זורק "אות" מיוחד שעוצר את הרינדור — ושום שאילתה למטה לא רצה.' },
            { match: 'await Promise.all([', text: '`Promise.all` מקבל מערך של Promises, מריץ את כולם **במקביל**, ומחכה שכולם יסתיימו. התוצאות חוזרות במערך **באותו סדר**, ומפורקות מיד עם destructuring של מערך: `const [metricsRes, sizesRes, ...]`.' },
            { match: '.limit(20),', text: 'ה-query builder של Supabase מתנהג כמו Promise (יש לו `then`), ולכן אפשר לשים אותו ישר בתוך `Promise.all`. הבקשה נשלחת רק כשמחכים לו.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'tip',
          body: 'Supabase **לא זורק** כשהמסד מחזיר שגיאה — הוא מחזיר אובייקט `{ data, error }`. לכן מיד אחרי ה-`Promise.all` הדף בודק `if (metricsRes.error)` לכל תוצאה, כותב ללוג, ונופל לערכי ברירת מחדל (`?? EMPTY_METRICS`). אם שאילתה אחת נכשלה, שאר הדף עדיין מוצג.',
        },
        {
          kind: 'quiz',
          question: 'כל אחת מארבע השאילתות לוקחת בערך 100ms. כמה זמן ייקח בערך החלק הזה של הדף עם `Promise.all`, ולעומת זאת עם ארבעה `await` אחד אחרי השני?',
          options: ['400ms בשני המקרים', '~100ms עם `Promise.all`, ~400ms ברצף', '~100ms בשני המקרים', '~400ms עם `Promise.all`, ~100ms ברצף'],
          answer: 1,
          explanation: 'ארבעה `await` ברצף מחכים לכל שאילתה לפני ששולחים את הבאה. `Promise.all` שולח את כולן מיד ומחכה לאיטית ביותר. כשהשאילתות לא תלויות זו בזו — מקבילים.',
        },
        {
          kind: 'text',
          body: `בצד הלקוח (בדפדפן) קוראים ל-API של האתר עם \`fetch\`. בטבלת המשתמשים, לחיצה על Pro/Free קודם **משנה את השורה במסך מיד** (עדכון אופטימי), ואז שולחת את הבקשה לשרת. אם משהו נכשל — מחזירים את השורה למצבה הקודם:`,
        },
        {
          kind: 'source',
          title: 'כפתור Pro/Free: fetch עם try/catch/finally',
          ref: { file: 'components/admin/admin-users-table.tsx', start: '    try {', lines: 35 },
          notes: [
            { match: 'await fetch(', text: '`fetch` מחזיר Promise של `Response`. הכתובת היא template literal שמשלב בתוכה את `row.id` — נרחיב בשיעור על מחרוזות.' },
            { match: '.catch(() => ({}))', text: 'גם `res.json()` אסינכרוני — והוא נכשל אם גוף התשובה אינו JSON (למשל דף שגיאה של השרת). `.catch(() => ({}))` הופך כישלון כזה לאובייקט ריק, וההודעה נופלת לברירת המחדל בעברית. `as { ... }` אחרי זה הוא TypeScript.' },
            { match: 'if (!res.ok)', text: '**חשוב:** `fetch` לא זורק על 403 או 500! הוא זורק רק כשאין רשת בכלל. תשובת שגיאה מהשרת היא תשובה "מוצלחת" מבחינתו, ולכן חייבים לבדוק `res.ok` ידנית — ולבטל את העדכון האופטימי.' },
            { match: '} finally {', text: '`finally` רץ **תמיד** — בהצלחה, אחרי `catch`, וגם אחרי ה-`return` שבתוך ה-`if`. זה המקום היחיד שצריך לכבות בו את הספינר.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'השרת עונה `403` עם `{ "error": "Forbidden" }`. מה קורה ב-`toggleTier`?',
          options: [
            'הקוד קופץ ל-`catch` ומציג "שגיאת רשת"',
            'נכנסים ל-`if (!res.ok)`: השורה חוזרת למצבה הקודם ומוצג `Forbidden`, ואז `finally` מכבה את הספינר',
            'לא קורה כלום, כי 403 נחשב הצלחה',
            'נכנסים ל-`if (!res.ok)`, אבל `finally` לא רץ בגלל ה-`return`',
          ],
          answer: 1,
          explanation: '`fetch` לא זורק על סטטוס שגיאה, אז לא מגיעים ל-`catch`. `res.ok` הוא `false` עבור 403, ולכן מבטלים את העדכון ומציגים את `json.error`. `finally` רץ גם אחרי `return`.',
        },
        {
          kind: 'text',
          body: `בצד השרת אפשר להשתמש ב-\`throw\` כדי לרכז את כל סוגי הכישלון ב-\`catch\` אחד. הפונקציה שמביאה את שער הדולר-שקל להצגת המחיר בשקלים עושה בדיוק את זה:`,
        },
        {
          kind: 'source',
          title: 'שער דולר-שקל עם fallback',
          ref: { file: 'lib/billing/fx.ts', start: 'export async function getUsdToIlsRate()' },
          notes: [
            { match: 'throw new Error(`fx api', text: 'כאן הופכים בכוונה תשובת שגיאה (שבה `fetch` לא זורק) לשגיאה אמיתית עם `throw`. מעכשיו גם שגיאת HTTP, גם רשת וגם JSON שבור מגיעים לאותו `catch`.' },
            { match: 'json.rates?.ILS', text: '`?.` (optional chaining): אם `rates` חסר בתשובה של ה-API החיצוני — מקבלים `undefined` במקום קריסה. אחר כך בודקים שזה באמת מספר חיובי.' },
            { match: 'catch (err)', text: '`catch (err)` מקבל את מה שנזרק. התוצאה: אם השער לא זמין, מציגים מחיר משוער לפי `3.7` במקום להפיל את הדף — המחיר בשקלים הוא רק להמחשה; החיוב עצמו בדולרים.' },
            { match: 'Promise<number>', text: '`Promise<number>` הוא טיפוס TS: "הבטחה למספר". כל פונקציה `async` מחזירה Promise, גם כשכותבים `return rate` רגיל.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: 'הבאג הנפוץ ביותר: לשכוח `await`. `const res = fetch(url)` נותן את ה-Promise עצמו, לא את התשובה — ו-`res.ok` יהיה `undefined`. באג קרוב: `array.forEach(async x => ...)` לא מחכה לאף אחד מהם. כשצריך לחכות לכמה פעולות — `await Promise.all(array.map(async x => ...))`.',
        },
        {
          kind: 'quiz',
          question: 'מה קורה בקוד הזה: `const res = fetch(url); if (!res.ok) setError(\'שגיאה\')`?',
          options: ['עובד כרגיל', 'תמיד מציג שגיאה, כי `res` הוא Promise ו-`res.ok` הוא `undefined`', 'זורק שגיאה מיד', 'לעולם לא מציג שגיאה'],
          answer: 1,
          explanation: 'בלי `await`, `res` הוא Promise. ל-Promise אין שדה `ok`, אז `res.ok` הוא `undefined`, ו-`!undefined` הוא `true` — תמיד נכנסים ל-`if`, גם כשהשרת ענה בהצלחה.',
        },
        {
          kind: 'exercise',
          prompt: 'כתבו ב-JS נקי פונקציה `async function loadAdminData()` שמביאה **במקביל** את `/api/admin/jobs` ואת `/api/admin/ibkr`, ומחזירה `{ jobs, ibkr }` עם ה-JSON של שתיהן. אם אחת התשובות אינה `ok`, או שיש שגיאת רשת — החזירו `null`.',
          hint: '`Promise.all` על שני `fetch`, בדיקת `ok` לשניהם, ואז עוד `Promise.all` על שני ה-`json()`. עטפו הכול ב-`try/catch`.',
          solution: {
            lang: 'js',
            code: `async function loadAdminData() {
  try {
    const [jobsRes, ibkrRes] = await Promise.all([
      fetch('/api/admin/jobs'),
      fetch('/api/admin/ibkr'),
    ])
    if (!jobsRes.ok || !ibkrRes.ok) return null
    const [jobs, ibkr] = await Promise.all([jobsRes.json(), ibkrRes.json()])
    return { jobs, ibkr }
  } catch (err) {
    console.error('loadAdminData failed:', err)
    return null
  }
}`,
          },
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 5. Modules and closures
    // -----------------------------------------------------------------------
    {
      slug: 'js-modules-closures',
      title: 'מודולים, closures ופונקציות כערכים',
      summary: '`import` / `export`, משתנה ברמת המודול כמטמון, `??=`, ופונקציות שזוכרות את הסביבה שבה נוצרו — דרך הצובע של הקוד בפלטפורמה הזו ומטמון אזורי הזמן.',
      minutes: 14,
      blocks: [
        {
          kind: 'text',
          body: `כל קובץ JS/TS באתר הוא **מודול**: יש לו scope משלו, ומשתנה שמוגדר בו לא נראה מבחוץ — אלא אם מסמנים אותו ב-\`export\`. קובץ אחר מקבל אותו עם \`import\`.

משתנה שמוגדר ב"רמה העליונה" של מודול (מחוץ לכל פונקציה) נוצר **פעם אחת** כשהמודול נטען, ונשאר בחיים כל עוד התהליך רץ. זה הופך אותו למקום טבעי למטמון.

הנה הקובץ שצובע את קטעי הקוד בשיעור שאתם קוראים עכשיו:`,
        },
        {
          kind: 'source',
          title: 'צובע הקוד של הפלטפורמה',
          ref: { file: 'lib/learn/highlight.ts', start: "import { createHighlighter, type Highlighter } from 'shiki'", lines: 12 },
          notes: [
            { match: "import { createHighlighter, type Highlighter } from 'shiki'", text: '**named import** מחבילה (`shiki`). הסוגריים המסולסלים בוחרים אילו exports לקחת. `type Highlighter` הוא import של טיפוס בלבד (TS) — נמחק לגמרי ב-JS.' },
            { match: "from './types'", text: 'נתיב שמתחיל ב-`./` הוא קובץ באותה תיקייה (`lib/learn/types.ts`). בלי נקודה — זו חבילה מ-`node_modules`.' },
            { match: 'let highlighterPromise', text: 'משתנה ברמת המודול, לא מיוצא — פרטי לקובץ. `let` ולא `const`, כי הערך שלו ישתנה בקריאה הראשונה. הוא שורד בין בקשות לאותו שרת.' },
            { match: '??=', text: '`a ??= b` פירושו: אם `a` הוא `null` או `undefined` — שים בו את `b`. אחרת לא לגעת. כך `createHighlighter` (שטוען את כל הדקדוקים ולוקח זמן) רץ רק בקריאה הראשונה.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'tip',
          body: 'שימו לב שהמטמון שומר את **ה-Promise**, לא את ה-Highlighter המוכן. אם שתי בקשות מגיעות באותו רגע, השנייה מקבלת את אותו Promise שכבר בדרך ומחכה לו. אילו שמרנו את התוצאה רק אחרי `await`, שתי הבקשות היו רואות `null` ושתיהן היו טוענות את כל הדקדוקים.',
        },
        {
          kind: 'quiz',
          question: 'אחרי `let x = 0; x ??= 5;` — מה הערך של `x`? ומה היה עם `x ||= 5`?',
          options: ['`5` בשני המקרים', '`0` עם `??=`, `5` עם `||=`', '`0` בשני המקרים', '`5` עם `??=`, `0` עם `||=`'],
          answer: 1,
          explanation: 'בדיוק כמו `??` מול `||` מהשיעור הראשון: `??=` מציב רק כשהערך `null` / `undefined`, אז `0` נשאר. `||=` מציב כשהערך falsy — ו-`0` הוא falsy.',
        },
        {
          kind: 'text',
          body: `ב-JavaScript פונקציה היא **ערך** כמו מספר או מחרוזת: אפשר לשמור אותה במשתנה, להעביר אותה כארגומנט (כמו \`t => t.realizedPnl > 0\` ל-\`filter\`), ולהחזיר אותה מפונקציה.

**Closure** הוא מה שקורה כשפונקציה נוצרת בתוך פונקציה אחרת: היא **זוכרת** את המשתנים של הסביבה שבה נוצרה, גם כשקוראים לה מאוחר יותר. הנה פונקציה שמחשבת את ההפרש בין אזור זמן ל-UTC — עם מטמון ברמת המודול ו-closure קטן בפנים:`,
        },
        {
          kind: 'source',
          title: 'הפרש אזור זמן: מטמון + closure',
          ref: { file: 'lib/trade/tz.ts', start: 'const offsetFormatters = new Map' },
          notes: [
            { match: 'const offsetFormatters = new Map', text: 'מטמון ברמת המודול: `Map` מאזור זמן (`\'America/New_York\'`) לאובייקט פורמט. `const` רק אומר שאי אפשר להציב `Map` אחר — את התוכן מותר לשנות עם `.set`. `<string, Intl.DateTimeFormat>` הוא TS.' },
            { match: 'if (!fmt) {', text: 'יצירת `Intl.DateTimeFormat` יקרה; הקריאה לו זולה. אז יוצרים פעם אחת לכל אזור זמן ושומרים. בצ׳אט זה רץ על כל טרייד — אותו אזור זמן שוב ושוב.' },
            { match: 'const get = (type: string) =>', text: '**closure**: `get` היא פונקציה שנוצרת בתוך `getTzOffsetMs` ומשתמשת ב-`parts` — משתנה מהסביבה שלה. היא לא מקבלת את `parts` כפרמטר; היא פשוט "רואה" אותו. ה-`!` הוא TS ("בטוח לא undefined").' },
            { match: 'Date.UTC(get(', text: 'שש קריאות קצרות ל-`get` במקום שש פעמים `Number(parts.find(p => p.type === ...).value)`. פונקציה פנימית קטנה היא דרך טובה למנוע חזרה על קוד.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'מאיפה הפונקציה `get` יודעת על `parts`?',
          options: ['`parts` מועבר אליה כפרמטר', 'היא נוצרה בתוך אותה פונקציה שבה מוגדר `parts`, ולכן "רואה" אותו (closure)', '`parts` הוא משתנה גלובלי', 'היא לא יודעת — זו שגיאה'],
          answer: 1,
          explanation: 'הפרמטר היחיד של `get` הוא `type`. `parts` מוגדר בשורה שלפניה, באותה פונקציה — ופונקציה פנימית רואה את כל המשתנים של הפונקציה שעוטפת אותה.',
        },
        {
          kind: 'text',
          body: `closure חשוב במיוחד כשמעבירים פונקציה **למישהו אחר** שיקרא לה אחר כך. בפונקציה \`highlight\`, אנחנו מוסרים ל-Shiki אובייקט עם מתודה \`line\`. Shiki קורא לה פעם אחת לכל שורת קוד — הרבה אחרי שהשורה שהגדירה אותה רצה — והיא עדיין רואה את \`startLine\` ואת \`opts\`:`,
        },
        {
          kind: 'source',
          title: 'callback שזוכר את הסביבה שלו',
          ref: { file: 'lib/learn/highlight.ts', start: 'export async function highlight(', lines: 20 },
          notes: [
            { match: '= {},', text: 'ערך ברירת מחדל לפרמטר: אם לא מעבירים `opts`, הוא אובייקט ריק — ואז `opts.startLine` הוא `undefined` ולא קריסה. מה שבין הנקודתיים ל-`=` הוא טיפוס TS.' },
            { match: 'const startLine = opts.startLine ?? 1', text: 'משתנה מקומי של `highlight`. כשהפונקציה תסתיים הוא לא "ייעלם" — המתודה `line` למטה עדיין מחזיקה בו.' },
            { match: 'line(node, line) {', text: '**method shorthand**: `line(node, line) { ... }` זה קיצור של `line: function (node, line) { ... }`. Shiki קורא לה לכל שורה, והיא משתמשת ב-`startLine` וב-`opts` מהסביבה החיצונית — closure. (הפרמטר השני נקרא גם הוא `line` — מספר השורה; בתוך הגוף הוא מסתיר את שם המתודה.)' },
            { match: 'this.addClassToHast', text: 'Shiki קורא למתודה עם `this` שמכיל פונקציות עזר. לכן זו פונקציה רגילה ולא arrow function: ל-arrow function אין `this` משלה.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: 'משתנה ברמת מודול בשרת חי **בתוך מופע אחד** של השרת. ב-Vercel יש כמה מופעים במקביל, וכל אחד מתחיל ריק אחרי cold start. זה מושלם למטמון של דברים שאפשר לחשב מחדש (צובע קוד, פורמט של אזור זמן, שער מטבע) — ואף פעם לא למידע שחייב להיות נכון ומשותף, כמו נתונים של משתמש. אלה הולכים למסד.',
        },
        {
          kind: 'snippet',
          lang: 'js',
          title: 'closure בצורה הכי פשוטה',
          code: `function makeCounter() {
  let count = 0              // lives on inside the returned function
  return () => ++count
}

const next = makeCounter()
next()  // 1
next()  // 2
next()  // 3 — count is remembered between calls

const other = makeCounter()
other() // 1 — every call to makeCounter creates a fresh count`,
        },
        {
          kind: 'exercise',
          prompt: 'הכלילו את דפוס המטמון של `offsetFormatters`: כתבו ב-JS נקי פונקציה `memoizeByKey(create)` שמחזירה **פונקציה חדשה**. הפונקציה החדשה מקבלת `key`, קוראת ל-`create(key)` רק בפעם הראשונה עבור אותו מפתח, ובפעמים הבאות מחזירה את התוצאה השמורה.',
          hint: 'צרו `Map` בתוך `memoizeByKey` והחזירו arrow function שמשתמשת בו. ה-`Map` הוא ה-closure — כל קריאה ל-`memoizeByKey` מקבלת מטמון משלה.',
          solution: {
            lang: 'js',
            code: `function memoizeByKey(create) {
  const cache = new Map()
  return key => {
    if (!cache.has(key)) cache.set(key, create(key))
    return cache.get(key)
  }
}

const getFormatter = memoizeByKey(
  tz => new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit' }),
)

getFormatter('America/New_York') === getFormatter('America/New_York')  // true — created once`,
          },
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 6. Strings and dates
    // -----------------------------------------------------------------------
    {
      slug: 'js-strings-dates',
      title: 'מחרוזות ותאריכים',
      summary: 'איך מפרקים את מחרוזת התאריך של IBKR ידנית עם `split`, `slice` ו-`parseInt`, למה `new Date(string)` מסוכן, ואיך `Date.UTC` ו-template literals מרכיבים זמנים נכונים.',
      minutes: 15,
      blocks: [
        {
          kind: 'text',
          body: `דוחות Flex של IBKR מתארים כל ביצוע עם זמן בפורמט \`dd/MM/yyyy;HH:mm:ss TimeZone\` — למשל \`23/04/2026;14:30:00 EST\`. אם נפרש את השעה לא נכון, הטרייד ייפתח בשעה הלא נכונה, ואולי ביום הלא נכון — וגרפי "רווח לפי שעה" ו"לפי יום בשבוע" בדף התחקור יהיו שגויים.

הפתרון הנאיבי — \`new Date(raw)\` — לא עובד. לפני שנראה את הקוד, כדאי להבין למה:`,
        },
        {
          kind: 'snippet',
          lang: 'js',
          title: 'המלכודות של new Date(string)',
          code: `new Date('23/04/2026;14:30:00 EST')  // Invalid Date — unknown format

new Date('2026-04-23')        // midnight UTC (date-only ISO = UTC)
new Date('2026-04-23T14:30')  // 14:30 in the LOCAL zone of whatever machine runs this!

new Date(2026, 3, 23, 14, 30) // also local time; and month 3 is April (0-based)
new Date(Date.UTC(2026, 3, 23, 14, 30))  // 14:30 UTC — same instant on every machine`,
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: 'השרת ב-Vercel רץ ב-UTC, והדפדפן שלכם רץ בשעון ישראל. כל פירוש שתלוי ב"אזור הזמן המקומי" ייתן **רגע שונה** בשרת ובדפדפן עבור אותה מחרוזת. לכן הקובץ `lib/ibkr/parse-date.ts` מפרק את המחרוזת ידנית ובונה את הזמן רק עם `Date.UTC`, שלא תלוי במכונה.',
        },
        {
          kind: 'source',
          title: 'שלב 1: חיתוך המחרוזת לחלקים',
          ref: { file: 'lib/ibkr/parse-date.ts', start: "const semicolonIdx = raw.indexOf(';')", end: 'const tzAbbrev' },
          notes: [
            { match: "raw.indexOf(';')", text: '`indexOf` מחזיר את המיקום של התו הראשון שמתאים, או `-1` אם אין כזה. בלי `;` — המחרוזת לא בפורמט, ומחזירים `null`.' },
            { match: 'raw.slice(0, semicolonIdx).trim()', text: '`slice(start, end)` חותך מ-`start` ועד `end` **לא כולל**. בלי `end` — עד הסוף. `trim()` מסיר רווחים בקצוות.' },
            { match: "timeWithTz.lastIndexOf(' ')", text: '`lastIndexOf` מחפש מהסוף. בשעה עצמה אין רווחים, אז הרווח האחרון הוא זה שלפני קיצור אזור הזמן.' },
            { match: '.toUpperCase()', text: 'מנרמלים `est` ל-`EST` כדי שהחיפוש בטבלת ההפרשים `TZ_OFFSETS_MINUTES[tzAbbrev]` יצליח. קיצור לא מוכר מחזיר `undefined` — והפונקציה מחזירה `null`.' },
          ],
        },
        {
          kind: 'source',
          title: 'שלב 2: מספרים מתוך מחרוזות',
          ref: { file: 'lib/ibkr/parse-date.ts', start: '// Parse date: dd/MM/yyyy', end: 'const seconds' },
          notes: [
            { match: "datePart.split('/')", text: '`split` מפרק מחרוזת למערך לפי מפריד: `\'23/04/2026\'.split(\'/\')` נותן `[\'23\', \'04\', \'2026\']` — עדיין **מחרוזות**.' },
            { match: 'dateParts.length !== 3', text: 'בודקים שיש בדיוק שלושה חלקים לפני שניגשים ל-`dateParts[2]` — גישה למיקום שלא קיים מחזירה `undefined`.' },
            { match: 'parseInt(dateParts[0], 10)', text: '`parseInt(str, 10)` ממיר למספר בבסיס עשרוני. הארגומנט `10` מבטל ניחושים: בלעדיו `parseInt(\'0x10\')` נותן `16`. אם אין ספרות בכלל — מתקבל `NaN`, ולכן אחר כך יש בדיקת `isNaN` לכל רכיב.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'tip',
          body: 'בדיקת הטווחים שאחרי הקטע הזה מאשרת `day` בין 1 ל-31 לכל חודש. כלומר `31/02/2026` יעבור, ו-`Date.UTC` "יגלגל" אותו קדימה ל-3 במרץ. IBKR לא מייצר תאריכים כאלה, אז זה מקובל כאן — אבל טוב לדעת ש-`Date` לא זורק על תאריך לא קיים, הוא פשוט ממשיך לספור.',
        },
        {
          kind: 'quiz',
          question: 'מה מחזירים `parseInt(\'14abc\', 10)` ו-`Number(\'14abc\')`?',
          options: ['`14` ו-`14`', '`14` ו-`NaN`', '`NaN` ו-`NaN`', '`NaN` ו-`14`'],
          answer: 1,
          explanation: '`parseInt` קורא ספרות מההתחלה ועוצר בתו הראשון שאינו ספרה. `Number` דורש שכל המחרוזת תהיה מספר תקין, אחרת `NaN`. בגלל ההתנהגות הסלחנית של `parseInt`, הפורמט עצמו נבדק קודם עם `split` ו-`length`.',
        },
        {
          kind: 'source',
          title: 'שלב 3: מרכיבים את הרגע ב-UTC',
          ref: { file: 'lib/ibkr/parse-date.ts', start: '// Date.UTC() treats all arguments as UTC', end: 'return new Date(utcMs)' },
          notes: [
            { match: 'Date.UTC(year, month - 1', text: '`Date.UTC` מחזיר **מספר** — מילישניות מאז 1970 — כאילו השעה הייתה ב-UTC. החודשים ב-JS מתחילים מ-0 (ינואר = 0), לכן `month - 1`.' },
            { match: 'offsetMinutes * 60_000', text: 'ההפרש בדקות כפול 60,000 = מילישניות. `60_000` הוא פשוט `60000` — הקו התחתון רק לקריאות. EST הוא `-300`, אז מחסירים מינוס חמש שעות = **מוסיפים** חמש שעות.' },
            { match: 'return new Date(utcMs)', text: '`new Date(number)` הוא הבנאי הבטוח: מספר מילישניות הוא רגע חד-משמעי, בלי שום פירוש של מחרוזת או אזור זמן.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'IBKR שולח `23/04/2026;14:30:00 EDT`. ל-EDT יש היסט של `-240` דקות. איזו שעת UTC תצא?',
          options: ['`14:30Z`', '`10:30Z`', '`18:30Z`', '`19:30Z`'],
          answer: 2,
          explanation: '`wallClockUtcMs` הוא 14:30Z. `utcMs = wallClockUtcMs - (-240) * 60_000` — מוסיפים 4 שעות, ומקבלים 18:30Z. (`19:30Z` היה נכון עבור EST, עם היסט של 5 שעות.)',
        },
        {
          kind: 'text',
          body: `הכיוון ההפוך — **להרכיב** מחרוזת — נעשה עם **template literals**: מחרוזת בין גרשיים הפוכים (backticks, המקש שליד הספרה 1) שבתוכה \`\${ביטוי}\` מוחלף בערך. הפונקציה הבאה מציגה רגע בשעון של אזור זמן מסוים, כולל ההיסט — הפורמט שהצ׳אט מקבל, כדי שיראה את היום והשעה של המשתמש בלי להמיר בעצמו:`,
        },
        {
          kind: 'source',
          title: 'בניית מחרוזת ISO עם היסט',
          ref: { file: 'lib/trade/tz.ts', start: 'export function toZonedIso(' },
          notes: [
            { match: '.toISOString().slice(0, 19)', text: '`toISOString()` תמיד מחזיר UTC בצורה `2026-01-04T01:30:00.000Z`. הטריק: מזיזים את הרגע בגודל ההיסט, מפרמטים "כאילו UTC", וחותכים 19 תווים — בלי המילישניות וה-`Z`.' },
            { match: "padStart(2, '0')", text: '`padStart(2, \'0\')` משלים את המחרוזת משמאל לאורך 2 — `\'5\'` הופך ל-`\'05\'`. `String(...)` קודם, כי `padStart` היא מתודה של מחרוזות ולא של מספרים.' },
            { match: 'return `${wall}', text: 'template literal: כל `${...}` מוחלף בערך — גם ביטוי שלם כמו ternary שבוחר `-` או `+`. התוצאה, למשל: `2026-01-04T01:30:00+02:00`.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'ב-`lib/billing/fx.ts` הפונקציה `formatPriceUsdWithIls` מחזירה template literal שתוכנו `$${usd.toFixed(2)} (~₪${ils})`, כאשר `ils = Math.round(usd * ilsRate)`. מה יוצא עבור `usd = 14.99` ו-`ilsRate = 3.7`?',
          options: ['`$14.99 (~₪55)`', '`${usd} (~₪55)`', '`14.99 (~₪55.463)`', '`$14.99 (~₪55.46)`'],
          answer: 0,
          explanation: 'ה-`$` הראשון הוא תו רגיל, כי אחריו לא בא `{` — רק `${` פותח ביטוי. `toFixed(2)` נותן `\'14.99\'`, ו-`Math.round(55.463)` הוא `55`.',
        },
        {
          kind: 'exercise',
          prompt: 'כתבו ב-JS נקי את הכיוון ההפוך ל-`parseIbkrDate`: פונקציה `formatIbkrDate(date)` שמקבלת `Date` ומחזירה מחרוזת בפורמט של IBKR ב-UTC — למשל `23/04/2026;19:30:00 UTC`. השתמשו ב-`getUTC*`, ב-`padStart` וב-template literal.',
          hint: 'שימו לב ש-`getUTCMonth()` מחזיר 0–11, אז צריך `+ 1`. פונקציית עזר קטנה `pad` תחסוך חזרות.',
          solution: {
            lang: 'js',
            code: `function formatIbkrDate(date) {
  const pad = n => String(n).padStart(2, '0')
  const d = \`\${pad(date.getUTCDate())}/\${pad(date.getUTCMonth() + 1)}/\${date.getUTCFullYear()}\`
  const t = \`\${pad(date.getUTCHours())}:\${pad(date.getUTCMinutes())}:\${pad(date.getUTCSeconds())}\`
  return \`\${d};\${t} UTC\`
}

formatIbkrDate(new Date(Date.UTC(2026, 3, 23, 19, 30, 0)))  // '23/04/2026;19:30:00 UTC'`,
          },
        },
      ],
    },
  ],
}
