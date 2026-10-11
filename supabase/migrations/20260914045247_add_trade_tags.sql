-- Free-form, multi-valued tags alongside the single structured setupType.
-- Validation (≤10 tags, each 1–20 chars, trimmed/deduped) lives in
-- lib/constants/trade-options.ts; the CHECK is only a backstop on cardinality.
-- No GIN index yet: every tag filter in v1 is in-memory (search, research, chat).
ALTER TABLE public."Trade" ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Trade_tags_max_10') THEN
    ALTER TABLE public."Trade" ADD CONSTRAINT "Trade_tags_max_10" CHECK (cardinality(tags) <= 10);
  END IF;
END $$;

COMMENT ON COLUMN public."Trade".tags IS
  'Free-form user tags (max 10, each max 20 chars). Normalized + validated in lib/constants/trade-options.ts.';