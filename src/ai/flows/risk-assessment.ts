'use server';

/**
 * @fileOverview Risk assessment and management flow
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RiskAssessmentInputSchema = z.object({
  audit_data: z.string().describe('Current audit results and scores.'),
  incident_data: z.string().describe('Historical incident and accident data.'),
  occupancy_data: z.string().describe('Current occupancy and capacity information.'),
  staffing_data: z.string().describe('Staffing levels and competency information.'),
  context: z.string().optional().describe('Additional organizational context.'),
});

export type RiskAssessmentInput = z.infer<typeof RiskAssessmentInputSchema>;

const RiskAssessmentOutputSchema = z.object({
  overall_risk_level: z.string().describe('Overall risk assessment (Low/Medium/High/Critical).'),
  risk_areas: z.array(z.object({
    category: z.string(),
    risk_level: z.string(),
    description: z.string(),
    contributing_factors: z.array(z.string()),
    potential_impact: z.string(),
    likelihood: z.string(),
    mitigation_priority: z.string()
  })).describe('Detailed risk assessment by category.'),
  immediate_actions: z.array(z.object({
    action: z.string(),
    priority: z.string(),
    timeline: z.string(),
    responsible_party: z.string()
  })).describe('Immediate actions required to address high-risk areas.'),
  monitoring_recommendations: z.array(z.string()).describe('Ongoing monitoring and surveillance recommendations.'),
  preventive_measures: z.array(z.string()).describe('Preventive measures to reduce future risks.'),
  risk_score: z.number().describe('Quantitative risk score (0-100, higher = more risk).'),
  summary: z.string().describe('Executive summary of risk assessment findings.')
});

export type RiskAssessmentOutput = z.infer<typeof RiskAssessmentOutputSchema>;

export async function assessRisks(input: RiskAssessmentInput): Promise<RiskAssessmentOutput> {
  return riskAssessmentFlow(input);
}

const riskAssessmentPrompt = ai.definePrompt({
  name: 'riskAssessmentPrompt',
  input: { schema: RiskAssessmentInputSchema },
  output: { schema: RiskAssessmentOutputSchema },
  prompt: `You are a risk management expert specializing in healthcare and care home operations. Conduct a comprehensive risk assessment based on the provided data.

Audit Data:
{{{audit_data}}}

Incident Data:
{{{incident_data}}}

Occupancy Data:
{{{occupancy_data}}}

Staffing Data:
{{{staffing_data}}}

Organizational Context:
{{{context}}}

**Risk Assessment Framework:**

**Risk Categories to Evaluate:**
1. **Clinical Care Risks**: Medication errors, falls, pressure ulcers, infections
2. **Operational Risks**: Staffing shortages, equipment failure, supply chain issues
3. **Compliance Risks**: Regulatory violations, documentation gaps, training deficiencies
4. **Safety Risks**: Fire hazards, security breaches, environmental hazards
5. **Financial Risks**: Budget constraints, resource allocation issues
6. **Reputational Risks**: Service quality issues, complaint management

**Risk Level Criteria:**
- **Critical**: Immediate threat to resident safety or regulatory compliance
- **High**: Significant potential for harm or non-compliance
- **Medium**: Moderate risk requiring monitoring and mitigation
- **Low**: Minimal risk with adequate controls in place

**Assessment Factors:**
- Historical incident patterns
- Audit performance trends
- Staffing adequacy ratios
- Occupancy pressure points
- Regulatory compliance status
- Training completion rates

Provide specific, actionable recommendations with clear priorities and timelines. Focus on preventive measures and early intervention strategies.`
});

const riskAssessmentFlow = ai.defineFlow(
  {
    name: 'riskAssessmentFlow',
    inputSchema: RiskAssessmentInputSchema,
    outputSchema: RiskAssessmentOutputSchema,
  },
  async (input) => {
    const { output } = await riskAssessmentPrompt(input);
    return output!;
  }
);