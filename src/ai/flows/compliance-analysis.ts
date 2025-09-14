'use server';

/**
 * @fileOverview Compliance analysis and gap identification flow
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ComplianceInputSchema = z.object({
  policies: z.array(z.string()).describe('List of existing policies.'),
  audits: z.string().describe('Audit data and results.'),
  requirements: z.string().describe('Regulatory requirements and standards.'),
  context: z.string().optional().describe('Additional context about the organization.'),
});

export type ComplianceInput = z.infer<typeof ComplianceInputSchema>;

const ComplianceOutputSchema = z.object({
  compliance_score: z.number().describe('Overall compliance score (0-100).'),
  gaps: z.array(z.object({
    area: z.string(),
    severity: z.string(),
    description: z.string(),
    required_action: z.string(),
    deadline: z.string().optional()
  })).describe('Identified compliance gaps.'),
  strengths: z.array(z.string()).describe('Areas of strong compliance.'),
  recommendations: z.array(z.object({
    priority: z.string(),
    action: z.string(),
    timeline: z.string(),
    responsible_party: z.string()
  })).describe('Recommended actions to address gaps.'),
  next_review_date: z.string().describe('Recommended date for next compliance review.'),
  summary: z.string().describe('Executive summary of compliance status.')
});

export type ComplianceOutput = z.infer<typeof ComplianceOutputSchema>;

export async function analyzeCompliance(input: ComplianceInput): Promise<ComplianceOutput> {
  return complianceAnalysisFlow(input);
}

const complianceAnalysisPrompt = ai.definePrompt({
  name: 'complianceAnalysisPrompt',
  input: { schema: ComplianceInputSchema },
  output: { schema: ComplianceOutputSchema },
  prompt: `You are a compliance expert specializing in healthcare and care home regulations. Analyze the provided information to assess compliance status and identify gaps.

Existing Policies:
{{{policies}}}

Audit Data:
{{{audits}}}

Regulatory Requirements:
{{{requirements}}}

Organization Context:
{{{context}}}

Conduct a comprehensive compliance analysis covering:

**Regulatory Frameworks:**
- CQC (Care Quality Commission) standards
- Health & Safety regulations
- Safeguarding requirements
- Medication management standards
- Infection control protocols
- Staff training requirements
- Documentation standards

**Assessment Areas:**
1. Policy completeness and adequacy
2. Audit compliance and performance
3. Documentation and record-keeping
4. Staff training and competency
5. Risk management procedures
6. Quality assurance processes

**Scoring Methodology:**
- 90-100%: Excellent compliance
- 75-89%: Good compliance with minor gaps
- 60-74%: Moderate compliance requiring attention
- Below 60%: Significant compliance issues

Provide specific, actionable recommendations with clear timelines and responsible parties.`
});

const complianceAnalysisFlow = ai.defineFlow(
  {
    name: 'complianceAnalysisFlow',
    inputSchema: ComplianceInputSchema,
    outputSchema: ComplianceOutputSchema,
  },
  async (input) => {
    const { output } = await complianceAnalysisPrompt(input);
    return output!;
  }
);