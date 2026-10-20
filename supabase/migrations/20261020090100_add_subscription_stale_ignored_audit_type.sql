-- Adds `subscription_stale_ignored` to the AuditEvent CHECK constraint: the billing webhook
-- records it when it drops an out-of-order Lemon Squeezy event whose subscription
-- `updated_at` is not newer than the version already applied to the User row
-- (see 20261020090000_add_user_lemonsqueezy_updated_at.sql).
ALTER TABLE public."AuditEvent" DROP CONSTRAINT IF EXISTS audit_event_type_check;

ALTER TABLE public."AuditEvent" ADD CONSTRAINT audit_event_type_check CHECK (
  "eventType" = ANY (ARRAY[
    'password_changed'::text,
    'email_changed'::text,
    'account_deleted'::text,
    'reauth_failed'::text,
    'rate_limit_hit'::text,
    'tier_upgraded'::text,
    'tier_downgraded'::text,
    'subscription_updated'::text,
    'subscription_orphaned'::text,
    'subscription_stale_ignored'::text,
    'signup_completed'::text,
    'oauth_callback_failed'::text,
    'auth_callback_no_code'::text
  ])
);
