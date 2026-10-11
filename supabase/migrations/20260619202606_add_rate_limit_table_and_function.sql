
CREATE TABLE "RateLimit" (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  "windowStart" timestamptz NOT NULL DEFAULT now()
);

-- RLS enabled with NO policies: only service-role bypasses, no client access.
ALTER TABLE "RateLimit" ENABLE ROW LEVEL SECURITY;

-- Atomic rate-limit check: always increments the bucket; resets if the window
-- expired. Returns ok=true while count <= limit, false once it exceeds.
-- A flood of failing attempts does NOT extend the window — count keeps growing
-- but windowStart stays fixed, so the user is locked out for the full duration.
CREATE OR REPLACE FUNCTION rate_limit_check(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) RETURNS TABLE (ok boolean, remaining integer, reset_at timestamptz)
LANGUAGE plpgsql AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
  v_now timestamptz := now();
BEGIN
  INSERT INTO "RateLimit" (key, count, "windowStart")
  VALUES (p_key, 1, v_now)
  ON CONFLICT (key) DO UPDATE
  SET
    count = CASE
      WHEN "RateLimit"."windowStart" < v_now - make_interval(secs => p_window_seconds) THEN 1
      ELSE "RateLimit".count + 1
    END,
    "windowStart" = CASE
      WHEN "RateLimit"."windowStart" < v_now - make_interval(secs => p_window_seconds) THEN v_now
      ELSE "RateLimit"."windowStart"
    END
  RETURNING "RateLimit".count, "RateLimit"."windowStart" INTO v_count, v_window_start;

  RETURN QUERY SELECT
    (v_count <= p_limit)::boolean AS ok,
    GREATEST(p_limit - v_count, 0)::integer AS remaining,
    (v_window_start + make_interval(secs => p_window_seconds))::timestamptz AS reset_at;
END;
$$;
