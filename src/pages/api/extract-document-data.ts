import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import formidable from 'formidable';
import fs from 'fs';
import { Buffer } from 'buffer';

export const config = {
  api: {
    bodyParser: false,
  },
};



async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractTextFromDoc(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

async function extractAllDataWithOpenAI(text: string, filename: string, mimetype: string): Promise<any> {
  const openai = new OpenAI({ apiKey: process.env.OPEN_API_KEY });
  // Split by page using form feed '\f' (common PDF page delimiter)
  const pages = text.split('\f');
  const structuredPages: any[] = [];
  const openaiStructuredPages: any[] = [];
  const openaiRawPages: any[] = [];
  for (let i = 0; i < pages.length; i++) {
    const pageText = pages[i].trim();
    if (!pageText) continue;
    const prompt = `Turn this into a well structured JSON.\n\nCRITICAL: You must not change, summarize, paraphrase, or omit any information. Every word, bullet point, list, table, and every piece of information must be preserved exactly as in the original text.\n- Do not reword, reformat, or skip any content.\n- Preserve all formatting, bullet points, lists, and tables as they appear.\n- Only structure the data as JSON, grouping by logical sections, headings, and lists.\n- If you see bullet points or lists, represent them as arrays in the JSON.\n- If you see tables, represent them as arrays of objects.\n- Do not summarize or omit anything.\n\nDocument text (page ${i+1}):\n${pageText}`;
    const messages = [
      { role: 'system', content: 'You are a document extraction assistant. Always return valid JSON. Structure the output as much as possible.' },
      { role: 'user', content: prompt }
    ];
    let openaiStructured: any = undefined;
    let openaiRaw: string | undefined = undefined;
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages as any,
        max_tokens: 4096,
        temperature: 0.0,
      });
      openaiRaw = response.choices[0].message.content || undefined;
      try {
        openaiStructured = JSON.parse(openaiRaw || '{}');
        structuredPages.push(openaiStructured);
        openaiStructuredPages.push(openaiStructured);
      } catch (e) {
        // If not valid JSON, fallback to content
        structuredPages.push({ content: openaiRaw });
        openaiStructuredPages.push(openaiRaw);
      }
      openaiRawPages.push(openaiRaw);
    } catch (e: any) {
      console.error(`OpenAI extraction failed for page ${i+1}:`, e);
      structuredPages.push({ error: 'OpenAI extraction failed', details: e?.message || e });
      openaiStructuredPages.push(null);
      openaiRawPages.push(null);
    }
  }
  // Merge all pages into a single object
  const extractedJson = {
    pages: structuredPages,
    _openaiStructured: openaiStructuredPages,
    _openaiRaw: openaiRawPages,
    pageCount: pages.length,
    content: text // Also add the full raw text for reference
  };
  return extractedJson;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const form = formidable({
    maxFileSize: 100 * 1024 * 1024, // 100MB
    multiples: false,
  });
  form.parse(req, async (err, fields, files) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'File too large. Max 100MB allowed.' });
        return;
      }
      res.status(500).json({ error: 'Error parsing form data', details: err.message });
      return;
    }
    const fileField = files.file;
    let fileObj: any = undefined;
    if (Array.isArray(fileField)) {
      fileObj = fileField[0];
    } else if (fileField) {
      fileObj = fileField;
    }
    if (!fileObj) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const filePath = fileObj.filepath || fileObj.path;
    const buffer = fs.readFileSync(filePath);
    const mimetype = fileObj.mimetype || fileObj.type || 'application/octet-stream';
    const filename = fileObj.originalFilename || fileObj.newFilename || 'document';
    let text = '';
    if (mimetype === 'application/pdf') {
      text = await extractTextFromPdf(buffer);
    } else if (
      mimetype === 'application/msword' ||
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      text = await extractTextFromDoc(buffer);
    } else {
      res.status(400).json({ error: 'Unsupported file type' });
      return;
    }
    try {
      const extractedJson = await extractAllDataWithOpenAI(text, filename, mimetype);
      res.status(200).json({ extractedJson });
    } catch (e: any) {
      // Log the full error for debugging
      console.error('OpenAI extraction failed:', e);
      if (e?.response) {
        // If OpenAI error, log the response data
        console.error('OpenAI error response:', e.response.data);
      }
      res.status(500).json({ error: 'OpenAI extraction failed', details: e?.message || e, stack: e?.stack });
    }
  });
}
