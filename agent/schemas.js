import { z } from 'zod';

/**
 * Zod schema for structured NLU output in the understand node.
 * Evaluates the customer's intent, extracts lead qualification data,
 * and determines the recommended next conversation stage.
 */
export const UnderstandSchema = z.object({
  intent: z.enum([
    'question',
    'objection',
    'interest',
    'demo_request',
    'ready_to_buy',
    'refusal',
    'small_talk',
    'greeting',
    'unclear',
  ]).describe('The primary intent of the customer message'),
  extractedName: z.string().nullable().describe('Customer name if mentioned'),
  extractedCompany: z.string().nullable().describe('Company name if mentioned'),
  extractedTeamSize: z.number().nullable().describe('Team size if mentioned'),
  extractedNeeds: z.array(z.string()).describe('Any project management needs or pain points mentioned'),
  extractedBudget: z.string().nullable().describe('Budget information if mentioned'),
  extractedObjection: z.string().nullable().describe('The specific objection if intent is objection'),
  suggestedNextStage: z.enum([
    'greeting',
    'discovery',
    'pitch',
    'objection_handling',
    'closing',
    'wrap_up',
  ]).describe('Suggested next conversation stage'),
});

/**
 * Zod schema for structured post-call analysis in the summarize node.
 * Produces high-level call summaries, extracted requirements, objections,
 * actionable next steps, and final CRM sales status.
 */
export const SummarySchema = z.object({
  summary: z.string().describe('2-3 sentence summary of the call'),
  requirements: z.array(z.string()).describe('Customer requirements identified during the call'),
  objections: z.array(z.string()).describe('Objections raised by the customer'),
  nextSteps: z.array(z.string()).describe('Recommended next steps'),
  salesStatus: z.enum([
    'Converted',
    'Interested',
    'Follow-up Required',
    'Not Interested',
    'Demo Requested',
    'No Response',
  ]).describe('Sales outcome status'),
  salesStatusReason: z.string().describe('Brief reason for the status assignment'),
});

export default {
  UnderstandSchema,
  SummarySchema,
};
