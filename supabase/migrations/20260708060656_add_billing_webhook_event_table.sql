-- X5 (SECURITY-AUDIT-LAUNCH.md): webhook idempotency.
--
-- Lemon Squeezy retries delivery on non-200 responses and can re-deliver the
-- same body on network flakes. Without a per-event dedup, every retry
-- re-executes the DB write. Reads are idempotent on terminal-state fields
-- (subscriptionTier/status/renewsAt — same input → same result) so today's
-- risk is low, but the moment we add analytics events, email notifications,
-- or per-event audit rows, duplicates become a real problem.
--
-- Strategy: use sha256(rawBody) as the effective event id. LS retries send
-- the identical body → identical hash → INSERT hits UNIQUE constraint (23505)
-- → handler short-circuits to 200 ack without re-writing user state.
--
-- Service-role only (webhook handler runs via createAdminClient), so RLS is
-- enabled purely for defense-in-depth — no policies grant anon/authenticated
-- access.

CREATE TABLE public."BillingWebhookEvent" (
  id          UUID        NOT NULL DEFAULT gen_random_uuid(),
  event_id    TEXT        NOT NULL,
  event_name  TEXT        NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY (id),
  CONSTRAINT "BillingWebhookEvent_event_id_key" UNIQUE (event_id)
);

CREATE INDEX "BillingWebhookEvent_received_at_idx"
  ON public."BillingWebhookEvent" (received_at);

ALTER TABLE public."BillingWebhookEvent" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public."BillingWebhookEvent" FROM authenticated, anon;
GRANT SELECT, INSERT ON public."BillingWebhookEvent" TO service_role;