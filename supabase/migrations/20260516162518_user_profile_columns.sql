ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "firstName"       TEXT,
  ADD COLUMN IF NOT EXISTS "lastName"        TEXT,
  ADD COLUMN IF NOT EXISTS "phone"           TEXT,
  ADD COLUMN IF NOT EXISTS "addressStreet"   TEXT,
  ADD COLUMN IF NOT EXISTS "addressCity"     TEXT,
  ADD COLUMN IF NOT EXISTS "addressCountry"  TEXT;