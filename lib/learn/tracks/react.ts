import type { Track } from '../types'

export const reactTrack: Track = {
  id: 'react',
  title: 'React + Next.js',
  description: 'קומפוננטות, state ושרת מול לקוח — דרך המסכים שאתה משתמש בהם כל יום.',
  lessons: [
    // ─────────────────────────────────────────────────────────────────────
    {
      slug: 'react-components-props',
      title: 'קומפוננטות, JSX ו-props',
      summary: 'מה זו קומפוננטה, איך JSX עובד, איך props ו-`children` זורמים — דרך `CodeBlock`, `RichText` וה-layout של אזור המנהל.',
      minutes: 14,
      blocks: [
        {
          kind: 'text',
          body: `קומפוננטה ב-React היא פשוט **פונקציה שמחזירה JSX** — תיאור של מה שצריך להופיע על המסך. React קורא לפונקציה, מקבל את התיאור, ודואג שה-DOM בדפדפן ייראה בהתאם. כל מה שהקומפוננטה מקבלת מבחוץ מגיע בפרמטר אחד: אובייקט ה-**props**.

הנה הקומפוננטה שמציירת כל קטע קוד בפלטפורמת הלמידה הזאת — כולל הקטע שאתה קורא ממש עכשיו:`,
        },
        {
          kind: 'source',
          title: 'מסגרת לקטע קוד',
          ref: { file: 'components/learn/code-block.tsx', start: 'export function CodeBlock(' },
          notes: [
            { match: '{ html, title, meta }', text: 'הקומפוננטה מקבלת אובייקט props אחד, וכאן מפרקים אותו כבר בחתימה (destructuring). מה שאחרי הנקודתיים הוא הטיפוס של ה-props: `html` חובה, `title` ו-`meta` אופציונליים (`?`).' },
            { match: 'className="rounded-md', text: 'JSX נראה כמו HTML אבל הוא JavaScript. לכן `class` נכתב `className` (`class` היא מילה שמורה ב-JS), ושמות תכונות נכתבים ב-camelCase.' },
            { match: '{(title || meta) && (', text: 'סוגריים מסולסלים פותחים "חלון" ל-JavaScript בתוך ה-JSX. התבנית `תנאי && <JSX>` היא **רינדור מותנה**: אם התנאי falsy, לא מוצג כלום. כאן שורת הכותרת מופיעה רק אם יש כותרת או מטא.' },
            { match: 'dangerouslySetInnerHTML', text: 'React בורח (escapes) מכל טקסט כברירת מחדל כדי למנוע XSS. כדי להכניס HTML מוכן צריך לבקש במפורש, והשם המפחיד מכוון. כאן זה בטוח כי ה-HTML מגיע מ-Shiki, על קוד מהריפו עצמו ולא מקלט של משתמש — בדיוק מה שההערה בראש הקובץ אומרת. הסוגריים הכפולים: החיצוניים פותחים ביטוי JS, הפנימיים הם אובייקט עם המפתח `__html`.' },
          ],
        },
        {
          kind: 'text',
          body: `חשוב להבין: אתה **לא** קורא ל-\`CodeBlock(...)\` בעצמך. אתה כותב \`<CodeBlock html={html} />\`, והקומפיילר הופך את זה לקריאה שמתארת אלמנט. React מחליט מתי (ואם בכלל) להריץ את הפונקציה.

בגלל זה שם של קומפוננטה חייב להתחיל באות גדולה: \`<codeBlock>\` באות קטנה היה מתפרש כתגית HTML בשם הזה, ולא כקריאה לפונקציה שלך.`,
        },
        {
          kind: 'snippet',
          lang: 'tsx',
          title: 'מה JSX הופך להיות',
          code: `// What you write:
<CodeBlock html={html} title="Solution" />

// Roughly what the compiler emits (automatic JSX runtime):
import { jsx } from 'react/jsx-runtime'
jsx(CodeBlock, { html: html, title: 'Solution' })`,
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: 'מלכודת קלאסית ברינדור מותנה: `{count && <Badge />}` כש-`count` הוא `0` מציג על המסך את הספרה **0**, כי `0 && ...` מחזיר `0` ו-React מרנדר מספרים. כשהתנאי הוא מספר, כתבו `{count > 0 && <Badge />}`. ב-`CodeBlock` אין בעיה כי `title` ו-`meta` הם מחרוזות, ומחרוזת ריקה לא מוצגת.',
        },
        {
          kind: 'text',
          body: `קומפוננטה יכולה להחזיר רשימת אלמנטים. ב-JSX אין לולאת \`for\` — משתמשים ב-\`.map()\` שמחזיר מערך של אלמנטים. כל אלמנט ברשימה צריך \`key\`: מזהה שעוזר ל-React להבין איזה פריט הוא איזה בין רינדור לרינדור.

הנה ה-renderer של הטקסט בשיעורים — הוא הופך את המחרוזות שבקובץ השיעור לפסקאות ולרשימות:`,
        },
        {
          kind: 'source',
          title: 'רינדור טקסט השיעור',
          ref: { file: 'components/learn/rich-text.tsx', start: 'export function RichText(' },
          notes: [
            { match: "className ?? 'space-y-3", text: '`className` הוא prop אופציונלי. עם `??` נותנים ערך ברירת מחדל כשהוא לא הועבר — כך המסגרת של שאלה או הערה יכולה להעביר עיצוב קטן יותר, ובלי זה מקבלים את עיצוב גוף השיעור.' },
            { match: 'paragraphs.map((para, i) =>', text: '`.map` מחזיר מערך של אלמנטים, ו-React יודע לרנדר מערך. זה התחליף ללולאה בתוך JSX.' },
            { match: 'lines.every(', text: 'קומפוננטה היא פונקציה רגילה, אז אפשר `if` ו-`return` מוקדם. אם כל השורות מתחילות ב-`- ` מחזירים `<ul>`, אחרת `<p>`.' },
            { match: 'return <p key={i}>', text: 'כל אלמנט שחוזר מ-`.map` מקבל `key`. כאן האינדקס משמש כ-key — ובשאלה למטה נבין למה זה בסדר דווקא כאן.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'ב-`RichText`, למה מותר להשתמש באינדקס `i` בתור `key`?',
          options: [
            'כי React מתעלם מ-`key` ברשימות קטנות',
            'כי הפסקאות נגזרות ממחרוזת קבועה של השיעור — הרשימה לא מתמיינת מחדש ולא מוסיפים או מוחקים ממנה פריטים באמצע',
            'כי `key` חייב תמיד להיות מספר',
            'כי לפסקאות אין state',
          ],
          answer: 1,
          explanation: 'אינדקס הוא זהות גרועה רק כשסדר הפריטים משתנה: אז React משייך את ה-DOM (וה-state) של פריט אחד לפריט אחר. ב-`AdminUsersTable` השורות יכולות להשתנות, ולכן שם הקוד משתמש ב-`key={r.id}` — מזהה יציב מהמסד.',
        },
        {
          kind: 'text',
          body: `עכשיו ה-prop המיוחד ביותר: **\`children\`**. כל מה שכותבים בין תגית הפתיחה לתגית הסגירה של קומפוננטה מגיע אליה כ-\`children\`. זה מה שמאפשר **הרכבה** (composition): קומפוננטה אחת עוטפת תוכן שהיא לא מכירה.

ה-layout של אזור המנהל הוא דוגמה טהורה לזה:`,
        },
        {
          kind: 'source',
          title: 'layout שעוטף כל דף מנהל',
          ref: {
            file: 'app/(dashboard)/admin/layout.tsx',
            start: 'import { AdminLayout as AdminLayoutShell }',
            end: 'return <AdminLayoutShell>',
          },
          notes: [
            { match: 'as AdminLayoutShell', text: '`as` משנה את השם המקומי של ה-import. הקומפוננטה מיוצאת בשם `AdminLayout`, וכאן קוראים לה `AdminLayoutShell` כדי שלא תתבלבל עם ה-layout של הקובץ הזה עצמו.' },
            { match: 'children: React.ReactNode', text: '`React.ReactNode` הוא הטיפוס של "כל דבר ש-React יודע לרנדר": אלמנט, מחרוזת, מספר, מערך, `null`.' },
            { match: 'await requireAdminPage()', text: 'קודם בודקים הרשאה — אם המשתמש לא מנהל, הפונקציה מפנה החוצה ושום דבר מתחת לא ירונדר. (הפונקציה `async` — נרחיב על זה בשיעור הבא.)' },
            { match: 'return <AdminLayoutShell>', text: 'ה-layout לא יודע איזה דף מוצג. הוא מקבל אותו כ-`children` ומעביר אותו הלאה לתוך ה-shell.' },
          ],
        },
        {
          kind: 'source',
          title: 'וה-shell מציב את children במקום',
          ref: { file: 'components/admin/admin-layout.tsx', start: '<section', end: '</section>' },
          notes: [
            { match: 'role="tabpanel"', text: 'מסביב יש סרגל טאבים קבוע (לא מוצג כאן). רק אזור התוכן הזה מתחלף בין דף לדף.' },
            { match: '{showSkeleton ? <AdminContentSkeleton /> : children}', text: '`children` הוא ערך רגיל — אפשר לבחור אם להציג אותו. כאן, בזמן מעבר טאב, מציגים skeleton במקומו. איך `showSkeleton` מחושב נראה בשיעור על state נגזר.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'נכנסים ל-`/admin/users`. מה מגיע ל-`AdminLayoutShell` בתור `children`?',
          options: [
            'רשימת הטאבים `TABS`',
            'האלמנט שמרונדר מ-`app/(dashboard)/admin/users/page.tsx`',
            'ה-`Header` של הדשבורד',
            'מחרוזת ה-URL',
          ],
          answer: 1,
          explanation: 'Next.js מרכיב את העץ מבחוץ פנימה: ה-layout של `(dashboard)` עוטף את ה-layout של `admin`, שעוטף את ה-page. כל layout מקבל את מה שמתחתיו כ-`children` בלי לדעת מה זה — ולכן אותו shell משרת את כל טאבי המנהל, כולל דף הלמידה הזה.',
        },
        {
          kind: 'exercise',
          prompt: 'כתבו קומפוננטה `Panel` שמקבלת `title` (מחרוזת), `hint` אופציונלי ו-`children`. היא מציירת מסגרת עם כותרת, מציגה את ה-`hint` רק אם הועבר, ואת התוכן מתחת. אחר כך השתמשו בה כדי לעטוף `<CodeBlock>`.',
          hint: 'התחילו מהחתימה של `AdminSectionLayout`: `children` מסוג `React.ReactNode`. לרינדור המותנה השתמשו ב-`&&`.',
          solution: {
            lang: 'tsx',
            code: `function Panel({ title, hint, children }: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-md border border-border p-4 space-y-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {hint && <p className="text-xs text-text-dim">{hint}</p>}
      {children}
    </section>
  )
}

// Usage
<Panel title="קטע מהקוד" hint="נקרא מהריפו בזמן אמת">
  <CodeBlock html={html} />
</Panel>`,
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────
    {
      slug: 'react-server-vs-client',
      title: "Server Components מול 'use client'",
      summary: 'מה רץ בשרת, מה רץ בדפדפן, ומה מותר להעביר ביניהם — דרך דפי המנהל ודרך הפלטפורמה הזאת עצמה.',
      minutes: 16,
      blocks: [
        {
          kind: 'text',
          body: `ב-Next.js App Router כל קומפוננטה היא **Server Component** כברירת מחדל. היא רצה רק בשרת, והקוד שלה לא נשלח לדפדפן בכלל. בזכות זה היא יכולה:

- להיות \`async\` ולחכות (\`await\`) למסד נתונים או לקובץ
- להשתמש בסודות (מפתחות API, מפתח service-role)
- לייבא ספריות כבדות בלי להגדיל את ה-JavaScript שהמשתמש מוריד

מה היא **לא** יכולה: \`useState\`, \`useEffect\`, \`onClick\` וכל דבר שקשור לאינטראקציה — כי אחרי שה-HTML נשלח, היא כבר לא קיימת בדפדפן.

הנה דף המשתמשים של אזור המנהל:`,
        },
        {
          kind: 'source',
          title: 'דף שרת שקורא מהמסד',
          ref: {
            file: 'app/(dashboard)/admin/users/page.tsx',
            start: 'export default async function AdminPage()',
            end: '}))',
          },
          notes: [
            { match: 'export default async function AdminPage()', text: 'קומפוננטה `async` — אפשרי רק בשרת. הדף פשוט מחכה לנתונים ואז מחזיר JSX. אין loading state, אין useEffect.' },
            { match: 'const admin = createAdminClient()', text: 'הלקוח עם מפתח ה-service-role שעוקף RLS. בטוח להשתמש בו כאן כי הקוד הזה לעולם לא מגיע לדפדפן — והדף בודק הרשאת מנהל לפני כן.' },
            { match: 'if (error) {', text: '`console.error` בקומפוננטת שרת נכתב ללוג של השרת (Vercel), לא לקונסול של הדפדפן.' },
            { match: 'const initialRows: AdminUserRow[]', text: 'ממפים את השורות לאובייקטים פשוטים עם בדיוק השדות שהטבלה צריכה. מה שנעביר לקומפוננטת הלקוח יישלח ברשת — אז שולחים רק את הנחוץ.' },
          ],
        },
        {
          kind: 'text',
          body: `בסוף הדף (לא מוצג כאן) יש \`<AdminUsersTable initialRows={initialRows} />\`. הטבלה צריכה כפתורים ו-state, אז הקובץ שלה מתחיל ב-\`'use client'\`. ההוראה הזו מסמנת **גבול**: הקובץ הזה, וכל מה שהוא מייבא, נכנס לבאנדל של הדפדפן.

שתי נקודות שמבלבלות מתחילים:

- גם קומפוננטת לקוח מרונדרת **פעם ראשונה בשרת** ל-HTML, כדי שהמשתמש יראה תוכן מיד. אחר כך, בדפדפן, React "מחייה" אותה (hydration) ומחבר את ה-event handlers.
- את ה-props שחוצים את הגבול React **מסדרת** (serialization) ושולחת ברשת. לכן הם חייבים להיות ערכים שאפשר לשלוח: מחרוזות, מספרים, מערכים, אובייקטים פשוטים, ו-JSX. פונקציה רגילה אי אפשר לשלוח.`,
        },
        {
          kind: 'source',
          title: 'דף הבריאות: כמה שאילתות במקביל',
          ref: {
            file: 'app/(dashboard)/admin/health/page.tsx',
            start: 'const [metricsRes, sizesRes, seriesRes, failuresRes]',
            end: '])',
          },
          notes: [
            { match: 'await Promise.all([', text: 'ארבע הבקשות יוצאות יחד ומחכים לכולן. אם היינו כותבים ארבעה `await` ברצף, כל אחת הייתה מחכה לקודמת. בשרת אין "ספינר" — המשתמש מחכה לבקשה האיטית ביותר, אז מקבילות חשובה.' },
            { match: "admin.rpc('admin_system_metrics')", text: 'קריאה לפונקציית Postgres. מהדפדפן הייתה נחסמת — כאן היא רצה עם הרשאות service-role.' },
            { match: '.limit(20)', text: 'שולחים לקומפוננטת הלקוח רק 20 כשלונות אחרונים. כל שורה כאן היא בתים שעוברים ברשת ונכנסים ל-HTML.' },
          ],
        },
        {
          kind: 'text',
          body: `הדף הזה מעביר את התוצאות ל-\`AdminHealthDashboard\` — "תמונת מצב קפואה", כמו שה-AGENTS.md של אזור המנהל מתאר אותה. אין polling: רענון הדף מריץ את השאילתות מחדש.

עכשיו הדוגמה הכי קרובה אליך: **הפלטפורמה שאתה קורא בה עכשיו**. דף השיעור הוא קומפוננטת שרת שקוראת את הקבצים מהדיסק, צובעת אותם עם Shiki, ומעבירה **HTML מוכן** לקומפוננטות הלקוח של השאלות והתרגילים:`,
        },
        {
          kind: 'source',
          title: 'דף השיעור (שרת) מכין את הפתרון',
          ref: { file: 'app/(dashboard)/admin/learn/[slug]/page.tsx', start: "case 'exercise':", lines: 10 },
          notes: [
            { match: '<LessonExercise', text: 'קומפוננטת לקוח שמרונדרת מתוך קומפוננטת שרת — זה המקום שבו עוברים את הגבול.' },
            { match: 'solutionHtml={await highlight(', text: 'הצביעה רצה **בשרת**, וה-prop הוא מחרוזת HTML פשוטה. Shiki טוען את כל הדקדוקים של השפות — אילו רץ בדפדפן, כל שיעור היה מוריד מגה-בייטים של JavaScript. כך הדפדפן מקבל רק את התוצאה.' },
          ],
        },
        {
          kind: 'source',
          title: 'והתרגיל (לקוח) רק מציג אותו',
          ref: {
            file: 'components/learn/lesson-exercise.tsx',
            start: "'use client'",
            end: 'const [showSolution, setShowSolution]',
          },
          notes: [
            { match: "'use client'", text: 'חייב להיות הדבר הראשון בקובץ. בלעדיו `useState` היה זורק שגיאה, כי בקומפוננטת שרת אין state.' },
            { match: "import { CodeBlock } from './code-block'", text: '`CodeBlock` לא מסומן `use client`, ובכל זאת מותר לייבא אותו לכאן: כל מה שקובץ לקוח מייבא נהיה קוד לקוח. אותו `CodeBlock` משמש גם את דף השרת — ההערה בקובץ שלו מסבירה שזה עובד כי אין בו hooks.' },
            { match: 'solutionHtml: string', text: 'ה-prop הוא מחרוזת — הדבר הכי קל לסדר ולשלוח. ההחלטה "לצבוע בשרת" היא שאפשרה ממשק פשוט כזה.' },
            { match: 'useState(false)', text: 'ה-state היחיד: האם הרמז והפתרון פתוחים. זה מה שמצדיק את ה-`use client` — אינטראקציה.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'tip',
          body: "יש גם הגנה הפוכה: `lib/supabase/auth.ts` מתחיל ב-`import 'server-only'`. אם קובץ לקוח ינסה לייבא אותו, ה-build ייכשל מיד — במקום לגלות בפרודקשן שמשתנה סביבה סודי הוא `undefined` בדפדפן (משתנים בלי `NEXT_PUBLIC_` לא נכנסים לבאנדל של הלקוח).",
        },
        {
          kind: 'quiz',
          question: "איזה מה-props הבאים **אי אפשר** להעביר מ-Server Component לקומפוננטה עם `'use client'`?",
          options: [
            "`initialRows={[{ id: '1', email: 'a@b.c' }]}`",
            '`solutionHtml="<pre>...</pre>"`',
            "`onClose={() => console.log('closed')}`",
            '`answer={2}`',
          ],
          answer: 2,
          explanation: "פונקציה רגילה היא קוד שקיים בשרת, ואין דרך לסדר אותה ולשלוח לדפדפן (החריג: Server Functions שמסומנות ב-`'use server'`). לכן ב-`AdminJobsTable` ה-`onClose` של המודאל נוצר **בתוך** קומפוננטת הלקוח — הוא לא מגיע מהדף.",
        },
        {
          kind: 'quiz',
          question: "מה יקרה אם נוסיף `'use client'` בראש `app/(dashboard)/admin/users/page.tsx`?",
          options: [
            'כלום — הדף ימשיך לעבוד אותו דבר',
            'שגיאה: קומפוננטת לקוח לא יכולה להיות `async`. וגם אילו הייתה יכולה — מפתח ה-service-role לא קיים בבאנדל של הדפדפן',
            'הדף יהיה מהיר יותר כי ירוץ בדפדפן',
            'רק `requireAdminPage()` יפסיק לעבוד',
          ],
          answer: 1,
          explanation: '`async` נתמך רק בקומפוננטות שרת. ו-`SUPABASE_SERVICE_ROLE_KEY` אינו `NEXT_PUBLIC_`, אז בדפדפן הוא `undefined` — וזה בדיוק טוב: מפתח שעוקף RLS לעולם לא אמור להגיע ללקוח. החלוקה "שרת קורא, לקוח מגיב" היא לא סגנון, היא גבול אבטחה.',
        },
        {
          kind: 'exercise',
          prompt: 'דף צריך להציג כמה טריידים פתוחים יש למשתמש, עם כפתור "רענן" שמביא את המספר מחדש מ-`/api/trades/open-count` (endpoint דמיוני שמחזיר `{ count }`). פצלו לשני קבצים: `page.tsx` (שרת) שקורא את המספר ההתחלתי מ-Supabase, ו-`open-count.tsx` (לקוח) שמחזיק אותו ב-state.',
          hint: 'חקו את הזוג `users/page.tsx` + `AdminUsersTable`: הדף מעביר `initial...` כ-prop, והלקוח מאתחל ממנו `useState`. בדף השתמשו בלקוח הרגיל מ-`@/lib/supabase/server` — RLS כבר מסנן לפי המשתמש.',
          solution: {
            lang: 'tsx',
            code: `// app/(dashboard)/open-count/page.tsx — Server Component
import { createClient } from '@/lib/supabase/server'
import { OpenCount } from '@/components/open-count'

export default async function OpenCountPage() {
  const supabase = await createClient()
  const { count } = await supabase
    .from('Trade')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'Open')
  return <OpenCount initialCount={count ?? 0} />
}

// components/open-count.tsx — Client Component
'use client'

import { useState } from 'react'

export function OpenCount({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount)

  async function refresh() {
    const res = await fetch('/api/trades/open-count', { cache: 'no-store' })
    if (res.ok) setCount(((await res.json()) as { count: number }).count)
  }

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono">{count}</span>
      <button type="button" onClick={refresh}>רענן</button>
    </div>
  )
}`,
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────
    {
      slug: 'react-state-events',
      title: 'State, אירועים ועדכון אופטימי',
      summary: '`useState`, event handlers, רינדור מחדש ועדכון immutable — ועד העדכון האופטימי עם rollback ב-`toggleTier`.',
      minutes: 16,
      blocks: [
        {
          kind: 'text',
          body: `**State** הוא זיכרון של קומפוננטה בין רינדורים. משתנה רגיל (\`let x\`) נוצר מחדש בכל פעם ש-React מריץ את הפונקציה, אז הוא לא יכול לזכור כלום. \`useState\` מחזיר זוג: הערך הנוכחי, ופונקציה שמשנה אותו. קריאה לפונקציה הזו אומרת ל-React: "הערך השתנה — תריץ אותי שוב ותעדכן את המסך".

השאלות בשיעורים האלה הן דוגמה מינימלית:`,
        },
        {
          kind: 'source',
          title: 'שאלה עם תשובה אחת',
          ref: { file: 'components/learn/lesson-quiz.tsx', start: 'export function LessonQuiz(', end: 'onClick={() => setPicked(i)}' },
          notes: [
            { match: 'useState<number | null>(null)', text: '`null` = "עוד לא בחרו". הטיפוס בסוגריים המשולשים אומר ל-TS שהערך יהיה מספר או `null` — בלי זה הוא היה מסיק `null` בלבד.' },
            { match: 'const answered = picked !== null', text: 'זה **לא** state — זה ערך שמחושב מה-state בכל רינדור. נרחיב על זה בשיעור הבא.' },
            { match: 'disabled={answered}', text: 'אחרי בחירה הכפתורים ננעלים. כשקוראים ל-`setPicked`, React מריץ את הפונקציה שוב, `answered` מחושב מחדש, וה-JSX משקף את המצב החדש. אף פעם לא "מכבים כפתור" ידנית ב-DOM.' },
            { match: 'onClick={() => setPicked(i)}', text: 'מעבירים ל-`onClick` **פונקציה** שתרוץ בלחיצה. החץ נחוץ כי צריך להעביר את `i` — ראו את ההשוואה למטה.' },
          ],
        },
        {
          kind: 'compare',
          left: {
            lang: 'tsx',
            title: 'שגוי: קורא ל-setPicked בזמן הרינדור',
            code: `<button onClick={setPicked(i)}>
// setPicked(i) runs while rendering ->
// state changes -> render again -> ...
// "Too many re-renders"`,
          },
          right: {
            lang: 'tsx',
            title: 'נכון: מעביר פונקציה שתרוץ בלחיצה',
            code: `<button onClick={() => setPicked(i)}>
// React stores the function and
// calls it only when clicked`,
          },
        },
        {
          kind: 'text',
          body: `נקודה שתופסת כמעט כל מתחיל: state הוא **תמונת מצב** של רינדור אחד. \`setPicked(2)\` לא משנה את המשתנה \`picked\` שכבר קיים — הוא מתזמן רינדור חדש שבו \`picked\` יהיה \`2\`. לכן כשהערך החדש תלוי בקודם, מעבירים ל-setter **פונקציה** שמקבלת את הערך העדכני:`,
        },
        {
          kind: 'source',
          title: 'כפתורי רמז ופתרון',
          ref: { file: 'components/learn/lesson-exercise.tsx', start: '{hint && (', end: '{showSolution && <CodeBlock' },
          notes: [
            { match: 'setShowHint(v => !v)', text: 'updater function: React מעביר את הערך האחרון שהוא מכיר (`v`), ואנחנו מחזירים את ההפוך. `setShowHint(!showHint)` היה עובד כאן, אבל ה-updater נכון גם כשיש כמה עדכונים ברצף או קוד אסינכרוני.' },
            { match: 'aria-expanded={showHint}', text: 'אותו state מניע גם נגישות: קורא מסך יודע אם הרמז פתוח.' },
            { match: '{hint && showHint && <RichText', text: 'שני תנאים: יש רמז בשיעור, **וגם** המשתמש פתח אותו.' },
          ],
        },
        {
          kind: 'text',
          body: `עכשיו לדוגמה רצינית. הכלל השני של state: **לא משנים אותו במקום** (immutable). לא כותבים \`rows[3].subscriptionTier = 'Pro'\` — React משווה את הערך הישן לחדש לפי הפניה (reference), ואם זה אותו מערך, הוא מניח ששום דבר לא השתנה. יוצרים מערך חדש עם \`.map\`, ואובייקט חדש עם spread (\`...\`).

כפתור "שדרג ל-Pro" בטבלת המשתמשים עושה **עדכון אופטימי**: מציג את התוצאה מיד, ורק אחר כך שואל את השרת.`,
        },
        {
          kind: 'source',
          title: 'toggleTier — חלק 1: עדכון מיידי',
          ref: { file: 'components/admin/admin-users-table.tsx', start: 'async function toggleTier(', end: 'try {' },
          notes: [
            { match: 'setBusyId(row.id)', text: 'state נפרד ל"איזו שורה בטיפול" — הכפתור שלה מציג ספינר ונהיה `disabled`, כדי שלא ילחצו פעמיים.' },
            { match: 'const prevSnapshot = row', text: 'שומרים את השורה **המקורית** לפני השינוי. בגלל שאף אחד לא משנה אובייקטים במקום, ההפניה הזו תישאר בדיוק כמו שהייתה — היא הגיבוי ל-rollback.' },
            { match: 'setRows(prev =>', text: 'updater function: `prev` הוא המערך העדכני ביותר. `.map` מחזיר מערך **חדש** — שורה אחת מוחלפת, כל השאר עוברות כמו שהן.' },
            { match: '...r,', text: 'spread: אובייקט חדש שמעתיק את כל השדות של `r`, ודורס רק את שלושת שדות המנוי. האובייקט הישן לא נגע.' },
          ],
        },
        {
          kind: 'source',
          title: 'toggleTier — חלק 2: השרת עונה',
          ref: { file: 'components/admin/admin-users-table.tsx', start: 'if (!res.ok) {', end: 'setBusyId(null)' },
          notes: [
            { match: 'r.id === row.id ? prevSnapshot : r', text: 'rollback ממוקד: מחזירים **רק** את השורה הזו לגיבוי, על גבי המצב העדכני. אם בינתיים השתנו שורות אחרות — השינויים שלהן נשמרים.' },
            { match: 'json.tier ?? nextTier', text: 'בהצלחה מיישרים קו עם מה שהשרת באמת כתב (למשל תאריך החידוש המדויק), עם fallback לניחוש האופטימי.' },
            { match: '} catch {', text: 'כשל רשת (ה-fetch עצמו נזרק) — אותו rollback, עם הודעה אחרת.' },
            { match: '} finally {', text: '`finally` רץ בכל מקרה — הצלחה, שגיאת שרת או כשל רשת. כך הספינר תמיד נעלם. שימו לב שגם ה-`return` בתוך ה-`if` עובר דרך `finally`.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'לחצת "שדרג ל-Pro" ליד משתמש Free. מה רואים על המסך **לפני** שהשרת ענה?',
          options: [
            'שום דבר לא משתנה עד שהשרת עונה',
            'השורה כבר מציגה Pro, סטטוס "פעיל" ותאריך חידוש, והכפתור שלה מציג ספינר',
            'השורה נעלמת מהטבלה',
            'מופיעה הודעת שגיאה',
          ],
          answer: 1,
          explanation: '`setBusyId` ו-`setRows` נקראים לפני ה-`await fetch`. React מרנדר את העדכונים האלה מיד כשה-handler מגיע ל-`await` הראשון, כך שהמשתמש רואה תגובה מיידית. רק אם השרת נכשל, `prevSnapshot` מחזיר את השורה.',
        },
        {
          kind: 'text',
          body: 'להשוואה, הנה עדכון אופטימי אחר באתר — מחיקת משימת ייבוא בטבלת המשימות. הגיבוי שם נשמר אחרת:',
        },
        {
          kind: 'source',
          title: 'deleteJob — גיבוי של כל הטבלה',
          ref: { file: 'components/admin/admin-jobs-table.tsx', start: '// Optimistic remove.', end: 'setRows(prev)' },
          notes: [
            { match: 'const prev = rows', text: 'הגיבוי הוא **כל המערך** כפי שהיה ברגע הלחיצה.' },
            { match: 'setRows(rows.filter(', text: '`.filter` מחזיר מערך חדש בלי השורה — עדכון immutable. כאן משתמשים ב-`rows` מה-closure ולא ב-updater.' },
            { match: 'setRows(prev)', text: 'בכישלון מחזירים את כל המערך הישן.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'בזמן שבקשת ה-DELETE בדרך, ה-polling של הטבלה הביא שורות מעודכנות, ואז ה-DELETE נכשל. מה יקרה?',
          options: [
            'השורה שנמחקה תחזור, והעדכון מה-polling יישמר',
            '`setRows(prev)` ידרוס את הטבלה בגרסה מלפני ה-polling, עד הסבב הבא שלו',
            'React יזרוק שגיאה',
            'השורה לא תחזור',
          ],
          answer: 1,
          explanation: '`prev` הוא תמונת מצב של כל המערך מרגע הלחיצה, ושחזור שלו מוחק כל שינוי שקרה בינתיים. ב-`toggleTier` ה-rollback ממוקד (`prev.map(r => r.id === row.id ? prevSnapshot : r)`) ולכן לא דורס כלום. כאן הנזק קטן — ה-polling מתקן אחרי 5 שניות — אבל זה בדיוק ההבדל בין שתי הגישות.',
        },
        {
          kind: 'exercise',
          prompt: 'כתבו פונקציה `renameUser(row, firstName)` בתוך `AdminUsersTable` שמעדכנת את `firstName` של השורה באופן אופטימי, שולחת `PATCH` ל-`/api/admin/users/<id>` (endpoint דמיוני) עם `{ firstName }` ב-body, ומחזירה **רק את השורה הזו** אם הבקשה נכשלה.',
          hint: 'העתיקו את המבנה של `toggleTier`: snapshot של השורה, `setRows(prev => prev.map(...))`, ואז `try` / `catch` / `finally`. אפשר לזרוק שגיאה כש-`!res.ok` כדי שגם כשל שרת יגיע ל-`catch`.',
          solution: {
            lang: 'tsx',
            code: `async function renameUser(row: AdminUserRow, firstName: string) {
  setError(null)
  setBusyId(row.id)
  const prevSnapshot = row
  setRows(prev => prev.map(r => (r.id === row.id ? { ...r, firstName } : r)))
  try {
    const res = await fetch(\`/api/admin/users/\${row.id}\`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName }),
    })
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`)
  } catch {
    setRows(prev => prev.map(r => (r.id === row.id ? prevSnapshot : r)))
    setError('שינוי השם נכשל. נסה שוב.')
  } finally {
    setBusyId(null)
  }
}`,
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────
    {
      slug: 'react-derived-state',
      title: 'State נגזר: לחשב במקום לסנכרן',
      summary: 'למה `activeTab` לא נשמר ב-state, איך מאפסים state כשה-URL משתנה בלי `useEffect`, ומה עושה `key` על מודאל.',
      minutes: 15,
      blocks: [
        {
          kind: 'text',
          body: `הכלל החשוב ביותר בשיעור הזה: **אם אפשר לחשב ערך מ-props או מ-state קיימים — לא שומרים אותו ב-state.** מחשבים אותו בכל רינדור, כמשתנה רגיל.

כבר ראינו את זה ב-\`LessonQuiz\`: \`answered\` ו-\`correct\` נגזרים מ-\`picked\`. סרגל הטאבים של אזור המנהל עושה את זה בקנה מידה גדול יותר:`,
        },
        {
          kind: 'source',
          title: 'שלושה ערכים נגזרים ב-AdminLayout',
          ref: { file: 'components/admin/admin-layout.tsx', start: 'const activeTab: TabId =', end: 'const showSkeleton = pendingId !== null' },
          notes: [
            { match: "?? 'users'", text: '`activeTab` מחושב מה-URL (`pathname`) בכל רינדור. ה-URL הוא מקור האמת — אין עותק שלו ב-state שיכול "להתיישן".' },
            { match: 'if (pathname !== prevPathname) {', text: 'את הבלוק הזה נפרק בעוד רגע.' },
            { match: 'const highlightId = pendingId ?? activeTab', text: 'הטאב המודגש: אם יש לחיצה שעוד לא הסתיימה — הוא; אחרת הטאב של ה-URL. ה-state היחיד כאן הוא `pendingId`; כל השאר נגזר.' },
            { match: 'const showSkeleton = pendingId !== null', text: 'מציגים skeleton רק כשעוברים לטאב **אחר** מזה שה-URL כבר עליו. זה ה-`showSkeleton` שראינו בשיעור הראשון עוטף את `children`.' },
          ],
        },
        {
          kind: 'compare',
          left: {
            lang: 'tsx',
            title: 'מיותר: state + effect שמסנכרן',
            code: `const [activeTab, setActiveTab] = useState<TabId>('users')

useEffect(() => {
  setActiveTab(
    TABS.find(t => pathname.startsWith(t.href))?.id ?? 'users',
  )
}, [pathname])
// Extra render on every navigation, and one
// render where activeTab is still the old tab`,
          },
          right: {
            lang: 'tsx',
            title: 'כמו בקוד: חישוב בזמן רינדור',
            code: `const activeTab: TabId =
  TABS.find(t => pathname === t.href || pathname.startsWith(t.href + '/'))?.id
  ?? 'users'
// Always in sync with the URL — nothing to sync`,
          },
        },
        {
          kind: 'text',
          body: `אבל לפעמים באמת יש state, והוא צריך **להתאפס** כשמשהו אחר משתנה. \`pendingId\` הוא state אמיתי — הטאב שנלחץ לפני שהניווט הסתיים — ואת זה אי אפשר לחשב מה-URL. כשה-URL משתנה (הניווט הסתיים, או שהמשתמש לחץ Back), צריך לנקות אותו.

האינסטינקט הוא \`useEffect\` על \`[pathname]\`. הקוד בחר דרך אחרת:`,
        },
        {
          kind: 'source',
          title: 'איפוס state בזמן רינדור',
          ref: { file: 'components/admin/admin-layout.tsx', start: '// The route committed (or the user navigated away', lines: 12 },
          notes: [
            { match: 'one frame where the skeleton lingered', text: 'ההערה מסבירה את הסיבה: גרסת ה-effect הייתה מציגה פריים אחד שבו ה-skeleton עדיין מכסה את הדף שכבר הגיע.' },
            { match: 'useState(pathname)', text: 'state שכל תפקידו לזכור מה היה ה-pathname ברינדור הקודם.' },
            { match: 'if (pathname !== prevPathname) {', text: 'בזמן רינדור משווים לערך הקודם. התנאי חיוני: אחרי ה-`set`, ברינדור הבא הם שווים — אז זה רץ פעם אחת בלבד לכל שינוי.' },
            { match: 'setPendingId(null)', text: 'setState **בזמן רינדור** של אותה קומפוננטה: React זורק את ה-JSX של הריצה הנוכחית ומריץ את הפונקציה שוב מיד — לפני שמשהו מוצג על המסך ולפני שהילדים מרונדרים.' },
          ],
        },
        {
          kind: 'compare',
          left: {
            lang: 'tsx',
            title: 'עם effect: פריים אחד ישן',
            code: `useEffect(() => {
  setPendingId(null)
}, [pathname])
// 1. render with the new pathname + stale pendingId
// 2. commit to the screen (skeleton may show)
// 3. effect runs -> setPendingId(null)
// 4. render + commit again`,
          },
          right: {
            lang: 'tsx',
            title: 'בזמן רינדור: אין פריים ישן',
            code: `const [prevPathname, setPrevPathname] = useState(pathname)
if (pathname !== prevPathname) {
  setPrevPathname(pathname)
  setPendingId(null)
}
// React re-runs the component immediately;
// only the corrected result is committed`,
          },
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: 'setState בזמן רינדור מותר **רק** על state של אותה קומפוננטה, ו**רק** בתוך תנאי שמפסיק להתקיים אחרי העדכון. בלי התנאי (`if (pathname !== prevPathname)`), כל רינדור היה מבקש רינדור נוסף ו-React היה עוצר עם "Too many re-renders".',
        },
        {
          kind: 'quiz',
          question: 'מה היה קורה אם **בכלל** לא היינו מאפסים את `pendingId` כשה-pathname משתנה?',
          options: [
            'כלום — `showSkeleton` מחושב מחדש בכל רינדור',
            "אחרי מעבר ל-jobs, `pendingId` היה נשאר `'jobs'`. חזרה עם Back ל-`/admin/users` הייתה משאירה skeleton והדגשה על הטאב הלא נכון, עד לחיצה על טאב אחר",
            'הדף היה קורס',
            'הניווט עצמו היה נכשל',
          ],
          answer: 1,
          explanation: "אחרי Back, `activeTab` הוא `'users'` (נגזר מה-URL) אבל `pendingId` עדיין `'jobs'`. אז `showSkeleton = pendingId !== activeTab` הוא `true`, ו-`highlightId` הוא `'jobs'`. ערך נגזר תמיד מדויק — אבל רק אם ה-state שהוא נגזר ממנו מדויק.",
        },
        {
          kind: 'text',
          body: `שני כלים נוספים מאותו עולם, בטבלת משימות הייבוא:

- **לשמור מזהה, לא עותק.** הטבלה שומרת ב-state את \`selectedId\` בלבד, ואת השורה עצמה גוזרת מ-\`rows\`.
- **\`key\` לאיפוס.** כשה-\`key\` של קומפוננטה משתנה, React זורק את המופע הישן (עם כל ה-state שלו) ויוצר חדש. ב-\`AdminJobDetail\` יש הערה שמסבירה שבזכות זה אין צורך לאפס \`loading\` ו-\`error\` ידנית כשעוברים בין משימות.`,
        },
        {
          kind: 'source',
          title: 'השורה הנבחרת נגזרת מהמזהה',
          ref: { file: 'components/admin/admin-jobs-table.tsx', start: 'const selected = useMemo(' },
          notes: [
            { match: 'rows.find(r => r.id === selectedId)', text: 'בכל פעם ש-`rows` מתעדכן (למשל מה-polling), `selected` מחושב מחדש — המודאל תמיד מציג את הגרסה העדכנית של השורה.' },
            { match: '[rows, selectedId]', text: '`useMemo` שומר את התוצאה ומחשב מחדש רק כשאחד מאלה משתנה. ל-`.find` על 200 שורות זה לא הכרחי — חישוב רגיל היה עובד באותה מידה.' },
          ],
        },
        {
          kind: 'source',
          title: 'key על המודאל',
          ref: { file: 'components/admin/admin-jobs-table.tsx', start: '{selected && (', end: 'onClose={() => setSelectedId(null)}' },
          notes: [
            { match: 'key={selected.id}', text: 'משימה אחרת = `key` אחר = מופע חדש של `AdminJobDetail`, שמתחיל מה-state ההתחלתי שלו (`loading: true`, `detail: null`). בלי ה-`key`, אם הבחירה הייתה מתחלפת כשהמודאל פתוח, React היה משתמש שוב באותו מופע — ועד שהבקשה החדשה חוזרת, הפרטים של המשימה הקודמת היו מוצגים תחת הכותרת של החדשה.' },
            { match: 'summary={selected}', text: 'גם התקציר שהמודאל מקבל נגזר — אם ה-polling שינה את הסטטוס, המודאל רואה את זה.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'למה `AdminJobsTable` שומר ב-state את `selectedId` ולא את אובייקט השורה עצמו?',
          options: [
            'כי אי אפשר לשמור אובייקט ב-state',
            'כי `selected` נגזר מ-`rows` בכל רינדור: כשה-polling מביא נתונים חדשים המודאל מתעדכן, ואם השורה נעלמה `selected` הופך ל-`null` והמודאל לא מוצג',
            'כי מחרוזת תופסת פחות זיכרון',
            'כי `useMemo` לא עובד עם אובייקטים',
          ],
          answer: 1,
          explanation: 'עותק של השורה ב-state היה "קופא" ברגע הלחיצה, ואז היו שני מקורות אמת שיכולים להתפצל. מזהה + גזירה = מקור אמת אחד (`rows`).',
        },
        {
          kind: 'snippet',
          lang: 'tsx',
          title: 'לתרגיל: קומפוננטה שמסנכרנת state בלי צורך',
          code: `function WinRate({ trades }: { trades: { result: string }[] }) {
  const [wins, setWins] = useState(0)
  const [rate, setRate] = useState(0)

  useEffect(() => {
    const w = trades.filter(t => t.result === 'Win').length
    setWins(w)
    setRate(trades.length > 0 ? w / trades.length : 0)
  }, [trades])

  return <span className="font-mono">{wins} ({Math.round(rate * 100)}%)</span>
}`,
        },
        {
          kind: 'exercise',
          prompt: 'שכתבו את `WinRate` מהקטע שמעל בלי `useState` ובלי `useEffect`. מה עוד השתפר חוץ מאורך הקוד?',
          hint: 'שני ה-state הם פונקציה של `trades` בלבד. ותחשבו מה מוצג ברינדור הראשון בגרסה המקורית, לפני שה-effect רץ.',
          solution: {
            lang: 'tsx',
            code: `function WinRate({ trades }: { trades: { result: string }[] }) {
  const wins = trades.filter(t => t.result === 'Win').length
  const rate = trades.length > 0 ? wins / trades.length : 0
  return <span className="font-mono">{wins} ({Math.round(rate * 100)}%)</span>
}

// Also fixed: the original rendered "0 (0%)" first (and in the
// server HTML), then corrected itself after the effect ran.`,
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────
    {
      slug: 'react-effects-polling',
      title: 'useEffect: מאזינים, טיימרים ו-polling',
      summary: 'מתי צריך effect, מה עושה מערך התלויות, למה cleanup קריטי — ואיך טבלת המשימות מתשאלת את השרת רק כשיש משימה פעילה.',
      minutes: 17,
      blocks: [
        {
          kind: 'text',
          body: `\`useEffect\` נועד ל**סנכרון עם משהו מחוץ ל-React**: מאזין על \`document\`, טיימר, בקשת רשת, חיבור. לא לחישוב ערכים — את זה ראינו בשיעור הקודם.

שלושה חלקים:

- **הפונקציה** רצה אחרי שהרינדור הגיע למסך.
- **מערך התלויות** אומר מתי להריץ שוב: React משווה כל ערך לערך מהריצה הקודמת (עם \`Object.is\`), ומריץ שוב רק אם משהו השתנה.
- **cleanup** — הפונקציה שה-effect מחזיר. React מריץ אותה לפני הריצה הבאה של ה-effect, וכשהקומפוננטה יורדת מהמסך.`,
        },
        {
          kind: 'source',
          title: 'Escape סוגר את חנן',
          ref: { file: 'components/chat-sidebar.tsx', start: '// Escape closes the panel', end: '}, [isOpen, toggleChat])' },
          notes: [
            { match: 'if (!isOpen) return', text: 'כשהפאנל סגור לא מאזינים בכלל. `return` בלי פונקציה = אין מה לנקות.' },
            { match: "document.addEventListener('keydown', handle)", text: 'זה ה"עולם החיצוני": `document` לא שייך ל-React, ולכן ההרשמה אליו היא effect.' },
            { match: "return () => document.removeEventListener('keydown', handle)", text: 'ה-cleanup מסיר בדיוק את אותו `handle`. בלעדיו, כל פתיחה של הפאנל הייתה מוסיפה מאזין נוסף שאף פעם לא מוסר.' },
            { match: '}, [isOpen, toggleChat])', text: 'כל מה שה-effect קורא מתוך הקומפוננטה מופיע כאן. כש-`isOpen` מתחלף, ה-cleanup הישן רץ ואז ה-effect החדש.' },
          ],
        },
        {
          kind: 'source',
          title: 'ספירה לאחור אחרי חסימת 429',
          ref: { file: 'components/chat-sidebar.tsx', start: '// Tick once a second while blocked', end: 'const isBlocked =' },
          notes: [
            { match: 'if (blockedUntil == null) return', text: 'טיימר רק כשבאמת חסומים.' },
            { match: 'const id = setInterval(() => {', text: 'ה-callback רואה את `blockedUntil` מהרינדור שבו ה-interval נוצר. זה נכון רק כי `blockedUntil` נמצא בתלויות: אם הוא משתנה, נוצר interval חדש עם הערך החדש.' },
            { match: 'return () => clearInterval(id)', text: 'ה-cleanup עוצר את הטיימר — גם כשהחסימה נגמרת (`blockedUntil` חוזר ל-`null` → ה-effect רץ שוב) וגם אם הקומפוננטה יורדת.' },
            { match: 'const isBlocked', text: 'והערך שהממשק משתמש בו — נגזר, לא state. בדיוק כמו בשיעור הקודם.' },
          ],
        },
        {
          kind: 'snippet',
          lang: 'ts',
          title: 'מה קורה לאורך זמן (תלויות: [blockedUntil])',
          code: `// render, blockedUntil = null       -> effect returns early (nothing to clean up)
// 429 -> setBlockedUntil(t)          -> render -> effect: setInterval #1
// every second: setNow(...)          -> render, deps unchanged -> effect NOT re-run
// t passes: setBlockedUntil(null)    -> render -> cleanup #1 (clearInterval) -> effect returns early
// component unmounts                 -> cleanup of the last run, if there is one`,
        },
        {
          kind: 'text',
          body: `עכשיו ה-effect המעניין ביותר באזור המנהל. טבלת משימות הייבוא צריכה להתעדכן כשמשימה מתקדמת, אבל לתשאל את השרת כל 5 שניות **לנצח** זה בזבוז שקט. ה-AGENTS.md של אזור המנהל אומר במפורש לשמור על התנאי: polling רק כשיש שורה מוצגת שעוד לא הגיעה לסטטוס סופי.

הצעד הראשון הוא ערך נגזר בוליאני:`,
        },
        {
          kind: 'source',
          title: 'האם יש משימה פעילה?',
          ref: { file: 'components/admin/admin-jobs-table.tsx', start: 'const hasNonTerminal = useMemo(' },
          notes: [
            { match: 'filtered.some(r => !TERMINAL_STATUSES.has(r.status))', text: 'בודקים את השורות **המסוננות** — מה שמוצג. אם הסינון מסתיר את המשימה הפעילה, אין טעם לתשאל.' },
            { match: '[filtered]', text: '`filtered` הוא מערך חדש אחרי כל polling, אז `hasNonTerminal` מחושב מחדש — אבל התוצאה היא `true`/`false`, וזה מה שחשוב ל-effect.' },
          ],
        },
        {
          kind: 'source',
          title: 'polling מותנה',
          ref: { file: 'components/admin/admin-jobs-table.tsx', start: '// Smart polling', end: '}, [hasNonTerminal])' },
          notes: [
            { match: 'if (!hasNonTerminal) {', text: 'הכל הגיע לסטטוס סופי: עוצרים ולא מתחילים כלום. (בפועל ה-cleanup של הריצה הקודמת כבר עצר את הטיימר — זו שכבת זהירות.)' },
            { match: 'if (pollTimerRef.current) return', text: 'הטיימר נשמר ב-`useRef` — קופסה שנשמרת בין רינדורים ושינוי שלה **לא** גורם לרינדור. השמירה מונעת שני טיימרים במקביל.' },
            { match: 'if (Array.isArray(json.jobs)) setRows(json.jobs)', text: 'ה-callback רק **כותב** state ולא קורא אותו, ולכן אין בעיית closure ישן. אם כל השורות החדשות סופיות, `hasNonTerminal` יהפוך ל-`false` וה-polling ייעצר מעצמו.' },
            { match: '}, [hasNonTerminal])', text: 'התלות היא בוליאני, לא המערך. בזמן polling `true` נשאר `true`, ו-`Object.is(true, true)` — אז ה-effect **לא** רץ שוב וה-interval לא נבנה מחדש בכל סבב.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'tip',
          body: 'בפיתוח, React (ב-Strict Mode, שפעיל כברירת מחדל ב-App Router) מריץ כל effect, את ה-cleanup שלו, ושוב את ה-effect — מיד בטעינה. זה מכוון: אם ה-cleanup לא מבטל בדיוק את מה שה-effect עשה, תראו את זה מיד (שני טיימרים, מאזין כפול). ה-interval ב-`ChatSidebar` עם `const id` מקומי הוא הצורה הפשוטה; גרסת ה-`useRef` בטבלת המשימות מגיעה לאותה תוצאה עם קצת יותר הגנה.',
        },
        {
          kind: 'quiz',
          question: 'מה היה קורה אם התלות של ה-effect הייתה `[filtered]` במקום `[hasNonTerminal]`?',
          options: [
            'ה-polling היה מפסיק לעבוד',
            'בכל polling `filtered` הוא מערך חדש, אז ה-cleanup היה מוחק את ה-interval וה-effect יוצר אחד חדש — עובד, אבל בונה טיימר מחדש בכל סבב',
            'שום הבדל',
            'React היה זורק שגיאה על מערך בתלויות',
          ],
          answer: 1,
          explanation: '`Object.is` משווה מערכים לפי הפניה, ו-`setRows(json.jobs)` תמיד מביא מערך חדש. הבחירה בבוליאני מצמצמת את ה-effect לשאלה היחידה שמעניינת אותו: "צריך לתשאל או לא?"',
        },
        {
          kind: 'text',
          body: 'סוג אחרון: effect שמביא נתונים. כשהמודאל של משימה נפתח, הוא טוען את הפרטים המלאים. הבעיה הקלאסית: התשובה יכולה להגיע **אחרי** שהמודאל כבר נסגר או התחלף.',
        },
        {
          kind: 'source',
          title: 'fetch עם דגל ביטול',
          ref: { file: 'components/admin/admin-job-detail.tsx', start: 'useEffect(() => {', end: '}, [jobId])' },
          notes: [
            { match: 'let cancelled = false', text: 'משתנה מקומי לכל ריצה של ה-effect. ה-cleanup של **אותה ריצה** יהפוך אותו ל-`true`.' },
            { match: 'if (!cancelled) setDetail(json)', text: 'אם המודאל נסגר בינתיים — מתעלמים מהתשובה במקום לכתוב state לקומפוננטה שכבר לא רלוונטית.' },
            { match: 'cancelled = true', text: 'ה-cleanup לא יכול לעצור את ה-fetch (בשביל זה יש `AbortController`), אבל הוא מבטיח שהתוצאה לא תשמש.' },
            { match: '}, [jobId])', text: 'משימה אחרת → טעינה מחדש. בפועל ה-`key` על המודאל (מהשיעור הקודם) גורם למופע חדש בכל מקרה.' },
          ],
        },
        {
          kind: 'quiz',
          question: "ל-`AdminJobDetail` יש effect של ESC עם התלות `[onClose]`, והטבלה מעבירה `onClose={() => setSelectedId(null)}`. כמה פעמים ה-effect הזה נרשם מחדש כשה-polling פעיל?",
          options: [
            'רק פעם אחת, כשהמודאל נפתח',
            'בכל רינדור של `AdminJobsTable` — למשל כל polling — כי פונקציית חץ בתוך JSX היא פונקציה חדשה בכל רינדור',
            'אף פעם, כי `onClose` לא משתנה',
            'כל שנייה',
          ],
          answer: 1,
          explanation: 'כל רינדור של ההורה יוצר פונקציה חדשה, ו-`Object.is` בין שתי פונקציות שונות הוא `false`. לכן React מריץ cleanup (מסיר מאזין) ומוסיף מאזין חדש. כאן זה לא מזיק — הוספה והסרה של מאזין זולות. כשזה כן משנה, עוטפים את הפונקציה ב-`useCallback`.',
        },
        {
          kind: 'exercise',
          prompt: 'כתבו קומפוננטת לקוח `SyncStatus` שמקבלת `initialStatus` (`\'SYNCING\' | \'OK\' | \'ERROR\'`), ומתשאלת את `/api/ibkr/status` (endpoint דמיוני שמחזיר `{ status }`) כל 5 שניות **רק כל עוד** הסטטוס הוא `SYNCING`. ודאו שאין טיימר שנשאר רץ.',
          hint: 'גזרו בוליאני `syncing` מה-state והשתמשו בו כתלות היחידה. `const id = setInterval(...)` ו-`return () => clearInterval(id)`.',
          solution: {
            lang: 'tsx',
            code: `'use client'

import { useEffect, useState } from 'react'

type Status = 'SYNCING' | 'OK' | 'ERROR'

export function SyncStatus({ initialStatus }: { initialStatus: Status }) {
  const [status, setStatus] = useState<Status>(initialStatus)
  const syncing = status === 'SYNCING'

  useEffect(() => {
    if (!syncing) return
    const id = setInterval(async () => {
      try {
        const res = await fetch('/api/ibkr/status', { cache: 'no-store' })
        if (!res.ok) return
        const json = (await res.json()) as { status: Status }
        setStatus(json.status)
      } catch {
        // transient failure: the next tick retries
      }
    }, 5000)
    return () => clearInterval(id)
  }, [syncing])

  return <span className="font-mono">{status}</span>
}`,
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────
    {
      slug: 'react-external-stores',
      title: 'useSyncExternalStore, hydration ו-localStorage',
      summary: 'למה אי אפשר פשוט לקרוא `localStorage` ברינדור, מה זה hydration mismatch, ואיך ההתקדמות בפלטפורמה הזאת נשמרת ומסתנכרנת בין טאבים.',
      minutes: 17,
      blocks: [
        {
          kind: 'text',
          body: `נזכור משיעור השרת והלקוח: גם קומפוננטת לקוח מרונדרת קודם **בשרת** ל-HTML. אחר כך בדפדפן React מריץ אותה שוב (**hydration**) ומצפה לקבל **בדיוק** את אותו HTML, כדי לחבר event handlers ל-DOM שכבר קיים.

הבעיה: יש מקורות שקיימים רק בדפדפן — \`localStorage\`, \`window\`, cookies דרך \`document.cookie\`, וגם \`Date.now()\` שנותן ערך שונה בשרת ובלקוח. אם הרינדור תלוי בהם, השרת והדפדפן יראו דברים שונים: **hydration mismatch** — אזהרה, ו-React מרנדר את האזור הזה מחדש בצד הלקוח.`,
        },
        {
          kind: 'compare',
          left: {
            lang: 'tsx',
            title: 'נשבר: קריאה ישירה ברינדור',
            code: `// Throws during SSR: localStorage is not defined on the server
const [raw] = useState(() => localStorage.getItem('learn:completed'))

// Guarding with typeof window only moves the problem:
// server renders the fallback, browser renders the stored value
// -> hydration mismatch`,
          },
          right: {
            lang: 'tsx',
            title: 'עובד, אבל עם רינדור מיותר',
            code: `const [raw, setRaw] = useState('[]')
useEffect(() => {
  setRaw(localStorage.getItem('learn:completed') ?? '[]')
}, [])
// Correct, but commits the default first and then
// re-renders — the lint rule react-hooks/set-state-in-effect
// flags exactly this`,
          },
        },
        {
          kind: 'text',
          body: `הכלי ש-React נותן לזה הוא \`useSyncExternalStore\`: hook שמחבר קומפוננטה ל"מאגר" שחי מחוץ ל-React. הוא מקבל שלוש פונקציות:

- \`subscribe(onChange)\` — מתחיל להאזין לשינויים, ומחזיר פונקציה שמפסיקה
- \`getSnapshot()\` — הערך הנוכחי בדפדפן
- \`getServerSnapshot()\` — הערך בשרת **ובזמן ה-hydration**

זה החלק החכם: בזמן ה-hydration React משתמש בערך של השרת — אז ה-HTML תואם — ומיד אחר כך עובר לערך של הדפדפן ומרנדר מחדש אם הוא שונה.

השימוש הכי פשוט באתר הוא "מאגר" שאף פעם לא משתנה:`,
        },
        {
          kind: 'source',
          title: 'useHydrated',
          ref: { file: 'lib/hooks/use-hydrated.ts', start: 'const subscribe = () => () => {}', end: 'return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)' },
          notes: [
            { match: 'const subscribe = () => () => {}', text: 'אין למה להאזין, אז `subscribe` מחזיר פונקציית ביטול ריקה. היא מוגדרת **מחוץ** לקומפוננטה: אם הזהות של `subscribe` משתנה, React נרשם מחדש.' },
            { match: 'const getServerSnapshot = () => false', text: 'בשרת וב-hydration: `false`. בדפדפן אחרי ה-hydration: `true`. זה כל ה-hook.' },
            { match: 'react-hooks/set-state-in-effect', text: 'ההערה מתעדת למה לא הלכו על הדרך "הנאיבית" מההשוואה למעלה.' },
            { match: 'return useSyncExternalStore(', text: 'מי שמשתמש בו מקבל `false` ברינדור הראשון בכל מקום, ולכן חייב לרנדר אז בדיוק את מה שהשרת רינדר.' },
          ],
        },
        {
          kind: 'source',
          title: 'שימוש: קריאת עוגיית ההסכמה',
          ref: { file: 'components/consent/consent-provider.tsx', start: 'const [consent, setConsentState]', end: 'setConsentState(readConsent())' },
          notes: [
            { match: 'useState<ConsentState>(DEFAULT_CONSENT)', text: 'מתחילים מברירת המחדל — מה שהשרת יכול לדעת.' },
            { match: 'if (hydrated && !cookieRead) {', text: 'התבנית משיעור ה-state הנגזר: setState בזמן רינדור, תחת תנאי שרץ פעם אחת. ההערה מעל בקובץ מסבירה שגרסת ה-effect הייתה עלולה להבהב את באנר ההסכמה למי שכבר סגר אותו.' },
            { match: 'setConsentState(readConsent())', text: 'רק עכשיו, בדפדפן ואחרי ה-hydration, קוראים את העוגייה האמיתית.' },
          ],
        },
        {
          kind: 'text',
          body: `עכשיו מאגר אמיתי — **ההתקדמות שלך בפלטפורמה הזאת**. השיעורים שסימנת כהושלמו נשמרים ב-\`localStorage\` (אזור מנהל של משתמש יחיד, אז אין צורך בטבלה), וסימון ה"הושלם" ליד כל שיעור ברשימה מתעדכן ברגע שאתה לוחץ — גם בטאב אחר.`,
        },
        {
          kind: 'source',
          title: 'progress.ts — קריאה והאזנה',
          ref: { file: 'lib/learn/progress.ts', start: 'function readRaw(): string {', lines: 18 },
          notes: [
            { match: "localStorage.getItem(KEY) ?? '[]'", text: 'ה-snapshot הוא המחרוזת הגולמית, לא Set. נראה עוד רגע למה.' },
            { match: '} catch {', text: '`localStorage` יכול לזרוק (חלון גלישה פרטית, חסימת אחסון). במקרה כזה פשוט אין התקדמות — העמוד לא קורס.' },
            { match: "window.addEventListener('storage', onChange)", text: 'האירוע `storage` נורה כשטאב **אחר** של אותו אתר משנה את `localStorage`. בטאב שכתב — הוא לא נורה.' },
            { match: 'window.addEventListener(CHANGE_EVENT, onChange)', text: 'ולכן יש גם אירוע פנימי משלנו, שהטאב הנוכחי שולח לעצמו אחרי כתיבה.' },
          ],
        },
        {
          kind: 'source',
          title: 'progress.ts — ה-hook והכתיבה',
          ref: { file: 'lib/learn/progress.ts', start: 'export function useCompletedLessons()', end: 'window.dispatchEvent(new Event(CHANGE_EVENT))' },
          notes: [
            { match: "useSyncExternalStore(subscribe, readRaw, () => '[]')", text: 'בשרת וב-hydration: "אף שיעור לא הושלם". בדפדפן: מה שבאמת שמור.' },
            { match: 'useMemo(() => new Set(parse(raw)), [raw])', text: 'הופכים את המחרוזת ל-Set רק כשהמחרוזת השתנתה. כך כל רינדור שלא נגע בהתקדמות מקבל את **אותו** Set ולא מפענח JSON מחדש.' },
            { match: 'localStorage.setItem(KEY, JSON.stringify([...next]))', text: 'שומרים מערך (JSON לא יודע לייצג Set ישירות).' },
            { match: 'window.dispatchEvent(new Event(CHANGE_EVENT))', text: 'מודיעים לכל הקומפוננטות בטאב הזה. React קורא ל-`readRaw`, רואה מחרוזת חדשה, ומרנדר מחדש את כל מי שמשתמש ב-hook.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: '`getSnapshot` חייב להחזיר ערך **יציב**: שתי קריאות בלי שינוי צריכות להחזיר ערכים ש-`Object.is` מחשיב שווים. מחרוזת עומדת בזה. אילו `readRaw` היה מחזיר `new Set(...)`, כל קריאה הייתה אובייקט חדש, React היה חושב שהמאגר משתנה כל הזמן — ונכנס ללולאת רינדורים (בפיתוח הוא גם מזהיר שה-snapshot צריך להיות cached). ההערה ב-`useCompletedLessons` אומרת בדיוק את זה.',
        },
        {
          kind: 'source',
          title: 'הכפתור בתחתית השיעור הזה',
          ref: { file: 'components/learn/lesson-progress.tsx', start: 'export function CompleteLessonButton(' },
          notes: [
            { match: 'useCompletedLessons().has(slug)', text: 'אין כאן `useState` בכלל. המאגר **הוא** ה-state, וכל קומפוננטה שקוראת ממנו (הכפתור הזה, `LessonDoneMark` ברשימה, `TrackProgress`) רואה אותו ערך.' },
            { match: 'onClick={() => setLessonCompleted(slug, !done)}', text: 'הכתיבה עוברת דרך המאגר, לא דרך setState. האירוע שהיא שולחת הוא מה שגורם לרינדור.' },
            { match: 'aria-pressed={done}', text: 'כפתור toggle נגיש: קורא מסך מודיע אם הוא "לחוץ".' },
          ],
        },
        {
          kind: 'quiz',
          question: 'למה `subscribe` ב-`progress.ts` מאזין גם ל-`storage` וגם לאירוע `learn:progress-change`?',
          options: [
            'זה כפול ומיותר — אחד מהם היה מספיק',
            '`storage` נורה רק בטאבים **אחרים**, לא בטאב שכתב. `setLessonCompleted` שולח את האירוע הפנימי כדי שגם הטאב הנוכחי יתעדכן',
            '`storage` עובד רק ב-Chrome',
            'האירוע הפנימי נדרש בשביל השרת',
          ],
          answer: 1,
          explanation: 'כל אחד מכסה מקרה אחר: האירוע הפנימי — הטאב שבו לחצת; `storage` — טאב אחר שבו רשימת השיעורים פתוחה. יחד, כל מקום שמציג התקדמות מתעדכן מיד.',
        },
        {
          kind: 'quiz',
          question: 'השיעור הזה כבר מסומן כהושלם. מה הטקסט של `CompleteLessonButton` ב-HTML שהשרת שולח?',
          options: [
            '"הושלם — לחץ לביטול"',
            '"סמן שיעור כהושלם" — ומיד אחרי ה-hydration הכפתור מתחלף ל"הושלם"',
            'הכפתור לא נכלל ב-HTML של השרת',
            'שגיאת hydration',
          ],
          answer: 1,
          explanation: "בשרת ובזמן ה-hydration React משתמש ב-`() => '[]'` — קבוצה ריקה — ולכן ה-HTML תואם בדיוק. אחר כך הוא קורא ל-`readRaw`, מקבל מחרוזת אחרת, ומרנדר מחדש. זה ההבהוב הקטן שאולי שמת לב אליו בטעינה — המחיר של מידע שקיים רק בדפדפן.",
        },
        {
          kind: 'exercise',
          prompt: 'כתבו hook בשם `useLocalStorageFlag(key)` שמחזיר `[value, setValue]` עבור דגל בוליאני ב-`localStorage` (שמור כ-`\'1\'` או `\'0\'`). הוא צריך לעבוד ב-SSR בלי mismatch (ערך שרת: `false`), ולהתעדכן בכל הקומפוננטות — בטאב הנוכחי ובטאבים אחרים.',
          hint: 'העתיקו את המבנה של `progress.ts`: `subscribe` ברמת המודול שמאזין ל-`storage` ולאירוע פנימי, snapshot שהוא המחרוזת הגולמית (או `null`), ו-setter שכותב ושולח את האירוע.',
          solution: {
            lang: 'tsx',
            code: `'use client'

import { useSyncExternalStore } from 'react'

const EVENT = 'local-flag-change'

// Module-level: a stable identity, so React doesn't re-subscribe every render.
function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange)
  window.addEventListener(EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(EVENT, onChange)
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function useLocalStorageFlag(key: string): [boolean, (next: boolean) => void] {
  // The snapshot is a string or null — stable between reads.
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null)

  function setValue(next: boolean) {
    try {
      localStorage.setItem(key, next ? '1' : '0')
    } catch {
      return
    }
    window.dispatchEvent(new Event(EVENT))
  }

  return [raw === '1', setValue]
}`,
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────
    {
      slug: 'react-next-routing',
      title: 'App Router: קבצים, layouts, routes ו-proxy',
      summary: 'איך מבנה התיקיות ב-`app/` הופך ל-URLs: `page`, `layout`, route groups, `[slug]` עם `params` כ-Promise, `loading`, `notFound`, `redirect`, `route.ts` ו-`proxy.ts`.',
      minutes: 18,
      blocks: [
        {
          kind: 'text',
          body: `ב-App Router **מבנה התיקיות הוא הניתוב**. כל תיקייה תחת \`app/\` היא מקטע ב-URL, ושמות קבצים מיוחדים קובעים מה המקטע עושה:

- \`page.tsx\` — הופך את המקטע לכתובת שאפשר לגלוש אליה
- \`layout.tsx\` — עוטף את כל מה שמתחתיו ב-\`children\`, ו**נשאר על המסך** במעבר בין דפים מתחתיו
- \`loading.tsx\` — מה שמוצג בזמן שהדף נטען
- \`route.ts\` — endpoint של API במקום דף
- תיקייה בסוגריים \`(dashboard)\` — **route group**: מארגנת קבצים ומשתפת layout, אבל לא מופיעה ב-URL
- תיקייה בסוגריים מרובעים \`[slug]\` — מקטע דינמי`,
        },
        {
          kind: 'snippet',
          lang: 'bash',
          title: 'חלק מהעץ של האתר, וה-URL של כל קובץ',
          code: `app/
  layout.tsx                    # root layout: <html lang="he" dir="rtl">
  page.tsx                      # /
  not-found.tsx                 # the app-wide 404 page
  (dashboard)/                  # route group: not part of the URL
    layout.tsx                  # session check, Header, ChatSidebar
    loading.tsx                 # fallback for top-level dashboard pages
    settings/page.tsx           # /settings -> redirect('/profile?tab=broker')
    admin/
      layout.tsx                # admin gate + AdminLayout shell
      loading.tsx               # fallback on first entry to /admin/*
      page.tsx                  # /admin -> redirect('/admin/users')
      users/page.tsx            # /admin/users
      learn/[slug]/page.tsx     # /admin/learn/react-next-routing
  api/
    admin/users/[userId]/toggle-tier/route.ts   # POST /api/admin/users/<id>/toggle-tier
proxy.ts                        # runs before matched requests (Next 16 name for middleware)`,
        },
        {
          kind: 'source',
          title: 'ה-layout של כל האפליקציה המחוברת',
          ref: { file: 'app/(dashboard)/layout.tsx', start: 'if (!firstName) {', end: '</ChatContextProvider>' },
          notes: [
            { match: "redirect('/signup')", text: '`redirect` מ-`next/navigation` **זורק** — הקוד שאחריו לא רץ, ו-Next מחזיר הפניה. ב-layout זה אומר שאף דף בקבוצה לא ירונדר למשתמש בלי פרופיל.' },
            { match: '<Header userEmail={user.email} isAdmin={isAdmin} />', text: 'ה-Header נמצא ב-layout, אז הוא לא נבנה מחדש כשעוברים בין תחקור, חיפוש ומנהל — רק ה-`children` מתחלף.' },
            { match: '{children}', text: 'כאן נכנס ה-layout המקונן של `admin` (שראינו בשיעור הראשון), ובתוכו הדף.' },
            { match: '<ChatSidebar isPro={isPro} />', text: 'חנן יושב **מחוץ** ל-div עם `overflow-hidden`, כאח שלו. ה-AGENTS.md מסביר שזה נדרש כדי ש-`position: fixed` ייצמד ל-viewport.' },
          ],
        },
        {
          kind: 'source',
          title: 'מקטע דינמי: דף השיעור',
          ref: { file: 'app/(dashboard)/admin/learn/[slug]/page.tsx', start: "export const dynamic = 'force-dynamic'", end: 'const { track, lesson, index, prev, next } = found' },
          notes: [
            { match: "export const dynamic = 'force-dynamic'", text: 'route segment config: תמיד לרנדר בזמן הבקשה, לא מראש ב-build. ההערה מעל מסבירה — הדף קורא קבצים מהריפו בכל בקשה.' },
            { match: 'params: Promise<{ slug: string }>', text: 'השם `slug` מגיע משם התיקייה `[slug]`. וזה **Promise**, לא אובייקט.' },
            { match: 'const { slug } = await params', text: 'לכן מחכים לו לפני שמשתמשים. עבור השיעור הזה `slug` הוא `react-next-routing`.' },
            { match: 'if (!found) notFound()', text: '`notFound()` גם הוא זורק: Next מציג את ה-`not-found.tsx` הקרוב (כאן — זה של כל האפליקציה) עם סטטוס 404. בגלל שהוא זורק, TypeScript יודע שבשורה הבאה `found` כבר לא `null`.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: 'מדריכים ישנים כותבים `params.slug` ישירות. מ-Next 15 `params` (וגם `searchParams`, `cookies()`, `headers()`) הם אסינכרוניים, ובגרסה 16 שבה האתר רץ הגישה הסינכרונית הוסרה לגמרי. אם AI מציע לך `{ params }: { params: { slug: string } }` — זה קוד של Next 14.',
        },
        {
          kind: 'text',
          body: `\`redirect()\` מופיע באתר גם כדף שלם: \`app/(dashboard)/admin/page.tsx\` לא מציג כלום, רק מפנה ל-\`/admin/users\`, ו-\`settings/page.tsx\` מפנה ל-\`/profile?tab=broker\`. כך URL ישן או "ריק" ממשיך לעבוד.

\`loading.tsx\` הוא דרך קצרה לכתוב גבול **Suspense**: Next עוטף את תוכן המקטע ב-\`<Suspense fallback={<Loading />}>\`, וה-fallback מוצג מיד בזמן שהשרת מרנדר את הדף.`,
        },
        {
          kind: 'source',
          title: 'loading של אזור המנהל',
          ref: { file: 'app/(dashboard)/admin/loading.tsx', start: '// Shown on the first entry into the admin section', lines: 7 },
          notes: [
            { match: "Sibling sub-tab switches don't", text: 'ההערה מתעדת מגבלה שגילו בפועל: במעבר בין טאבים של המנהל, הגבול כבר "נפתר", ו-React משאיר את הדף הקודם על המסך במקום להציג שוב את ה-fallback. בגלל זה `AdminLayout` מנהל `pendingId` משלו — הבלוק שפירקנו בשיעור על state נגזר.' },
            { match: 'return <AdminContentSkeleton />', text: 'אותו skeleton משמש את שני המנגנונים, כך שהמשתמש רואה אותה תמונה בשני המקרים.' },
          ],
        },
        {
          kind: 'text',
          body: `**route handlers**: קובץ \`route.ts\` מייצא פונקציות בשמות של מתודות HTTP — \`GET\`, \`POST\`, \`DELETE\` — במקום קומפוננטה. הן מקבלות \`Request\` ומחזירות \`Response\` (בדרך כלל \`NextResponse.json(...)\`). באותה תיקייה לא יכולים להיות גם \`page.tsx\` וגם \`route.ts\`.

זה ה-endpoint שהכפתור "שדרג ל-Pro" קורא לו:`,
        },
        {
          kind: 'source',
          title: 'POST /api/admin/users/[userId]/toggle-tier',
          ref: { file: 'app/api/admin/users/[userId]/toggle-tier/route.ts', start: 'export async function POST(', end: 'const { userId } = await params' },
          notes: [
            { match: 'export async function POST(', text: 'השם הוא המתודה. `GET` לאותה כתובת היה מקבל 405, כי לא יוצא `GET` מהקובץ.' },
            { match: '{ params }: { params: Promise<{ userId: string }> }', text: 'הארגומנט השני — וגם כאן `params` הוא Promise, בדיוק כמו בדף. השם `userId` מגיע מהתיקייה `[userId]`.' },
            { match: 'if (resp) return resp', text: 'route handler לא מפנה ל-login כמו דף — הוא מחזיר 401 או 403 ב-JSON, כי מי שקורא לו הוא `fetch` ולא דפדפן שגולש.' },
            { match: 'const { userId } = await params', text: 'אחרי זה (לא מוצג) — ולידציה עם zod שזה UUID, ורק אז נגיעה במסד.' },
          ],
        },
        {
          kind: 'text',
          body: `ולבסוף \`proxy.ts\` בשורש הריפו. ב-Next 16 הקובץ שנקרא בעבר \`middleware.ts\` שונה ל-\`proxy.ts\`, והפונקציה המיוצאת נקראת \`proxy\`. **אין \`middleware.ts\` בריפו ואין להוסיף אחד.** הוא רץ לפני כל בקשה שמתאימה ל-\`matcher\` — עוד לפני שמשהו מרונדר — ומחליט אם להמשיך, להפנות או לחסום:`,
        },
        {
          kind: 'source',
          title: 'proxy.ts: משתמש לא מחובר',
          ref: { file: 'proxy.ts', start: '// Unauthenticated: allow landing', end: 'return setSecurityHeaders(NextResponse.redirect(url))' },
          notes: [
            { match: '!user && !isLandingPage', text: 'אין משתמש, והנתיב לא ברשימת הדפים הציבוריים (דף הבית, login, signup, דפי השיווק, ה-webhook של התשלומים...).' },
            { match: "url.pathname = '/login'", text: 'משכפלים את ה-URL ומחליפים רק את הנתיב.' },
            { match: 'NextResponse.redirect(url)', text: 'הפניה (307 כברירת מחדל) — הדף המבוקש לא ירונדר בכלל. ה-`matcher` בסוף הקובץ מחריג קבצים סטטיים ואת `api/cron/`, ולכן routes של cron חייבים בדיקת סוד משלהם.' },
          ],
        },
        {
          kind: 'quiz',
          question: 'באיזה URL מוגש הקובץ `app/(dashboard)/admin/learn/[slug]/page.tsx` עבור השיעור הזה?',
          options: [
            '`/dashboard/admin/learn/react-next-routing`',
            '`/admin/learn/react-next-routing`',
            '`/admin/learn/[slug]`',
            '`/admin/learn?slug=react-next-routing`',
          ],
          answer: 1,
          explanation: '`(dashboard)` הוא route group — הוא לא מופיע ב-URL. `[slug]` מוחלף בערך האמיתי, שמגיע לדף דרך `await params`.',
        },
        {
          kind: 'quiz',
          question: 'משתמש לא מחובר נכנס ל-`/admin/users`. מה עוצר אותו **ראשון**?',
          options: [
            '`requireAdminPage()` בדף',
            'ה-layout של `admin`',
            '`proxy.ts` — הוא רץ לפני כל רינדור ומפנה ל-`/login`',
            'RLS במסד — הטבלה תחזור ריקה',
          ],
          answer: 2,
          explanation: 'ה-proxy רץ ראשון. הבדיקות ב-layout של `(dashboard)`, ב-layout של `admin` ובדף עצמו הן שכבות הגנה נוספות (defense in depth): ה-AGENTS.md של אזור המנהל דורש במפורש שכל דף יבדוק שוב, כדי ששינוי ב-matcher או ב-layout לא יפתח דף בטעות.',
        },
        {
          kind: 'exercise',
          prompt: 'הוסיפו route handler של `GET /api/admin/users/[userId]` שמחזיר `email` ו-`subscriptionTier` של משתמש. באיזה נתיב יושב הקובץ? טפלו ב-`params` כ-Promise, הגנו עליו עם `requireAdmin()` ו-`adminAuthErrorResponse()`, החזירו 400 ל-id שאינו UUID ו-404 כשאין משתמש.',
          hint: 'העתיקו את פתיחת `toggle-tier/route.ts`: אותו `try`/`catch` סביב `requireAdmin()`, אותו `uuidSchema`. הקובץ יושב בתיקייה `[userId]` עצמה, לא בתוך `toggle-tier`.',
          solution: {
            lang: 'ts',
            code: `// app/api/admin/users/[userId]/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, adminAuthErrorResponse } from '@/lib/auth/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    await requireAdmin()
  } catch (err) {
    const resp = adminAuthErrorResponse(err)
    if (resp) return resp
    throw err
  }

  const { userId } = await params
  if (!z.string().uuid().safeParse(userId).success) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
  }

  const { data, error } = await createAdminClient()
    .from('User')
    .select('email, subscriptionTier')
    .eq('id', userId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json(data)
}`,
          },
        },
      ],
    },
  ],
}
