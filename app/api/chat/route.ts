import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { MEDHA_BASE_PROMPT, TONE_MODIFIERS, TYPE_MODIFIERS, OPENROUTER_FALLBACK_MODELS } from '@/lib/constants'
import { buildSystemPrompt, routeToFaculty } from '@/lib/utils'
import type { ChatRequest, FacultyId } from '@/types'

export const runtime = 'edge'

const enc = new TextEncoder()
const sse = (data: object) => enc.encode(`data: ${JSON.stringify(data)}\n\n`)
const sseDone = () => enc.encode('data: [DONE]\n\n')

// ─── Token Budget System ──────────────────────────────────────────────────────
// Each faculty has a daily token limit. When exhausted it auto-kills
// and cascades to the next best faculty for that query type.
// Limits are set via env vars — defaults are conservative free-tier values.

const DEFAULT_DAILY_LIMITS: Record<FacultyId, number> = {
  svayam:  0,       // routing only — no tokens consumed
  prajna:  50000,   // GPT-4o — expensive, conservative limit
  dhyana:  80000,   // Claude — generous
  aksaya:  100000,  // Gemini via OpenRouter
  java:    200000,  // Groq — free tier, very generous
  sancara: 150000,  // OpenRouter — flexible
}

// Cascade order per faculty when it exhausts budget
// "which consciousness takes over when this one sleeps?"
const CASCADE_ORDER: Record<FacultyId, FacultyId[]> = {
  svayam:  ['dhyana', 'prajna', 'java', 'aksaya', 'sancara'],
  prajna:  ['dhyana', 'aksaya', 'java', 'sancara'],
  dhyana:  ['prajna', 'aksaya', 'java', 'sancara'],
  aksaya:  ['java', 'sancara', 'dhyana', 'prajna'],
  java:    ['sancara', 'aksaya', 'dhyana', 'prajna'],
  sancara: ['java', 'aksaya', 'dhyana', 'prajna'],
}

// In-memory token counters (resets on cold start / per edge instance)
// For production use KV store — this handles most cases well
const tokenCounters: Map<string, { used: number; resetAt: number }> = new Map()

function getDailyLimit(faculty: FacultyId): number {
  const envKey = `MEDHA_LIMIT_${faculty.toUpperCase()}`
  const envVal = process.env[envKey]
  if (envVal) return parseInt(envVal, 10)
  return DEFAULT_DAILY_LIMITS[faculty]
}

function getCounter(faculty: FacultyId): { used: number; resetAt: number } {
  const now = Date.now()
  const dayMs = 86_400_000
  let counter = tokenCounters.get(faculty)
  if (!counter || now > counter.resetAt) {
    counter = { used: 0, resetAt: now + dayMs }
    tokenCounters.set(faculty, counter)
  }
  return counter
}

function recordTokens(faculty: FacultyId, tokens: number) {
  const counter = getCounter(faculty)
  counter.used += tokens
}

function isBudgetExhausted(faculty: FacultyId): boolean {
  if (faculty === 'svayam') return false
  const limit = getDailyLimit(faculty)
  if (limit === 0) return false // 0 = unlimited
  const counter = getCounter(faculty)
  return counter.used >= limit
}

function getBudgetStatus(faculty: FacultyId): { used: number; limit: number; pct: number } {
  const limit = getDailyLimit(faculty)
  const counter = getCounter(faculty)
  return { used: counter.used, limit, pct: limit > 0 ? Math.round((counter.used / limit) * 100) : 0 }
}

// ─── Manual Kill Switches ─────────────────────────────────────────────────────

function isManuallyKilled(faculty?: FacultyId): boolean {
  if (process.env.MEDHA_KILL_ALL === 'true') return true
  if (faculty) return process.env[`MEDHA_KILL_${faculty.toUpperCase()}`] === 'true'
  return false
}

function isFacultyAvailable(faculty: FacultyId): boolean {
  if (faculty === 'svayam') return true
  if (isManuallyKilled(faculty)) return false
  if (isBudgetExhausted(faculty)) return false
  // Check if API key exists
  switch (faculty) {
    case 'prajna':  return !!process.env.OPENAI_API_KEY
    case 'dhyana':  return !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY)
    case 'aksaya':  return !!process.env.OPENROUTER_API_KEY
    case 'java':    return !!process.env.GROQ_API_KEY
    case 'sancara': return !!process.env.OPENROUTER_API_KEY
    default:        return false
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPrompt(req: ChatRequest): string {
  return buildSystemPrompt(
    MEDHA_BASE_PROMPT,
    req.settings.responseTone,
    req.settings.responseType,
    req.settings.systemInstructions,
    TONE_MODIFIERS,
    TYPE_MODIFIERS
  )
}

function openaiClient(apiKey: string, baseURL?: string, headers?: Record<string, string>) {
  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
    ...(headers ? { defaultHeaders: headers } : {}),
  })
}

// Rough token estimator — 1 token ≈ 4 chars
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

async function streamFaculty(
  faculty: FacultyId,
  systemPrompt: string,
  messages: ChatRequest['messages'],
  controller: ReadableStreamDefaultController
): Promise<boolean> {
  if (!isFacultyAvailable(faculty)) return false

  let totalTokens = 0

  try {
    switch (faculty) {
      case 'prajna': {
        const client = openaiClient(process.env.OPENAI_API_KEY!)
        const stream = await client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          stream: true,
          max_tokens: 1024,
          temperature: 0.7,
        })
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content
          if (delta) {
            controller.enqueue(sse({ content: delta }))
            totalTokens += estimateTokens(delta)
          }
        }
        recordTokens(faculty, totalTokens)
        return true
      }

      case 'dhyana': {
        const key = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY!
        const baseURL = process.env.ANTHROPIC_API_KEY ? 'https://api.anthropic.com/v1' : undefined
        const headers = process.env.ANTHROPIC_API_KEY
          ? { 'anthropic-version': '2023-06-01', 'anthropic-beta': 'messages-2023-12-15' }
          : undefined
        const model = process.env.ANTHROPIC_API_KEY ? 'claude-sonnet-4-20250514' : 'gpt-4o'
        const client = openaiClient(key, baseURL, headers)
        const stream = await client.chat.completions.create({
          model,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          stream: true,
          max_tokens: 1024,
          temperature: 0.7,
        })
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content
          if (delta) {
            controller.enqueue(sse({ content: delta }))
            totalTokens += estimateTokens(delta)
          }
        }
        recordTokens(faculty, totalTokens)
        return true
      }

      case 'aksaya': {
        const client = openaiClient(
          process.env.OPENROUTER_API_KEY!,
          'https://openrouter.ai/api/v1',
          { 'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://medha.ai', 'X-Title': 'MEDHĀ' }
        )
        const stream = await client.chat.completions.create({
          model: 'google/gemini-pro-1.5',
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          stream: true,
          max_tokens: 1024,
        })
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content
          if (delta) {
            controller.enqueue(sse({ content: delta }))
            totalTokens += estimateTokens(delta)
          }
        }
        recordTokens(faculty, totalTokens)
        return true
      }

      case 'java': {
        const client = openaiClient(process.env.GROQ_API_KEY!, 'https://api.groq.com/openai/v1')
        const stream = await client.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          stream: true,
          max_tokens: 1024,
        })
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content
          if (delta) {
            controller.enqueue(sse({ content: delta }))
            totalTokens += estimateTokens(delta)
          }
        }
        recordTokens(faculty, totalTokens)
        return true
      }

      case 'sancara': {
        const client = openaiClient(
          process.env.OPENROUTER_API_KEY!,
          'https://openrouter.ai/api/v1',
          { 'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://medha.ai', 'X-Title': 'MEDHĀ' }
        )
        for (const model of OPENROUTER_FALLBACK_MODELS) {
          try {
            const stream = await client.chat.completions.create({
              model,
              messages: [{ role: 'system', content: systemPrompt }, ...messages],
              stream: true,
              max_tokens: 1024,
            })
            for await (const chunk of stream) {
              const delta = chunk.choices[0]?.delta?.content
              if (delta) {
                controller.enqueue(sse({ content: delta }))
                totalTokens += estimateTokens(delta)
              }
            }
            recordTokens(faculty, totalTokens)
            return true
          } catch { continue }
        }
        return false
      }

      default:
        return false
    }
  } catch (err: unknown) {
    // Detect billing/quota errors and auto-kill
    const msg = err instanceof Error ? err.message : String(err)
    const isBillingError = /429|quota|billing|insufficient|rate.limit|exceeded/i.test(msg)
    if (isBillingError) {
      // Force exhaust this faculty's budget instantly
      const limit = getDailyLimit(faculty)
      recordTokens(faculty, limit)
      console.warn(`[MEDHĀ] ${faculty} auto-killed due to billing/quota error`)
    }
    return false
  }
}

function resolveFaculty(req: ChatRequest): FacultyId {
  if (req.faculty !== 'svayam') return req.faculty
  const lastUser = [...req.messages].reverse().find(m => m.role === 'user')
  return lastUser ? routeToFaculty(lastUser.content) : 'dhyana'
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: ChatRequest
  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Global kill switch
        if (isManuallyKilled()) {
          controller.enqueue(sse({ meta: { facultyId: 'svayam' } }))
          controller.enqueue(sse({ content: 'The void is dormant. MEDHĀ is temporarily at rest.' }))
          controller.enqueue(sseDone())
          controller.close()
          return
        }

        const resolvedFaculty = resolveFaculty(body)
        const systemPrompt = buildPrompt(body)

        // Send resolved faculty to client
        controller.enqueue(sse({ meta: { facultyId: resolvedFaculty } }))

        // Try primary faculty
        let success = await streamFaculty(resolvedFaculty, systemPrompt, body.messages, controller)

        // Auto-cascade through best alternatives
        if (!success) {
          const cascadeList = CASCADE_ORDER[resolvedFaculty] ?? []
          for (const nextFaculty of cascadeList) {
            if (!isFacultyAvailable(nextFaculty)) continue
            // Notify client of cascade
            controller.enqueue(sse({ meta: { facultyId: nextFaculty, cascaded: true } }))
            success = await streamFaculty(nextFaculty, systemPrompt, body.messages, controller)
            if (success) break
          }
        }

        if (!success) {
          controller.enqueue(sse({
            content: 'MEDHĀ is momentarily beyond reach. All pathways are silent.',
          }))
        }

        controller.enqueue(sseDone())
        controller.close()
      } catch (err) {
        console.error('[MEDHĀ]', err)
        controller.enqueue(sse({ content: 'The void is unreachable at this moment.' }))
        controller.enqueue(sseDone())
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
