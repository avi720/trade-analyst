"use client";

import { useState, useEffect, useCallback } from "react";
import { IbritConnect } from "./ibrit-connect";
import type { ConnectionStatus } from "./broker-connection";
import { IBRIT_BROKER_NAME } from "@/lib/ibkr/broker-names";
import { ProRequiredBanner } from "@/components/billing/pro-required-banner";
import type { SubscriptionTier } from "@/lib/billing/tier";

const POLL_INTERVAL_MS = 2_000;
// The first sync loads the account's whole history and may run up to the
// connect route's 300s maxDuration.
const POLL_TIMEOUT_MS = 300_000;

async function fetchConnection(): Promise<ConnectionStatus | null> {
  const res = await fetch("/api/ibkr/connection");
  if (!res.ok) return null;
  const json = await res.json();
  return (json.connection as ConnectionStatus | undefined) ?? null;
}

interface TabBrokerProps {
  userTier: SubscriptionTier;
}

export function TabBroker({ userTier }: TabBrokerProps) {
  const [conn, setConn] = useState<ConnectionStatus | null>(null);
  const [firstSyncRunning, setFirstSyncRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchConnection().then((c) => {
      if (!cancelled) setConn(c);
    });
    return () => { cancelled = true; };
  }, []);

  // The connect route clears lastSyncAt; the first background sync writes it.
  useEffect(() => {
    if (!firstSyncRunning) return;
    const startedAt = Date.now();
    const interval = setInterval(async () => {
      const c = await fetchConnection();
      if (c?.lastSyncAt) {
        setConn(c);
        setFirstSyncRunning(false);
      } else if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        setFirstSyncRunning(false);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [firstSyncRunning]);

  const handleConnected = useCallback(() => {
    setFirstSyncRunning(true);
    void fetchConnection().then(setConn);
  }, []);

  // A leftover Flex connection still syncs on the server, but users only see
  // IBRIT: they connect it here and it replaces the Flex one.
  const ibritConn = conn?.brokerName === IBRIT_BROKER_NAME ? conn : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-main">ברוקר — IBKR</h2>
        <p className="text-sm text-text-dim mt-1">חיבור לחשבון Interactive Brokers לסנכרון אוטומטי של הטריידים</p>
      </div>

      {userTier === "Free" && <ProRequiredBanner feature="סנכרון אוטומטי מ-IBKR" />}

      <IbritConnect connection={ibritConn} syncing={firstSyncRunning} onConnected={handleConnected} />
    </div>
  );
}
