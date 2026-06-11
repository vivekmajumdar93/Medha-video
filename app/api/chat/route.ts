import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { MEDHA_BASE_PROMPT, TONE_MODIFIERS, TYPE_MODIFIERS, OPENROUTER_FALLBACK_MODELS } from '@/lib/constants'
import { buildSystemPrompt, routeToFaculty } from '@/lib/utils'
import type { ChatRequest, FacultyId } from '@/types'

export const runtime = 'edge'

const enc = new TextEncoder()
const sse = (data: object) => enc.encode(`data: ${JSON.stringify(data)}\n\n`)
const sseDone = () => enc.encode('data: [DONE]\n\n')

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
  return new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}), ...(headers ? { defaultHeaders: headers } : {}) })
}

async function streamOpenAI(
  client: OpenAI,
  model: string,
  systemPrompt: string,
  messages: ChatRequest['messages'],
  controller: ReadableStreamDefaultController
) {
  const stream = await client.chat.completions.create({
    model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: true,
    max_tokens: 1024,
    temperature: 0.7,
  })
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) controller.enqueue(sse({ content: delta }))
  }
}

function resolveFaculty(req: ChatRequest): FacultyId {
  if (req.faculty !== 'svayam') return req.faculty
  const lastUser = [...req.messages].reverse().find(m => m.role === 'user')
  return lastUser ? routeToFaculty(lastUser.content) : 'dhyana'
}

export async function POST(request: NextRequest) {
  let body: ChatRequest
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const resolvedFaculty = resolveFaculty(body)
  const systemPrompt = buildPrompt(body)

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send resolved faculty immediately
        controller.enqueue(sse({ meta: { facultyId: resolvedFaculty } }))

        let success = false

        const tryFaculty = async (faculty: FacultyId) => {
          switch (faculty) {
            case 'prajna':
              if (process.env.OPENAI_API_KEY) {
                await streamOpenAI(openaiClient(process.env.OPENAI_API_KEY), 'gpt-4o', systemPrompt, body.messages, controller)
                success = true
              }
              break
            case 'dhyana':
              if (process.env.ANTHROPIC_API_KEY) {
                // Use Anthropic via OpenAI-compat endpoint
                await streamOpenAI(
                  openaiClient(process.env.ANTHROPIC_API_KEY, 'https://api.anthropic.com/v1', { 'anthropic-version': '2023-06-01', 'anthropic-beta': 'messages-2023-12-15' }),
                  'claude-sonnet-4-20250514', systemPrompt, body.messages, controller
                )
                success = true
              } else if (process.env.OPENAI_API_KEY) {
                // Fallback to GPT-4o for Dhyana if no Anthropic key
                await streamOpenAI(openaiClient(process.env.OPENAI_API_KEY), 'gpt-4o', systemPrompt, body.messages, controller)
                success = true
              }
              break
            case 'aksaya':
              if (process.env.OPENROUTER_API_KEY) {
                await streamOpenAI(
                  openaiClient(process.env.OPENROUTER_API_KEY, 'https://openrouter.ai/api/v1', { 'HTTP-Referer': 'https://medha.ai', 'X-Title': 'MEDHĀ' }),
                  'google/gemini-pro-1.5', systemPrompt, body.messages, controller
                )
                success = true
              }
              break
            case 'java':
              if (process.env.GROQ_API_KEY) {
                await streamOpenAI(
                  openaiClient(process.env.GROQ_API_KEY, 'https://api.groq.com/openai/v1'),
                  'llama-3.3-70b-versatile', systemPrompt, body.messages, controller
                )
                success = true
              }
              break
            case 'sancara':
              if (process.env.OPENROUTER_API_KEY) {
                for (const model of OPENROUTER_FALLBACK_MODELS) {
                  try {
                    await streamOpenAI(
                      openaiClient(process.env.OPENROUTER_API_KEY, 'https://openrouter.ai/api/v1', { 'HTTP-Referer': 'https://medha.ai', 'X-Title': 'MEDHĀ' }),
                      model, systemPrompt, body.messages, controller
                    )
                    success = true; break
                  } catch { continue }
                }
              }
              break
          }
        }

        await tryFaculty(resolvedFaculty)

        // Cascade fallback
        if (!success) {
          const fallbackOrder: FacultyId[] = ['prajna', 'java', 'sancara', 'dhyana', 'aksaya']
          for (const f of fallbackOrder) {
            if (f === resolvedFaculty) continue
            try {
              controller.enqueue(sse({ meta: { facultyId: f } }))
              await tryFaculty(f)
              if (success) break
            } catch { continue }
          }
        }

        if (!success) {
          controller.enqueue(sse({ content: 'MEDHĀ is momentarily beyond reach. All pathways are silent.' }))
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
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
  })
}
