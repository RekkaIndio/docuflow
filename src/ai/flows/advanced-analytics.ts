'use server';

/**
 * @fileOverview Advanced analytics and insights flow for comprehensive data analysis
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyticsInputSchema = z.object({
  query: z.string().describe('The analytics query or request for insights.'),
  data: z.string().describe('The JSON data to analyze.'),
  context: z.string().optional().describe('Additional context about the analysis request.'),
});

export type AnalyticsInput = z.infer<typeof AnalyticsInputSchema>;

const AnalyticsOutputSchema = z.object({
  insights: z.array(z.string()).describe('Key insights and findings from the analysis.'),
  recommendations: z.array(z.string()).describe('Actionable recommendations based on the analysis.'),
  trends: z.array(z.object({
    metric: z.string(),
    trend: z.string(),
    confidence: z.number(),
    explanation: z.string()
  })).describe('Identified trends with confidence levels.'),
  risks: z.array(z.object({
    level: z.string(),
    description: z.string(),
    impact: z.string(),
    mitigation: z.string()
  })).describe('Identified risks and mitigation strategies.'),
  summary: z.string().describe('Executive summary of the analysis.')
});

export type AnalyticsOutput = z.infer<typeof AnalyticsOutputSchema>;

export async function performAdvancedAnalytics(input: AnalyticsInput): Promise<AnalyticsOutput> {
  return advancedAnalyticsFlow(input);
}

const advancedAnalyticsPrompt = ai.definePrompt({
  name: 'advancedAnalyticsPrompt',
  input: { schema: AnalyticsInputSchema },
  output: { schema: AnalyticsOutputSchema },
  prompt: `You are an expert data analyst specializing in healthcare and care home operations. Analyze the provided data and generate comprehensive insights, trends, risks, and recommendations.

Data to analyze:
{{{data}}}

Query/Request: {{{query}}}

Additional Context: {{{context}}}

Please provide a thorough analysis including:

1. **Key Insights**: Extract the most important findings from the data
2. **Trends**: Identify patterns, changes over time, and future projections
3. **Risks**: Highlight potential issues, compliance gaps, or operational concerns
4. **Recommendations**: Provide actionable suggestions for improvement

Focus on:
- Performance metrics and KPIs
- Compliance and regulatory requirements
- Operational efficiency
- Risk management
- Quality of care indicators
- Resource utilization
- Predictive analytics where possible

Be specific, data-driven, and provide confidence levels where applicable.
Structure your response to be immediately actionable for care home management.`
});

const advancedAnalyticsFlow = ai.defineFlow(
  {
    name: 'advancedAnalyticsFlow',
    inputSchema: AnalyticsInputSchema,
    outputSchema: AnalyticsOutputSchema,
  },
  async (input) => {
    const { output } = await advancedAnalyticsPrompt(input);
    return output!;
  }
);