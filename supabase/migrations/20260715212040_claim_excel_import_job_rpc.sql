-- Atomic single-job claim for the AI-import worker. FOR UPDATE SKIP LOCKED
-- lets overlapping GitHub-runner invocations never grab the same job.
CREATE OR REPLACE FUNCTION claim_excel_import_job()
RETURNS SETOF "ExcelImportJob"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE "ExcelImportJob"
  SET status = 'PARSING', "updatedAt" = now()
  WHERE id = (
    SELECT j.id
    FROM "ExcelImportJob" j
    WHERE j.status = 'PENDING'
    ORDER BY j."createdAt"
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING *;
END;
$$;

-- Callable only by the service role (worker proxy uses the service key).
REVOKE ALL ON FUNCTION claim_excel_import_job() FROM PUBLIC;
REVOKE ALL ON FUNCTION claim_excel_import_job() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_excel_import_job() TO service_role;