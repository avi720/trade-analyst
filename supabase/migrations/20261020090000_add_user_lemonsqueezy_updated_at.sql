-- Out-of-order protection for the Lemon Squeezy webhook.
--
-- LS retries and can reorder deliveries, and the sha256(rawBody) ledger only dedupes exact
-- repeats. Without a version on the User row, a delayed `subscription_updated` (active) landing
-- after `subscription_cancelled`/`subscription_expired` re-granted Pro. This column stores the
-- subscription's `data.attributes.updated_at` from the last applied event; the webhook updates
-- the row only when the incoming event is strictly newer (conditional UPDATE, so concurrent
-- deliveries can't race past the check).
--
-- Nullable: existing rows have no applied version yet, and the first event fills it in.
-- No grant needed — authenticated holds only column-scoped INSERT/UPDATE on profile columns
-- (harden_user_billing_write_paths), so a new column is service-role-write-only by default.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "lemonsqueezyUpdatedAt" timestamptz;
