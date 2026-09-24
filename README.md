# Trade Analyst

יומן מסחר בעברית עם עוזר AI ("חנן"), לסוחרים עצמאיים במניות. הטריידים נכנסים מסנכרון
IBKR, מהזנה ידנית או מייבוא Excel, עוברים התאמת FIFO לפוזיציות, ומנותחים בלוח תחקור
ובצ'אט.

אתר: [tradeanalyst.app](https://tradeanalyst.app)

## מה יש באפליקציה

| לשונית / אזור | מה עושה |
|---|---|
| **תחקור** (`/research`) | מדדים, עקומת הון, התפלגות R, ביצועים לפי setup ותגיות, פילוח לפי יום ושעה — עם סינון |
| **חיפוש** (`/search`) | חיפוש טריידים, עריכת הערות, והוספה / מימוש חלקי / סגירה של פוזיציות ידניות פתוחות |
| **ייבוא-ידני** (`/manual-import`) | הזנת טרייד פתוח או סגור, ייבוא Excel לפי תבנית, וייבוא AI מכל פורמט Excel (Pro) |
| **חנן** | צ'אט על היסטוריית הטריידים (Gemini). מצב Smart לכולם, מצב Full וחיפוש ברשת ב-Pro |
| **פרופיל** (`/profile`) | חשבון, אבטחה, תצוגה, חיבור ברוקר, מנוי, העדפות עוגיות |
| **מנהל** (`/admin`) | למנהלים בלבד: משתמשים, עבודות ייבוא AI, סנכרוני IBKR, בריאות מערכת |

מסלולים: **Free** ו-**Pro**, בחיוב דרך Lemon Squeezy. המחירים מוגדרים ב-`lib/billing/prices.ts`
והמגבלות ב-`lib/billing/limits.ts` — משם הם מוצגים גם באתר.

## Stack

- **Next.js 16** (App Router) + **React 19** + TypeScript, Tailwind CSS, Recharts
- **Supabase** — Postgres עם RLS, Auth (אימייל + Google), Storage. גישה דרך Supabase JS בלבד, בלי ORM
- **Gemini 2.5** (`@google/genai`) — הצ'אט וייבוא ה-AI
- **IBKR Flex Web Service** — סנכרון ביצועים; ה-token מוצפן AES-256-GCM
- **Lemon Squeezy** — מנויים · **Sentry** — שגיאות · **PostHog** — אנליטיקה (רק אחרי הסכמה לעוגיות)
- **Vercel** לאפליקציה, **GitHub Actions** לכל המשימות המתוזמנות
- **Vitest** לבדיקות

## הרצה מקומית

```bash
npm install
cp .env.example .env.local   # ולמלא ערכים
npm run dev                  # http://localhost:3000
```

המינימום להרצה: שלושת משתני Supabase. `GEMINI_API_KEY` נדרש לצ'אט ולייבוא ה-AI,
ו-`FLEX_TOKEN_ENCRYPTION_KEY` לחיבור IBKR. כל משתנה מתועד ב-[.env.example](.env.example);
בלי משתני Lemon Squeezy החיוב פשוט כבוי.

**מסד הנתונים:** אין קבצי migration ב-repo — ההיסטוריה נשמרת בפרויקטי Supabase עצמם
(prod ופרויקט dev נפרד). סביבה חדשה נבנית משחזור היסטוריית ה-migrations של פרויקט קיים.
מקומית כדאי להצביע על פרויקט ה-dev, לא על prod.

### פקודות

| פקודה | מה עושה |
|---|---|
| `npm run dev` | שרת פיתוח |
| `npm run build` | build לפרודקשן — זה גם בדיקת ה-TypeScript |
| `npm run lint` | ESLint |
| `npm run test:run` | כל הבדיקות פעם אחת (`npm run test` למצב watch) |
| `npm run test:run -- __tests__/fifo.test.ts` | קובץ בדיקות בודד |
| `npm run db:seed` | נתוני דוגמה (service-role מתוך `.env.local`) |

**שימו לב:** בדיקות ה-`__tests__/integration/` רצות מול פרויקט ה-Supabase ש-`.env.local`
מצביע עליו, ומדלגות בשקט כשאין `SUPABASE_SERVICE_ROLE_KEY`.

## Deploy

- **Vercel** — מחובר ל-repo. פרודקשן רץ מ-`main`; העבודה השוטפת ב-`dev`. את כל המשתנים
  מ-`.env.example` מגדירים ב-Vercel, כולל `SITE_URL`.
- **`SITE_URL` חייב להיות ה-origin שלא עושה redirect** (`https://tradeanalyst.app`, בלי `www`).
  ערך שמפנה הלאה גורם לכל ה-cron לא לעשות כלום בזמן ש-GitHub Actions נשאר ירוק.
- **Supabase** — אחרי שינוי דומיין לעדכן את Site URL ו-Redirect URLs ב-Authentication →
  URL Configuration. תבניות המיילים: [docs/supabase-email-templates.md](docs/supabase-email-templates.md).

### משימות מתוזמנות (GitHub Actions)

כולן קוראות ל-endpoints תחת `/api/cron/*` עם `CRON_SECRET`. ב-Secrets של ה-repo צריך
`SITE_URL`, `CRON_SECRET` ו-`GEMINI_API_KEY`.

| Workflow | מתי | מה |
|---|---|---|
| IBKR Sync | 13:00 ו-20:00 UTC | סנכרון כל חיבורי IBKR הפעילים |
| AI Import Worker | לפי `repository_dispatch` + כל 30 דקות | עיבוד עבודות ייבוא ה-AI — רץ על ה-runner, לא על Vercel |
| AI Import Watchdog | כל 15 דקות | מכשיל עבודות שנתקעו |
| AI Import Cleanup | 03:00 UTC | מוחק קבצי xlsx ישנים של עבודות שהסתיימו |

סנכרון המחירים (Massive, לשעבר Polygon) כבוי כרגע — הקוד קיים, אין לו workflow.

## תיעוד

- [AGENTS.md](AGENTS.md) — ארכיטקטורה ואינווריאנטים (FIFO, RLS, נתיבי שינוי פוזיציה). נקרא
  גם על ידי סוכני קוד; קבצי `AGENTS.md` נוספים יושבים בתיקיות שצריכות הסבר משלהן
- [docs/RUNBOOK.md](docs/RUNBOOK.md) — נהלי תקלות ותפעול
- [docs/decisions/](docs/decisions/) — דברים שהוחלט במכוון לא לבנות או להשאיר כבויים
- [docs/qa-test-user.md](docs/qa-test-user.md) — משתמש ה-QA ונתוני הבסיס שלו
- [docs/in-progress/](docs/in-progress/) ו-[docs/completed/](docs/completed/) — תוכניות עבודה ואודיטים
