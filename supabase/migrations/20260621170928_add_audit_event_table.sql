
CREATE TABLE "AuditEvent" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "eventType" text NOT NULL,
  status text NOT NULL,
  metadata jsonb,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "AuditEvent_userId_createdAt_idx"
  ON "AuditEvent" ("userId", "createdAt" DESC);

ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;

-- User can SELECT their own events. INSERT/UPDATE/DELETE go through service-role only
-- (writes happen from server-side helpers; clients never write).
CREATE POLICY "AuditEvent_select_own"
  ON "AuditEvent" FOR SELECT
  USING (auth.uid() = "userId");
