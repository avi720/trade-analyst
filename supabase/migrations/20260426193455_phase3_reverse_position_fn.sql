CREATE OR REPLACE FUNCTION reverse_position(
  p_close_trade_id   UUID,
  p_close_status     TEXT,
  p_close_at         TIMESTAMPTZ,
  p_avg_exit_price   NUMERIC,
  p_actual_r         NUMERIC,
  p_result           TEXT,
  p_realized_pnl     NUMERIC,
  p_total_commission NUMERIC,
  p_close_order      JSONB,
  p_new_trade        JSONB,
  p_new_order        JSONB
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- 1. Close the existing trade
  UPDATE "Trade" SET
    status            = p_close_status,
    "closedAt"        = p_close_at,
    "avgExitPrice"    = p_avg_exit_price,
    "actualR"         = p_actual_r,
    result            = p_result,
    "realizedPnl"     = p_realized_pnl,
    "totalQuantity"   = 0,
    "totalCommission" = p_total_commission
  WHERE id = p_close_trade_id;

  -- 2. Insert closing order
  INSERT INTO "Order" SELECT * FROM jsonb_populate_record(null::"Order", p_close_order);

  -- 3. Insert the new (reversed) trade
  INSERT INTO "Trade" SELECT * FROM jsonb_populate_record(null::"Trade", p_new_trade);

  -- 4. Insert opening order for the new trade
  INSERT INTO "Order" SELECT * FROM jsonb_populate_record(null::"Order", p_new_order);
END;
$$;