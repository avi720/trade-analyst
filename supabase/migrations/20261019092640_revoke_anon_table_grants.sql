-- The anon role (requests without a session) held every privilege, DELETE and TRUNCATE
-- included, on all app tables except BillingWebhookEvent, and SELECT on "User". These came
-- from Supabase's default privileges, not from any decision here, and nothing uses them: the
-- browser queries tables only after login (as authenticated), and audit logging and rate
-- limiting go through the service-role client. RLS was the only thing between the public anon
-- key and every user's data, so a single over-broad policy would have exposed it.
--
-- After this, an anon query against any table fails with 42501 before RLS is consulted.
-- authenticated and service_role are unchanged.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Stop new tables from getting them back. Migrations run as postgres, which owns every table
-- in public, so its default privileges are the ones that apply. supabase_admin's defaults
-- cover only objects supabase_admin creates and cannot be changed from here.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
