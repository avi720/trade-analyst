# Billing (Lemon Squeezy)

## Single sources — never hardcode elsewhere

- **Prices and the launch-promo end date**: `prices.ts` only. They used to live in four files and
  drifted ($19.99 vs $14.99 shipped in different commits). The numbers there are display copy;
  the charged price is whatever Lemon Squeezy applies.
- **Plan limits** (chat caps): `limits.ts`. It imports nothing, so client components and
  marketing copy can quote the same numbers the routes enforce.
- **`tier.ts` is server-only** — it pulls in the service-role client. Client code imports
  `limits.ts`, never `tier.ts`.

## Which subscription states grant Pro

`grantsPro(status, endsAt)` in `lemon-squeezy.ts` is the single answer. Two owner decisions
shape it — don't "fix" either:

- `past_due` → **Free immediately** (0-day dunning, 2026-07-07). The renewal already failed, so
  there is no paid period left, and LS's 14-day dunning window would otherwise hand out weeks of
  `gemini-2.5-pro` chat for free.
- `cancelled` → **Pro until `ends_at`** (2026-09-14). In LS, cancelled means "won't renew", not
  "access ended"; `subscription_expired` arrives at period end and downgrades.

## Webhook invariants

- Idempotent by `sha256(rawBody)` on a UNIQUE ledger column — duplicates ack 200 without writing.
- Always ack what should not be retried (unknown events, non-UUID ids, orphaned users);
  return 500 only when a retry can succeed. An orphaned subscription is logged with
  `userId: null` (FK to `User`) and the id in metadata.
- With billing env unset, the webhook acks with `billing not configured`.
- The admin Pro/Free toggle writes a fake but coherent `subscriptionStatus` and never touches the
  `lemonsqueezy*Id` columns, so a real webhook can still overwrite it cleanly.
