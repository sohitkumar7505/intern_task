import { ChatGroq } from '@langchain/groq';
import { getRespondPrompt } from '../prompts.js';
import product from '../../config/product.js';

let llm;

/**
 * Returns the cached ChatGroq instance, initializing lazily
 * if environment variables were loaded after module evaluation.
 */
function getClient() {
  if (!llm) {
    llm = new ChatGroq({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      temperature: 0.7,
      maxTokens: 500,
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return llm;
}

try {
  llm = new ChatGroq({
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    temperature: 0.7,
    maxTokens: 500,
    apiKey: process.env.GROQ_API_KEY,
  });
} catch {
  // Will be lazily initialized on invocation if GROQ_API_KEY was not set at import time
}

/**
 * Cleans the bot's raw reply to ensure pristine text-to-speech audio output.
 * Strips markdown formatting, emojis, bullet points, headers, and excessive whitespace.
 *
 * @param {string} text - Raw text from the LLM.
 * @returns {string} Sanitized spoken text.
 */
function cleanReply(text) {
  if (!text) return '';

  return text
    // Remove markdown code blocks and inline code
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove markdown headers (# Header)
    .replace(/^#+\s+/gm, '')
    // Remove bullet points (*, -, +, •, numbers like 1.)
    .replace(/^[\s*•\-+]+\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove bold/italics (**, *, __, _)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove blockquotes (> Quote)
    .replace(/^>\s+/gm, '')
    // Remove emojis across all Unicode ranges
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    // Normalize newlines and whitespace into single spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes message objects to { role, content } format.
 * @param {Array} messages - Conversation history.
 * @returns {Array<{role: string, content: string}>}
 */
function normalizeMessages(messages = []) {
  return messages.slice(-10).map((msg) => {
    let role = 'user';
    if (msg.role) {
      role = msg.role === 'human' ? 'user' : (msg.role === 'ai' ? 'assistant' : msg.role);
    } else if (typeof msg._getType === 'function') {
      const type = msg._getType();
      role = type === 'human' ? 'user' : (type === 'ai' ? 'assistant' : (type === 'system' ? 'system' : 'user'));
    } else if (msg.type) {
      role = msg.type === 'human' ? 'user' : (msg.type === 'ai' ? 'assistant' : msg.type);
    }

    const content = typeof msg.content === 'string'
      ? msg.content
      : (typeof msg.text === 'string' ? msg.text : JSON.stringify(msg.content ?? ''));

    return { role, content };
  });
}

/**
 * Respond node in the LangGraph sales flow.
 * Generates the conversational sales reply adhering to stage objectives,
 * product grounding, and voice brevity constraints.
 *
 * @param {object} state - Current AgentState.
 * @returns {Promise<object>} Partial state updates containing botReply, messages, refusalCount, and callStage.
 */
export async function respond(state) {
  let refusalCount = state.refusalCount || 0;
  if (state.intent === 'refusal') {
    refusalCount += 1;
  }

  let callStage = state.callStage || 'greeting';
  if (refusalCount >= 2 && callStage !== 'wrap_up') {
    callStage = 'wrap_up';
  }

  try {
    const client = getClient();
    const systemPrompt = getRespondPrompt(state.language, callStage, state.customerProfile, product);
    const recentMessages = normalizeMessages(state.messages);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentMessages,
    ];

    const response = await client.invoke(messages);

    let rawReply = '';
    if (typeof response.content === 'string') {
      rawReply = response.content;
    } else if (Array.isArray(response.content)) {
      rawReply = response.content.map((c) => (typeof c === 'string' ? c : c.text || '')).join(' ');
    } else {
      rawReply = String(response.content || '');
    }

    const cleanedReply = cleanReply(rawReply);

    return {
      botReply: cleanedReply,
      messages: [{ role: 'assistant', content: cleanedReply }],
      refusalCount,
      callStage,
    };
  } catch (error) {
    console.error('Error in respond node:', error);

    let fallback = "I'm sorry, I didn't quite catch that. Could you please repeat what you said?";
    if (state.language === 'hi-en') {
      fallback = "Maaf kijiye, main theek se sun nahi payi. Kya aap ek baar repeat kar sakte hain?";
    } else if (state.language === 'te') {
      fallback = "క్షమించండి, నేను వినలేకపోయాను. దయచేసి మళ్ళీ చెప్పగలరా?";
    }

    return {
      botReply: fallback,
      messages: [{ role: 'assistant', content: fallback }],
      refusalCount,
      callStage,
    };
  }
}

export default respond;
