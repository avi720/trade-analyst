-- Billing/subscription mirror columns on User.
-- Lemon Squeezy is the source of truth; we mirror tier + IDs for fast lookup,
-- portal links, and webhook resolution.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "subscriptionTier" text NOT NULL DEFAULT 'Free',
  ADD COLUMN IF NOT EXISTS "lemonsqueezyCustomerId" text,
  ADD COLUMN IF NOT EXISTS "lemonsqueezySubscriptionId" text,
  ADD COLUMN IF NOT EXISTS "subscriptionStatus" text,
  ADD COLUMN IF NOT EXISTS "subscriptionRenewsAt" timestamptz;

ALTER TABLE "User"
  ADD CONSTRAINT "User_subscriptionTier_check"
  CHECK ("subscriptionTier" IN ('Free', 'Pro'));

-- Fast lookup when resolving a webhook event to a user.
CREATE INDEX IF NOT EXISTS "User_lemonsqueezySubscriptionId_idx"
  ON "User" ("lemonsqueezySubscriptionId")
  WHERE "lemonsqueezySubscriptionId" IS NOT NULL;
