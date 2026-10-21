import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root or server dir
const rootEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

import { defaultLimiter, turnLimiter } from './middleware/rateLimiter.js';
import db from './services/db.js';
import sarvam from './services/sarvam.js';
import languages from '../config/languages.js';
import { turnGraph, summaryGraph } from '../agent/graph.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Project root data & recordings folder
const projectRoot = path.resolve(__dirname, '../');
const recordingsDir = path.resolve(projectRoot, 'data/recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(defaultLimiter);

// Serve call recordings statically
app.use('/recordings', express.static(recordingsDir));

// Multer memory storage for user turn audio blobs
const memoryStorage = multer.memoryStorage();
const uploadTurnAudio = multer({
  storage: memoryStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

// Multer disk storage for full call recording uploads
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, recordingsDir);
  },
  filename: (req, file, cb) => {
    const callId = req.params.callId || 'recording';
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${callId}-${Date.now()}${ext}`);
  },
});
const uploadCallRecording = multer({
  storage: diskStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
});

/**
 * Helper to safely parse JSON or return original value
 */
function safeJsonParse(val, fallback = null) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

// ─────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ai-voice-sales-bot',
  });
});

// ─────────────────────────────────────────────────────────────
// 1. Create a new call session
// POST /api/calls
// ─────────────────────────────────────────────────────────────
app.post('/api/calls', async (req, res) => {
  try {
    const { language = 'hi-en' } = req.body;
    const langConfig = languages[language] || languages['hi-en'];
    const callId = uuidv4();

    // 1. Create call in DB
    db.createCall(callId, language);

    // 2. Greeting message
    const greeting = langConfig.greeting;
    db.addMessage(callId, 'bot', greeting, 'greeting');

    // 3. Synthesize greeting TTS
    let greetingAudio = '';
    try {
      const ttsResult = await sarvam.textToSpeech(
        greeting,
        langConfig.ttsCode,
        langConfig.ttsSpeaker
      );
      greetingAudio = ttsResult?.audioBase64 || '';
    } catch (ttsErr) {
      console.error('[server] Greeting TTS error:', ttsErr.message);
    }

    return res.status(201).json({
      callId,
      greeting,
      greetingAudio,
    });
  } catch (err) {
    console.error('[server] Error creating call:', err);
    return res.status(500).json({ error: 'Failed to create call session: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 2. Process conversation turn
// POST /api/calls/:callId/turn
// ─────────────────────────────────────────────────────────────
app.post(
  '/api/calls/:callId/turn',
  turnLimiter,
  uploadTurnAudio.single('audio'),
  async (req, res) => {
    try {
      const { callId } = req.params;
      const call = db.getCall(callId);
      if (!call) {
        return res.status(404).json({ error: 'Call session not found' });
      }

      const langConfig = languages[call.language] || languages['hi-en'];

      // 1. Resolve user message from text input or audio STT
      let transcript = (req.body?.text || '').trim();

      if (!transcript && req.file && req.file.buffer) {
        try {
          const sttResult = await sarvam.speechToText(
            req.file.buffer,
            langConfig.sttCode,
            langConfig.sttMode
          );
          transcript = (sttResult.transcript || '').trim();
        } catch (sttErr) {
          console.error('[server] STT Error:', sttErr);
        }
      }

      if (!transcript && (!req.file || !req.file.buffer)) {
        return res.status(400).json({ error: 'Audio file or text is required for turn processing' });
      }

      // Handle empty / undetected audio
      if (!transcript) {
        const fallbackTexts = {
          'hi-en': 'Maaf kijiye, main theek se sun nahi payi. Kya aap ek baar repeat kar sakte hain?',
          en: "I'm sorry, I didn't quite catch that. Could you please repeat what you said?",
          te: 'క్షమించండి, నేను వినలేకపోయాను. దయచేసి మళ్ళీ చెప్పగలరా?',
        };
        const botReply = fallbackTexts[call.language] || fallbackTexts['hi-en'];
        const ttsResult = await sarvam.textToSpeech(
          botReply,
          langConfig.ttsCode,
          langConfig.ttsSpeaker
        );

        return res.json({
          userText: '',
          botText: botReply,
          audioBase64: ttsResult?.audioBase64 || '',
          stageInfo: { stage: 'listening' },
        });
      }

      // 2. Save user message to database
      db.addMessage(callId, 'user', transcript, 'user_input');

      // 3. Prepare messages & state for LangGraph turnGraph
      const rawMessages = db.getMessages(callId) || [];
      const messagesForAgent = rawMessages.map((m) => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.content,
      }));

      // Find last stage or default
      const lastBotMessage = [...rawMessages].reverse().find((m) => m.role === 'bot' && m.stage);
      const currentStage = lastBotMessage?.stage || 'greeting';

      const customerProfile = safeJsonParse(call.customer_profile, {
        name: null,
        company: null,
        teamSize: null,
        needs: [],
        budget: null,
        objections: [],
      });

      // 4. Run LangGraph Turn Workflow
      const turnResult = await turnGraph.invoke({
        messages: messagesForAgent,
        language: call.language,
        callStage: currentStage,
        customerProfile,
        callId,
      });

      const botReply = turnResult.botReply || 'I understand. How else can TaskFlow help your team?';
      const nextStage = turnResult.callStage || currentStage;

      // 5. Save bot reply and updated profile to DB
      db.addMessage(callId, 'bot', botReply, nextStage);
      if (turnResult.customerProfile) {
        db.updateCall(callId, { customer_profile: turnResult.customerProfile });
      }

      // 6. Text to Speech for Bot Response
      let audioBase64 = '';
      try {
        const ttsResult = await sarvam.textToSpeech(
          botReply,
          langConfig.ttsCode,
          langConfig.ttsSpeaker
        );
        audioBase64 = ttsResult?.audioBase64 || '';
      } catch (ttsErr) {
        console.error('[server] TTS Error:', ttsErr);
      }

      return res.json({
        userText: transcript,
        botText: botReply,
        audioBase64,
        stageInfo: {
          stage: nextStage,
          intent: turnResult.intent || '',
        },
      });
    } catch (err) {
      console.error('[server] Error processing turn:', err);
      return res.status(500).json({ error: 'Turn processing failed: ' + err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 3. End call & generate CRM summary
// POST /api/calls/:callId/end
// ─────────────────────────────────────────────────────────────
app.post('/api/calls/:callId/end', async (req, res) => {
  try {
    const { callId } = req.params;
    const call = db.getCall(callId);
    if (!call) {
      return res.status(404).json({ error: 'Call session not found' });
    }

    // Calculate call duration in seconds
    const duration = call.start_time
      ? Math.max(0, Math.round((Date.now() - new Date(call.start_time).getTime()) / 1000))
      : 0;

    const rawMessages = db.getMessages(callId) || [];
    const messagesForAgent = rawMessages.map((m) => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.content,
    }));

    const customerProfile = safeJsonParse(call.customer_profile, {});

    // Run LangGraph summaryGraph
    const summaryResult = await summaryGraph.invoke({
      messages: messagesForAgent,
      language: call.language,
      customerProfile,
      callId,
    });

    const summaryData = {
      status: 'completed',
      end_time: new Date().toISOString(),
      duration,
      summary: summaryResult.summary || 'Call finished.',
      requirements: JSON.stringify(summaryResult.requirements || []),
      objections: JSON.stringify(summaryResult.objections || []),
      next_steps: JSON.stringify(summaryResult.nextSteps || []),
      sales_status: summaryResult.salesStatus || 'No Response',
      sales_status_reason: summaryResult.salesStatusReason || '',
    };

    db.updateCall(callId, summaryData);

    return res.json({
      summary: summaryResult.summary,
      requirements: summaryResult.requirements || [],
      objections: summaryResult.objections || [],
      nextSteps: summaryResult.nextSteps || [],
      salesStatus: summaryResult.salesStatus,
      salesStatusReason: summaryResult.salesStatusReason,
    });
  } catch (err) {
    console.error('[server] Error ending call:', err);
    return res.status(500).json({ error: 'Failed to finalize call: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 4. Upload call recording
// POST /api/calls/:callId/recording
// ─────────────────────────────────────────────────────────────
app.post(
  '/api/calls/:callId/recording',
  uploadCallRecording.single('recording'),
  async (req, res) => {
    try {
      const { callId } = req.params;
      const call = db.getCall(callId);
      if (!call) {
        return res.status(404).json({ error: 'Call session not found' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No recording file uploaded' });
      }

      db.updateCall(callId, {
        recording_filename: req.file.filename,
      });

      return res.json({
        success: true,
        recordingUrl: `/recordings/${req.file.filename}`,
      });
    } catch (err) {
      console.error('[server] Error uploading recording:', err);
      return res.status(500).json({ error: 'Failed to upload recording: ' + err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 5. List all calls
// GET /api/calls
// ─────────────────────────────────────────────────────────────
app.get('/api/calls', (req, res) => {
  try {
    const { status } = req.query;
    const calls = db.listCalls(status);

    const formattedCalls = calls.map((c) => ({
      ...c,
      requirements: safeJsonParse(c.requirements, []),
      objections: safeJsonParse(c.objections, []),
      next_steps: safeJsonParse(c.next_steps, []),
      customer_profile: safeJsonParse(c.customer_profile, {}),
      recordingUrl: c.recording_filename ? `/recordings/${c.recording_filename}` : null,
    }));

    return res.json({ calls: formattedCalls });
  } catch (err) {
    console.error('[server] Error listing calls:', err);
    return res.status(500).json({ error: 'Failed to list calls' });
  }
});

// ─────────────────────────────────────────────────────────────
// 6. Get call details
// GET /api/calls/:callId
// ─────────────────────────────────────────────────────────────
app.get('/api/calls/:callId', (req, res) => {
  try {
    const call = db.getCall(req.params.callId);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    const formattedCall = {
      ...call,
      requirements: safeJsonParse(call.requirements, []),
      objections: safeJsonParse(call.objections, []),
      next_steps: safeJsonParse(call.next_steps, []),
      customer_profile: safeJsonParse(call.customer_profile, {}),
      recordingUrl: call.recording_filename ? `/recordings/${call.recording_filename}` : null,
    };

    return res.json({ call: formattedCall });
  } catch (err) {
    console.error('[server] Error retrieving call:', err);
    return res.status(500).json({ error: 'Failed to get call details' });
  }
});

// ─────────────────────────────────────────────────────────────
// 7. Delete call
// DELETE /api/calls/:callId
// ─────────────────────────────────────────────────────────────
app.delete('/api/calls/:callId', (req, res) => {
  try {
    const recordingFilename = db.deleteCall(req.params.callId);
    if (recordingFilename) {
      const filePath = path.resolve(recordingsDir, recordingFilename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('[server] Error deleting call:', err);
    return res.status(500).json({ error: 'Failed to delete call' });
  }
});

// ─────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Voice Sales Bot Server is running on http://localhost:${PORT}`);
});
