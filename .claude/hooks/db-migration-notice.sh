#!/usr/bin/env bash
# Guards the migration workflow (see .claude/settings.json and the db-schema skill).
#
# Migrations live as files in supabase/migrations/ and are applied by the Supabase GitHub
# integration: push to `dev` applies them to the dev project, merge to `main` applies them to
# production. Two hooks enforce that deterministically, regardless of how a request is phrased:
#
#   block-apply  PreToolUse on MCP apply_migration — denies it. A version recorded in a
#                database with no matching file in git makes the integration's next deploy
#                fail ("remote migration versions not found in local migrations directory").
#   checklist    PreToolUse on Write|Edit — when the target is under supabase/migrations/,
#                injects the db-schema checklist. Any other path: no output.
#
# Usage: db-migration-notice.sh block-apply|checklist   (hook payload arrives on stdin)
set -euo pipefail

mode="${1:-}"
case "$mode" in
block-apply | checklist) ;;
*)
  echo "usage: ${0##*/} block-apply|checklist" >&2
  exit 1
  ;;
esac

# Emitted via node, not jq: jq is not installed on this machine, and node is guaranteed
# present because this is a Node project. The payload is read from stdin inside node, so no
# quoting reaches a shell parser.
HOOK_MODE="$mode" node -e '
const mode = process.env.HOOK_MODE;
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  if (mode === "block-apply") {
    process.stdout.write(JSON.stringify({
      systemMessage: "db-schema: apply_migration blocked — migrations ship as files",
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          "Schema changes no longer go through apply_migration. Create " +
          "supabase/migrations/<UTC yyyymmddHHMMSS>_<name>.sql, commit and push to dev (the " +
          "GitHub integration applies it to the dev project); merging dev into main applies " +
          "it to production. A version applied directly would exist in the database but not " +
          "in git and break the next integration deploy. Load the db-schema skill.",
      },
    }));
    return;
  }

  let filePath = "";
  try {
    filePath = (JSON.parse(raw).tool_input || {}).file_path || "";
  } catch {
    return;
  }
  if (!/(^|[\\/])supabase[\\/]migrations[\\/][^\\/]+\.sql$/i.test(filePath)) return;

  process.stdout.write(JSON.stringify({
    systemMessage: "db-schema checklist injected before migration file write",
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: `db-schema checklist (full detail: .claude/skills/db-schema/SKILL.md):

0. Never edit a migration that has already been pushed — the integration will not re-run it,
   so the file and the databases silently diverge. Add a new migration instead. A new file
   needs a UTC timestamp later than the newest one in supabase/migrations/.
1. New table? Ship RLS enabled + an auth.uid() = "userId" policy in THIS migration,
   not a follow-up.
2. Admin-wide read? Use the SECURITY DEFINER public.is_admin(uuid) helper. Never an
   inline EXISTS(SELECT ... FROM "User") — that causes infinite policy recursion.
3. Prefer IF NOT EXISTS / IF EXISTS so the migration is idempotent-safe.
4. Do NOT re-add Order columns dropped in cleanup: tax, tradeDate, exchange,
   proceeds, brokerTradeId, rawPayload. The audit trail lives on
   BrokerEvent.rawPayload. Order.broker IS a real column and must stay one.
5. User billing columns are RLS-protected against authenticated-role writes
   (migration harden_user_billing_write_paths) — write them only via
   createAdminClient().
6. Destructive (DROP / rename / new NOT NULL / tighter CHECK)? It must reach main in a
   later release than the code that stops using the old shape.
7. After the push to dev applies it, regenerate lib/db/types.ts from the dev project
   (sssichkbdqariguvqprc) with generate_typescript_types, then npm run build.

If any of the above is unclear for this change, load the db-schema skill before continuing.`,
    },
  }));
});'
