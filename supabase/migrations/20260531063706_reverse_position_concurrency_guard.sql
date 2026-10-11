-- Add an optimistic-concurrency guard to the 11-param reverse_position.
-- Same signature (CREATE OR REPLACE) — does NOT introduce a new overload.
-- The close UPDATE only fires if the trade is still Open AND its totalQuantity
-- still matches the quantity the caller computed the reversal against (the
-- closing order's quantity == the open position size in FIFO REVERSAL). If a
-- concurrent REDUCE/CLOSE changed the position first, no row matches and we
-- raise 'reverse_position_conflict', which the caller detects and retries
-- after re-reading the latest position state.
CREATE OR REPLACE FUNCTION public.reverse_position(
  p_close_trade_id uuid,
  p_close_status text,
  p_close_at timestamp with time zone,
  p_avg_exit_price numeric,
  p_actual_r numeric,
  p_result text,
  p_realized_pnl numeric,
  p_total_commission numeric,
  p_close_order jsonb,
  p_new_trade jsonb,
  p_new_order jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- 1. Close the existing trade (guarded against concurrent modification)
  UPDATE "Trade" SET
    status            = p_close_status,
    "closedAt"        = p_close_at,
    "avgExitPrice"    = p_avg_exit_price,
    "actualR"         = p_actual_r,
    result            = p_result,
    "realizedPnl"     = p_realized_pnl,
    "totalQuantity"   = 0,
    "totalCommission" = p_total_commission
  WHERE id = p_close_trade_id
    AND status = 'Open'
    AND "totalQuantity" = (p_close_order->>'quantity')::numeric;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reverse_position_conflict: trade % is not open or its quantity changed', p_close_trade_id;
  END IF;

  -- 2. Insert closing order
  INSERT INTO "Order" SELECT * FROM jsonb_populate_record(null::"Order", p_close_order);

  -- 3. Insert the new (reversed) trade
  INSERT INTO "Trade" SELECT * FROM jsonb_populate_record(null::"Trade", p_new_trade);

  -- 4. Insert opening order for the new trade
  INSERT INTO "Order" SELECT * FROM jsonb_populate_record(null::"Order", p_new_order);
END;
$function$;