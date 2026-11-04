# Decision: Gemini Interactions API runs stateless (`store: false`), no `previous_interaction_id`

**Status:** decided 2026-11-04, when chat (`lib/chat/gemini-client.ts`) and the AI import
(`lib/trade/ai-import/extract.ts`) moved from `generateContent` / `chats` to
`genAI.interactions.create`.

The Interactions API can keep conversation state on Google's side: each call is stored
(`store` defaults to `true`) and the next turn passes `previous_interaction_id` instead of the
history. We don't use that. Every call sets `store: false` and sends the history itself, as
`user_input` / `model_output` steps built from `AIConversation.messages`. Inside one tool-loop
turn the steps the model returned (thoughts, `function_call`, search steps, with their
signatures) are appended to the input and resent unchanged, which is how stateless mode
carries thought signatures.

## Why

- **Caching is no better stateful.** Measured live on both models with a ~13k-token system
  prompt over three turns: the stateful chain and the stateless resend both hit ~10.2k cached
  tokens (Flash-Lite) / ~11.2k (3.8 Flash) per turn. Only the first stateful call missed; the
  stateless one reused the prefix the stateful run had just warmed. What dominates our
  prompt is the system instruction with the trade context, and that has to be resent every
  turn either way: `system_instruction`, `tools` and `generation_config` are not inherited
  through `previous_interaction_id`. Stateful input also grows faster, because the stored
  chain carries every earlier thought step forward.
- **Retention of user data on a third party.** A stored interaction holds the system
  instruction (the user's trade rows and KPIs) and, on tool turns, the `queryTrades` results,
  which can include the free-text `notes` / `didRight` / `wouldChange` columns. Google keeps
  stored interactions 55 days on the paid tier (1 day on free). Deleting a conversation, or
  an account, in our app would then also have to delete every interaction id it produced. With
  `store: false` nothing outlives the request beyond Google's standard API logging.
- **Multi-user boundary.** Interactions are scoped to the API key's project, which every user
  shares, not to our users. A stored id would be a server-only secret on an RLS-guarded row.
  That works, but it is one more thing that must never reach the client, for no gain.
- **The fallback would have to exist anyway.** Stored ids expire (1 or 55 days), and the user
  can switch Smart ↔ Full mid-conversation, which changes the model. An expired or unusable
  id would have to fall back to resending our history. That makes the stateless path the one
  that must always work, so it is the only one.
- **Our DB stays the only source of truth**, for the UI and for the model. No migration, no
  second copy of the conversation to keep in sync.

## Revisit when

- Google adds explicit caching to Interactions and it needs stored state. It is listed as not
  yet available. Or the `[chat] turn` log shows `cacheHitRatio` collapsing on long
  conversations.
- We start keeping tool results across turns. Today only the text of earlier turns is
  resent, so a follow-up re-queries rather than re-reading earlier tool output. If that turns
  out to cost real quality, storing state is one way to keep it.
