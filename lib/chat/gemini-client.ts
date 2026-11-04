import { GoogleGenAI, type FunctionDeclaration, type Interactions } from '@google/genai'

export type ChatMessage = { role: 'user' | 'model'; parts: [{ text: string }] }

export type GeminiModel = 'gemini-3.5-flash-lite' | 'gemini-3.8-flash'

const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]

type Step = Interactions.Step
type Interaction = Interactions.Interaction
type GenerationConfig = Interactions.GenerationConfig

// One client per process: the SDK logs an "experimental" warning the first time each client
// touches `.interactions`, which a per-turn client would repeat on every chat turn.
let client: GoogleGenAI | undefined
function interactions() {
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  return client.interactions
}

/**
 * Flash-Lite defaults to `minimal` thinking, which is too shallow for analysing a trade set or
 * driving the tool loop — Google's migration guide asks for medium+ there. 3.8 Flash has no
 * `minimal` level and its default already fits, so it is left alone.
 */
function generationConfigFor(model: GeminiModel): GenerationConfig | undefined {
  return model === 'gemini-3.5-flash-lite' ? { thinking_level: 'medium' } : undefined
}

function textStep(type: 'user_input' | 'model_output', text: string): Step {
  return { type, content: [{ type: 'text', text }] }
}

/**
 * Our stored history plus the new message, as Interactions input steps. Every call is
 * stateless (`store: false`, no `previous_interaction_id`): `AIConversation.messages` is the
 * only copy of the conversation — see docs/decisions/gemini-conversation-state.md.
 */
function toSteps(history: ChatMessage[], newMessage: string): Step[] {
  return [
    ...history.map(m => textStep(m.role === 'user' ? 'user_input' : 'model_output', m.parts[0].text)),
    textStep('user_input', newMessage),
  ]
}

/**
 * Token accounting for one chat turn, summed across every round-trip the turn
 * needed (a tool-use turn makes several). `cachedTokens` is the one worth
 * watching: Gemini caches repeated prompt prefixes implicitly at ~90% off, and
 * P1 chose to rely on that rather than build a caching layer — so this number
 * being non-zero across a multi-turn conversation is the evidence that the
 * decision holds.
 */
export interface GeminiUsage {
  promptTokens: number
  cachedTokens: number
  responseTokens: number
  totalTokens: number
  thoughtsTokens: number
}

const ZERO_USAGE: GeminiUsage = {
  promptTokens: 0, cachedTokens: 0, responseTokens: 0, totalTokens: 0, thoughtsTokens: 0,
}

function addUsage(acc: GeminiUsage, result: Interaction): GeminiUsage {
  const u = result.usage
  if (!u) return acc
  return {
    promptTokens: acc.promptTokens + (u.total_input_tokens ?? 0),
    cachedTokens: acc.cachedTokens + (u.total_cached_tokens ?? 0),
    responseTokens: acc.responseTokens + (u.total_output_tokens ?? 0),
    totalTokens: acc.totalTokens + (u.total_tokens ?? 0),
    thoughtsTokens: acc.thoughtsTokens + (u.total_thought_tokens ?? 0),
  }
}

function isRetryable(error: unknown): boolean {
  const anyErr = error as Record<string, unknown>
  if (typeof anyErr.status === 'number') {
    const s = anyErr.status
    return s === 429 || (s >= 500 && s < 600)
  }
  if (error instanceof Error) {
    const msg = error.message
    return msg.includes('429') || msg.includes('rate limit') || msg.includes('quota') ||
      /5\d\d/.test(msg) || error.name === 'FetchError'
  }
  return false
}

export interface CallGeminiOptions {
  retries?: number
  delayFn?: (ms: number) => Promise<void>
  /**
   * P1-D — enable Gemini's native Google Search grounding for this turn.
   *
   * Only ever set for Pro users on a turn with **no custom function tools
   * registered**. The gate dates from Gemini 2.5, which could not serve search
   * and function declarations in one request; 3.x on Interactions can, so it is
   * now a product choice (see `lib/chat/AGENTS.md`). It is tool-call XOR web,
   * not data XOR web — the inline trade rows and KPIs are plain prompt text,
   * so a grounded turn still answers from the user's data.
   */
  webSearch?: boolean
  /** P1-F — receives the turn's token accounting for observability logging. */
  onUsage?: (usage: GeminiUsage) => void
}

export async function callGemini(
  history: ChatMessage[],
  newMessage: string,
  systemPrompt: string,
  model: GeminiModel,
  opts: CallGeminiOptions = {},
): Promise<string> {
  const retries = opts.retries ?? 5
  const delayFn = opts.delayFn ?? (ms => new Promise(r => setTimeout(r, ms)))
  const webSearch = opts.webSearch ?? false

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await interactions().create({
        model,
        input: toSteps(history, newMessage),
        system_instruction: systemPrompt,
        generation_config: generationConfigFor(model),
        ...(webSearch ? { tools: [{ type: 'google_search' }] } : {}),
        store: false,
      })
      opts.onUsage?.(addUsage(ZERO_USAGE, result))
      return result.output_text ?? ''
    } catch (error) {
      console.error(`[gemini] attempt ${attempt + 1} failed:`, error)
      if (attempt === retries || !isRetryable(error)) {
        throw new Error('חנן אינו זמין כרגע. אנא נסה שוב מאוחר יותר.')
      }
      await delayFn(RETRY_DELAYS[attempt])
    }
  }
  throw new Error('חנן אינו זמין כרגע. אנא נסה שוב מאוחר יותר.')
}

/**
 * How many model→tool→model rounds one turn may take before we stop and ask
 * for an answer from what has already been gathered.
 *
 * Six is enough for the realistic worst case the spec calls out — "compare my
 * most recent trades against my oldest" is two `queryTrades` calls plus an
 * aggregation or two. A model that has not converged after six rounds is
 * looping, not working, and each round is a full billed request.
 */
export const MAX_TOOL_ITERATIONS = 6

const OUT_OF_ROUNDS_NUDGE =
  'הגעת למספר המרבי של קריאות כלים לתור הזה. ענה עכשיו על סמך מה שכבר אספת, ' +
  'וציין במפורש בתשובה על איזה היקף נתונים התבססת ומה לא הספקת לבדוק.'

export interface ChatToolRuntime {
  declarations: FunctionDeclaration[]
  execute: (name: string, args: Record<string, unknown>) => Promise<unknown> | unknown
}

/**
 * A `generateContent`-style function declaration as an Interactions function tool. The
 * declarations use the SDK's `Type` enum (`'OBJECT'`, `'STRING'`); Interactions documents
 * lowercase JSON Schema types, so they are lowered here rather than relying on the API
 * accepting both.
 */
function toFunctionTool(d: FunctionDeclaration): Interactions.Tool {
  return { type: 'function', name: d.name, description: d.description, parameters: lowerTypes(d.parameters) }
}

function lowerTypes(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(lowerTypes)
  if (!schema || typeof schema !== 'object') return schema
  return Object.fromEntries(Object.entries(schema).map(([k, v]) =>
    [k, k === 'type' && typeof v === 'string' ? v.toLowerCase() : lowerTypes(v)]))
}

export interface ToolLoopResult {
  text: string
  /** Every tool the model actually invoked, in order — for logging and tests. */
  toolCalls: Array<{ name: string; args: Record<string, unknown> }>
  usage: GeminiUsage
  /** True when the loop hit `MAX_TOOL_ITERATIONS` and had to force an answer. */
  exhausted: boolean
}

/**
 * Runs one chat turn with function-tools registered, driving the
 * model → function_call → function_result → model loop to a text answer.
 *
 * Used only above the inline byte budget (see `context-builder.ts`); below it
 * the rows are already in the prompt and `callGemini` answers in one hop.
 *
 * Stateless like `callGemini`: each round resends the whole turn so far — the
 * history, then every step the model returned (thoughts and calls carry the
 * signatures the 3.x models validate), then our function results.
 *
 * Note for P1-D: no web grounding is registered here. Gemini 2.5 could not
 * combine Search with function declarations; 3.x on Interactions can, so
 * adding it is a product decision, not an API limit.
 */
export async function callGeminiWithTools(
  history: ChatMessage[],
  newMessage: string,
  systemPrompt: string,
  model: GeminiModel,
  tools: ChatToolRuntime,
  opts: {
    maxIterations?: number
    retries?: number
    delayFn?: (ms: number) => Promise<void>
  } = {},
): Promise<ToolLoopResult> {
  const maxIterations = opts.maxIterations ?? MAX_TOOL_ITERATIONS
  const retries = opts.retries ?? 5
  const delayFn = opts.delayFn ?? (ms => new Promise(r => setTimeout(r, ms)))

  const functionTools = tools.declarations.map(toFunctionTool)
  const input = toSteps(history, newMessage)

  async function send(generationConfig = generationConfigFor(model)): Promise<Interaction> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await interactions().create({
          model,
          input: [...input],
          system_instruction: systemPrompt,
          generation_config: generationConfig,
          tools: functionTools,
          store: false,
        })
      } catch (error) {
        console.error(`[gemini:tools] attempt ${attempt + 1} failed:`, error)
        if (attempt === retries || !isRetryable(error)) {
          throw new Error('חנן אינו זמין כרגע. אנא נסה שוב מאוחר יותר.')
        }
        await delayFn(RETRY_DELAYS[attempt])
      }
    }
    throw new Error('חנן אינו זמין כרגע. אנא נסה שוב מאוחר יותר.')
  }

  const toolCalls: ToolLoopResult['toolCalls'] = []
  let usage = ZERO_USAGE

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const result = await send()
    usage = addUsage(usage, result)

    const steps = result.steps ?? []
    const calls = steps.filter((s): s is Interactions.FunctionCallStep => s.type === 'function_call')
    if (calls.length === 0) {
      return { text: result.output_text ?? '', toolCalls, usage, exhausted: false }
    }
    // The model's own steps go back verbatim, signatures included, ahead of our results.
    input.push(...steps)

    for (const call of calls) {
      const name = call.name
      const args = call.arguments ?? {}
      toolCalls.push({ name, args })

      let response: unknown
      try {
        response = await tools.execute(name, args)
      } catch (error) {
        // A failed tool is data the model can route around — surfacing it as a
        // function result beats 500ing the whole turn over one bad argument.
        console.error(`[gemini:tools] executor "${name}" threw:`, error)
        response = { error: error instanceof Error ? error.message : 'tool execution failed' }
      }
      // `call_id` must echo the call's `id`, or the 3.x models reject the result.
      input.push({
        type: 'function_result',
        call_id: call.id,
        name,
        result: [{ type: 'text', text: JSON.stringify({ result: response }) }],
      })
    }
  }

  // Out of rounds with tool results still unanswered. Deliver them alongside the
  // nudge so the final answer is built from everything that was gathered, and
  // switch tool calls off so this last round has to answer in text.
  input.push(textStep('user_input', OUT_OF_ROUNDS_NUDGE))
  const final = await send({ ...generationConfigFor(model), tool_choice: 'none' })
  usage = addUsage(usage, final)
  return {
    text: final.output_text || 'לא הצלחתי להשלים את הניתוח בתוך מספר הצעדים המותר. נסה לצמצם את השאלה.',
    toolCalls,
    usage,
    exhausted: true,
  }
}
