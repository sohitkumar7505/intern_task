// config/languages.js
// ─────────────────────────────────────────────────────────────
// Language configuration for STT, TTS, and LLM prompts.
// Maps language codes to Sarvam API settings and LLM behavior.
// ─────────────────────────────────────────────────────────────

const languages = {
  "hi-en": {
    label: "हिंदी-English (Hinglish)",
    sttCode: "hi-IN",
    sttMode: "codemix",        // Sarvam STT codemix mode for Hinglish
    ttsCode: "hi-IN",
    ttsSpeaker: "priya",       // Female voice, good Hindi support
    llmLanguageInstruction:
      "Respond in Hinglish (a natural mix of Hindi and English, the way young Indians speak in cities). Use Devanagari script for Hindi words mixed with English words. Keep it conversational and natural.",
    greeting: "Namaste! Main TaskFlow se Priya hoon. TaskFlow ek smart AI tool hai jo team ke projects 3 guna fast deliver karne me help karta hai. Kya aap apni team ke project management ko automate karna chahte hain?",
    defaultLabel: true,
  },
  en: {
    label: "English",
    sttCode: "en-IN",
    sttMode: "transcribe",
    ttsCode: "en-IN",
    ttsSpeaker: "priya",       // Female voice, good English support
    llmLanguageInstruction:
      "Respond in clear, natural English. Use simple words suitable for spoken conversation.",
    greeting: "Hello! I'm Priya from TaskFlow. We help teams plan and deliver projects 3 times faster with AI automation. Are you looking to improve your team's project tracking or workflow?",
  },
  te: {
    label: "తెలుగు (Telugu)",
    sttCode: "te-IN",
    sttMode: "transcribe",
    ttsCode: "te-IN",
    ttsSpeaker: "priya",       // Female voice, Telugu support
    llmLanguageInstruction:
      "Respond in Telugu (తెలుగు) using Telugu script. Keep it conversational and natural for spoken dialogue.",
    greeting: "నమస్కారం! నేను TaskFlow నుండి ప్రియని. మా AI ప్రాజెక్ట్ మేనేజ్‌మెంట్ టూల్ ద్వారా ప్రాజెక్ట్‌లను 3 రెట్లు వేగంగా పూర్తి చేయవచ్చు. మీ టీమ్ ప్రాజెక్ట్ వర్క్‌ఫ్లోలను సులభతరం చేయడానికి ఏదైనా టూల్ చూస్తున్నారా?",
  },
};

export default languages;
