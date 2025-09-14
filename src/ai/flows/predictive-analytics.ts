'use server';

/**
 * @fileOverview Predictive analytics and forecasting flow
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PredictiveInputSchema = z.object({
  historical_data: z.string().describe('Historical performance and trend data.'),
  current_metrics: z.string().describe('Current operational metrics.'),
  external_factors: z.string().optional().describe('External factors that may influence predictions.'),
  prediction_horizon: z.string().describe('Time period for predictions (e.g., 3-months, 6-months, 1-year).'),
  focus_areas: z.array(z.string()).describe('Specific areas to focus predictions on.'),
});

export type PredictiveInput = z.infer<typeof PredictiveInputSchema>;

const PredictiveOutputSchema = z.object({
  predictions: z.array(z.object({
    metric: z.string(),
    predicted_value: z.string(),
    confidence_level: z.number(),
    time_horizon: z.string(),
    drivers: z.array(z.string()),
    assumptions: z.array(z.string())
  })).describe('Specific predictions with confidence levels.'),
  trends: z.array(z.object({
    trend: z.string(),
    direction: z.string(),
    strength: z.string(),
    timeframe: z.string(),
    implications: z.string()
  })).describe('Identified trends and their implications.'),
  opportunities: z.array(z.object({
    opportunity: z.string(),
    potential_impact: z.string(),
    implementation_complexity: z.string(),
    timeline: z.string()
  })).describe('Identified opportunities for improvement.'),
  warnings: z.array(z.object({
    warning: z.string(),
    severity: z.string(),
    likelihood: z.string(),
    recommended_action: z.string()
  })).describe('Potential future risks or challenges.'),
  recommendations: z.array(z.object({
    recommendation: z.string(),
    rationale: z.string(),
    expected_benefit: z.string(),
    implementation_priority: z.string()
  })).describe('Strategic recommendations based on predictions.'),
  summary: z.string().describe('Executive summary of predictive insights.')
});

export type PredictiveOutput = z.infer<typeof PredictiveOutputSchema>;

export async function generatePredictiveInsights(input: PredictiveInput): Promise<PredictiveOutput> {
  return predictiveAnalyticsFlow(input);
}

const predictiveAnalyticsPrompt = ai.definePrompt({
  name: 'predictiveAnalyticsPrompt',
  input: { schema: PredictiveInputSchema },
  output: { schema: PredictiveOutputSchema },
  prompt: `You are a predictive analytics expert specializing in healthcare operations and care home management. Analyze historical data and current metrics to generate forward-looking insights and predictions.

Historical Data:
{{{historical_data}}}

Current Metrics:
{{{current_metrics}}}

External Factors:
{{{external_factors}}}

Prediction Horizon: {{{prediction_horizon}}}

Focus Areas: {{{focus_areas}}}

**Predictive Analysis Framework:**

**Key Prediction Areas:**
1. **Performance Trends**: Audit scores, quality metrics, resident satisfaction
2. **Operational Capacity**: Occupancy rates, staffing needs, resource utilization
3. **Compliance Trajectory**: Regulatory compliance, audit preparedness
4. **Financial Projections**: Budget impacts, cost trends, efficiency gains
5. **Risk Evolution**: Emerging risks, incident patterns, safety concerns
6. **Quality Indicators**: Care quality metrics, outcome measures

**Analytical Methods:**
- Time series analysis of historical data
- Regression modeling for trend extrapolation
- Seasonal pattern recognition
- Correlation analysis between key metrics
- Risk probability assessment
- Scenario planning and sensitivity analysis

**Prediction Confidence Levels:**
- **High (80-100%)**: Strong historical patterns, consistent data
- **Medium (60-79%)**: Moderate confidence with some variability
- **Low (40-59%)**: Limited data or high uncertainty
- **Speculative (<40%)**: Based on assumptions rather than data

**Consider External Factors:**
- Regulatory changes
- Seasonal patterns (winter pressure, summer staffing)
- Economic conditions
- Demographic trends
- Technology adoption
- Industry benchmarks

Provide actionable insights with clear confidence levels and implementation guidance. Focus on both opportunities and risks, with specific timelines and measurable outcomes.`
});

const predictiveAnalyticsFlow = ai.defineFlow(
  {
    name: 'predictiveAnalyticsFlow',
    inputSchema: PredictiveInputSchema,
    outputSchema: PredictiveOutputSchema,
  },
  async (input) => {
    const { output } = await predictiveAnalyticsPrompt(input);
    return output!;
  }
);