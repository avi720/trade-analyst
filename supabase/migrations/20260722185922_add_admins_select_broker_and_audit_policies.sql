-- Admin SELECT policies for the broker + audit tables. Same is_admin()
-- SECURITY DEFINER helper as the Users and ExcelImportJob policies —
-- keeps a single source of truth for the admin check across all tables.

DROP POLICY IF EXISTS "admins_select_all_broker_connections" ON "BrokerConnection";
CREATE POLICY "admins_select_all_broker_connections" ON "BrokerConnection"
  FOR SELECT
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "admins_select_all_broker_events" ON "BrokerEvent";
CREATE POLICY "admins_select_all_broker_events" ON "BrokerEvent"
  FOR SELECT
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "admins_select_all_audit_events" ON "AuditEvent";
CREATE POLICY "admins_select_all_audit_events" ON "AuditEvent"
  FOR SELECT
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())));