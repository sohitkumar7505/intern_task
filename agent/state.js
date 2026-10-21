import { Annotation } from '@langchain/langgraph';

/**
 * LangGraph Agent State definition for the TaskFlow voice sales bot.
 * Tracks conversation messages, customer profile, call progression stage,
 * language preferences, and refusal metrics.
 */
const AgentState = Annotation.Root({
  messages: Annotation({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  language: Annotation({ reducer: (_, n) => n, default: () => 'hi-en' }),
  callStage: Annotation({ reducer: (_, n) => n, default: () => 'greeting' }),
  customerProfile: Annotation({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({ name: null, company: null, teamSize: null, needs: [], budget: null, objections: [] }),
  }),
  interestSignals: Annotation({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  callId: Annotation({ reducer: (_, n) => n, default: () => '' }),
  intent: Annotation({ reducer: (_, n) => n, default: () => '' }),
  botReply: Annotation({ reducer: (_, n) => n, default: () => '' }),
  refusalCount: Annotation({ reducer: (_, n) => n, default: () => 0 }),
  summary: Annotation({ reducer: (_, n) => n, default: () => '' }),
  requirements: Annotation({ reducer: (_, n) => n, default: () => [] }),
  objections: Annotation({ reducer: (_, n) => n, default: () => [] }),
  nextSteps: Annotation({ reducer: (_, n) => n, default: () => [] }),
  salesStatus: Annotation({ reducer: (_, n) => n, default: () => '' }),
  salesStatusReason: Annotation({ reducer: (_, n) => n, default: () => '' }),
});

export { AgentState };
export default AgentState;
