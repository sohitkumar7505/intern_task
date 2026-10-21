import { StateGraph, START, END } from '@langchain/langgraph';
import AgentState from './state.js';
import understand from './nodes/understand.js';
import respond from './nodes/respond.js';
import summarize from './nodes/summarize.js';

/**
 * Conditional routing logic following the understand node.
 * Routes to 'respond' in standard execution, but structured to support
 * bypassing response generation directly to END if needed in future iterations.
 *
 * @param {object} state - Current AgentState after understand step.
 * @returns {string} Name of next node to execute ('respond' or END).
 */
function routeAfterUnderstand(state) {
  // In v1, always route to 'respond'.
  // Future extensions could return END for specific non-responsive intents.
  return 'respond';
}

// ─────────────────────────────────────────────────────────────
// 1. turnGraph: Process a single conversational turn
// START -> understand -> (conditional) -> respond -> END
// ─────────────────────────────────────────────────────────────
const turnWorkflow = new StateGraph(AgentState)
  .addNode('understand', understand)
  .addNode('respond', respond)
  .addEdge(START, 'understand')
  .addConditionalEdges('understand', routeAfterUnderstand, {
    respond: 'respond',
    [END]: END,
  })
  .addEdge('respond', END);

export const turnGraph = turnWorkflow.compile();

// ─────────────────────────────────────────────────────────────
// 2. summaryGraph: Process post-call analytics and CRM summary
// START -> summarize -> END
// ─────────────────────────────────────────────────────────────
const summaryWorkflow = new StateGraph(AgentState)
  .addNode('summarize', summarize)
  .addEdge(START, 'summarize')
  .addEdge('summarize', END);

export const summaryGraph = summaryWorkflow.compile();

export default {
  turnGraph,
  summaryGraph,
};
