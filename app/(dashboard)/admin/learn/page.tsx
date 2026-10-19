import Link from 'next/link'
import { Clock } from 'lucide-react'
import { requireAdminPage } from '@/lib/auth/require-admin'
import { TRACKS } from '@/lib/learn/curriculum'
import { LessonDoneMark, TrackProgress } from '@/components/learn/lesson-progress'

export default async function AdminLearnPage() {
  await requireAdminPage()

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <header>
        <h1 className="text-xl font-semibold text-text-main">מנהל — למידה</h1>
        <p className="text-sm text-text-dim mt-1">
          סיור מודרך בקוד של האתר: JavaScript, TypeScript, React ו-Python. כל קטע קוד בשיעורים
          נקרא מהריפו בזמן אמת, כך שתמיד רואים את הגרסה הנוכחית. ההתקדמות נשמרת בדפדפן הזה.
        </p>
      </header>

      {TRACKS.map((track, t) => (
        <section key={track.id} className="rounded-md border border-border bg-panel">
          <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-base font-semibold text-text-main">
                <span className="font-mono text-amber me-2" dir="ltr">
                  {t + 1}.
                </span>
                {track.title}
              </h2>
              <p className="text-sm text-text-dim mt-1">{track.description}</p>
            </div>
            <TrackProgress slugs={track.lessons.map(l => l.slug)} />
          </div>
          {track.lessons.length === 0 ? (
            <p className="px-5 py-4 text-sm text-text-mute">אין עדיין שיעורים במסלול הזה.</p>
          ) : (
            <ol>
              {track.lessons.map((lesson, i) => (
                <li key={lesson.slug} className="border-b border-border last:border-b-0">
                  <Link
                    href={`/admin/learn/${lesson.slug}`}
                    className="flex items-start gap-3 px-5 py-3 hover:bg-panel-3 transition-colors"
                  >
                    <span className="mt-0.5">
                      <LessonDoneMark slug={lesson.slug} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-text-main">
                        <span className="font-mono text-text-mute me-2" dir="ltr">
                          {t + 1}.{i + 1}
                        </span>
                        {lesson.title}
                      </span>
                      <span className="block text-xs text-text-mute mt-0.5">{lesson.summary.replace(/`/g, '')}</span>
                    </span>
                    <span className="flex items-center gap-1 text-xs text-text-mute shrink-0">
                      <Clock size={12} aria-hidden="true" />
                      <span className="font-mono">{lesson.minutes}</span> דק׳
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </div>
  )
}
