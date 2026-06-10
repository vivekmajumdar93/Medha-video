// ─── Message & Conversation ───────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  isStreaming?: boolean
  error?: boolean
}

export interface Conversation {
  id: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

// ─── Voice ───────────────────────────────────────────────────────────────────

export type VoiceState = 'idle' | 'recording' | 'processing' | 'error'

export interface VoiceResult {
  transcript: string
  confidence?: number
}

// ─── Entity States (maps to the 20 Kling video states) ───────────────────────

export type EntityState =
  | 'dormant'
  | 'listening'
  | 'thinking'
  | 'reasoning'
  | 'researching'
  | 'creating'
  | 'responding'
  | 'memory-recall'
  | 'deep-research'
  | 'voice-listening'
  | 'voice-active'
  | 'creative-flow'
  | 'guardian'
  | 'meditation'
  | 'patrol'
  | 'approach'
  | 'retreat'
  | 'wake-up'
  | 'sleep'
  | 'celebration'

// ─── Chat API ─────────────────────────────────────────────────────────────────

export interface ChatRequest {
  messages: Pick<Message, 'role' | 'content'>[]
  model?: string
}

export interface ChatResponse {
  content: string
  error?: string
}

// ─── Future Phase Placeholders ────────────────────────────────────────────────

export interface MemoryNode {
  id: string
  content: string
  embedding?: number[]
  timestamp: number
  connections: string[]
}

export interface ResearchUniverse {
  topic: string
  nodes: MemoryNode[]
  active: boolean
}

export interface ConsciousnessState {
  focus: number       // 0–1
  energy: number      // 0–1
  coherence: number   // 0–1
  mode: EntityState
}
