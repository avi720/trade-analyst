-- Adds three auth-path event types to the AuditEvent CHECK constraint.
--   signup_completed      — profile wizard finished (userId present)
--   oauth_callback_failed — PKCE code->session exchange failed (userId NULL: the
--                           public."User" row does not exist yet, and userId has an
--                           FK to it, so the auth uid rides in metadata instead)
--   auth_callback_no_code — /auth/callback hit with no `code` param (malformed or bot)
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
    'signup_completed'::text,
    'oauth_callback_failed'::text,
    'auth_callback_no_code'::text
  ])
);