import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { SVAYAM_ROUTING } from './constants'
import type { FacultyId, MedhaSettings, ResponseTone, ResponseType } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Svayam auto-routing ──────────────────────────────────────────────────────

export function routeToFaculty(input: string): FacultyId {
  const lower = input.toLowerCase()
  const scores: Partial<Record<FacultyId, number>> = {}

  for (const [facultyId, keywords] of Object.entries(SVAYAM_ROUTING)) {
    if (facultyId === 'svayam' || facultyId === 'sancara') continue
    let score = 0
    for (const kw of keywords) {
      if (lower.includes(kw)) score++
    }
    if (score > 0) scores[facultyId as FacultyId] = score
  }

  if (Object.keys(scores).length === 0) return 'dhyana' // default to Claude for general

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  return best[0] as FacultyId
}

// ─── Settings persistence ─────────────────────────────────────────────────────

export function loadSettings(): Partial<MedhaSettings> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem('medha-settings')
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export function saveSettings(settings: MedhaSettings): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('medha-settings', JSON.stringify(settings))
  } catch { /* ignore */ }
}

// ─── History persistence ──────────────────────────────────────────────────────

export function loadHistory() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('medha-history')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveHistory(messages: unknown[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('medha-history', JSON.stringify(messages.slice(-100)))
  } catch { /* ignore */ }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('medha-history')
}

// ─── Build system prompt ──────────────────────────────────────────────────────

export function buildSystemPrompt(
  base: string,
  tone: ResponseTone,
  type: ResponseType,
  custom: string,
  toneMap: Record<ResponseTone, string>,
  typeMap: Record<ResponseType, string>
): string {
  const parts = [base, toneMap[tone], typeMap[type]]
  if (custom.trim()) parts.push(`\nAdditional instructions: ${custom.trim()}`)
  return parts.join('\n\n')
}

export function formatTime(ts: number): string {
  return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(new Date(ts))
}
