-- Enforce the core FIFO invariant at the DB level: at most one Open Trade per
-- (userId, ticker). This converts a concurrent duplicate OPEN (the "orphaned
-- Open rows" bug seen under request pile-ups) into a hard 23505 constraint
-- violation instead of silent data corruption. The application layer catches
-- this and re-matches the execution against the now-existing open position.
CREATE UNIQUE INDEX IF NOT EXISTS "Trade_userId_ticker_open_unique"
ON "Trade" ("userId", ticker)
WHERE status = 'Open';