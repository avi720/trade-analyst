-- Admins can SELECT any ExcelImportJob row. Same is_admin(uuid) helper as
-- the Users policy (added in fix_admin_select_policy_recursion) — avoids
-- recursion, keeps a single source of truth for the admin check.
DROP POLICY IF EXISTS "admins_select_all_excel_import_jobs" ON "ExcelImportJob";
CREATE POLICY "admins_select_all_excel_import_jobs" ON "ExcelImportJob"
  FOR SELECT
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())));