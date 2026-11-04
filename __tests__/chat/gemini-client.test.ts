import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ChatMessage } from '@/lib/chat/gemini-client'

const mockCreate = vi.fn()

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({ interactions: { create: mockCreate } })),
}))

// Import after mock setup
const { callGemini } = await import('@/lib/chat/gemini-client')

const noDelay = async () => {}
const systemPrompt = 'אתה חנן'
const model = 'gemini-3.5-flash-lite' as const

const userStep = (text: string) => ({ type: 'user_input', content: [{ type: 'text', text }] })

describe('callGemini', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-key'
  })

  it('returns response text on success', async () => {
    mockCreate.mockResolvedValueOnce({ output_text: 'שלום' })
    const result = await callGemini([], 'שאלה', systemPrompt, model, { retries: 5, delayFn: noDelay })
    expect(result).toBe('שלום')
  })

  it('returns an empty string when the interaction has no text output', async () => {
    mockCreate.mockResolvedValueOnce({ steps: [] })
    const result = await callGemini([], 'שאלה', systemPrompt, model, { retries: 5, delayFn: noDelay })
    expect(result).toBe('')
  })

  it('retries on 429 and succeeds on second attempt', async () => {
    const err = Object.assign(new Error('429 Too Many Requests'), { status: 429 })
    mockCreate
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce({ output_text: 'תשובה' })
    const result = await callGemini([], 'שאלה', systemPrompt, model, { retries: 1, delayFn: noDelay })
    expect(result).toBe('תשובה')
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })

  it('throws after exhausting all retries', async () => {
    const err = Object.assign(new Error('429'), { status: 429 })
    mockCreate.mockRejectedValue(err)
    await expect(callGemini([], 'שאלה', systemPrompt, model, { retries: 2, delayFn: noDelay }))
      .rejects.toThrow('חנן אינו זמין')
    expect(mockCreate).toHaveBeenCalledTimes(3)
  })

  it('does not retry on non-retryable 400 error', async () => {
    const err = Object.assign(new Error('400 Bad Request'), { status: 400 })
    mockCreate.mockRejectedValueOnce(err)
    await expect(callGemini([], 'שאלה', systemPrompt, model, { retries: 5, delayFn: noDelay }))
      .rejects.toThrow()
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('passes the model name to interactions.create', async () => {
    mockCreate.mockResolvedValueOnce({ output_text: 'ok' })
    await callGemini([], 'שאלה', systemPrompt, 'gemini-3.8-flash', { retries: 5, delayFn: noDelay })
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-3.8-flash' })
    )
  })

  it('retries on 5xx server error', async () => {
    const err = Object.assign(new Error('500 Internal Server Error'), { status: 500 })
    mockCreate
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce({ output_text: 'בסדר' })
    const result = await callGemini([], 'שאלה', systemPrompt, model, { retries: 1, delayFn: noDelay })
    expect(result).toBe('בסדר')
  })

  // Stateless by decision (docs/decisions/gemini-conversation-state.md): our stored history is
  // resent as steps every turn, and nothing is stored on Google's side.
  it('sends the history as steps, statelessly, with the system instruction', async () => {
    mockCreate.mockResolvedValueOnce({ output_text: 'ok' })
    const history: ChatMessage[] = [
      { role: 'user', parts: [{ text: 'שאלה קודמת' }] },
      { role: 'model', parts: [{ text: 'תשובה קודמת' }] },
    ]
    await callGemini(history, 'שאלה חדשה', systemPrompt, model, { retries: 5, delayFn: noDelay })
    const params = mockCreate.mock.calls[0][0]
    expect(params).toEqual({
      model,
      input: [
        userStep('שאלה קודמת'),
        { type: 'model_output', content: [{ type: 'text', text: 'תשובה קודמת' }] },
        userStep('שאלה חדשה'),
      ],
      system_instruction: systemPrompt,
      generation_config: { thinking_level: 'medium' },
      store: false,
    })
    expect(params).not.toHaveProperty('previous_interaction_id')
  })

  it('raises Flash-Lite thinking to medium and leaves 3.8 Flash on its default', async () => {
    mockCreate.mockResolvedValue({ output_text: 'ok' })
    await callGemini([], 'שאלה', systemPrompt, 'gemini-3.8-flash', { retries: 0, delayFn: noDelay })
    expect(mockCreate.mock.calls[0][0].generation_config).toBeUndefined()
  })

  // P1-D — grounding is opt-in per turn; the route offers it only on turns with no tools.
  it('registers no tools when webSearch is off', async () => {
    mockCreate.mockResolvedValueOnce({ output_text: 'ok' })
    await callGemini([], 'שאלה', systemPrompt, model, { retries: 5, delayFn: noDelay, webSearch: false })
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('tools')
  })

  it('defaults webSearch to off when the argument is omitted', async () => {
    mockCreate.mockResolvedValueOnce({ output_text: 'ok' })
    await callGemini([], 'שאלה', systemPrompt, model, { retries: 5, delayFn: noDelay })
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('tools')
  })

  it('registers google_search grounding when webSearch is on', async () => {
    mockCreate.mockResolvedValueOnce({ output_text: 'ok' })
    await callGemini([], 'שאלה', systemPrompt, model, { retries: 5, delayFn: noDelay, webSearch: true })
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ tools: [{ type: 'google_search' }] }),
    )
  })

  // P1-F — the route logs this to check the implicit-caching assumption.
  it('reports token usage to onUsage', async () => {
    mockCreate.mockResolvedValueOnce({
      output_text: 'ok',
      usage: {
        total_input_tokens: 5000,
        total_cached_tokens: 4200,
        total_output_tokens: 90,
        total_tokens: 5400,
        total_thought_tokens: 310,
      },
    })
    const onUsage = vi.fn()
    await callGemini([], 'שאלה', systemPrompt, model, { retries: 5, delayFn: noDelay, onUsage })
    expect(onUsage).toHaveBeenCalledWith({
      promptTokens: 5000,
      cachedTokens: 4200,
      responseTokens: 90,
      totalTokens: 5400,
      thoughtsTokens: 310,
    })
  })

  it('reports zeroed usage when the interaction carries no usage', async () => {
    mockCreate.mockResolvedValueOnce({ output_text: 'ok' })
    const onUsage = vi.fn()
    await callGemini([], 'שאלה', systemPrompt, model, { retries: 5, delayFn: noDelay, onUsage })
    expect(onUsage).toHaveBeenCalledWith(
      expect.objectContaining({ promptTokens: 0, cachedTokens: 0 }),
    )
  })

  it('does not call onUsage when every attempt fails', async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error('500'), { status: 500 }))
    const onUsage = vi.fn()
    await expect(
      callGemini([], 'שאלה', systemPrompt, model, { retries: 1, delayFn: noDelay, onUsage }),
    ).rejects.toThrow()
    expect(onUsage).not.toHaveBeenCalled()
  })
})
