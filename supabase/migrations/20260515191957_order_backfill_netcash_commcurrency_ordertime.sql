-- 1. netCash + commissionCurrency: straightforward cast from JSONB
UPDATE "Order"
SET
  "netCash" = COALESCE(
    ("rawPayload" ->> 'netCash')::numeric,
    ("rawPayload" ->> 'NetCash')::numeric
  ),
  "commissionCurrency" = COALESCE(
    "rawPayload" ->> 'ibCommissionCurrency',
    "rawPayload" ->> 'CommissionCurrency'
  )
WHERE "netCash" IS NULL OR "commissionCurrency" IS NULL;

-- 2. orderTime: parse "dd/MM/yyyy;HH:mm:ss TZ" → UTC timestamp
--    Mirrors the logic in lib/ibkr/parse-date.ts (manual component parse + timezone offset).
--    camelCase ("orderTime") takes priority; PascalCase ("OrderTime") as fallback.
WITH src AS (
  SELECT
    id,
    COALESCE("rawPayload" ->> 'orderTime', "rawPayload" ->> 'OrderTime') AS raw_ot
  FROM "Order"
  WHERE "orderTime" IS NULL
    AND COALESCE("rawPayload" ->> 'orderTime', "rawPayload" ->> 'OrderTime') IS NOT NULL
),
parts AS (
  SELECT
    id,
    -- date part: everything before the ';'
    split_part(raw_ot, ';', 1)                                         AS d,
    -- time part: between ';' and ' '
    split_part(split_part(raw_ot, ';', 2), ' ', 1)                    AS t,
    -- timezone abbreviation: after the space
    split_part(split_part(raw_ot, ';', 2), ' ', 2)                    AS tz
  FROM src
),
utc_times AS (
  SELECT
    id,
    -- Parse naive local time, then add the UTC offset to shift to UTC.
    -- to_timestamp AT TIME ZONE 'UTC' strips any session-tz interpretation,
    -- giving us the raw numeric value as a plain timestamp. Adding offset hours converts
    -- from IBKR local time to UTC — identical to what parseIbkrDate does in TypeScript.
    to_timestamp(d || ' ' || t, 'DD/MM/YYYY HH24:MI:SS') AT TIME ZONE 'UTC'
    + CASE tz
        WHEN 'EST' THEN INTERVAL '5 hours'
        WHEN 'EDT' THEN INTERVAL '4 hours'
        WHEN 'CST' THEN INTERVAL '6 hours'
        WHEN 'CDT' THEN INTERVAL '5 hours'
        WHEN 'MST' THEN INTERVAL '7 hours'
        WHEN 'MDT' THEN INTERVAL '6 hours'
        WHEN 'PST' THEN INTERVAL '8 hours'
        WHEN 'PDT' THEN INTERVAL '7 hours'
        WHEN 'UTC' THEN INTERVAL '0 hours'
        WHEN 'GMT' THEN INTERVAL '0 hours'
        ELSE NULL
      END AS utc_ts
  FROM parts
)
UPDATE "Order" o
SET "orderTime" = u.utc_ts
FROM utc_times u
WHERE o.id = u.id
  AND u.utc_ts IS NOT NULL;