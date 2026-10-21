# 🎙️ TaskFlow AI Voice Sales Bot

An intelligent, multilingual AI-powered voice sales agent built for **TaskFlow** — a smart project management platform. The bot conducts real-time consultative outbound/inbound sales calls, actively discovers customer requirements, addresses objections, pitches pricing and ROI, closes for free trial activations or demos, and automatically generates structured CRM summaries and qualification statuses.

---

## 🌟 Key Features

- **🎙️ Real-Time Voice Dialogue & VAD**:
  - Live microphone streaming with Voice Activity Detection (silence detection).
  - Real-time audio frequency visualizer that pulses during speech and listening.
  - Interactive text input support as an alternative to voice recording.
- **🇮🇳 Multilingual Capabilities (Powered by Sarvam AI)**:
  - Supports **Hinglish (`hi-en`)**, **English (`en`)**, and **Telugu (`te`)**.
  - Natural Indian accent text-to-speech voice synthesis (`saaras:v4` STT and `bulbul:v3` TTS).
- **🧠 LangGraph Sales Flow Agent (Powered by Groq LLM)**:
  - Multi-node conversational state graph: `understand` ➔ `respond` ➔ `summarize`.
  - Intent classification (`question`, `interest`, `objection`, `ready_to_buy`, `refusal`, `small_talk`).
  - Proactive qualification: extracts company name, team size, workflow bottlenecks, and budget.
  - Stage-based dialogue progression: `greeting` ➔ `discovery` ➔ `pitch` ➔ `objection_handling` ➔ `closing` ➔ `wrap_up`.
- **📊 Automated CRM Analytics & Scoring**:
  - Automatically assesses sales outcomes: `Converted`, `Interested`, `Follow-up Required`, `Not Interested`, `Demo Requested`, `No Response`.
  - Generates executive call summaries, extracted requirements, objections raised, and actionable next steps.
- **🔴 Dual-Channel Call Recording**:
  - Web Audio API destination mixing that captures both user mic input and bot synthesized audio into a unified recording.
  - Audio playback directly inside call details.
- **📋 Call History Dashboard**:
  - Filter calls by sales qualification status.
  - View full conversation transcripts, metadata, audio recordings, and delete past sessions.

---

## 🏗️ Architecture

```
├── agent/                  # LangGraph conversational agent
│   ├── graph.js            # turnGraph and summaryGraph definition
│   ├── nodes/              # understand, respond, and summarize nodes
│   ├── prompts.js          # Stage-based system prompts & voice persona rules
│   ├── schemas.js          # Zod validation schemas for NLU & summaries
│   └── state.js            # LangGraph AgentState definition
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # CallScreen, HistoryScreen, CallDetailModal, AudioVisualizer, ChatBubble, etc.
│   │   ├── hooks/          # useAudioRecorder, useCallRecording, useCallState
│   │   ├── utils/          # API client for backend communication
│   │   └── App.jsx         # App router and view management
│   └── vite.config.js      # Vite proxy to backend API
├── config/                 # Product & language configs
│   ├── languages.js        # Language mapping, TTS voices, and greetings
│   └── product.js          # Grounded source of truth for TaskFlow features, pricing, & objection handling
├── server/                 # Express backend API
│   ├── index.js            # REST endpoints, audio upload, and agent orchestration
│   ├── middleware/         # Rate limiting (express-rate-limit)
│   └── services/           # SQLite database (better-sqlite3) & Sarvam AI API client
└── package.json            # Root scripts and concurrently runner
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20+ recommended (compatible with Node 20, 22 LTS, and 26+)
- **npm** or **pnpm**
- **Sarvam AI API Key**: Get from [console.sarvam.ai](https://console.sarvam.ai)
- **Groq API Key**: Get from [console.groq.com](https://console.groq.com)

### 2. Installation
Clone the repository and install all dependencies (root, server, and client):

```bash
git clone https://github.com/sohitkumar7505/intern_task.git
cd intern_task
npm run setup
```

### 3. Environment Configuration
Create a `.env` file in the root directory (refer to `.env.example`):

```bash
cp .env.example .env
```

Add your API credentials:
```env
SARVAM_API_KEY=your_sarvam_api_key_here
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
PORT=3001
```

### 4. Running Locally
Start both backend and frontend development servers concurrently:

```bash
npm run dev
```

- **Frontend Client**: [http://localhost:5173](http://localhost:5173)
- **Backend API Server**: [http://localhost:3001](http://localhost:3001)

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/calls` | Creates a new call session and synthesizes the personalized audio greeting |
| `POST` | `/api/calls/:id/turn` | Processes a dialogue turn (supports audio WebM upload or JSON text) |
| `POST` | `/api/calls/:id/end` | Finalizes call, calculates duration, and generates CRM AI summary |
| `POST` | `/api/calls/:id/recording` | Uploads full recorded call audio (WebM) |
| `GET` | `/api/calls` | Lists all past calls with optional `?status=` filtering |
| `GET` | `/api/calls/:id` | Retrieves full call details, transcript, and audio recording URL |
| `DELETE` | `/api/calls/:id` | Deletes a call record and removes associated audio file |
| `GET` | `/api/health` | Health check probe |

---

## 🛡️ License

MIT License. Designed and developed for demonstration and recruitment evaluation.
