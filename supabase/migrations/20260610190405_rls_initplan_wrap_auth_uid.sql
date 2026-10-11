-- Wrap auth.uid() in a subselect so the planner treats it as an InitPlan
-- (evaluated once per query instead of per row). Functionally identical;
-- pure query-plan optimization recommended by the Supabase database linter
-- (lint 0003_auth_rls_initplan).
ALTER POLICY ai_conversations_own ON public."AIConversation"
  USING ((select auth.uid()) = "userId");

ALTER POLICY broker_connection_own ON public."BrokerConnection"
  USING ((select auth.uid()) = "userId");

ALTER POLICY broker_events_own ON public."BrokerEvent"
  USING ((select auth.uid()) = "userId");

ALTER POLICY orders_own ON public."Order"
  USING ((select auth.uid()) = "userId");

ALTER POLICY trades_own ON public."Trade"
  USING ((select auth.uid()) = "userId");

ALTER POLICY users_own_row ON public."User"
  USING ((select auth.uid()) = id);