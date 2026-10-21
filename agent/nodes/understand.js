import { ChatGroq } from '@langchain/groq';
import { UnderstandSchema } from '../schemas.js';
import { getUnderstandPrompt } from '../prompts.js';

let llm;
let structuredLlm;

/**
 * Returns the cached structured ChatGroq instance, initializing lazily
 * if environment variables were loaded after module evaluation.
 */
function getStructuredClient() {
  if (!structuredLlm) {
    llm = new ChatGroq({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      temperature: 0,
      apiKey: process.env.GROQ_API_KEY,
    });
    structuredLlm = llm.withStructuredOutput(UnderstandSchema);
  }
  return structuredLlm;
}

try {
  llm = new ChatGroq({
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    temperature: 0,
    apiKey: process.env.GROQ_API_KEY,
  });
  structuredLlm = llm.withStructuredOutput(UnderstandSchema);
} catch {
  // Will be lazily initialized on invocation if GROQ_API_KEY was not set at import time
}

/**
 * Normalizes message objects to { role, content } format for LLM consumption.
 * @param {Array} messages - Array of conversation messages.
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
 * Understand node in the LangGraph sales flow.
 * Analyzes the customer's input, classifies intent, extracts profile info,
 * updates interest signals, and suggests the next call stage.
 *
 * @param {object} state - Current AgentState.
 * @returns {Promise<object>} Partial state updates.
 */
export async function understand(state) {
  try {
    const client = getStructuredClient();
    const systemPrompt = getUnderstandPrompt(state.language, state.callStage);
    const recentMessages = normalizeMessages(state.messages);

    const callMessages = [
      { role: 'system', content: systemPrompt },
      ...(recentMessages.length > 0 ? recentMessages : [{ role: 'user', content: 'Call started' }]),
    ];

    const result = await client.invoke(callMessages);

    // Merge customer profile data
    const prevProfile = state.customerProfile || {};
    const updatedProfile = {
      name: result.extractedName || prevProfile.name || null,
      company: result.extractedCompany || prevProfile.company || null,
      teamSize: (result.extractedTeamSize !== null && result.extractedTeamSize !== undefined)
        ? result.extractedTeamSize
        : (prevProfile.teamSize ?? null),
      needs: Array.from(new Set([
        ...(prevProfile.needs || []),
        ...(Array.isArray(result.extractedNeeds) ? result.extractedNeeds : []),
      ])).filter(Boolean),
      budget: result.extractedBudget || prevProfile.budget || null,
      objections: Array.from(new Set([
        ...(prevProfile.objections || []),
        ...(result.extractedObjection ? [result.extractedObjection] : []),
      ])).filter(Boolean),
    };

    // Append signal if intent indicates positive interest
    const interestIntents = ['interest', 'demo_request', 'ready_to_buy'];
    const interestSignals = interestIntents.includes(result.intent) ? [result.intent] : [];

    // Next conversation stage
    const callStage = result.suggestedNextStage || state.callStage || 'greeting';

    return {
      intent: result.intent || 'unclear',
      customerProfile: updatedProfile,
      interestSignals,
      callStage,
    };
  } catch (error) {
    console.error('Error in understand node:', error);
    return {
      intent: 'unclear',
    };
  }
}

export default understand;
