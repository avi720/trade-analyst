# Signup → first trade funnel

PostHog funnel from a new account to the first `Trade` row. Build it as a
**Funnels** insight. Event names below are exact.

People are one person across the funnel because `posthog.identify` is called
with the **Supabase user id** and nothing else — no email, no name. The server
event uses that same id as `distinct_id`, so it joins the person created in the
browser. Anonymous events from before identify (signup page, submit) are merged
by that identify call. `person_profiles` is `identified_only`.

Analytics stays opt-in. Browser events wait until PostHog is initialised after
consent. The server event fires only when the request cookie is an explicit
opt-in, or — when the request has no cookie, which is the IBKR cron — when
`User.settings.analyticsOptIn` is true. That flag is written at
`POST /api/auth/signup-complete` from the consent cookie, and kept in sync by
`POST /api/analytics/consent` after sign-in. Opt-out wins over the stored flag.

## Canonical funnel

Use this one. It includes email signup and Google signup from either `/signup`
or `/login`.

Conversion window: **30 days**. A new user often finishes the profile, leaves,
and imports or connects IBKR later; the first broker sync can be the next
cron run rather than the same session. A 14-day window is the tighter cut if
you only care about the first fortnight.

| Step | Event | Properties | What it means |
|---|---|---|---|
| 1 | `signup_started` | `method`: `email` \| `google` | Supabase account exists. Email: after `signUp` succeeds. Google: after `signInWithIdToken` when `created_at` is under 5 minutes old. |
| 2 | `profile_completed` | `method`: `email` \| `google` | Profile wizard finished (`POST /api/auth/signup-complete`). This is the signup-completed step. The audit row for the same moment is `signup_completed`; PostHog keeps the existing name `profile_completed`. |
| 3 | `onboarding_viewed` | — | Empty research screen ("עוד אין כאן טריידים"). Once per browser tab session. |
| 4 | `import_started` **or** `broker_connected` | `source`: see below | They committed to a way to get a trade in. One funnel step with two events (PostHog "add multiple events"). |
| 5 | `first_trade_created` | `source`: `manual` \| `excel` \| `ai_import` \| `ibkr` | **Server only.** Exactly one per user: the batch that inserts their first `Trade` row. |

Step 4 properties:

| Event | `source` | When |
|---|---|---|
| `import_started` | `manual` | Manual open form or closed-trade form is submitted. |
| `import_started` | `excel` | An Excel file is chosen for preview. |
| `import_started` | `ai_import` | An AI-import upload is sent. |
| `broker_connected` | `ibkr` | IBRIT connect saved the token. |

`first_trade_created.source` is the path that inserted the row: `manual` (open
form, closed form, and `POST /api/trades/manual`), `excel` (template confirm
and the non-preview import), `ai_import` (confirm), `ibkr` (IBRIT sync, Flex
sync, and the legacy Flex connect's first sync). Closed-form entry is
`manual`, not a separate source.

Breakdowns:

- Steps 1–2 by `method` (email vs Google).
- Step 4 and step 5 by `source`.

Filter the insight to events where the person has completed step 1, and do not
put `email_confirmed` in this funnel. Google accounts never emit it, so a
required email-confirm step would drop every Google signup.

## Signup-page funnel

Drop-off **before** the account exists, for people who open `/signup`. Google
signups that start on `/login` are not in this one; they join the canonical
funnel at `signup_started`.

| Step | Event | Properties |
|---|---|---|
| 1 | `signup_viewed` | — |
| 2 | `signup_submitted` | `method`: `email` \| `google` |
| 3 | `signup_started` | `method`: `email` \| `google` |
| 4 | `profile_completed` | `method`: `email` \| `google` |

Then continue with steps 3–5 of the canonical funnel if you want one chart
from the signup page all the way to the trade. Anyone who signed up with
Google from `/login` will be missing from step 1.

`$pageview` still fires for consented users (`capture_pageview: history_change`).
The funnel uses `signup_viewed` so other routes are not the first step.

## Email confirmation (diagnostic, not a required step)

| Event | Properties | When |
|---|---|---|
| `email_confirmed` | `auto: true` when confirmation is off and a session comes back immediately | Account is confirmed: auto-confirm, the "I clicked the link" button, or a return to `/signup` with `email_confirmed_at` set. Once per user per tab session. |

`/signup/verified` does not emit `email_confirmed`. A plain visit is the other
tab of a successful confirm; `reason=exchange_failed` emits
`oauth_callback_failed` instead.

## Other events (not funnel steps)

These were already there, or are side signals. Do not add them as required
funnel steps.

| Event | Role |
|---|---|
| `signup_failed` | `step` (`account` \| `profile`) and `reason` (`email_exists`, `auth_error`, `api_error`, `network`). Where signup breaks. |
| `login_succeeded` | `method`: `email` \| `google`. A returning login, including Google on an account older than 5 minutes. |
| `login_failed` | `reason`. |
| `google_signin_clicked` | `next`. Every Google button click, login and signup. |
| `google_signin_failed` | `next`, `supabaseError`. |
| `oauth_callback_failed` | PKCE exchange failed on the email-confirm redirect. |
| `ai_import_uploaded` | `timezone`. Upload accepted. Finer than `import_started`. |
| `ai_import_mapped` | `mode`. |
| `ai_import_confirmed` | `count`. |
| `ai_import_failed` | Import pipeline error. |
| `first_trade_imported` | **Legacy client event.** Fires on every successful manual, closed-form, Excel, or AI confirm, with `source` `manual_form` \| `closed_form` \| `excel` \| `ai` and sometimes `count`. It is not once-per-user and it never fires for IBKR. The conversion step is `first_trade_created`. |

## What was already instrumented

| Already there | Gap this fills |
|---|---|
| `signup_submitted` `{ method: 'email' }`, `signup_failed`, `signup_started`, `email_confirmed`, `profile_completed` | `signup_viewed`. Google now emits `signup_submitted` `{ method: 'google' }` on `/signup` and `signup_started` `{ method: 'google' }` for a new account from either page. `signup_started` / `profile_completed` carry `method`. `email_confirmed` also fires when a confirmed user lands back on `/signup`, once per tab session. |
| `identifyUser` on the email wizard, plus `AnalyticsIdentity` on every signed-in page (Supabase user id, no traits) | Google success and email login call `identify` before navigation, so the event just captured is on that person. Events that fire before `initPostHog` are queued and flushed on init, identify first, instead of being dropped. |
| `google_signin_clicked` / `google_signin_failed` / `oauth_callback_failed` / `login_failed` | `login_succeeded` for a returning email or Google login. |
| `first_trade_imported` in the browser, on every import, not on IBKR | `first_trade_created` on the server, once per user, with `source`. |
| `ai_import_uploaded` / `mapped` / `confirmed` / `failed` | `import_started` and `broker_connected` so step 4 is one property (`source`) across manual, Excel, AI, and IBKR. |
| Empty research state with no event | `onboarding_viewed`. |

## Once-per-user rule for `first_trade_created`

The event is sent only when all of these are true:

1. The user had **zero** `Trade` rows before this batch.
2. This batch **inserted** at least one Trade (`OPEN`, or a `REVERSAL` that opens a new row). Adding to, reducing, or closing an existing position does not count.
3. After the batch commits, the user's trade count **equals** the number of trades this batch inserted. If a concurrent batch also inserted, both sides see a higher total and neither sends — at most one event. One import or one sync at a time (the normal case) sends exactly one.
4. Analytics opt-in, as above.
5. This server process has not already sent it for that user. A failed send is retried; a successful one is not. The event `uuid` is a pure function of the user id, so PostHog also drops a duplicate delivery.

The capture properties are `{ source }` plus `$insert_id` (a uuid derived from the user id, for PostHog dedupe) and `$geoip_disable: true`, so the Vercel region is not stored as the user's location. No email or name is sent.
