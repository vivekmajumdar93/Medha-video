# MEDHĀ — Cognitive Operating Environment

> A celestial intelligence. A void consciousness. An ancient mind awakened.

Built by VYAN Labs.

---

## Phase 1 — Foundation MVP

This is the production-ready foundation for the MEDHĀ experience.

### What's included

- Black cosmic void interface with subtle star field
- Animated wing entity video (autoplay, loop, hardware-accelerated)
- GSAP + Framer Motion entity animations responding to AI state
- Streaming OpenAI chat with conversation history
- Premium glassmorphism chat input
- Voice input via Web Speech API
- Full responsive design (mobile → desktop)
- Clean layer architecture ready for Phase 2+

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

Add your `OPENAI_API_KEY` to `.env.local`.

### 3. Add your video asset

Place your Kling-generated wing video at:

```
public/assets/medha-dormant.mp4
```

Optionally add the source image as fallback:

```
public/assets/medha-entity.png
```

### 4. Run

```bash
npm run dev
```

### 5. Build

```bash
npm run build
npm start
```

---

## Deploy to Vercel

```bash
npx vercel
```

Set `OPENAI_API_KEY` in Vercel environment variables.

---

## Architecture

```
app/
  page.tsx              # Main experience — layer orchestration
  layout.tsx            # Root layout with fonts + metadata
  globals.css           # Global styles
  api/
    chat/route.ts       # Streaming OpenAI endpoint (Edge Runtime)

components/
  entity/
    MedhaEntity.tsx     # Wing video + state aura
  chat/
    MessageList.tsx     # Minimal conversational messages
  input/
    ChatInput.tsx       # Glassmorphism input with voice
  layout/
    VoidBackground.tsx  # Canvas star field
    Header.tsx          # Wordmark + state label
    FutureLayers.tsx    # Phase 2–6 placeholder stubs

hooks/
  useChat.ts            # Streaming chat, history, entity state
  useVoice.ts           # Web Speech API recording + STT
  useEntityAnimation.ts # GSAP animation per entity state

lib/
  constants.ts          # System prompt, models, feature flags
  utils.ts              # cn(), generateId(), formatTime()

types/
  index.ts              # Full type system inc. future phase types
```

---

## Future Phases

| Phase | Features |
|-------|----------|
| 2 | Memory Galaxy, Constellation Navigation |
| 3 | Research Universe, GPU Particles, Three.js |
| 4 | Roaming Wing States (all 20 Kling videos) |
| 5 | Consciousness Engine, Adaptive Music |
| 6 | Multi-Model Routing, Local Models, Voice Consciousness |

Feature flags in `lib/constants.ts` — set to `true` when implemented.

---

## Video Assets

Place Kling-generated state videos in `public/assets/`:

| State | Filename |
|-------|----------|
| Dormant (default) | `medha-dormant.mp4` |
| Listening | `medha-listening.mp4` |
| Thinking | `medha-thinking.mp4` |
| Responding | `medha-responding.mp4` |
| … | … |

Phase 4 will implement automatic video switching based on entity state.

---

*VYAN Labs — Conscious Cognitive Systems*
