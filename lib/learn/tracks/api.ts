import type { Track } from '../types'

export const apiTrack: Track = {
  id: 'api',
  title: 'APIs',
  description: 'ה-API של האתר עצמו, קריאות לשירותים חיצוניים, webhooks ו-cron — דרך האינטגרציות האמיתיות.',
  lessons: [
    // -----------------------------------------------------------------------
    // 1. Our own HTTP API
    // -----------------------------------------------------------------------
    {
      slug: 'api-route-handlers',
      title: 'לתכנן API משלנו: מתודות, סטטוסים והחוזה של route handler',
      summary: 'איך נראית בקשת HTTP, מה ההבדל בין GET ל-POST ל-DELETE, מה כל קוד סטטוס אומר — ואיך כל route ב-`app/api` עובר את אותו מסלול: זהות, Pro, rate limit, ולידציה, עבודה.',
      minutes: 16,
      blocks: [
        {
          kind: 'text',
          body: `במסלול React ראינו ש-\`route.ts\` מייצא פונקציות בשמות של מתודות HTTP. השיעור הזה עוסק במה ששמים **בתוכן**: איך מתכננים API כך שהלקוח (הדפדפן, \`fetch\` בקומפוננטה, או סקריפט) יבין בדיוק מה קרה.

כל בקשת HTTP בנויה מארבעה חלקים:

- **מתודה** — מה רוצים לעשות: \`GET\`, \`POST\`, \`PATCH\`, \`PUT\`, \`DELETE\`
- **URL** — על איזה משאב: \`/api/trades/<id>\`
- **headers** — מטא-דאטה: סוג התוכן, עוגיית ההתחברות, טוקן
- **body** — הנתונים עצמם, אצלנו כמעט תמיד JSON

והתשובה בנויה משלושה: **קוד סטטוס** (מספר תלת-ספרתי), headers ו-body.`,
        },
        {
          kind: 'snippet',
          lang: 'bash',
          title: 'בקשה ותשובה מלאות מול האתר (ערכים מומצאים)',
          code: `# The session cookie is what supabase.auth.getUser() reads on the server
curl -i https://tradeanalyst.app/api/trades/tags \\
  -H "Cookie: sb-<project>-auth-token=<your-session>"

HTTP/2 200
content-type: application/json

{"tags":[{"tag":"breakout","count":12},{"tag":"earnings","count":4}]}

# Same request without the cookie
HTTP/2 401
{"error":"Unauthorized"}`,
        },
        {
          kind: 'text',
          body: `**REST** הוא סגנון שבו ה-URL מתאר **משאב** (שם עצם), והמתודה מתארת את **הפעולה** (פועל). לכן באתר יש \`/api/trades/[id]\` אחד, שמייצא גם \`PATCH\` (עדכון הערות ושדות "רכים") וגם \`DELETE\` — ולא \`/api/deleteTrade?id=...\`.

- \`GET\` — קריאה בלבד. לא משנה שום דבר בשרת
- \`POST\` — יצירה או "פעולה" (סגירת פוזיציה, התחלת סנכרון)
- \`PATCH\` — עדכון חלקי: רק השדות שנשלחו
- \`PUT\` — החלפה מלאה של המשאב (לא בשימוש באתר)
- \`DELETE\` — מחיקה

מושג חשוב: **אידמפוטנטיות** — שליחת אותה בקשה פעמיים משאירה את השרת באותו מצב כמו פעם אחת. \`GET\`, \`PUT\` ו-\`DELETE\` אידמפוטנטיים (מחיקה שנייה פשוט תחזיר 404, אבל הטרייד עדיין מחוק). \`POST\` לא: שני \`POST\` לפתיחת טרייד עלולים לפתוח שניים. זו הסיבה שדפדפן שואל "לשלוח שוב את הטופס?" בריענון.

הנה ה-route הכי פשוט באתר — \`GET\` שמחזיר את התגיות של המשתמש:`,
        },
        {
          kind: 'source',
          title: 'GET /api/trades/tags',
          ref: { file: 'app/api/trades/tags/route.ts', start: 'export async function GET() {' },
          notes: [
            { match: 'if (authError || !user)', text: 'שלב 1 בכל route: **מי שואל?** אין משתמש מחובר — 401 ומפסיקים. שימו לב ש-`createClient()` הוא הלקוח הרגיל, שעובר דרך RLS.' },
            { match: ".eq('userId', user.id)", text: 'סינון לפי המשתמש. RLS היה מסנן גם בלעדיו — זה עוד שכבת הגנה, וגם עוזר ל-Postgres להשתמש באינדקס.' },
            { match: '{ status: 500 }', text: '500 = "השרת נכשל". זו לא אשמת הלקוח, ולכן לא 400.' },
            { match: 'return NextResponse.json({ tags })', text: 'בלי `status` — ברירת המחדל היא 200. עוטפים את המערך באובייקט (`{ tags }`) ולא מחזירים מערך חשוף, כדי שאפשר יהיה להוסיף שדות בעתיד בלי לשבור לקוחות.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'הכפתור "מחק טרייד" נלחץ, הרשת נתקעה, והדפדפן שלח את `DELETE /api/trades/abc` פעמיים. מה המצב בסוף?',
          options: [
            'שני טריידים נמחקו',
            'הטרייד נמחק פעם אחת; הבקשה השנייה מקבלת 404 כי הוא כבר לא קיים',
            'הבקשה השנייה מחזירה 500 וה-DB נשאר במצב שבור',
            'הבקשה השנייה משחזרת את הטרייד',
          ],
          answer: 1,
          explanation: '`DELETE` אידמפוטנטי: המצב הסופי זהה — הטרייד מחוק. הקריאה השנייה לא מוצאת שורה (`maybeSingle()` מחזיר `null`) ולכן ה-route מחזיר 404. התשובה שונה, אבל השרת לא השתנה.',
        },
        {
          kind: 'text',
          body: `**קודי סטטוס** הם השפה המשותפת בין השרת ללקוח. הספרה הראשונה אומרת את הסיפור: \`2xx\` הצלחה, \`3xx\` הפניה, \`4xx\` הלקוח טעה, \`5xx\` השרת נכשל. אלה שבשימוש באתר:

- \`200\` OK — ברירת המחדל של \`NextResponse.json\`
- \`201\` Created — הקוד "הנכון" ליצירת משאב חדש. האתר לא משתמש בו: גם יצירות מחזירות 200 עם JSON
- \`202\` Accepted — "קיבלתי, העבודה רצה ברקע" (ייבוא AI, סנכרון מנהל)
- \`204\` No Content — הצלחה בלי גוף תשובה
- \`400\` Bad Request — הבקשה שבורה: JSON לא תקין, id שאינו UUID
- \`401\` Unauthorized — לא מחובר (השם מטעה: זה בעצם "לא מזוהה")
- \`403\` Forbidden — מזוהה, אבל אסור לך (לא Pro, לא מנהל, טרייד של ברוקר)
- \`404\` Not Found — אין משאב כזה (או שהוא לא שלך — לא מגלים את ההבדל)
- \`409\` Conflict — הבקשה תקינה, אבל מתנגשת במצב הנוכחי
- \`422\` Unprocessable — ה-JSON תקין, אבל הערכים לא עוברים את הסכמה
- \`429\` Too Many Requests — rate limit, עם header בשם \`Retry-After\`
- \`500\` / \`502\` / \`503\` — כשל אצלנו / בשירות שקראנו לו / שירות עמוס זמנית

ה-AGENTS.md של \`app/api\` מגדיר **חוזה** שכל route עוקב אחריו, באותו סדר: זהות → שער Pro → rate limit → ולידציה עם zod → עבודה. הנה ה-route שמחבר חשבון IBKR, שמכיל את כל השלבים:`,
        },
        {
          kind: 'source',
          title: 'POST /api/ibkr/ibrit/connect — החוזה המלא',
          ref: { file: 'app/api/ibkr/ibrit/connect/route.ts', start: 'export async function POST(req: NextRequest) {', end: 'return rateLimitedResponse(rl, ' },
          notes: [
            { match: 'if (!user) return NextResponse.json', text: '**זהות** — 401. כל השאר בכלל לא רץ למשתמש אנונימי.' },
            { match: 'return proRequiredResponse("ibkr_sync")', text: '**שער Pro** — 403 עם `errorCode: \'pro_required\'`. הלקוח מזהה את ה-`errorCode` ומציג חלון שדרוג במקום הודעת שגיאה כללית.' },
            { match: 'if (body === null)', text: '`req.json()` זורק על JSON שבור; `.catch(() => null)` הופך את זה ל-`null`, והתוצאה היא 400.' },
            { match: 'parsed.error.flatten().fieldErrors', text: 'JSON תקין אבל חסר שדה — **422** עם הפירוט של zod, כך שהטופס יכול לסמן את השדה הבעייתי.' },
            { match: 'checkRateLimit(', text: '**rate limit** — מפתח בצורה `user:<id>:<action>`, 5 ניסיונות לשעה. כאן הוולידציה באה לפני ה-rate limit, כך שבקשה שבורה לא "שורפת" ניסיון (`checkRateLimit` סופר כל קריאה, גם כזו שנדחית).' },
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: 'שער Pro נאכף **ב-route**, לא ב-UI. כפתור מושבת או טאב מוסתר הם רק תצוגה — כל אחד יכול לשלוח `POST` ידני עם `curl` או מה-DevTools. ועוד החלטה מכוונת: `checkRateLimit` **נכשל פתוח** — אם ה-RPC של המגביל נופל, הבקשה עוברת ונרשמת שגיאה ללוג. אל "תקשיחו" את זה לחסימה: תקלה במגביל לא צריכה להשבית את האתר.',
        },
        {
          kind: 'text',
          body: `**404 מול 403**: ה-route של מחיקת טרייד מבדיל בין "אין כזה טרייד" לבין "יש, אבל אסור למחוק אותו":`,
        },
        {
          kind: 'source',
          title: 'DELETE /api/trades/[id]',
          ref: { file: 'app/api/trades/[id]/route.ts', start: 'export async function DELETE(', end: "{ error: 'Only manual trades can be deleted' }" },
          notes: [
            { match: '{ params }: { params: Promise<{ id: string }> }', text: 'ה-`id` מגיע מה-URL (התיקייה `[id]`), לא מה-body. ב-REST, זהות המשאב היא חלק מהכתובת.' },
            { match: ".eq('userId', user.id)", text: 'טרייד של משתמש אחר פשוט "לא נמצא" — לכן 404 ולא 403. לא מגלים לתוקף שה-id קיים.' },
            { match: "{ error: 'Not found' }, { status: 404 }", text: '`maybeSingle()` מחזיר `null` כשאין שורה (בשונה מ-`single()`, שהיה מחזיר שגיאה) — וזה הופך ל-404.' },
            { match: 'status: 403', text: 'הטרייד קיים ושלך, אבל הגיע מ-IBKR. מחיקה תיעשה לשווא — הסנכרון הבא ייצור אותו מחדש. זו החלטה עסקית, ולכן 403.' },
          ],
        },
        {
          kind: 'text',
          body: `**409 מול 422**: ב-\`POST /api/trades/[id]/close\`, סגירת טרייד שכבר סגור מחזירה \`409\` (\`'Trade is not Open'\`). הבקשה עצמה מושלמת — היא פשוט מתנגשת במצב הנוכחי, ואם המצב היה אחר היא הייתה עוברת. לעומת זאת \`422\` אומר "הנתונים ששלחת לא תקינים, לא משנה מה המצב".

ובצד המנהל — מחיקת משימת ייבוא מסתיימת ב-204, שבו אין גוף בכלל:`,
        },
        {
          kind: 'source',
          title: 'DELETE /api/admin/jobs/[jobId] — הסוף',
          ref: { file: 'app/api/admin/jobs/[jobId]/route.ts', start: 'const { error: deleteError } = await admin', end: 'return new NextResponse(null, { status: 204 })' },
          notes: [
            { match: "console.error('[admin/jobs DELETE] db delete failed:'", text: 'השגיאה המלאה הולכת ללוג (באנגלית, כדי שיהיה קל לחפש אותה), והלקוח מקבל הודעה כללית. לא שולחים פרטי DB החוצה.' },
            { match: 'new NextResponse(null, { status: 204 })', text: '`null` כגוף — 204 אסור שיכיל body. בצד הלקוח אסור לקרוא `res.json()` על תשובה כזו: הוא ייכשל על גוף ריק.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'משתמש Free שולח `POST /api/ibkr/ibrit/connect` עם body שהוא `{"token":""}`. מה הוא מקבל?',
          options: ['400 — JSON לא תקין', '422 — Token ריק', '403 עם `pro_required`', '429'],
          answer: 2,
          explanation: 'הסדר קובע. שער ה-Pro רץ לפני קריאת ה-body, ולכן משתמש Free נעצר ב-403 עוד לפני שמישהו בודק את ה-token. משתמש Pro עם אותו body היה מקבל 422.',
        },
        {
          kind: 'quiz',
          question: 'מה הקוד המתאים ל-`POST /api/trades/[id]/add-to-position` כשהטרייד כבר סגור?',
          options: ['400', '404', '409', '500'],
          answer: 2,
          explanation: 'הטרייד קיים (לא 404), הבקשה תקינה (לא 400/422), והשרת לא נכשל (לא 500). היא פשוט סותרת את המצב הנוכחי — זה בדיוק 409 Conflict, כמו ב-`close`.',
        },
        {
          kind: 'exercise',
          prompt: 'כתבו `POST /api/trades/[id]/tags` שמוסיף תגית אחת לטרייד. ה-body: `{ "tag": "breakout" }`. החזירו 401 ללא משתמש, 400 ל-JSON שבור, 422 כשהתגית ריקה או ארוכה מ-30 תווים, 429 אחרי 30 קריאות בשעה, 404 כשאין טרייד כזה למשתמש, ו-200 עם המערך החדש.',
          hint: 'העתיקו את המבנה של `ibrit/connect`: `req.json().catch(() => null)`, `schema.safeParse`, `checkRateLimit` עם מפתח `user:<id>:add-tag`. לקריאה ולעדכון השתמשו ב-`createClient()` הרגיל — זו בקשה בשם המשתמש.',
          solution: {
            lang: 'ts',
            code: `// app/api/trades/[id]/tags/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitedResponse } from '@/lib/auth/rate-limit'

const schema = z.object({ tag: z.string().trim().min(1).max(30) })

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (body === null) return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'תגית לא תקינה', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const rl = await checkRateLimit(\`user:\${user.id}:add-tag\`, 30, 3600)
  if (!rl.ok) return rateLimitedResponse(rl)

  const { data: trade } = await supabase
    .from('Trade')
    .select('tags')
    .eq('id', id)
    .eq('userId', user.id)
    .maybeSingle()
  if (!trade) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const tags = Array.from(new Set([...trade.tags, parsed.data.tag]))
  const { error } = await supabase
    .from('Trade')
    .update({ tags })
    .eq('id', id)
    .eq('userId', user.id)
  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })

  return NextResponse.json({ tags })
}`,
          },
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 2. REST — our endpoints and Supabase (PostgREST)
    // -----------------------------------------------------------------------
    {
      slug: 'api-rest-and-postgrest',
      title: 'REST: המשאבים שלנו, פעולות, ו-Supabase כ-REST API',
      summary: 'מה הופך API ל-REST, למה סגירת פוזיציה היא `POST .../close` ולא `PATCH`, ואיך כל `supabase.from(...)` בקוד הוא בעצם בקשת HTTP ל-PostgREST.',
      minutes: 16,
      blocks: [
        {
          kind: 'text',
          body: `**REST** הוא סגנון לתכנון API מעל HTTP, לא ספרייה ולא פרוטוקול. הרעיונות המרכזיים:

- **משאבים** (שמות עצם) ב-URL: \`/api/trades/{id}\` הוא טרייד אחד.
- **מתודות** (פעלים) אומרות מה עושים למשאב: \`GET\` קורא, \`POST\` יוצר, \`PATCH\` משנה חלק, \`PUT\` מחליף, \`DELETE\` מוחק.
- **סטטוס** אומר מה קרה: 200, 404, 409 וכו׳ — מהשיעור הקודם.
- **בלי מצב בשרת בין בקשות** (stateless): כל בקשה נושאת את כל מה שצריך, כולל הזהות (cookie או header).

רוב ה-API של האתר בנוי כך, אבל לא כולו — וזה בכוונה.`,
        },
        {
          kind: 'compare',
          left: {
            lang: 'bash',
            title: 'REST קלאסי — משאב + מתודה',
            code: `GET    /api/trades/tags           # the caller's tags
DELETE /api/trades/{id}           # delete one trade
DELETE /api/admin/jobs/{jobId}    # delete one AI-import job`,
          },
          right: {
            lang: 'bash',
            title: 'action-style — הפועל בתוך ה-URL',
            code: `POST /api/trades/{id}/close               # close a position
POST /api/trades/{id}/add-to-position     # scale in
POST /api/admin/users/{userId}/toggle-tier`,
          },
        },
        {
          kind: 'text',
          body: `למה לא פשוט \`PATCH /api/trades/{id}\` עם \`{ status: 'Closed' }\`? כי סגירה היא **פעולה עסקית**, לא "תעדכן לי שדה": היא עוברת דרך מנוע ה-FIFO, מחשבת \`realizedPnl\` ו-R, מוסיפה שורה להערות ובודקת שהטרייד בכלל פתוח. \`PATCH\` כללי היה מזמין את הלקוח לשלוח כל שדה שבא לו. endpoint של פעולה מגדיר בדיוק מה מותר — וזה גם מה שהכלל "manual entry opens positions and nothing else" נשען עליו.`,
        },
        {
          kind: 'source',
          title: 'POST /api/trades/[id]/close — הבדיקות מול המצב הנוכחי',
          ref: { file: 'app/api/trades/[id]/close/route.ts', start: "if (trade.source !== 'manual') {", lines: 6 },
          notes: [
            { match: 'status: 403', text: 'הטרייד שלך, אבל הוא הגיע מהברוקר — אסור לערוך אותו ידנית, כי הסנכרון הבא היה "נלחם" בשינוי. 403 = מזוהה אבל לא מורשה לפעולה הזו.' },
            { match: 'status: 409', text: '409 Conflict: הבקשה תקינה, אבל מתנגשת ב**מצב הנוכחי** של המשאב. טרייד שכבר נסגר לא נסגר שוב.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'המשתמש לחץ פעמיים מהר על "סגור פוזיציה", ושתי בקשות `POST .../close` יצאו. הראשונה הצליחה. מה מקבלת השנייה?',
          options: ['`200` — סוגרת שוב', '`404` — הטרייד נמחק', '`409` — הטרייד כבר לא Open', '`500` — שגיאת שרת'],
          answer: 2,
          explanation: 'אחרי הבקשה הראשונה `status` הוא `Closed`, אז הבדיקה `trade.status !== \'Open\'` מחזירה 409. `POST` לא אידמפוטנטי מטבעו — הבדיקה מול המצב הנוכחי היא מה שמונע סגירה כפולה.',
        },
        {
          kind: 'text',
          body: `עכשיו ההפתעה: גם כשהקוד "מדבר עם מסד הנתונים", הוא בעצם קורא ל-**REST API**. ‏Supabase מריץ מעל Postgres שירות בשם **PostgREST**, שהופך כל טבלה למשאב REST בכתובת \`/rest/v1/<Table>\`. הספרייה \`@supabase/supabase-js\` היא בסך הכל client נוח שבונה את בקשות ה-HTTP האלה.`,
        },
        {
          kind: 'source',
          title: 'הלקוח בצד השרת — כתובת, מפתח ו-cookies',
          ref: { file: 'lib/supabase/server.ts', start: 'return createServerClient<Database>(', lines: 3 },
          notes: [
            { match: 'NEXT_PUBLIC_SUPABASE_URL', text: 'בסיס ה-URL של הפרויקט. כל בקשה הולכת ל-`<url>/rest/v1/...`.' },
            { match: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', text: 'המפתח הציבורי — נשלח ב-header בשם `apikey`. הוא **לא סוד** (הוא אפילו `NEXT_PUBLIC_`); הוא רק אומר "הבקשה הגיעה מהאפליקציה הזו". מי המשתמש — את זה קובע ה-JWT שמגיע מה-cookies ונשלח כ-`Authorization: Bearer ...`.' },
          ],
        },
        {
          kind: 'source',
          title: 'שאילתה מ-GET /api/trades/tags',
          ref: { file: 'app/api/trades/tags/route.ts', start: 'const { data, error } = await supabase', end: ".not('tags', 'eq', '{}')" },
          notes: [
            { match: ".from('Trade')", text: 'המשאב: `/rest/v1/Trade`. בלי `.insert`/`.update`/`.delete` — זו קריאה, כלומר `GET`.' },
            { match: ".select('tags')", text: 'הופך ל-query param ‏`select=tags` — אילו עמודות להחזיר.' },
            { match: ".eq('userId', user.id)", text: 'פילטר: `userId=eq.<uuid>`. ה-RLS היה מסנן לפי המשתמש בכל מקרה; הפילטר המפורש הוא חגורה ושלייקס.' },
            { match: ".not('tags', 'eq', '{}')", text: 'פילטר שלילי: `tags=not.eq.{}` — רק טריידים שיש להם לפחות תג אחד.' },
          ],
        },
        {
          kind: 'snippet',
          lang: 'bash',
          title: 'אותה שאילתה כבקשת HTTP גולמית (ערכים להמחשה)',
          code: `curl "https://<project-ref>.supabase.co/rest/v1/Trade?select=tags&userId=eq.<user-uuid>&tags=not.eq.%7B%7D" \\
  -H "apikey: <anon-key>" \\
  -H "Authorization: Bearer <user-access-token>"

# 200 OK
# [{"tags":["breakout","earnings"]},{"tags":["breakout"]}]`,
        },
        {
          kind: 'text',
          body: `המיפוי המלא בין ה-client לבין HTTP (בדקתי מול הקוד של \`postgrest-js\` שמותקן בפרויקט):

- \`.select(...)\` → \`GET /rest/v1/<Table>\`
- \`.insert(...)\` → \`POST\`
- \`.upsert(...)\` → \`POST\` עם header \`Prefer: resolution=merge-duplicates\`
- \`.update(...)\` → \`PATCH\`
- \`.delete()\` → \`DELETE\`
- \`.rpc('fn', args)\` → \`POST /rest/v1/rpc/fn\` — קריאה לפונקציית Postgres
- \`.eq\`, \`.not\`, \`.order\`, \`.limit\` → query params (\`status=eq.Closed\`, \`order=closedAt.desc\`, \`limit=5\`)
- \`.single()\` → header \`Accept: application/vnd.pgrst.object+json\` (השרת מחזיר אובייקט אחד או שגיאה); \`.maybeSingle()\` לעומת זאת שולח בקשה רגילה ובודק בצד ה-client שחזרו 0 או 1 שורות.`,
        },
        {
          kind: 'source',
          title: 'כשבקשת REST אחת לא מספיקה — RPC',
          ref: { file: 'lib/ibkr/process-executions.ts', start: 'const { error: rpcErr } = await admin.rpc("reverse_position", {' },
          notes: [
            { match: 'admin.rpc("reverse_position"', text: 'בפועל: `POST /rest/v1/rpc/reverse_position` עם הארגומנטים כ-JSON. היפוך פוזיציה הוא שתי כתיבות (סגירה + פתיחה), וכל בקשת REST היא טרנזקציה נפרדת — לכן זה רץ כפונקציית Postgres אחת, אטומית.' },
            { match: 'p_close_order', text: 'אובייקטים מקוננים עוברים כ-`jsonb`; הפונקציה מפרקת אותם בתוך הטרנזקציה.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: 'אם ה-`anon key` ציבורי, מה מונע ממישהו לשלוח `GET /rest/v1/Trade` בעצמו? שתי שכבות: **הרשאות טבלה** (GRANT) ו-**RLS**. ה-`admin` שראית למעלה משתמש במפתח service-role שעוקף את RLS — ולכן הוא חי רק בשרת ולעולם לא ב-`NEXT_PUBLIC_`.',
        },
        {
          kind: 'source',
          title: 'השכבה שנוספה לאחרונה — אין לבקשות אנונימיות גישה לטבלאות',
          ref: { file: 'supabase/migrations/20261019092640_revoke_anon_table_grants.sql', start: '-- After this, an anon query', lines: 4 },
          notes: [
            { match: 'fails with 42501', text: 'בקשת REST בלי משתמש מחובר נכשלת על הרשאות עוד לפני ש-RLS נבדק. קודם, RLS היה ההגנה היחידה בין המפתח הציבורי לבין המידע.' },
            { match: 'REVOKE ALL ON ALL TABLES', text: 'הפקודה עצמה: מוריד מה-role ‏`anon` כל הרשאה על כל הטבלאות. `authenticated` (משתמש מחובר) ממשיך לעבוד דרך RLS.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'איזו מתודת HTTP יוצאת מ-`supabase.from(\'Trade\').update({ tags }).eq(\'id\', id)`?',
          options: ['`GET`', '`POST`', '`PUT`', '`PATCH`'],
          answer: 3,
          explanation: '`.update()` שולח `PATCH` — שינוי חלקי של השורות שעוברות את הפילטר (`id=eq.<id>`). `PUT` הוא החלפה מלאה, ו-PostgREST משתמש בו רק במקרים מיוחדים.',
        },
        {
          kind: 'quiz',
          question: 'למה `reverse_position` רץ דרך `.rpc()` ולא כשתי קריאות — `.update()` לסגירה ואז `.insert()` לפתיחה?',
          options: [
            'כי `.insert()` לא עובד עם service-role',
            'כי כל קריאת REST היא בקשה וטרנזקציה נפרדת — אם השנייה נכשלת, הראשונה כבר נשמרה',
            'כי RPC מהיר יותר בכל מקרה',
            'כי PostgREST לא תומך ב-`PATCH`',
          ],
          answer: 1,
          explanation: 'שתי בקשות HTTP הן שתי טרנזקציות. כשל באמצע היה משאיר פוזיציה סגורה בלי ההפוכה שלה. פונקציית Postgres מבצעת את שתיהן ב-transaction אחת — הכל או כלום.',
        },
        {
          kind: 'exercise',
          prompt: 'תרגמו לבקשת HTTP גולמית (URL + headers) את השאילתה: `supabase.from(\'Trade\').select(\'ticker, realizedPnl\').eq(\'status\', \'Closed\').order(\'closedAt\', { ascending: false }).limit(5)` — חמשת הטריידים האחרונים שנסגרו.',
          hint: 'כל פילטר הוא `column=op.value`, המיון הוא `order=column.desc`, וה-headers זהים לדוגמה של התגים.',
          solution: {
            lang: 'bash',
            code: `curl "https://<project-ref>.supabase.co/rest/v1/Trade?select=ticker,realizedPnl&status=eq.Closed&order=closedAt.desc&limit=5" \\
  -H "apikey: <anon-key>" \\
  -H "Authorization: Bearer <user-access-token>"

# RLS still scopes the rows to the signed-in user, even without a userId filter.`,
          },
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 3. Calling someone else's API
    // -----------------------------------------------------------------------
    {
      slug: 'api-calling-external',
      title: 'לקרוא ל-API של מישהו אחר עם fetch',
      summary: 'שער הדולר מ-Frankfurter, מחירים מ-Massive ויצירת checkout ב-Lemon Squeezy: URL ופרמטרים, headers, מפתח API, `res.ok`, פענוח JSON, cache, fallback ו-timeout.',
      minutes: 15,
      blocks: [
        {
          kind: 'text',
          body: `בשיעור הקודם האתר היה **השרת** — אחרים שלחו אליו בקשות. עכשיו הוא **הלקוח**: קוד שרץ בשרת שלנו שולח בקשה לשירות חיצוני ומחכה לתשובה. הכלי זהה ל-\`fetch\` שמכירים מהדפדפן — ב-Node הוא מובנה.

הדוגמה הכי פשוטה באתר: דף המחירים מציג את המחיר גם בשקלים, ולשם כך צריך את שער הדולר. הוא מגיע מ-Frankfurter, API ציבורי וחינמי שלא דורש מפתח:`,
        },
        {
          kind: 'snippet',
          lang: 'bash',
          title: 'אותה קריאה מהטרמינל (המספרים להמחשה)',
          code: `curl "https://api.frankfurter.app/latest?from=USD&to=ILS"

{"amount":1.0,"base":"USD","date":"2026-10-19","rates":{"ILS":3.71}}`,
        },
        {
          kind: 'source',
          title: 'lib/billing/fx.ts — שער דולר/שקל',
          ref: { file: 'lib/billing/fx.ts', start: 'export async function getUsdToIlsRate(): Promise<number> {' },
          notes: [
            { match: 'if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS)', text: '**cache בזיכרון**: משתנה ברמת המודול, שחי כל עוד אותו instance של הפונקציה חי. בתוך שעה — לא יוצאים לרשת בכלל. ב-serverless זה cache "בערך": instance חדש מתחיל ריק.' },
            { match: '?from=USD&to=ILS', text: '**query parameters** אחרי `?`, מופרדים ב-`&`. כאן הם קבועים, אז מותר לכתוב אותם ישירות. כשהערכים דינמיים — `URLSearchParams` (נראה בשיעור על IBKR), שמקודד תווים מיוחדים.' },
            { match: 'next: { revalidate: 3600 }', text: 'אופציה של Next.js (לא של `fetch` הסטנדרטי): לשמור את התשובה ב-Data Cache של Next לשעה. שכבת cache שנייה, שמשותפת בין instances.' },
            { match: 'if (!res.ok) throw', text: '`fetch` **לא זורק** על 404 או 500 — רק על כשל רשת. `res.ok` הוא `true` רק לסטטוס 200–299, וחובה לבדוק אותו בעצמכם.' },
            { match: "typeof rate !== 'number'", text: '`res.json()` מחזיר מה שהשרת שלח — TypeScript לא בודק את זה בזמן ריצה. ה-`as` למעלה הוא רק הבטחה. בודקים ידנית שהמספר באמת קיים, סופי וחיובי.' },
            { match: 'return FALLBACK_USD_TO_ILS', text: '**fallback**: כל כשל — רשת, סטטוס, צורה — נגמר בשער קבוע של 3.7 במקום דף מחירים שבור. מתאים כאן כי המספר הוא רק תצוגה ("בערך ₪"); לחיוב אמיתי זה היה מסוכן.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'tip',
          body: 'שלושה שלבים שכל קריאה חיצונית צריכה: (1) בדיקת `res.ok`, (2) פענוח הגוף, (3) **בדיקת הצורה** של מה שחזר. השלב השלישי הוא זה שנשכח — ואז `undefined` מגיע לחישוב ומופיע למשתמש כ-`NaN`.',
        },
        {
          kind: 'quiz',
          question: 'Frankfurter מחזיר `503` עם גוף HTML. מה `getUsdToIlsRate` מחזירה?',
          options: [
            'זורקת שגיאה לקורא',
            'מחזירה `undefined`',
            '`3.7` — ה-`throw` אחרי `!res.ok` נתפס ב-`catch`, שמחזיר את ה-fallback',
            'מנסה שוב אחרי שנייה',
          ],
          answer: 2,
          explanation: '`res.ok` הוא `false` ל-503, אז נזרקת `Error`. היא נתפסת ב-`catch` של אותה פונקציה, שרושמת ללוג ומחזירה `FALLBACK_USD_TO_ILS`. אין ניסיון חוזר — וה-cache לא מתעדכן, כך שהקריאה הבאה תנסה שוב.',
        },
        {
          kind: 'text',
          body: `רוב ה-APIs דורשים **מפתח API** — מזהה סודי שאומר לשירות מי משלם. Massive (לשעבר Polygon) הוא ספק המחירים. **סנכרון המחירים כרגע כבוי**: אין workflow שמפעיל אותו, והמפתח לא מוגדר ב-Vercel. הקוד נשאר כי הוא מתוכנן לחזור, ויש בו כמה דברים טובים ללמוד:`,
        },
        {
          kind: 'source',
          title: 'lib/massive/client.ts — מחירים אחרונים',
          ref: { file: 'lib/massive/client.ts', start: 'export async function fetchPrices(' },
          notes: [
            { match: 'const apiKey = process.env.MASSIVE_API_KEY', text: 'המפתח נקרא מ-env var **בלי** `NEXT_PUBLIC_`. משתנה כזה קיים רק בשרת ולא נכנס ל-JavaScript שנשלח לדפדפן.' },
            { match: '?apiKey=${apiKey}', text: 'המפתח נשלח **ב-query string** — כך Massive מאפשרים. החיסרון: URLs נרשמים בלוגים של שרתים ו-proxies, ולכן אסור להדפיס את ה-`url` הזה ללוג.' },
            { match: 'res.status === 429', text: 'טיפול מיוחד ב-rate limit (במסלול החינמי: 5 קריאות בדקה). לא זורקים — מחזירים Map ריק, והריצה הבאה תנסה שוב.' },
            { match: 'entry.lastTrade?.p ?? entry.day?.c', text: 'optional chaining ו-`??` על JSON חיצוני: לא כל מניה מגיעה עם `lastTrade`. מעדיפים את העסקה האחרונה, ואם אין — את סגירת היום.' },
          ],
        },
        {
          kind: 'compare',
          left: {
            lang: 'ts',
            title: 'מפתח ב-query (Massive)',
            code: `// The key becomes part of the URL —
// it lands in access logs and proxy logs
await fetch(\`\${BASE}?apiKey=\${apiKey}\`)`,
          },
          right: {
            lang: 'ts',
            title: 'מפתח ב-header (Lemon Squeezy)',
            code: `// Headers are not part of the URL,
// so they stay out of most logs
await fetch(BASE, {
  headers: { Authorization: \`Bearer \${apiKey}\` },
})`,
          },
        },
        {
          kind: 'text',
          body: `כשאפשר לבחור, header עדיף. הנה הקריאה המלאה ביותר באתר — \`POST\` עם גוף JSON ומפתח ב-\`Authorization\`, שיוצרת דף תשלום ב-Lemon Squeezy:`,
        },
        {
          kind: 'source',
          title: 'lib/billing/lemon-squeezy.ts — יצירת checkout',
          ref: { file: 'lib/billing/lemon-squeezy.ts', start: "const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {", end: 'return { url: json.data.attributes.url }' },
          notes: [
            { match: "method: 'POST',", text: 'בלי `method`, `fetch` שולח `GET`. כאן יוצרים משאב, אז `POST`.' },
            { match: "'Content-Type': 'application/vnd.api+json',", text: '`Content-Type` אומר לשרת מה **שלחנו**; `Accept` בשורה מעל — מה אנחנו **מוכנים לקבל**. Lemon Squeezy עובדים בפורמט JSON:API, שיש לו סוג מדיה משלו.' },
            { match: 'Authorization: `Bearer ${config.apiKey}`', text: 'סכמת **Bearer**: "מי שמחזיק בטוקן הזה — מורשה". זה אותו מנגנון שה-cron שלנו משתמש בו בכיוון ההפוך.' },
            { match: 'body: JSON.stringify(payload)', text: '`fetch` לא ממיר אובייקט ל-JSON לבד — צריך `JSON.stringify`. שליחת אובייקט ישירות הייתה שולחת את המחרוזת `[object Object]`.' },
            { match: "const text = await res.text().catch(() => '')", text: 'בשגיאה קוראים את הגוף כטקסט — הוא לא בהכרח JSON — ומצרפים אותו להודעה, כדי שבלוג יופיע למה LS סירבו.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: 'אף קריאה חיצונית באתר לא מגדירה **timeout**. אם השירות תקוע, `fetch` מחכה עד שהפונקציה כולה נהרגת ב-`maxDuration` של Vercel. בקוד חדש אפשר להוסיף `signal: AbortSignal.timeout(5000)` — אחרי 5 שניות ה-`fetch` נזרק עם `TimeoutError`, וה-`catch` יכול להחזיר fallback מהר.',
        },
        {
          kind: 'quiz',
          question: 'איפה נכון לשמור את המפתח של Massive?',
          options: [
            '`NEXT_PUBLIC_MASSIVE_API_KEY`, כדי שהקומפוננטה תוכל לקרוא ישירות ל-Massive',
            '`MASSIVE_API_KEY` ב-env של השרת, והדפדפן קורא ל-route שלנו שקורא ל-Massive',
            'קבוע בקוד, כי ממילא הריפו פרטי',
            'ב-`localStorage` של המשתמש',
          ],
          answer: 1,
          explanation: 'כל מה שמתחיל ב-`NEXT_PUBLIC_` נכנס לבאנדל של הדפדפן — כל מבקר יכול לקרוא אותו ב-DevTools ולהשתמש במכסה שלכם. מפתח נשאר בשרת, והדפדפן מדבר רק עם ה-API שלנו, שמוסיף את המפתח בצד השרת.',
        },
        {
          kind: 'exercise',
          prompt: 'כתבו `getEurToUsdRate()` שמביאה את שער האירו לדולר מ-Frankfurter (`from=EUR&to=USD`). דרישות: timeout של 4 שניות, בדיקת `res.ok`, בדיקת צורה, cache בזיכרון לשעה, ו-fallback של `1.08` בכל כשל.',
          hint: 'העתיקו את `getUsdToIlsRate` והוסיפו `signal: AbortSignal.timeout(4000)` לאופציות של `fetch`. שגיאת timeout נזרקת כמו כל שגיאה אחרת — ה-`catch` הקיים כבר תופס אותה.',
          solution: {
            lang: 'ts',
            code: `const TTL_MS = 60 * 60 * 1000
const FALLBACK_EUR_TO_USD = 1.08
let cached: { rate: number; fetchedAt: number } | null = null

export async function getEurToUsdRate(): Promise<number> {
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.rate

  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD', {
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) throw new Error(\`fx api: \${res.status}\`)
    const json = (await res.json()) as { rates?: { USD?: number } }
    const rate = json.rates?.USD
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
      throw new Error('invalid fx rate shape')
    }
    cached = { rate, fetchedAt: Date.now() }
    return rate
  } catch (err) {
    console.error('[fx] EUR/USD failed, using fallback:', err)
    return FALLBACK_EUR_TO_USD
  }
}`,
          },
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 4. A messy real-world integration: IBKR
    // -----------------------------------------------------------------------
    {
      slug: 'api-ibkr-integration',
      title: 'אינטגרציה אמיתית ומבולגנת: IBKR',
      summary: 'IBRIT Web Service: GET אחד לטווח תאריכים, קבצי ZIP או שגיאת JSON עם קוד, מרווח של 3 שניות בין בקשות וניסיון חוזר על 1018, טוקן מוצפן ב-AES-256-GCM ומצב `TOKEN_INVALID` — ובקצרה, זרימת Flex הישנה.',
      minutes: 18,
      blocks: [
        {
          kind: 'text',
          body: `Frankfurter הוא API "נחמד": JSON נקי, סטטוסים הגיוניים. ברוקרים הם לא כאלה. הסנכרון עם Interactive Brokers הוא האינטגרציה הכי מורכבת באתר, וכמעט כל שורה בה נכתבה בעקבות משהו ששבר בפרודקשן.

משתמשים מתחברים דרך **IBRIT Web Service** (פיד בשם \`tradeanalyst-ws\`): הם מעתיקים מהפורטל של IBKR **token** ו-**query ID**, והאתר שולח **GET אחד** לכל טווח תאריכים. התשובה היא אחת משלוש:

- קובץ **ZIP** עם קובץ CSV לכל יום דיווח
- טקסט רגיל (קובץ יחיד)
- **JSON של שגיאה** עם קוד \`rc\` — השגיאות מגיעות בגוף התשובה, ולא כקוד HTTP`,
        },
        {
          kind: 'snippet',
          lang: 'bash',
          title: 'צורת הבקשה (token ו-query ID מומצאים)',
          code: `curl -H "User-Agent: Java" \\
  "https://ndcdyn.interactivebrokers.com/Reporting/IBRITService?t=YOUR_TOKEN&q=YOUR_QUERY_ID&s=tradeanalyst-ws&fd=20261001&td=20261019"

# Success: binary ZIP (starts with the bytes "PK")
# Failure: a small JSON body, for example
{"rc":1018,"msg":"..."}`,
        },
        {
          kind: 'source',
          title: 'בקשה אחת ל-IBRIT',
          ref: { file: 'lib/ibkr/ibrit-client.ts', start: 'async function fetchIbritRangeOnce(' },
          notes: [
            { match: 'new URLSearchParams(', text: '`URLSearchParams` בונה את ה-query string ומקודד כל ערך. `fd`/`td` הם from/to בפורמט `yyyymmdd`, ו-`s` הוא קוד השירות שלנו.' },
            { match: 'await waitForRequestSlot(', text: 'לפני כל בקשה — מחכים לתור (הסבר בהמשך). המפתח הוא token + query ID, כך שמשתמשים שונים לא מחכים זה לזה.' },
            { match: 'console.log(`[ibrit] fetch fd=${from} td=${to}`)', text: 'הלוג מדפיס רק את התאריכים — **לא** את ה-URL. ה-URL מכיל את ה-token, ו-token בלוג הוא token שדלף.' },
            { match: '"User-Agent": "Java"', text: 'IBKR מצפים ל-User-Agent הזה (גם ב-Flex, שם ההערה אומרת שבלעדיו הבקשה עלולה להידחות). דוגמה לדרישה לא מתועדת היטב שלומדים בדרך הקשה.' },
            { match: 'if (!isZip(buf))', text: 'אין header אמין שאומר מה חזר, אז בודקים את **הבתים עצמם**: קובץ ZIP תמיד מתחיל ב-`0x50 0x4b` ("PK"). אם זה לא ZIP ומתחיל ב-`{` — זו שגיאה.' },
            { match: 'JSZip.loadAsync(buf)', text: 'פותחים את ה-ZIP בזיכרון, ממיינים לפי שם (תאריך) ומחזירים מערך של מחרוזות CSV.' },
          ],
        },
        {
          kind: 'source',
          title: 'סיווג קודי השגיאה',
          ref: { file: 'lib/ibkr/ibrit-client.ts', start: 'function handleErrorBody(text: string): void {' },
          notes: [
            { match: 'JSON.parse(text)', text: 'גם JSON של שגיאה יכול להיות שבור. במקרה כזה זורקים עם 200 התווים הראשונים — מספיק כדי להבין מה קרה, בלי לשפוך ללוג קובץ שלם.' },
            { match: 'if (NO_DATA_CODES.has(rc)) return;', text: '1010 או 1600 = "אין דוח לתאריכים האלה" (למשל לפני שהחשבון נפתח). זו לא שגיאה — מחזירים מערך ריק.' },
            { match: 'if (rc === BAD_CREDENTIALS_CODE)', text: '1052: token או query ID שגויים, או token שעבר שנה. **לא** מנסים שוב עם אותם ערכים.' },
            { match: 'if (TRANSIENT_CODES.has(rc))', text: '1019 (הדוח בהכנה) ו-1410 (בקשות חופפות) — זמניים. `IbkrTransientError` אומר לקורא "הריצה הבאה כנראה תצליח".' },
          ],
        },
        {
          kind: 'text',
          body: `שימו לב לדפוס: הלקוח לא מחליט מה לעשות עם השגיאה — הוא רק **מסווג** אותה לסוג (class) נכון, והקורא מחליט. כך \`ibrit-sync.ts\` יכול לטפל בכל סוג אחרת:

- \`IbritCredentialsError\` → סטטוס \`TOKEN_INVALID\`, הטאב "ברוקר" מבקש לחדש את ה-token
- \`IbkrTransientError\` → \`lastSyncAt\` **לא** מתעדכן, והריצה הבאה של ה-cron תנסה שוב את אותו חלון
- כל השאר → \`ERROR\`

**Rate limiting**: IBKR מגבילים לבקשה אחת בשנייה ועשר בדקה לכל לקוח (token + query ID). חריגה מחזירה \`rc 1018\`. בפועל זה התגלה מחמיר יותר מהתיעוד:`,
        },
        {
          kind: 'source',
          title: 'המגבלות, כפי שנמדדו בפרודקשן',
          ref: { file: 'lib/ibkr/ibrit-client.ts', start: "// IBKR's documented limit is 1 fetch per second", end: 'export const IBRIT_MAX_REQUESTS_PER_MINUTE = 10;' },
          notes: [
            { match: 'request 1.1s after the previous one still got 1018', text: 'בקשה שנשלחה 1.1 שניות אחרי הקודמת קיבלה 1018 — למרות שהתיעוד מתיר שנייה. הקוד לא סומך על התיעוד, אלא על מה שנמדד.' },
            { match: 'const MIN_REQUEST_GAP_MS = 3_000;', text: 'לכן: לפחות **3 שניות** בין תחילת בקשה לתחילת הבאה, לכל לקוח. `3_000` זה פשוט `3000` — הקו התחתון רק עוזר לקרוא.' },
            { match: 'const RATE_LIMIT_RETRY_DELAYS_MS = [5_000, 15_000];', text: 'ואם בכל זאת הגיע 1018 — ניסיון חוזר אחרי 5 שניות, ואז אחרי 15. **backoff**: כל המתנה ארוכה מהקודמת.' },
          ],
        },
        {
          kind: 'source',
          title: 'לולאת הניסיונות החוזרים',
          ref: { file: 'lib/ibkr/ibrit-client.ts', start: 'export async function fetchIbritRange(' },
          notes: [
            { match: 'for (let attempt = 0; ; attempt++)', text: 'לולאה בלי תנאי עצירה — יוצאים ממנה רק עם `return` (הצלחה) או `throw` (ויתור).' },
            { match: 'const delay = RATE_LIMIT_RETRY_DELAYS_MS[attempt];', text: 'אחרי הניסיון השלישי `attempt` הוא 2, ו-`[5000, 15000][2]` הוא `undefined` — זה סימן לוותר. אורך המערך הוא מספר הניסיונות החוזרים.' },
            { match: '!(err instanceof IbritRateLimitedError) || delay === undefined', text: 'רק 1018 מנוסה שוב. token שגוי לא יתוקן אם נחכה, אז הוא נזרק מיד. `IbritRateLimitedError` יורש מ-`IbkrTransientError`, אז גם כשמוותרים — זה עדיין "זמני" מבחינת הסנכרון.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'IBKR מחזירים 1018 שוב ושוב. כמה בקשות ישלח `fetchIbritRange`, ומה יקרה בסוף?',
          options: [
            'בקשה אחת, ואז `IbritCredentialsError`',
            'שלוש בקשות (אחרי המתנות של 5 ו-15 שניות), ואז שגיאה זמנית — הסנכרון מסתיים ב-`TRANSIENT_ERROR` וה-cron הבא ינסה שוב',
            'עד שיצליח — הלולאה אינסופית',
            'עשר בקשות, לפי המגבלה לדקה',
          ],
          answer: 1,
          explanation: 'ניסיון ראשון + שני ניסיונות חוזרים (5s, 15s). ב-`attempt = 2` אין עוד delay, אז השגיאה נזרקת. היא `IbkrTransientError`, ולכן `syncIbritConnection` לא מקדם את `lastSyncAt` ומחזיר `TRANSIENT_ERROR`.',
        },
        {
          kind: 'text',
          body: `**הטוקן**: token של IBRIT תקף **שנה**, ומי שמחזיק בו יכול לקרוא את כל היסטוריית המסחר של המשתמש. לכן הוא לא נשמר במסד כמו שהוא — הוא מוצפן ב-**AES-256-GCM**, עם מפתח שנמצא רק ב-env var בשם \`FLEX_TOKEN_ENCRYPTION_KEY\` (השם נשאר מימי Flex). דליפה של המסד לבד לא חושפת אף token.`,
        },
        {
          kind: 'source',
          title: 'lib/ibkr/encrypt.ts — הצפנה',
          ref: { file: 'lib/ibkr/encrypt.ts', start: 'export function encryptToken(plain: string): string {' },
          notes: [
            { match: 'const key = getKey();', text: 'המפתח: 32 בתים (256 ביט) שנקראים מ-env כ-64 תווי hex. `getKey` זורק אם הוא חסר או באורך שגוי — עדיף לקרוס מאשר להצפין עם מפתח שבור.' },
            { match: 'randomBytes(12)', text: '**IV** (initialization vector) אקראי לכל הצפנה. לכן אותו token מוצפן פעמיים נותן שתי מחרוזות שונות — ואי אפשר להשוות ciphertext כדי לגלות שני משתמשים עם אותו token.' },
            { match: 'cipher.getAuthTag()', text: 'ה-"G" ב-GCM: **auth tag** שמאמת שהמידע לא שונה. אם מישהו ישנה בית אחד במסד, `decipher.final()` ייכשל במקום להחזיר זבל.' },
            { match: 'CURRENT_VERSION,', text: 'הפורמט השמור: `v1:iv:authTag:ciphertext`. גרסה בתחילת המחרוזת מאפשרת להחליף אלגוריתם בעתיד ועדיין לקרוא ערכים ישנים.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'tip',
          body: 'בגלל ה-IV האקראי, ה-route של החיבור לא יכול לבדוק "האם זה אותו token?" לפי ה-ciphertext — הוא מפענח את השמור ומשווה לטקסט שהמשתמש הדביק (`decryptToken(existing.flexTokenEncrypted) === token`). מצד שני, הסנכרון **כן** משווה ciphertext כשהוא רוצה לוודא שה-token לא **הוחלף** באמצע ריצה — שם בדיוק השוני הזה שימושי.',
        },
        {
          kind: 'source',
          title: 'כש-IBKR דוחים את הטוקן',
          ref: { file: 'lib/ibkr/ibrit-sync.ts', start: 'if (err instanceof IbritCredentialsError) {' },
          notes: [
            { match: 'lastSyncStatus: IBRIT_TOKEN_INVALID_STATUS,', text: 'הקבוע `\'TOKEN_INVALID\'` מגיע מ-`ibrit-token.ts`, קובץ בלי imports של שרת — כך גם הטאב "ברוקר" בדפדפן יכול לייבא אותו ולהציג "חדשו את ה-token".' },
            { match: '.eq("flexTokenEncrypted", conn.flexTokenEncrypted);', text: 'עדכון מותנה: רק אם ה-token השמור עדיין זה שהסנכרון התחיל איתו. אם המשתמש הדביק token חדש בזמן שהסנכרון רץ — לא מסמנים את **החדש** כפסול.' },
            { match: 'status: "TOKEN_INVALID",', text: 'ב-cron זה נספר בנפרד (`tokenInvalid`) ולא מכשיל את הריצה: token שפג הוא של המשתמש לחדש, לא תקלה שלנו.' },
          ],
        },
        {
          kind: 'text',
          body: `**תוקף השנה**: IBKR לא חושפים מתי token פג, אז האתר סופר שנה מ-\`BrokerConnection.tokenConnectedAt\` (\`ibritTokenExpiresAt\` ב-\`ibrit-token.ts\`), ותזכורות במייל נשלחות לפני כן מאותו cron של הסנכרון.

**פענוח**: הקבצים הם CSV מופרד בפסיקים. \`parse-ibrit-csv.ts\` מפצל כל שורה עם \`splitCsvLine\` — שדה עטוף במירכאות רק כשהוא מכיל פסיק, ו-\`""\` בתוכו הוא מירכאה אחת. אחר כך כל שורה הופכת ל-\`NormalizedExecution\`, ושורות של ביטול או תיקון (\`CA\`/\`CO\`) לא מיושמות אוטומטית אלא מסומנות לבדיקה ידנית.

**Flex** — הדרך הישנה, ש**הוסרה** מהאתר: שתי בקשות במקום אחת, ו-XML במקום CSV:`,
        },
        {
          kind: 'compare',
          left: {
            lang: 'ts',
            title: 'Flex (הוסר) — שני שלבים',
            code: `// Step 1: ask IBKR to generate a report
//   GET .../SendRequest?t=TOKEN&q=QUERY&v=3
//   -> XML with ReferenceCode + Url
// Step 2: download it, polling while it is generated
//   GET <Url>?q=ReferenceCode&t=TOKEN&v=3
//   "Statement generation in progress"
//   -> sleep 10s, up to 4 attempts
// Result: one XML (fast-xml-parser),
// fields as PascalCase ?? camelCase`,
          },
          right: {
            lang: 'ts',
            title: 'IBRIT (ibrit-client.ts) — בקשה אחת',
            code: `// One request per date range (max 365 days)
//   GET .../IBRITService?t=&q=&s=&fd=&td=
//   -> ZIP of CSV files, one per report date
//   -> or {"rc": ..., "msg": ...}
// Rate limit handled up front:
//   3s gap between starts, retry 1018 after 5s / 15s
// First sync: year-long windows, newest first,
// one at a time (parallel requests got rc 1410)`,
          },
        },
        {
          kind: 'quiz',
          question: 'בסנכרון הראשון צריך עד 10 שנות היסטוריה. למה `fetchIbritFiles` מבקש שנה אחרי שנה בלולאה, ולא את כל השנים במקביל עם `Promise.all`?',
          options: [
            'כי `Promise.all` לא עובד עם `fetch`',
            'כי בקשות מקבילות קיבלו מהשירות החי `rc 1410`, וממילא ה-rate limit מרווח אותן ל-3 שניות',
            'כי JavaScript יכול להריץ רק בקשה אחת בכל פעם',
            'כדי שהקוד יהיה קצר יותר',
          ],
          answer: 1,
          explanation: 'ההערה ב-`ibrit-sync.ts` אומרת זאת במפורש: בקשות חופפות קיבלו 1410. בנוסף, אחת-אחת מאפשר לעצור ברגע שמגיעים לשנה ריקה — אין טעם לבקש שנים מלפני שהחשבון נפתח.',
        },
        {
          kind: 'exercise',
          prompt: 'כתבו פונקציה כללית `withRetry(fn, delaysMs, isRetryable)` שמריצה את `fn`, ואם היא זורקת שגיאה ש-`isRetryable(err)` מחזיר עליה `true` — מחכה לפי `delaysMs` ומנסה שוב. כשהמערך נגמר, או כשהשגיאה לא ניתנת לניסיון חוזר — זורקים אותה. הראו איך `fetchIbritRange` הייתה נכתבת איתה.',
          hint: 'העתיקו את המבנה של `fetchIbritRange`: `for (let attempt = 0; ; attempt++)`, `try { return await fn() }`, וב-`catch` — `const delay = delaysMs[attempt]`.',
          solution: {
            lang: 'ts',
            code: `export async function withRetry<T>(
  fn: () => Promise<T>,
  delaysMs: number[],
  isRetryable: (err: unknown) => boolean,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const delay = delaysMs[attempt]
      if (!isRetryable(err) || delay === undefined) throw err
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

// fetchIbritRange, rewritten:
export function fetchIbritRange(token: string, queryId: string, from: string, to: string) {
  return withRetry(
    () => fetchIbritRangeOnce(token, queryId, from, to),
    [5_000, 15_000],
    (err) => err instanceof IbritRateLimitedError,
  )
}`,
          },
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 5. Webhooks: Lemon Squeezy calls us
    // -----------------------------------------------------------------------
    {
      slug: 'api-webhooks',
      title: 'Webhooks: כשהשירות החיצוני קורא לנו',
      summary: 'Lemon Squeezy מודיע לאתר על שינויי מנוי: גוף גולמי, חתימת HMAC-SHA256 עם `timingSafeEqual`, אידמפוטנטיות לפי hash של הגוף, מתי להחזיר 200 ומתי 500, ואיזה סטטוס מנוי נותן Pro.',
      minutes: 16,
      blocks: [
        {
          kind: 'text',
          body: `עד עכשיו האתר תמיד **יזם**. אבל איך האתר יודע שמשתמש שילם, ביטל, או שהכרטיס שלו נדחה? אפשר היה לשאול את Lemon Squeezy כל דקה ("polling"), אבל זה בזבזני ואיטי. במקום זה, **הם** קוראים **לנו**: בכל שינוי במנוי, LS שולחים \`POST\` לכתובת שהגדרנו בלוח הבקרה שלהם — \`/api/billing/webhook\`. זה **webhook**.

הסיפור מתחיל ביצירת ה-checkout: איך LS יידעו, כשיקראו לנו אחר כך, לאיזה משתמש שייך התשלום?`,
        },
        {
          kind: 'source',
          title: 'POST /api/billing/checkout — הקצה השני של החוט',
          ref: { file: 'app/api/billing/checkout/route.ts', start: 'const plan: BillingPlan = parsed.data.plan', end: 'return NextResponse.json({ url })' },
          notes: [
            { match: '${getBaseUrl()}/profile?tab=billing&checkout=success', text: 'לאן LS יחזירו את המשתמש אחרי התשלום. כתובת חיצונית נבנית תמיד מ-`getBaseUrl()`, לעולם לא מ-`request.url` — נרחיב בשיעור הבא.' },
            { match: 'userId: user.id,', text: 'ה-id של המשתמש נכנס ל-`checkout_data.custom.user_id` (בתוך `createCheckoutSession`). LS שומרים אותו על המנוי ושולחים אותו חזרה **בכל** webhook — כך מחברים בין התשלום לשורה ב-`User`.' },
            { match: 'return NextResponse.json({ url })', text: 'ה-route לא מפנה בעצמו — הוא מחזיר את ה-URL של דף התשלום, והקומפוננטה עושה `window.location = url`.' },
          ],
        },
        {
          kind: 'snippet',
          lang: 'bash',
          title: 'מה LS שולחים לנו (מקוצר, ערכים מומצאים)',
          code: `curl -X POST https://tradeanalyst.app/api/billing/webhook \\
  -H "Content-Type: application/json" \\
  -H "X-Signature: <64 hex chars: HMAC-SHA256 of the exact body>" \\
  -d '{
    "meta": {
      "event_name": "subscription_updated",
      "custom_data": { "user_id": "00000000-0000-0000-0000-000000000000" }
    },
    "data": {
      "id": "123456",
      "attributes": { "status": "active", "customer_id": 789, "renews_at": "2026-11-20T00:00:00Z", "ends_at": null }
    }
  }'`,
        },
        {
          kind: 'text',
          body: `הבעיה: ה-route הזה **אנונימי** — ה-proxy מעביר אותו בלי התחברות, כי LS לא מחזיקים עוגייה של משתמש. כל אחד באינטרנט יכול לשלוח לו \`POST\` עם \`"status": "active"\` ולקבל Pro בחינם.

הפתרון: **חתימה**. ל-LS ולנו יש סוד משותף (ב-env var בשם \`LEMONSQUEEZY_WEBHOOK_SECRET\`). LS מחשבים **HMAC-SHA256** של הגוף עם הסוד ושולחים את התוצאה ב-header \`X-Signature\`. אנחנו מחשבים אותו דבר בעצמנו ומשווים. בלי הסוד אי אפשר לייצר חתימה נכונה, ושינוי של תו אחד בגוף משנה את החתימה לגמרי.`,
        },
        {
          kind: 'source',
          title: 'אימות החתימה',
          ref: { file: 'app/api/billing/webhook/route.ts', start: 'const rawBody = await request.text()', lines: 32 },
          notes: [
            { match: 'const rawBody = await request.text()', text: 'קוראים את הגוף כ**טקסט גולמי**, לא `request.json()`. החתימה חושבה על הבתים המדויקים; `JSON.parse` ואז `JSON.stringify` יכולים לשנות רווחים או סדר מפתחות — והחתימה לא תתאים.' },
            { match: "request.headers.get('X-Signature')", text: 'בלי header בכלל — 401 מיד.' },
            { match: '/^[0-9a-f]{64}$/i', text: 'בדיקת צורה לפני ההשוואה: SHA-256 ב-hex הוא תמיד 64 תווים. `timingSafeEqual` זורק כשהאורכים שונים, וההערה מסבירה שזה היה מערבב בלוגים בין "מישהו שלח זבל" לבין "סוד שגוי".' },
            { match: "createHmac('sha256', config.webhookSecret).update(rawBody).digest('hex')", text: 'מחשבים בעצמנו את החתימה **הצפויה**: HMAC של הגוף הגולמי עם הסוד שלנו.' },
            { match: 'signatureValid = timingSafeEqual(', text: 'השוואה בזמן קבוע של שני ה-Buffers — מסבירים למה ממש למטה.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: 'למה לא `expected === signatureHeader`? השוואת מחרוזות רגילה עוצרת **בתו הראשון ששונה**. חתימה שהתו הראשון שלה נכון לוקחת קצת יותר זמן לדחות מחתימה שכולה שגויה. תוקף ששולח אלפי בקשות ומודד זמני תגובה יכול לנחש את החתימה תו אחרי תו — **timing attack**. `timingSafeEqual` תמיד עובר על כל הבתים, כך שהזמן לא מגלה כלום. אותו דבר נכון לכל השוואה של סוד: סיסמאות, טוקנים, וה-`CRON_SECRET` שנראה בשיעור הבא.',
        },
        {
          kind: 'quiz',
          question: 'מישהו "שיפר" את ה-route: `const payload = await request.json()` ואז `createHmac(...).update(JSON.stringify(payload))`. מה יקרה?',
          options: [
            'שום דבר, זה שקול',
            'חלק מה-webhooks האמיתיים ייכשלו באימות, כי `JSON.stringify` לא בהכרח משחזר את הבתים המקוריים',
            'האימות יעבור תמיד, גם לחתימות מזויפות',
            'שגיאת TypeScript',
          ],
          answer: 1,
          explanation: 'HMAC מחושב על בתים. אם LS שלחו JSON עם רווחים, שבירות שורה או escapes שונים, `JSON.stringify` יפיק מחרוזת אחרת — וחתימה אחרת. webhooks אמיתיים יידחו ב-401, ו-LS ימשיכו לנסות שוב.',
        },
        {
          kind: 'text',
          body: `**אידמפוטנטיות**: ספקי webhook מבטיחים "לפחות פעם אחת", לא "בדיוק פעם אחת". אם לא ענינו 2xx (או שהתשובה התעכבה), LS שולחים **שוב**. אותו אירוע יכול להגיע פעמיים — וצריך שזה לא יזיק.`,
        },
        {
          kind: 'source',
          title: 'פנקס אירועים: hash של הגוף כמפתח ייחודי',
          ref: { file: 'app/api/billing/webhook/route.ts', start: "const eventId = createHash('sha256').update(rawBody).digest('hex')", end: "return NextResponse.json({ error: 'db insert failed' }, { status: 500 })" },
          notes: [
            { match: "createHash('sha256').update(rawBody)", text: '**hash** (בלי סוד, בשונה מ-HMAC) של הגוף: משלוח חוזר של אותו אירוע נותן את אותו `eventId`.' },
            { match: ".insert({ event_id: eventId, event_name: eventName })", text: 'קודם מנסים להכניס שורה לפנקס — **לפני** שנוגעים ב-`User`. לעמודה `event_id` יש אילוץ UNIQUE.' },
            { match: "insertErr.code === '23505'", text: '23505 = הפרת UNIQUE ב-Postgres: האירוע כבר טופל. עונים 200 עם `duplicate: true` ולא כותבים שוב. ה-DB הוא שמכריע — גם אם שני משלוחים מגיעים באותה שנייה, רק אחד מצליח להכניס.' },
            { match: "{ error: 'db insert failed' }, { status: 500 }", text: 'שגיאת DB **אחרת** — 500, כדי ש-LS ינסו שוב. בניסיון הבא ה-hash זהה, אז האידמפוטנטיות נשמרת.' },
          ],
        },
        {
          kind: 'text',
          body: `הכלל שמנחה את כל התשובות ב-route: **מחזירים 500 רק כשניסיון חוזר יכול להצליח**. כל השאר מקבל 200, גם אם לא עשינו כלום:

- אירוע שלא מטופל (לא ב-\`HANDLED_EVENTS\`) — 200 עם \`ignored\`
- \`user_id\` שאינו UUID (קורה במצב בדיקה) — 200. אחרת Postgres היה זורק, ה-route היה מחזיר 500, ו-LS היו מנסים לנצח
- UUID תקין בלי שורת \`User\` (המשתמש מחק את החשבון) — 200, ונרשם אירוע audit עם \`userId: null\`

**סדר אירועים**: כל אירוע נושא את המצב המלא של המנוי, ו-LS יכולים לשלוח אותו באיחור או בסדר הפוך. ה-route שומר את \`data.attributes.updated_at\` על \`User.lemonsqueezyUpdatedAt\` ומחיל את העדכון רק אם הגרסה **חדשה ממש** (שוויון = ישן, הראשון שהוחל מנצח). אירוע ישן מקבל 200 עם \`ignored: stale\` בלי לדרוס את ה-tier.

**מי מקבל Pro?** התשובה היחידה באתר היא \`grantsPro\`:`,
        },
        {
          kind: 'source',
          title: 'lib/billing/lemon-squeezy.ts — אילו סטטוסים נותנים Pro',
          ref: { file: 'lib/billing/lemon-squeezy.ts', start: 'export function isActiveStatus(status: string): boolean {', end: 'return Number.isFinite(end) && end > now' },
          notes: [
            { match: "status === 'on_trial' || status === 'active'", text: 'רק שני סטטוסים "פעילים". `past_due` (החיוב נכשל) **לא** ביניהם: לפי החלטת הבעלים מ-2026-07-07, המשתמש יורד ל-Free מיד, בלי 14 ימי חסד שבהם היה מקבל צ\'אט Pro בחינם.' },
            { match: 'Owner decision 2026-09-14', text: '`cancelled` ב-LS אומר "לא יתחדש", לא "הגישה נגמרה". המשתמש שילם עד סוף התקופה — אז הוא נשאר Pro עד `ends_at`.' },
            { match: "if (status !== 'cancelled' || !endsAt) return false", text: 'כל סטטוס אחר (`paused`, `unpaid`, `expired`...) — Free. וגם `cancelled` בלי תאריך סיום.' },
            { match: 'end > now', text: '`now` הוא פרמטר עם ברירת מחדל `Date.now()` — כך הבדיקות יכולות להעביר זמן קבוע. כש-`ends_at` מגיע, LS שולחים `subscription_expired` והמשתמש יורד ל-Free.' },
          ],
        },
        {
          kind: 'text',
          body: `ה-webhook כותב את התוצאה לעמודה \`subscriptionTier\`, ו-\`getUserTier\` ב-\`lib/billing/tier.ts\` קורא אותה בכל route עם שער Pro. העמודות האלה נעולות לתפקיד \`authenticated\` — משתמש לא יכול לעדכן את עצמו ל-Pro — ולכן \`getUserTier\` קורא עם הלקוח של service-role.

ועוד דבר: webhook צריך לענות **מהר**. ספקים מחכים זמן מוגבל, ותשובה איטית נספרת ככישלון ומייצרת ניסיון חוזר. ה-route הזה עושה רק בדיקות ושלוש-ארבע פעולות DB קטנות; עבודה כבדה הייתה עוברת ל-\`waitUntil\` או לתור.`,
        },
        {
          kind: 'quiz',
          question: 'מגיע webhook עם `status: "past_due"` ו-`ends_at` בעוד שבועיים. מה יהיה ה-tier?',
          options: ['Pro עד `ends_at`', 'Free', 'Pro ל-14 ימים', 'ללא שינוי'],
          answer: 1,
          explanation: '`isActiveStatus(\'past_due\')` הוא `false`, ו-`ends_at` נבדק רק כשהסטטוס הוא `cancelled`. לכן `grantsPro` מחזירה `false` → Free. זו ההחלטה המכוונת של "0 ימי dunning".',
        },
        {
          kind: 'exercise',
          prompt: 'כתבו `verifySignature(rawBody: string, header: string | null, secret: string): boolean` לספק webhook שחותם ב-HMAC-SHA256 ושולח את החתימה ב-hex. הפונקציה צריכה להחזיר `false` (לא לזרוק) כשה-header חסר, כשהצורה שלו שגויה, או כשהחתימה לא תואמת. ואז: איך תבדקו אותה בטרמינל עם Node?',
          hint: 'שלושה שלבים כמו ב-route: בדיקת קיום, בדיקת צורה עם `/^[0-9a-f]{64}$/i`, ואז `timingSafeEqual` על שני Buffers מ-hex. בדיקת הצורה מבטיחה אורכים שווים.',
          solution: {
            lang: 'ts',
            code: `import { createHmac, timingSafeEqual } from 'crypto'

export function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !/^[0-9a-f]{64}$/i.test(header)) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(header, 'hex'))
}

// Quick check from a terminal (fake secret):
//   node -e "const c=require('crypto');console.log(c.createHmac('sha256','test-secret').update('{\\"a\\":1}').digest('hex'))"
// then:
//   verifySignature('{"a":1}', '<that output>', 'test-secret')  // true
//   verifySignature('{"a": 1}', '<that output>', 'test-secret') // false: one space changed`,
          },
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 6. Cron, secrets and base URLs
    // -----------------------------------------------------------------------
    {
      slug: 'api-cron-and-secrets',
      title: 'Cron בלי שרת: GitHub Actions, סודות ו-SITE_URL',
      summary: 'איך הסנכרון עם IBKR רץ פעמיים ביום בלי שרת קבוע: workflow שקורא ל-`/api/cron/*` עם bearer secret, הבאג של SITE_URL שהשאיר את ה-cron ירוק חודשיים בלי לעשות כלום, `getBaseUrl()`, הגנה מ-open redirect, ו-`waitUntil()`.',
      minutes: 16,
      blocks: [
        {
          kind: 'text',
          body: `ב-Vercel אין "שרת שרץ כל הזמן". פונקציה מתעוררת כשמגיעה בקשה, עונה, ונעלמת. אז מי יגיד לה "עכשיו 13:00, תסנכרן את כולם"?

התשובה באתר: **GitHub Actions**. ל-GitHub יש מתזמן שמריץ workflows לפי ביטוי cron. ה-workflow לא מסנכרן בעצמו — הוא רק שולח \`POST\` ל-route שלנו, וה-route עושה את העבודה. ה-scheduler חיצוני, והלוגיקה נשארת באפליקציה.`,
        },
        {
          kind: 'source',
          title: '.github/workflows/ibkr-sync.yml',
          ref: { file: '.github/workflows/ibkr-sync.yml', start: 'name: IBKR Sync', end: "max-time: '320'" },
          notes: [
            { match: "- cron: '0 13 * * *'", text: 'ביטוי cron: דקה, שעה, יום בחודש, חודש, יום בשבוע. `0 13 * * *` = כל יום ב-13:00 **UTC**. שתי שורות = שתי ריצות ביום.' },
            { match: 'workflow_dispatch:', text: 'מאפשר להריץ ידנית מכפתור ב-GitHub — שימושי לבדיקה.' },
            { match: 'site-url: ${{ secrets.SITE_URL }}', text: '`secrets.*` מגיעים מההגדרות של הריפו ב-GitHub, לא מהקוד. GitHub מסתיר אותם בלוגים.' },
            { match: "expect: '.ok == true'", text: 'תנאי jq על גוף התשובה. 200 לא מספיק — ה-route צריך להחזיר `ok: true`. גם `{"skipped":true}` (אין חיבורים פעילים) מכשיל את הריצה, בכוונה.' },
          ],
        },
        {
          kind: 'text',
          body: `ה-workflow משתמש ב-composite action מקומי, \`.github/actions/call-cron\`. בלב שלו יש קריאת \`curl\` אחת:`,
        },
        {
          kind: 'snippet',
          lang: 'bash',
          title: 'הליבה של call-cron (מקוצר)',
          code: `# No -f and no -L on purpose
out=$(curl -sS --max-time "$MAX_TIME" \\
  -o "$body" -w '%{http_code} %{redirect_url}' \\
  -X POST "\${SITE_URL}\${ENDPOINT_PATH}" \\
  -H "Authorization: Bearer \${CRON_SECRET}")

case "$code" in
  200) ;;                       # then: jq -e "$EXPECT" on the body
  3??) echo "::error::redirect — the route never ran"; exit 1 ;;
  *)   echo "::error::HTTP $code"; exit 1 ;;
esac`,
        },
        {
          kind: 'text',
          body: `בצד השני, ה-route חייב לוודא שמי שקורא לו הוא באמת ה-workflow. ה-\`matcher\` של \`proxy.ts\` **מחריג** את \`api/cron/\`, כך שאין שום שכבה לפני ה-handler — הבדיקה שלו היא השער היחיד:`,
        },
        {
          kind: 'source',
          title: 'lib/auth/cron-secret.ts',
          ref: { file: 'lib/auth/cron-secret.ts', start: 'export function verifyCronSecret(authHeader: string | null): boolean {' },
          notes: [
            { match: 'if (!secret || !authHeader) return false;', text: 'אם `CRON_SECRET` לא מוגדר בשרת — דוחים הכול. בלי השורה הזו, `Bearer undefined` היה עלול להתאים.' },
            { match: 'if (a.length !== b.length) return false;', text: '`timingSafeEqual` זורק על אורכים שונים, אז בודקים קודם. זה חושף רק את **אורך** הסוד, לא את תוכנו.' },
            { match: 'return timingSafeEqual(a, b);', text: 'אותה השוואה בזמן קבוע כמו ב-webhook, מאותה סיבה.' },
          ],
        },
        {
          kind: 'source',
          title: 'app/api/cron/ibkr-sync/route.ts — מה נחשב הצלחה',
          ref: { file: 'app/api/cron/ibkr-sync/route.ts', start: 'if (results.length === 0) {', end: 'ok: errored === 0 && remindersOk,' },
          notes: [
            { match: 'skipped: true,', text: '200, אבל בלי `ok` — ולכן ה-`expect` ב-workflow נכשל. cron שהפסיק לעבוד בשקט צריך להיות אדום.' },
            { match: 'const tokenInvalid', text: 'token שפג נספר בנפרד ולא מכשיל — זה של המשתמש לחדש.' },
            { match: 'ok: errored === 0 && remindersOk,', text: '`ok` הוא `false` אם חיבור אחד נכשל ב-`ERROR` — אבל **לא** בגלל `TRANSIENT_ERROR`, שהריצה הבאה תנסה שוב.' },
          ],
        },
        {
          kind: 'text',
          body: `**הבאג שעלה חודשיים.** מ-2026-05-26 עד 2026-07-28, הסוד \`SITE_URL\` ב-GitHub הצביע על כתובת **שמפנה** (בלבול בין הכתובת עם \`www\` לבלעדיה). מה שקרה בכל ריצה:

- ה-workflow שלח \`POST\` וקיבל **307** (הפניה לכתובת הקנונית)
- הקריאה אז הייתה \`curl -f\`, ש**נכשל רק על 400 ומעלה**. 307 נחשב הצלחה — ה-workflow ירוק
- \`curl\` לא עקב אחרי ההפניה. וגם אם היה עוקב (\`-L\`), מעבר בין hosts מוריד את ה-header \`Authorization\`, וה-route היה עונה 401
- כלומר ה-route **לא רץ אפילו פעם אחת**, ואף אחד לא ידע

לכן \`SITE_URL\` חייב להיות ה-origin שלא מפנה, ושני שומרים נוספו: \`call-cron\` שמכשיל על כל 3xx ובודק את הגוף, ומדד ב-\`/admin/health\` שמודד את **התוצאה** ולא את התעבורה:`,
        },
        {
          kind: 'source',
          title: 'staleSyncConnections — האם סנכרון באמת קרה?',
          ref: { file: 'supabase/migrations/20260728204114_add_broker_sync_staleness_metrics.sql', start: '-- Active connections whose last successful-or-failed sync', end: "interval '48 hours'))" },
          notes: [
            { match: '(48h = 4 missed slots)', text: 'שתי ריצות ביום, אז 48 שעות בלי סנכרון = ארבע ריצות שהוחמצו. מספיק מרווח כדי לא להתריע על תקלה בודדת.' },
            { match: '"lastSyncAt" IS NULL', text: 'חיבור שמעולם לא סונכרן נספר כ"תקוע" — הוא המקרה הגרוע ביותר, לא חריג.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'למה ה-workflow נשאר ירוק כשה-route לא רץ בכלל?',
          options: [
            'כי ה-route החזיר 200 עם שגיאה בגוף',
            'כי `curl -f` נכשל רק על סטטוס 400 ומעלה, ו-307 נראה לו כהצלחה',
            'כי GitHub Actions מתעלם מקודי יציאה',
            'כי `CRON_SECRET` היה שגוי',
          ],
          answer: 1,
          explanation: 'ההפניה עצמה הייתה התשובה היחידה. `curl -f` לא רואה ב-3xx כישלון, ובלי `-L` הוא גם לא עוקב — אז הוא יצא עם קוד 0. היום `call-cron` מכשיל במפורש כל 3xx ודורש `.ok == true` בגוף.',
        },
        {
          kind: 'text',
          body: `**\`getBaseUrl()\`**: אותו לקח חל על כל כתובת חיצונית שהשרת בונה — callback של התחברות, קישור לאיפוס סיסמה, \`redirect_url\` של Lemon Squeezy. אסור לבנות אותן מ-\`new URL(request.url).origin\`: מאחורי proxies, ה-edge של Vercel ודומיינים מותאמים, \`request.url\` לא תמיד משקף את הכתובת שהמשתמש רואה.`,
        },
        {
          kind: 'source',
          title: 'lib/utils.ts',
          ref: { file: 'lib/utils.ts', start: 'export function getBaseUrl(): string {' },
          notes: [
            { match: "process.env.SITE_URL ?? 'http://localhost:3000'", text: '`SITE_URL` הוא env var **בלי** `NEXT_PUBLIC_` — הוא קיים רק בשרת, ולכן אסור לקרוא ל-`getBaseUrl()` מקוד של הדפדפן.' },
            { match: 'return new URL(raw).origin', text: '`.origin` מוריד path ו-`/` בסוף, כך ש-`${getBaseUrl()}/profile` אף פעם לא יוצא עם `//`. ערך שבור זורק מיד, במקום לייצר קישורים שבורים בשקט.' },
          ],
        },
        {
          kind: 'source',
          title: 'app/auth/callback/route.ts — הגנה מ-open redirect',
          ref: { file: 'app/auth/callback/route.ts', start: 'const { searchParams } = new URL(request.url)', lines: 5 },
          notes: [
            { match: 'new URL(request.url)', text: 'כאן מותר להשתמש ב-`request.url` — רק כדי **לקרוא** פרמטרים, לא כדי לבנות כתובת חיצונית.' },
            { match: "rawNext.startsWith('/') ? rawNext : '/research'", text: '`next` מגיע מה-URL, כלומר מכל מי ששלח קישור. בלי הבדיקה, `next=@evil.com` היה נותן `https://tradeanalyst.app@evil.com` — כתובת שהדפדפן שולח ל-`evil.com` (מה שלפני `@` נחשב שם משתמש). רק נתיב שמתחיל ב-`/` מודבק אחרי ה-origin.' },
          ],
        },
        {
          kind: 'text',
          body: `**\`waitUntil()\`**: לפעמים route צריך להתחיל עבודה ארוכה ולענות מיד — למשל כפתור "סנכרן עכשיו" בפאנל המנהל. promise שלא מחכים לו (\`syncOneConnection(...)\` בלי \`await\`) **ייהרג** ברגע שהתשובה נשלחת: Vercel מקפיא את הפונקציה. \`waitUntil\` מ-\`@vercel/functions\` אומר לפלטפורמה "תשאירי אותי חיה עד שה-promise הזה יסתיים" — עד גבול ה-\`maxDuration\`:`,
        },
        {
          kind: 'source',
          title: 'POST /api/admin/ibkr/[connectionId]/sync',
          ref: { file: 'app/api/admin/ibkr/[connectionId]/sync/route.ts', start: '// Fire-and-forget through waitUntil', end: '{ status: 202 },' },
          notes: [
            { match: 'waitUntil(', text: 'הסנכרון ממשיך לרוץ אחרי שהתשובה יצאה. ה-route מגדיר `maxDuration = 300` — מעבר לזה גם `waitUntil` לא יעזור.' },
            { match: '}).catch(err => {', text: 'אף אחד לא מחכה ל-promise הזה, אז שגיאה בו לא תגיע לשום מקום. ה-`.catch` מוודא שלפחות תירשם ללוג.' },
            { match: "note: 'sync started'", text: '**202** = "התקבל, עדיין לא הסתיים". ה-UI עושה polling ל-`GET /api/admin/ibkr` ומחכה ש-`lastSyncStatus` ישתנה.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'מה יקרה אם נמחק את `waitUntil(...)` ונשאיר `syncOneConnection(...).catch(...)` בלי `await`?',
          options: [
            'אותו דבר — ה-promise ירוץ ברקע',
            'הסנכרון עלול להיעצר באמצע ברגע שהתשובה 202 נשלחת',
            'ה-route יחזיר 500',
            'הסנכרון ירוץ פעמיים',
          ],
          answer: 1,
          explanation: 'ב-serverless, אחרי שהתשובה נשלחת הפלטפורמה רשאית להקפיא או להרוג את הפונקציה. ה-AGENTS.md של `app/api` מזהיר במפורש: promise חשוף או `setImmediate` נהרגים. ועבודה שעלולה לחרוג מ-`maxDuration` עוברת ל-worker ב-GitHub Actions.',
        },
        {
          kind: 'exercise',
          prompt: 'הוסיפו cron יומי `POST /api/cron/cleanup-audit` שמוחק אירועי audit ישנים מ-180 יום. כתבו את ה-route (בדיקת סוד, לקוח service-role, תשובה עם `ok`), ובהערה בראש הקובץ — את ה-workflow שקורא לו כל יום ב-03:30 UTC דרך `call-cron`.',
          hint: 'פתחו כמו `cron/ibkr-sync`: `verifyCronSecret(req.headers.get(\'Authorization\'))` → 401. החזירו `{ ok: true, deleted }` כדי שה-`expect` ברירת המחדל יעבור. ב-workflow צריך `actions/checkout@v4` לפני ה-action המקומי.',
          solution: {
            lang: 'ts',
            code: `// app/api/cron/cleanup-audit/route.ts
//
// .github/workflows/cleanup-audit.yml:
//   name: Audit cleanup
//   on:
//     schedule:
//       - cron: '30 3 * * *'
//     workflow_dispatch:
//   jobs:
//     cleanup:
//       runs-on: ubuntu-latest
//       steps:
//         - uses: actions/checkout@v4
//         - uses: ./.github/actions/call-cron
//           with:
//             site-url: \${{ secrets.SITE_URL }}
//             path: /api/cron/cleanup-audit
//             cron-secret: \${{ secrets.CRON_SECRET }}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyCronSecret } from '@/lib/auth/cron-secret'

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('Authorization'))) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await createAdminClient()
    .from('AuditEvent')
    .delete({ count: 'exact' })
    .lt('createdAt', cutoff)

  if (error) {
    console.error('[cron/cleanup-audit] delete failed:', error.message)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, deleted: count ?? 0 })
}`,
          },
        },
      ],
    },
  ],
}
