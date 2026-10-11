-- X1 (SECURITY-AUDIT-LAUNCH.md): close paywall bypass.
-- Before this migration, `authenticated` and `anon` roles had INSERT+UPDATE on
-- the five billing columns of public."User", so any signed-in user could
-- upgrade themselves to Pro from the browser via a direct Supabase client call:
--   await supabase.from('User').update({ subscriptionTier: 'Pro' }).eq('id', me)
-- The `users_own_row` RLS policy (auth.uid() = id) let it through because it
-- was their own row. Column-level revoke shuts the vector without touching
-- the row-ownership model for legitimate columns (firstName, settings, etc.).
--
-- The service-role admin client (used by /api/billing/webhook and cron jobs)
-- keeps writing normally because service_role bypasses column grants.

REVOKE INSERT, UPDATE ("subscriptionTier", "subscriptionStatus", "subscriptionRenewsAt", "lemonsqueezySubscriptionId", "lemonsqueezyCustomerId")
  ON public."User"
  FROM authenticated, anon;