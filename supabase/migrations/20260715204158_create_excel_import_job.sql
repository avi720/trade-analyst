-- AI Excel Import (Pro) — job queue table + private storage bucket.

CREATE TABLE IF NOT EXISTS "ExcelImportJob" (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"           uuid        NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  status             text        NOT NULL DEFAULT 'PENDING',
    -- PENDING | PARSING | AI_MAPPING | AWAITING_CONFIRMATION | IMPORTING | COMPLETED | FAILED | CANCELLED
  "storagePath"      text        NOT NULL,          -- object name within the 'ai-imports' bucket: '<userId>/<jobId>.xlsx'
  "originalFilename" text        NOT NULL,
  "fileSize"         integer     NOT NULL,
  "sourceTimezone"   text        NOT NULL,          -- IANA, user-selected at upload (never AI-inferred)
  "rowCountRaw"      integer,
  "aiMapping"        jsonb,                          -- { mode, ... , confidence, notes }
  "extractedLegs"    jsonb,                          -- ManualLeg[] preview (post-mapping)
  "parseErrors"      jsonb,                          -- [{ rowIndex, reason }]
  "importSummary"    jsonb,                          -- { processed, skipped, failed, errors }
  "errorMessage"     text,
  "createdAt"        timestamptz NOT NULL DEFAULT now(),
  "updatedAt"        timestamptz NOT NULL DEFAULT now(),
  "completedAt"      timestamptz
);

CREATE INDEX IF NOT EXISTS "ExcelImportJob_userId_createdAt_idx"
  ON "ExcelImportJob" ("userId", "createdAt" DESC);

-- Partial index to make the worker's PENDING claim scan cheap.
CREATE INDEX IF NOT EXISTS "ExcelImportJob_pending_idx"
  ON "ExcelImportJob" ("createdAt") WHERE status = 'PENDING';

-- Keep updatedAt fresh on every write.
CREATE OR REPLACE FUNCTION "excel_import_job_touch_updated_at"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."updatedAt" := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "excel_import_job_set_updated_at" ON "ExcelImportJob";
CREATE TRIGGER "excel_import_job_set_updated_at"
  BEFORE UPDATE ON "ExcelImportJob"
  FOR EACH ROW EXECUTE FUNCTION "excel_import_job_touch_updated_at"();

ALTER TABLE "ExcelImportJob" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "excel_import_job_owner" ON "ExcelImportJob";
CREATE POLICY "excel_import_job_owner" ON "ExcelImportJob"
  FOR ALL USING (auth.uid() = "userId") WITH CHECK (auth.uid() = "userId");

-- Private bucket for uploaded xlsx files.
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-imports', 'ai-imports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS on storage.objects: scope every path to its owning userId prefix.
DROP POLICY IF EXISTS "ai_imports_owner_read" ON storage.objects;
CREATE POLICY "ai_imports_owner_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'ai-imports' AND auth.uid()::text = split_part(name, '/', 1));

DROP POLICY IF EXISTS "ai_imports_owner_write" ON storage.objects;
CREATE POLICY "ai_imports_owner_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ai-imports' AND auth.uid()::text = split_part(name, '/', 1));

DROP POLICY IF EXISTS "ai_imports_owner_delete" ON storage.objects;
CREATE POLICY "ai_imports_owner_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'ai-imports' AND auth.uid()::text = split_part(name, '/', 1));