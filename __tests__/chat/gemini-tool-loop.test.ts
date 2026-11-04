import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({ interactions: { create: mockCreate } })),
  Type: { OBJECT: 'OBJECT', STRING: 'STRING', NUMBER: 'NUMBER', INTEGER: 'INTEGER', ARRAY: 'ARRAY' },
}))

const { Type } = await import('@google/genai')
const { callGeminiWithTools, MAX_TOOL_ITERATIONS } = await import('@/lib/chat/gemini-client')
type ToolExecute = import('@/lib/chat/gemini-client').ChatToolRuntime['execute']

const noDelay = async () => {}
const model = 'gemini-3.8-flash' as const

const declarations = [
  {
    name: 'queryTrades',
    description: 'q',
    parameters: {
      type: Type.OBJECT,
      properties: { fields: { type: Type.ARRAY, items: { type: Type.STRING, enum: ['ticker'] } } },
    },
  },
]

type Step = Record<string, unknown>
type Params = { input: Step[]; tools: unknown; generation_config?: Record<string, unknown> }

function textReply(text: string, usage?: Record<string, number>) {
  return { status: 'completed', output_text: text, steps: [{ type: 'model_output', content: [{ type: 'text', text }] }], usage }
}
function callStep(name: string, args: Record<string, unknown>) {
  return { type: 'function_call', id: `call-${name}`, name, arguments: args }
}
function callReply(name: string, args: Record<string, unknown>, usage?: Record<string, number>) {
  return {
    status: 'requires_action',
    steps: [{ type: 'thought', signature: 'sig-1' }, callStep(name, args)],
    usage,
  }
}
const sent = (n: number) => mockCreate.mock.calls[n][0] as Params
const results = (input: Step[]) => input.filter(s => s.type === 'function_result')
const parsedResult = (step: Step) =>
  JSON.parse((step.result as Array<{ text: string }>)[0].text) as { result: unknown }

function run(
  execute: ToolExecute = async () => ({ rows: [] }),
  opts: { maxIterations?: number; retries?: number } = {},
) {
  return callGeminiWithTools([], 'שאלה', 'אתה חנן', model, { declarations, execute }, {
    delayFn: noDelay, retries: 0, ...opts,
  })
}

describe('callGeminiWithTools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-key'
  })

  it('registers the declarations as function tools, with lowercase JSON Schema types', async () => {
    mockCreate.mockResolvedValueOnce(textReply('שלום'))
    await run()
    expect(sent(0).tools).toEqual([
      {
        type: 'function',
        name: 'queryTrades',
        description: 'q',
        parameters: {
          type: 'object',
          properties: { fields: { type: 'array', items: { type: 'string', enum: ['ticker'] } } },
        },
      },
    ])
    expect(sent(0)).toMatchObject({ store: false, system_instruction: 'אתה חנן' })
  })

  it('raises Flash-Lite thinking to medium and leaves 3.8 Flash on its default', async () => {
    mockCreate.mockResolvedValue(textReply('ok'))
    await run()
    expect(sent(0).generation_config).toBeUndefined()
    await callGeminiWithTools([], 'שאלה', 'אתה חנן', 'gemini-3.5-flash-lite', {
      declarations, execute: async () => ({}),
    }, { delayFn: noDelay, retries: 0 })
    expect(sent(1).generation_config).toEqual({ thinking_level: 'medium' })
  })

  it('returns immediately when the model answers without calling a tool', async () => {
    mockCreate.mockResolvedValueOnce(textReply('תשובה ישירה'))
    const execute = vi.fn()
    const result = await run(execute)
    expect(result.text).toBe('תשובה ישירה')
    expect(result.toolCalls).toEqual([])
    expect(result.exhausted).toBe(false)
    expect(execute).not.toHaveBeenCalled()
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('executes a tool call and resends the turn with the model steps and a function_result', async () => {
    mockCreate
      .mockResolvedValueOnce(callReply('queryTrades', { limit: 20 }))
      .mockResolvedValueOnce(textReply('ניתחתי 20 טריידים'))
    const execute = vi.fn(async () => ({ rows: [{ ticker: 'AAPL' }], matched: 1 }))

    const result = await run(execute)

    expect(execute).toHaveBeenCalledWith('queryTrades', { limit: 20 })
    expect(result.text).toBe('ניתחתי 20 טריידים')
    expect(result.toolCalls).toEqual([{ name: 'queryTrades', args: { limit: 20 } }])

    // Stateless: the second request carries the whole turn — the user message, the model's
    // steps verbatim (the thought signature included), then our result echoing the call id.
    expect(sent(1).input).toEqual([
      { type: 'user_input', content: [{ type: 'text', text: 'שאלה' }] },
      { type: 'thought', signature: 'sig-1' },
      callStep('queryTrades', { limit: 20 }),
      {
        type: 'function_result',
        call_id: 'call-queryTrades',
        name: 'queryTrades',
        result: [{ type: 'text', text: JSON.stringify({ result: { rows: [{ ticker: 'AAPL' }], matched: 1 } }) }],
      },
    ])
    expect(sent(1)).not.toHaveProperty('previous_interaction_id')
  })

  it('drives a multi-call sequence — the "recent vs oldest" shape from the spec', async () => {
    mockCreate
      .mockResolvedValueOnce(callReply('queryTrades', { direction: 'desc', limit: 20 }))
      .mockResolvedValueOnce(callReply('queryTrades', { direction: 'asc', limit: 20 }))
      .mockResolvedValueOnce(textReply('השוויתי 20 אחרונים מול 20 ראשונים מתוך 340'))

    const execute = vi.fn(async () => ({ rows: [], matched: 340 }))
    const result = await run(execute)

    expect(execute).toHaveBeenCalledTimes(2)
    expect(result.toolCalls.map(c => c.args.direction)).toEqual(['desc', 'asc'])
    expect(result.exhausted).toBe(false)
    // Each round accumulates: user + 2×(thought, call, result).
    expect(sent(2).input).toHaveLength(7)
  })

  it('handles several tool calls returned in one model turn', async () => {
    mockCreate
      .mockResolvedValueOnce({
        status: 'requires_action',
        steps: [
          { type: 'function_call', id: 'a', name: 'getSetupBreakdown', arguments: {} },
          { type: 'function_call', id: 'b', name: 'getTickerBreakdown', arguments: { limit: 5 } },
        ],
      })
      .mockResolvedValueOnce(textReply('סיכום'))

    const execute = vi.fn(async (name: string) => ({ tool: name }))
    const result = await run(execute)

    expect(execute).toHaveBeenCalledTimes(2)
    expect(result.toolCalls.map(c => c.name)).toEqual(['getSetupBreakdown', 'getTickerBreakdown'])
    expect(results(sent(1).input).map(s => s.call_id)).toEqual(['a', 'b'])
  })

  it('hands an executor throw back to the model instead of failing the turn', async () => {
    mockCreate
      .mockResolvedValueOnce(callReply('queryTrades', { limit: 9999 }))
      .mockResolvedValueOnce(textReply('התאוששתי'))

    const execute = vi.fn(async () => { throw new Error('bad argument') })
    const result = await run(execute)

    expect(result.text).toBe('התאוששתי')
    const [res] = results(sent(1).input)
    expect(parsedResult(res).result).toEqual({ error: 'bad argument' })
  })

  it('stops after the iteration cap and forces a final answer', async () => {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      mockCreate.mockResolvedValueOnce(callReply('queryTrades', { offset: i }))
    }
    mockCreate.mockResolvedValueOnce(textReply('הנה מה שהספקתי'))

    const result = await run()

    expect(result.exhausted).toBe(true)
    expect(result.toolCalls).toHaveLength(MAX_TOOL_ITERATIONS)
    expect(result.text).toBe('הנה מה שהספקתי')
    expect(mockCreate).toHaveBeenCalledTimes(MAX_TOOL_ITERATIONS + 1)
  })

  it('sends the last pending tool results, then the nudge, with tool calls switched off', async () => {
    for (let i = 0; i < 2; i++) {
      mockCreate.mockResolvedValueOnce(callReply('queryTrades', { offset: i }))
    }
    mockCreate.mockResolvedValueOnce(textReply('סיכום חלקי'))

    await run(vi.fn(async () => ({ rows: ['x'] })), { maxIterations: 2 })

    const final = sent(2)
    expect(results(final.input)).toHaveLength(2)
    const last = final.input.at(-1) as { type: string; content: Array<{ text: string }> }
    expect(final.input.at(-2)).toHaveProperty('type', 'function_result')
    expect(last.type).toBe('user_input')
    expect(last.content[0].text).toContain('ציין במפורש')
    expect(final.generation_config).toEqual({ tool_choice: 'none' })
  })

  it('falls back to a Hebrew message when the forced final answer has no text', async () => {
    mockCreate
      .mockResolvedValueOnce(callReply('queryTrades', {}))
      .mockResolvedValueOnce({ status: 'completed', steps: [] })

    const result = await run(vi.fn(async () => ({})), { maxIterations: 1 })
    expect(result.text).toContain('נסה לצמצם את השאלה')
  })

  it('respects a custom maxIterations', async () => {
    mockCreate
      .mockResolvedValueOnce(callReply('queryTrades', {}))
      .mockResolvedValueOnce(textReply('נאלצתי לעצור'))

    const result = await run(vi.fn(async () => ({})), { maxIterations: 1 })

    expect(result.exhausted).toBe(true)
    expect(result.toolCalls).toHaveLength(1)
  })

  it('sums usage across every round-trip in the turn', async () => {
    mockCreate
      .mockResolvedValueOnce(callReply('queryTrades', {}, {
        total_input_tokens: 1000, total_cached_tokens: 800,
        total_output_tokens: 50, total_tokens: 1050,
      }))
      .mockResolvedValueOnce(textReply('סיום', {
        total_input_tokens: 1200, total_cached_tokens: 900,
        total_output_tokens: 120, total_tokens: 1320,
      }))

    const result = await run()

    expect(result.usage).toEqual({
      promptTokens: 2200,
      cachedTokens: 1700,
      responseTokens: 170,
      totalTokens: 2370,
      thoughtsTokens: 0,
    })
  })

  it('tolerates an interaction with no usage', async () => {
    mockCreate.mockResolvedValueOnce(textReply('שלום'))
    const result = await run()
    expect(result.usage.totalTokens).toBe(0)
  })

  it('retries a 429 inside the loop with the same input and still completes', async () => {
    const err = Object.assign(new Error('429 Too Many Requests'), { status: 429 })
    mockCreate
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce(textReply('אחרי ניסיון חוזר'))

    const result = await callGeminiWithTools(
      [], 'שאלה', 'אתה חנן', model,
      { declarations, execute: vi.fn() },
      { delayFn: noDelay, retries: 1 },
    )
    expect(result.text).toBe('אחרי ניסיון חוזר')
    expect(sent(1).input).toEqual(sent(0).input)
  })

  it('throws the Hebrew user-facing error when retries are exhausted', async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error('500'), { status: 500 }))
    await expect(run()).rejects.toThrow('חנן אינו זמין כרגע')
  })
})
