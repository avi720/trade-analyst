"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Loader2, Mail } from "lucide-react";
import { formatRelativeTime, type ConnectionStatus } from "./broker-connection";

// Login entry points, not deep links: the Third-Party Data Feeds page sits
// behind the Portal login, and a deep link doesn't survive the SSO redirect.
// Interactive Israel clients sign in through IBKR's white-label domain.
const LOGIN_LINKS = [
  { label: "כניסה דרך אינטראקטיב ישראל", href: "https://www.clientam.com/sso/Login?partnerID=Inter_il" },
  { label: "כניסה ישירה ל-IBKR", href: "https://www.interactivebrokers.com/sso/Login" },
];

// Until IBKR ships the self-service listing, a client has to ask for the feed by email.
const REQUEST_FEED_MAILTO =
  "mailto:reportingintegration@interactivebrokers.com" +
  `?subject=${encodeURIComponent("Request: Trade Analyst Web Service feed")}` +
  `&body=${encodeURIComponent(
    "Hello,\n\nPlease enable the Trade Analyst Web Service feed (tradeanalyst-ws) on my account.\n\nAccount number: \n\nThank you",
  )}`;

// Path in the IBKR Portal where the token and query ID are shown.
const PORTAL_PATH = ["Reporting", "Third-Party Reports", "Third-Party Data Feeds", "Trade Analyst (ws)"];

// Set once the final-screen screenshot is added under public/.
const GUIDE_SCREENSHOT: { src: string; alt: string } | null = null;

const inputClass =
  "w-full bg-panel border border-border rounded px-3 py-2 text-sm text-text-main placeholder-text-mute outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber focus-visible:outline-offset-2 focus:border-amber font-mono";

const linkButtonClass =
  "inline-flex items-center gap-2 px-3 py-2 border border-border text-text-main text-sm rounded hover:border-amber transition-colors";

function Guide({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="border border-border rounded-md mb-6">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between p-4 text-right text-sm font-medium text-text-main hover:bg-input-bg transition-colors"
      >
        <span className="flex items-center gap-2 text-amber">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          איך מוצאים את ה-Token וה-Query ID
        </span>
      </button>
      {open && (
        <div className="p-4 border-t border-border space-y-4 text-sm text-text-dim">
          <div>
            <p className="text-text-main font-medium mb-1">שלב 1: בקשת הפעלה מ-IBKR (פעם אחת)</p>
            <p className="mb-2">
              שלחו מייל ל-IBKR עם מספר החשבון שלכם ובקשו להפעיל את שירות Trade Analyst. הם יאשרו במייל
              כשהשירות פעיל, בדרך כלל תוך יום עסקים.
            </p>
            <a href={REQUEST_FEED_MAILTO} className={linkButtonClass}>
              <Mail size={14} />
              פתיחת מייל מוכן ל-IBKR
            </a>
          </div>

          <div>
            <p className="text-text-main font-medium mb-1">שלב 2: כניסה לחשבון IBKR</p>
            <div className="flex flex-wrap gap-2">
              {LOGIN_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkButtonClass}
                >
                  <ExternalLink size={14} />
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-text-main font-medium mb-1">שלב 3: העתקת הפרטים</p>
            <p>בתפריט של ה-Portal:</p>
            <p dir="ltr" className="my-2 font-mono text-xs text-text-main">
              {PORTAL_PATH.join(" → ")}
            </p>
            <p>שם יופיעו ה-Token וה-Query ID. העתיקו אותם לשדות למטה.</p>
            {GUIDE_SCREENSHOT && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={GUIDE_SCREENSHOT.src}
                alt={GUIDE_SCREENSHOT.alt}
                className="mt-3 w-full rounded border border-border"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface IbritConnectProps {
  // The user's connection when it is an IBRIT one, null otherwise.
  connection: ConnectionStatus | null;
  syncing: boolean;
  onConnected: () => void;
}

function SyncStatus({ connection, syncing }: { connection: ConnectionStatus; syncing: boolean }) {
  if (syncing) {
    return (
      <p className="flex items-center gap-2 text-amber">
        <Loader2 size={12} className="animate-spin" />
        טוען את היסטוריית החשבון מ-IBKR...
      </p>
    );
  }
  if (!connection.lastSyncAt) {
    return <p className="text-text-dim">הסנכרון הראשון עוד לא הסתיים</p>;
  }
  const failed = connection.lastSyncStatus === "ERROR";
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-text-dim">סנכרון אחרון</span>
        <span className={failed ? "text-red" : "text-text-main"}>
          {formatRelativeTime(connection.lastSyncAt)}
          {failed ? " · נכשל" : ""}
        </span>
      </div>
      {failed && connection.lastSyncError && (
        <p dir="ltr" className="text-red text-xs font-mono break-words">
          {connection.lastSyncError}
        </p>
      )}
    </div>
  );
}

export function IbritConnect({ connection, syncing, onConnected }: IbritConnectProps) {
  // null until the user toggles it: open for a new user, closed once connected.
  // The connection loads after mount, so this can't be a one-time initial value.
  const [guideToggled, setGuideToggled] = useState<boolean | null>(null);
  const guideOpen = guideToggled ?? !connection;
  const [token, setToken] = useState("");
  const [queryId, setQueryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmedToken = token.trim();
    const trimmedQueryId = queryId.trim();
    if (!trimmedToken || !trimmedQueryId) {
      setError("יש למלא גם Token וגם Query ID");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/ibkr/ibrit/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: trimmedToken, queryId: trimmedQueryId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "החיבור נכשל, נסו שוב");
        return;
      }
      setSaved(true);
      setToken("");
      setQueryId("");
      setGuideToggled(false);
      onConnected();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel p-6">
      <h3 className="text-sm font-medium text-text-main mb-1">חיבור דרך שירות Trade Analyst ב-IBKR</h3>
      <p className="text-sm text-text-dim mb-4">
        מדביקים פעם אחת Token ו-Query ID, ומאז הטריידים מסתנכרנים לבד כל בוקר, כולל כל ההיסטוריה של
        החשבון.
      </p>

      <Guide open={guideOpen} onToggle={() => setGuideToggled(!guideOpen)} />

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label htmlFor="ibrit-token" className="block text-sm text-text-dim mb-1">
            Token
          </label>
          <input
            id="ibrit-token"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={connection ? "••••••••  (להחלפה הדביקו Token חדש)" : "הדביקו את ה-Token כאן"}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="ibrit-query-id" className="block text-sm text-text-dim mb-1">
            Query ID
          </label>
          <input
            id="ibrit-query-id"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={queryId}
            onChange={(e) => setQueryId(e.target.value)}
            placeholder="123456"
            className={inputClass}
          />
        </div>

        {error && (
          <p role="alert" className="text-red text-sm">
            {error}
          </p>
        )}
        {saved && <p className="text-text-main text-sm">החשבון חובר. הסנכרון הראשון יתחיל בקרוב.</p>}

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-amber text-black text-sm font-medium rounded hover:bg-amber-dark disabled:opacity-50 transition-colors"
        >
          {saving ? "בודק מול IBKR..." : connection ? "עדכון" : "חיבור"}
        </button>
      </form>

      {connection && (
        <div className="mt-6 pt-4 border-t border-border text-sm">
          <SyncStatus connection={connection} syncing={syncing} />
        </div>
      )}
    </div>
  );
}
