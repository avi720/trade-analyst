-- reverse_position: atomic close of one trade + open of a new opposite-direction trade.
-- Used by FIFO REVERSAL when an execution flips an open position past zero.
-- All five JSONB args are validated by the caller (TS code) and assumed well-formed.
-- Returns JSON: { closed_trade_id, closed_order_id, open_trade_id, open_order_id }
CREATE OR REPLACE FUNCTION public.reverse_position(
  close_trade_id UUID,
  close_update    JSONB,
  close_order     JSONB,
  open_trade      JSONB,
  open_order      JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_closed_order_id UUID;
  v_open_trade_id   UUID;
  v_open_order_id   UUID;
BEGIN
  -- 1. Update the existing trade to Closed state
  UPDATE "Trade" SET
    "status"              = (close_update->>'status'),
    "closedAt"            = (close_update->>'closedAt')::timestamptz,
    "avgExitPrice"        = (close_update->>'avgExitPrice')::numeric,
    "totalQuantity"       = (close_update->>'totalQuantity')::numeric,
    "totalCommission"     = (close_update->>'totalCommission')::numeric,
    "realizedPnl"         = (close_update->>'realizedPnl')::numeric,
    "actualR"             = NULLIF(close_update->>'actualR','')::numeric,
    "result"              = NULLIF(close_update->>'result','')
  WHERE "id" = close_trade_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reverse_position: trade % not found', close_trade_id;
  END IF;

  -- 2. Insert the closing order
  INSERT INTO "Order" (
    "tradeId", "userId", "side", "quantity", "price", "commission",
    "executedAt", "brokerExecId", "brokerOrderId", "rawPayload"
  ) VALUES (
    close_trade_id,
    (close_order->>'userId')::uuid,
    close_order->>'side',
    (close_order->>'quantity')::numeric,
    (close_order->>'price')::numeric,
    (close_order->>'commission')::numeric,
    (close_order->>'executedAt')::timestamptz,
    close_order->>'brokerExecId',
    NULLIF(close_order->>'brokerOrderId',''),
    COALESCE(close_order->'rawPayload', '{}'::jsonb)
  )
  RETURNING "id" INTO v_closed_order_id;

  -- 3. Insert the new opposite-direction trade
  INSERT INTO "Trade" (
    "userId", "ticker", "direction", "status", "setupType",
    "openedAt", "avgEntryPrice", "totalQuantity", "totalQuantityOpened",
    "stopPrice", "totalCommission", "realizedPnl"
  ) VALUES (
    (open_trade->>'userId')::uuid,
    open_trade->>'ticker',
    open_trade->>'direction',
    open_trade->>'status',
    NULLIF(open_trade->>'setupType',''),
    (open_trade->>'openedAt')::timestamptz,
    (open_trade->>'avgEntryPrice')::numeric,
    (open_trade->>'totalQuantity')::numeric,
    (open_trade->>'totalQuantityOpened')::numeric,
    NULLIF(open_trade->>'stopPrice','')::numeric,
    (open_trade->>'totalCommission')::numeric,
    (open_trade->>'realizedPnl')::numeric
  )
  RETURNING "id" INTO v_open_trade_id;

  -- 4. Insert the opening order for the new trade
  INSERT INTO "Order" (
    "tradeId", "userId", "side", "quantity", "price", "commission",
    "executedAt", "brokerExecId", "brokerOrderId", "rawPayload"
  ) VALUES (
    v_open_trade_id,
    (open_order->>'userId')::uuid,
    open_order->>'side',
    (open_order->>'quantity')::numeric,
    (open_order->>'price')::numeric,
    (open_order->>'commission')::numeric,
    (open_order->>'executedAt')::timestamptz,
    open_order->>'brokerExecId',
    NULLIF(open_order->>'brokerOrderId',''),
    COALESCE(open_order->'rawPayload', '{}'::jsonb)
  )
  RETURNING "id" INTO v_open_order_id;

  RETURN jsonb_build_object(
    'closed_trade_id', close_trade_id,
    'closed_order_id', v_closed_order_id,
    'open_trade_id',   v_open_trade_id,
    'open_order_id',   v_open_order_id
  );
END;
$$;