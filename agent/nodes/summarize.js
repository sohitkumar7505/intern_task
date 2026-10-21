import { ChatGroq } from '@langchain/groq';
import { SummarySchema } from '../schemas.js';
import { getSummaryPrompt } from '../prompts.js';

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
    structuredLlm = llm.withStructuredOutput(SummarySchema);
  }
  return structuredLlm;
}

try {
  llm = new ChatGroq({
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    temperature: 0,
    apiKey: process.env.GROQ_API_KEY,
  });
  structuredLlm = llm.withStructuredOutput(SummarySchema);
} catch {
  // Will be lazily initialized on invocation if GROQ_API_KEY was not set at import time
}

/**
 * Normalizes message objects to { role, content } format.
 * @param {Array} messages - Conversation history.
 * @returns {Array<{role: string, content: string}>}
 */
function normalizeMessages(messages = []) {
  return messages.map((msg) => {
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
 * Summarize node in the LangGraph sales flow.
 * Invoked once after a call concludes to produce CRM summary, customer requirements,
 * objections, next steps, and sales qualification status.
 *
 * @param {object} state - Full AgentState with all messages.
 * @returns {Promise<object>} Structured post-call summary conforming to SummarySchema.
 */
export async function summarize(state) {
  try {
    const rawMessages = state.messages || [];
    const normalized = normalizeMessages(rawMessages);

    // Count user utterances
    const userMessages = normalized.filter((msg) => msg.role === 'user');

    // If customer spoke 0 or 1 time, mark as "No Response" directly without LLM call
    if (userMessages.length <= 1) {
      return {
        summary: 'The call concluded with minimal to no customer engagement.',
        requirements: [],
        objections: [],
        nextSteps: ['Schedule a follow-up outreach or retry call at a different time.'],
        salesStatus: 'No Response',
        salesStatusReason: 'Customer did not speak or provided minimal input during the call.',
      };
    }

    const client = getStructuredClient();
    const systemPrompt = getSummaryPrompt(state.language);

    const callMessages = [
      { role: 'system', content: systemPrompt },
      ...normalized,
    ];

    const result = await client.invoke(callMessages);

    return {
      summary: result.summary,
      requirements: result.requirements || [],
      objections: result.objections || [],
      nextSteps: result.nextSteps || [],
      salesStatus: result.salesStatus,
      salesStatusReason: result.salesStatusReason,
    };
  } catch (error) {
    console.error('Error in summarize node:', error);

    return {
      summary: 'Call completed. Automated summary generation encountered an issue.',
      requirements: state.customerProfile?.needs || [],
      objections: state.customerProfile?.objections || [],
      nextSteps: ['Review call recording and follow up with the customer directly.'],
      salesStatus: 'Follow-up Required',
      salesStatusReason: 'Automated summarization failed; manual review suggested.',
    };
  }
}

export default summarize;
