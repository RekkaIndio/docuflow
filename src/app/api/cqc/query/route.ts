import { NextRequest, NextResponse } from 'next/server';
import { getCqcRegulationDetail } from '@/lib/cqc-regulations';
import { getDefaultOpenAIModel, getOpenAIClient, isOpenAIEnabled } from '@/ai/openai-utils';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MODEL_FALLBACK = 'gpt-5';

const toInstruction = (regulationCode?: string | null, focus?: string | null) => {
  const extra: string[] = [];
  if (regulationCode) {
    extra.push(`If relevant, highlight how Regulation ${regulationCode} applies.`);
  }
  if (focus) {
    extra.push(`The user is particularly interested in: ${focus}.`);
  }
  extra.push('Always cite at least one official CQC source URL when possible.');
  extra.push('Respond ONLY with valid JSON following this shape: {"summary": string, "sources": [{"title"?: string, "url": string}]}.');
  extra.push('Do not include commentary outside of the JSON. Do not fabricate references or invent guidance.');
  return [
    'You are a compliance assistant for UK care providers.',
    'Use the web_search tool to look up the latest official guidance from the Care Quality Commission (CQC) and trusted UK government sources.',
    'Answer succinctly and objectively. Include regulation numbers or section names when the source provides them.',
    'Return valid JSON that contains a human readable summary plus an array of supporting sources.',
    ...extra,
  ].join(' ');
};

export async function POST(request: NextRequest) {
  if (!isOpenAIEnabled()) {
    return NextResponse.json({ error: 'OpenAI integration is not configured.' }, { status: 503 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  const regulationCode = typeof body?.regulationCode === 'string' ? body.regulationCode.trim() : undefined;
  const focus = typeof body?.focus === 'string' ? body.focus.trim() : undefined;

  if (!question) {
    return NextResponse.json({ error: 'Question is required.' }, { status: 400 });
  }

  const regulationDetail = regulationCode ? getCqcRegulationDetail(regulationCode) : null;

  try {
    const client = getOpenAIClient();
    const model = process.env.OPENAI_WEB_SEARCH_MODEL || process.env.OPENAI_REGULATION_MODEL || getDefaultOpenAIModel() || MODEL_FALLBACK;

    const response = await client.responses.create({
      model,
      tools: [{ type: 'web_search' }],
      input: [
        { role: 'system', content: toInstruction(regulationDetail?.code, focus) },
        {
          role: 'user',
          content: [
            `Provide CQC guidance for the following question: ${question}.`,
            regulationDetail?.title ? `Commonly relevant regulation: ${regulationDetail.label} – ${regulationDetail.title}.` : undefined,
            focus ? `Key focus: ${focus}.` : undefined,
          ]
            .filter(Boolean)
            .join(' '),
        },
      ],
    });

    const outputText = response?.output_text?.trim();
    let summary: string | undefined;
    let sources: Array<{ title?: string; url: string }> = [];
    let urlFromText: string | null = null;

    if (outputText) {
      try {
        const parsed = JSON.parse(outputText);
        if (parsed && typeof parsed.summary === 'string') {
          summary = parsed.summary.trim();
        }
        if (Array.isArray(parsed?.sources)) {
          sources = parsed.sources
            .filter((item: any) => item && typeof item.url === 'string')
            .map((item: any) => ({
              url: String(item.url),
              title: typeof item.title === 'string' ? item.title.trim() : undefined,
            }));
        }
      } catch (error) {
        summary = outputText;
      }

      if (!sources.length) {
        const match = outputText.match(/https?:\/\/\S+/i);
        if (match) urlFromText = match[0];
      }
    }

    if (!summary) {
      summary = 'I could not retrieve guidance just now.';
    }

    const preferredSource = sources.find((source) => /cqc\.org\.uk/i.test(source.url));
    const fallbackSource = sources[0];
    const url = preferredSource?.url || fallbackSource?.url || urlFromText || regulationDetail?.url || null;

    return NextResponse.json({
      summary,
      url,
      sources,
      regulation: regulationDetail
        ? {
            code: regulationDetail.code,
            label: regulationDetail.label,
            title: regulationDetail.title,
            url: regulationDetail.url,
          }
        : null,
    });
  } catch (error) {
    console.error('Failed to query OpenAI for CQC guidance', error);
    return NextResponse.json({ error: 'Failed to fetch CQC guidance.' }, { status: 500 });
  }
}
