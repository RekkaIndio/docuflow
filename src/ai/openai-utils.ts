import { OpenAI } from 'openai';

const MAX_SECTION_CHARS = 12000;
const MAX_STRING_VALUE_CHARS = 800;
const DEFAULT_MODEL = process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

let cachedClient: OpenAI | null = null;

const resolveApiKey = () => process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || '';

function getClient(): OpenAI {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured. Set OPEN_API_KEY or OPENAI_API_KEY.');
  }
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey });
  }
  return cachedClient;
}

export function isOpenAIEnabled(): boolean {
  try {
    return Boolean(resolveApiKey());
  } catch {
    return false;
  }
}

const truncateString = (value: string, limit: number): string => {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}\n\n[Context truncated to ${limit} characters]`;
};

const sanitizeJsonValue = (_key: string, value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.length > MAX_STRING_VALUE_CHARS ? `${value.slice(0, MAX_STRING_VALUE_CHARS)}…` : value;
  }
  return value;
};

const prettyPrint = (payload: unknown): string => {
  if (payload === undefined || payload === null) return '';
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (!trimmed) return '';
    try {
      const parsed = JSON.parse(trimmed);
      return JSON.stringify(parsed, sanitizeJsonValue, 2);
    } catch {
      return truncateString(trimmed, MAX_SECTION_CHARS);
    }
  }
  try {
    return JSON.stringify(payload, sanitizeJsonValue, 2);
  } catch {
    return truncateString(String(payload), MAX_SECTION_CHARS);
  }
};

type ContextSection = {
  title: string;
  payload?: unknown;
};

export async function generateOpenAIAnswer({
  query,
  contextSections,
  temperature = 0.2,
}: {
  query: string;
  contextSections: ContextSection[];
  temperature?: number;
}): Promise<{ answer: string }>
{
  const client = getClient();

  const context = contextSections
    .map(({ title, payload }) => {
      const body = prettyPrint(payload);
      if (!body) return '';
      const safeBody = truncateString(body, MAX_SECTION_CHARS);
      return `### ${title}\n${safeBody}`;
    })
    .filter(Boolean)
    .join('\n\n');

  const systemMessage = `You are the CG360 compliance co-pilot. Analyse structured data, policy extracts, audit results, staffing outputs, and workspace analytics. Deliver accurate, actionable answers that reference the provided material. Highlight risks, deadlines, and next steps when relevant. If critical information is missing, state the gap and suggest how to obtain it.`;

  const userMessage = `User question:\n${query}\n\nContext:\n${context || 'No additional context provided.'}\n\nInstructions:\n- Reference document titles, dates, or metrics from the context whenever possible.\n- If numbers or dates are mentioned, include them in the answer.\n- Provide clear, concise guidance tailored to care-home compliance workflows.\n- Suggest follow-up actions when appropriate.`;

  const response = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    temperature,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
  });

  const answer = response.choices?.[0]?.message?.content?.trim() || 'I could not generate a response at this time.';
  return { answer };
}
