
-- 1. Change all child FKs that reference User.id from RESTRICT to CASCADE
ALTER TABLE "AIConversation"   DROP CONSTRAINT "AIConversation_userId_fkey",
  ADD CONSTRAINT "AIConversation_userId_fkey"   FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "BrokerConnection" DROP CONSTRAINT "BrokerConnection_userId_fkey",
  ADD CONSTRAINT "BrokerConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "BrokerEvent"      DROP CONSTRAINT "BrokerEvent_userId_fkey",
  ADD CONSTRAINT "BrokerEvent_userId_fkey"      FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "Order"            DROP CONSTRAINT "Order_userId_fkey",
  ADD CONSTRAINT "Order_userId_fkey"            FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "Trade"            DROP CONSTRAINT "Trade_userId_fkey",
  ADD CONSTRAINT "Trade_userId_fkey"            FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

-- 2. Tie User.id to auth.users.id with cascade. NOT VALID lets us add it
--    without failing on the existing orphan row (id=85019b4f...) which has no auth user.
--    The FK is still enforced for all new INSERT/UPDATE/DELETE operations,
--    including cascade on DELETE from auth.users.
ALTER TABLE "User"
  ADD CONSTRAINT "User_id_fkey"
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
