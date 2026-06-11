// ─── Faculty System ───────────────────────────────────────────────────────────

export type FacultyId = 'svayam' | 'prajna' | 'dhyana' | 'aksaya' | 'java' | 'sancara'

export interface Faculty {
  id: FacultyId
  name: string          // Sanskrit name
  meaning: string       // English meaning
  provider: string      // Underlying provider
  model: string         // Model string
  color: string         // Particle/aura hex
  colorName: string     // MEDHĀ color name
  description: string   // Shown in settings
}

export const FACULTIES: Record<FacultyId, Faculty> = {
  svayam: {
    id: 'svayam',
    name: 'Svayam',
    meaning: 'Self-determined',
    provider: 'auto',
    model: 'auto',
    color: '#e8e4ff',
    colorName: 'Void White',
    description: 'MEDHĀ selects the optimal faculty based on your input.',
  },
  prajna: {
    id: 'prajna',
    name: 'Prājña',
    meaning: 'Supreme wisdom',
    provider: 'openai',
    model: 'gpt-4o',
    color: '#2d9e7f',
    colorName: 'Void Sage',
    description: 'Deep reasoning, code, analysis, and complex problem solving.',
  },
  dhyana: {
    id: 'dhyana',
    name: 'Dhyāna',
    meaning: 'Deep meditation',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    color: '#c4622d',
    colorName: 'Solar Ember',
    description: 'Creative, philosophical, nuanced, and long-form understanding.',
  },
  aksaya: {
    id: 'aksaya',
    name: 'Akṣaya',
    meaning: 'Inexhaustible',
    provider: 'google',
    model: 'gemini-1.5-pro',
    color: '#00c4cc',
    colorName: 'Celestial Cyan',
    description: 'Research, real-time knowledge, and multimodal understanding.',
  },
  java: {
    id: 'java',
    name: 'Javā',
    meaning: 'Swift, fleet',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    color: '#a855f7',
    colorName: 'Velocity Violet',
    description: 'Instant responses for quick queries and rapid iteration.',
  },
  sancara: {
    id: 'sancara',
    name: 'Sañcāra',
    meaning: 'Passage, transmission',
    provider: 'openrouter',
    model: 'auto',
    color: '#e8b94f',
    colorName: 'Transmission Gold',
    description: 'Universal passage. Routes through available models as fallback.',
  },
}

// ─── Entity State ─────────────────────────────────────────────────────────────

export type EntityState =
  | 'dormant' | 'listening' | 'thinking' | 'reasoning'
  | 'researching' | 'deep-research' | 'responding'
  | 'voice-listening' | 'voice-active' | 'celebration'
  | 'sleep' | 'wake' | 'switching'

// ─── Message ──────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  facultyId?: FacultyId
  isStreaming?: boolean
  error?: boolean
  attachment?: Attachment
}

// ─── Attachment ───────────────────────────────────────────────────────────────

export type AttachmentType = 'image' | 'document' | 'audio'

export interface Attachment {
  id: string
  name: string
  type: AttachmentType
  mimeType: string
  size: number
  dataUrl: string
  base64: string
}

// ─── Voice ───────────────────────────────────────────────────────────────────

export type VoiceState = 'idle' | 'recording' | 'processing' | 'speaking' | 'error'

// ─── Settings ────────────────────────────────────────────────────────────────

export type ResponseTone = 'cosmic' | 'precise' | 'balanced' | 'concise'
export type ResponseType = 'conversational' | 'analytical' | 'creative' | 'instructional'

export interface MedhaSettings {
  // Faculty
  defaultFaculty: FacultyId
  // Behaviour
  systemInstructions: string
  responseTone: ResponseTone
  responseType: ResponseType
  // Voice
  voiceEnabled: boolean
  ttsEnabled: boolean
  ttsSpeed: number
  // History
  saveHistory: boolean
  maxHistoryMessages: number
  // Display
  showFacultyIndicator: boolean
  showTimestamps: boolean
  particleBurstOnSwitch: boolean
}

export const DEFAULT_SETTINGS: MedhaSettings = {
  defaultFaculty: 'svayam',
  systemInstructions: '',
  responseTone: 'cosmic',
  responseType: 'conversational',
  voiceEnabled: true,
  ttsEnabled: true,
  ttsSpeed: 1.0,
  saveHistory: true,
  maxHistoryMessages: 50,
  showFacultyIndicator: true,
  showTimestamps: false,
  particleBurstOnSwitch: true,
}

// ─── Chat API ─────────────────────────────────────────────────────────────────

export interface ChatRequest {
  messages: Pick<Message, 'role' | 'content'>[]
  faculty: FacultyId
  settings: Pick<MedhaSettings, 'responseTone' | 'responseType' | 'systemInstructions'>
  attachment?: Attachment
}
