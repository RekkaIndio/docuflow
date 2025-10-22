import { NextRequest, NextResponse } from 'next/server';
import { getCqcRegulationDetail } from '@/lib/cqc-regulations';

export const runtime = 'nodejs';
export const maxDuration = 20;

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'from',
  'this',
  'these',
  'those',
  'have',
  'been',
  'shall',
  'must',
  'will',
  'into',
  'about',
  'under',
  'part',
  'parts',
  'section',
  'sections',
  'paragraph',
  'paragraphs',
  'subsection',
  'subsections',
  'regulation',
  'regulations',
  'regs',
  'cqc',
  'care',
  'quality',
  'commission',
  'service',
  'services',
  'people',
  'persons',
  'provider',
  'providers',
]);

const clipText = (value: string, limit = 480) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.length <= limit) return trimmed;
  const sliceLimit = Math.max(0, limit - 3);
  return `${trimmed.slice(0, sliceLimit).trimEnd()}...`;
};

const decodeEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#8211;/gi, '-')
    .replace(/&#8212;/gi, '-')
    .replace(/&bull;/gi, '-');

const sanitizeHtml = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');

const extractSections = (html: string): string[] => {
  const cleaned = sanitizeHtml(html);
  const sections: string[] = [];
  const sectionRegex = /<(p|li|h[2-4])[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = sectionRegex.exec(cleaned)) !== null) {
    const raw = match[2] ?? '';
    const text = decodeEntities(raw)
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) sections.push(text);
  }

  return sections;
};

const scoreSection = (section: string, keywords: string[], fullQuery: string) => {
  const lower = section.toLowerCase();
  let score = 0;

  if (fullQuery && lower.includes(fullQuery)) {
    score += 6;
  }

  for (const keyword of keywords) {
    if (keyword.length === 0) continue;
    if (lower.includes(keyword)) score += 2;
  }

  return score;
};

const extractSnippet = (html: string, query?: string | null): string | null => {
  const sections = extractSections(html);
  if (sections.length === 0) return null;

  if (!query) {
    return clipText(sections.slice(0, 2).join(' '));
  }

  const normalizedQuery = query.toLowerCase().trim();
  const rawKeywords = normalizedQuery.split(/\s+/);
  const keywords = rawKeywords
    .map((word) => word.replace(/[^a-z0-9()\-]/g, '').trim())
    .filter((word) => {
      if (!word) return false;
      if (STOP_WORDS.has(word)) return false;
      if (word.length > 2) return true;
      return /\d/.test(word);
    });

  let bestIndex = -1;
  let bestScore = -1;

  sections.forEach((section, index) => {
    const score = scoreSection(section, keywords, normalizedQuery);
    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  });

  if (bestIndex === -1 || bestScore <= 0) {
    return clipText(sections.slice(0, 2).join(' '));
  }

  const windowSections = [
    sections[bestIndex - 1],
    sections[bestIndex],
    sections[bestIndex + 1],
  ].filter(Boolean) as string[];

  const combined = windowSections.length > 0 ? windowSections.join(' ') : sections[bestIndex];
  return clipText(combined);
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const codeParam = searchParams.get('code');

  if (!codeParam) {
    return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
  }

  const detail = getCqcRegulationDetail(codeParam);
  if (!detail) {
    return NextResponse.json({ error: 'Regulation not found' }, { status: 404 });
  }

  const focus = searchParams.get('q');
  let snippet: string | null = null;

  try {
    const response = await fetch(detail.url, { next: { revalidate: 43200 } });
    if (response.ok) {
      const html = await response.text();
      snippet = extractSnippet(html, focus);
    }
  } catch (error) {
    console.error('Failed to fetch CQC regulation page', error);
  }

  return NextResponse.json({
    code: detail.code,
    label: detail.label,
    title: detail.title,
    summary: detail.summary,
    url: detail.url,
    snippet,
  });
}
