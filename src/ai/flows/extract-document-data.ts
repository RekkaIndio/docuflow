
'use server';

/**
 * @fileOverview This file defines a Genkit flow for extracting structured data and tags from documents.
 *
 * - extractDocumentData - A function that initiates the document data extraction process.
 * - ExtractDocumentDataInput - The input type for the extractDocumentData function.
 * - ExtractDocumentDataOutput - The return type for the extractDocumentData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { Buffer } from 'buffer';
// Utility: Extract all text from a PDF (all pages)
async function extractAllTextFromPdf(buffer: Buffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  let fullText = '';
  const maxPages = 100;
  const lastPage = Math.min(pdf.numPages, maxPages);
  for (let i = 1; i <= lastPage; i++) {
    try {
      // eslint-disable-next-line no-console
      console.log(`Extracting page ${i} of ${lastPage}`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(' ');
      fullText += `\n--- Page ${i} ---\n` + pageText;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Failed to extract page ${i}:`, err);
    }
  }
  return fullText;
}

// Utility: Extract all text from a DOC or DOCX file
async function extractAllTextFromDoc(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

const ExtractDocumentDataInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      'A document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type ExtractDocumentDataInput = z.infer<typeof ExtractDocumentDataInputSchema>;

const ExtractDocumentDataOutputSchema = z.object({
  extractedData: z.string().describe('The extracted structured data from the document as a JSON formatted string.'),
  tags: z.array(z.string()).describe('A list of 3-5 relevant keywords or tags based on the document content.'),
  summary: z.string().describe('A concise 5-line summary of the document.'),
});
export type ExtractDocumentDataOutput = z.infer<typeof ExtractDocumentDataOutputSchema>;

export async function extractDocumentData(input: ExtractDocumentDataInput): Promise<ExtractDocumentDataOutput> {
  return extractDocumentDataFlow(input);
}

const extractDocumentDataPrompt = ai.definePrompt({
  name: 'extractDocumentDataPrompt',
  input: {schema: z.object({ documentContent: z.string() }) },
  output: {schema: ExtractDocumentDataOutputSchema},
  prompt: `You are a meticulous and highly accurate data extraction engine. Your primary function is to extract ALL structured and semi-structured information from a given document, generate relevant tags, and provide a concise summary.

Your tasks are:
1.  **Extract Data**: Process the document content provided and convert its entire content into a well-formed JSON object.
  - Extract all text, including headers, footers, and body content.
  - Identify and extract all key-value pairs.
  - Capture all data from tables, preserving their structure.
  - Do not summarize, abbreviate, or alter the content. Extract it exactly as it appears.
  - The goal is a complete and lossless representation of the document's data in JSON format.
  - Return the result as a JSON formatted string in the 'extractedData' field.

2.  **Generate Tags**: Based on the document's content, generate a list of 3-5 relevant keywords or tags. These tags should accurately reflect the main topics or subjects of the document (e.g., "invoice", "contract", "Q3-report", "legal").
  - Return this list as an array of strings in the 'tags' field.

3.  **Summary**: Write a concise, single-paragraph summary of the document in no more than 5 sentences. The summary should provide a clear, readable overview of the document's main points, topics, and purpose, and should not simply list metadata or copy text verbatim. Focus on what the document is about and what a user would learn or find inside. Avoid bullet points, lists, or repeating document headers. Return this as a string in the 'summary' field.

Document Content:
{{{documentContent}}}
`,
});


const extractExcelData = (buffer: Buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetData: Record<string, any> = {};
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet);
    sheetData[sheetName] = json;
  });
  return JSON.stringify(sheetData, null, 2);
};


const extractDocumentDataFlow = ai.defineFlow(
  {
    name: 'extractDocumentDataFlow',
    inputSchema: ExtractDocumentDataInputSchema,
    outputSchema: ExtractDocumentDataOutputSchema,
  },
  async ({ documentDataUri }) => {
    const mimeMatch = documentDataUri.match(/^data:(.*?);base64,/);
    if (!mimeMatch) {
      throw new Error('Invalid data URI format.');
    }
    const mimeType = mimeMatch[1];
    
    const base64Data = documentDataUri.substring(documentDataUri.indexOf(',') + 1);
    const buffer = Buffer.from(base64Data, 'base64');

    // Excel
    if (
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      const documentContent = extractExcelData(buffer);
      const { output } = await extractDocumentDataPrompt({ documentContent });
      return output!;
    }

    // PDF
    if (mimeType === 'application/pdf') {
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;
      const pageCount = pdf.numPages;
      let documentContent = '';
      // Always extract all pages up to maxPages
      documentContent = await extractAllTextFromPdf(buffer);
      // If the document is small, send to OpenAI; otherwise, return raw extraction
      const PAGE_THRESHOLD = 30;
      if (pageCount <= PAGE_THRESHOLD) {
        const { output } = await extractDocumentDataPrompt({ documentContent });
        return output!;
      } else {
        // For large documents, skip OpenAI and return extracted text only
        return {
          extractedData: documentContent,
          tags: ['large-document'],
          summary: `Document has ${pageCount} pages. Extraction complete. Further processing skipped due to size.`
        };
      }
    }

    // DOC/DOCX
    if (
      mimeType === 'application/msword' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const documentContent = await extractAllTextFromDoc(buffer);
      const { output } = await extractDocumentDataPrompt({ documentContent });
      return output!;
    }

    // Fallback: Use media helper for other file types
    const prompt = ai.definePrompt({
      name: 'extractDocumentDataWithMediaPrompt',
      input: { schema: ExtractDocumentDataInputSchema },
      output: { schema: ExtractDocumentDataOutputSchema },
      prompt: `You are a meticulous and highly accurate data extraction engine. Your primary function is to extract ALL structured and semi-structured information from a given document, generate relevant tags, and provide a concise summary.

Your tasks are:
1.  **Extract Data**: Process the ENTIRE document provided (including every page, not just the first page) and convert its entire content into a well-formed JSON object.
  - Extract all text, including headers, footers, and body content from every page.
  - Identify and extract all key-value pairs.
  - Capture all data from tables, preserving their structure.
  - Do not summarize, abbreviate, or alter the content. Extract it exactly as it appears.
  - The goal is a complete and lossless representation of the document's data in JSON format, covering every page.
  - Return the result as a JSON formatted string in the 'extractedData' field.

2.  **Generate Tags**: Based on the document's content, generate a list of 3-5 relevant keywords or tags. These tags should accurately reflect the main topics or subjects of the document (e.g., "invoice", "contract", "Q3-report", "legal").
  - Return this list as an array of strings in the 'tags' field.

3.  **Summary**: Write a concise summary of the document in 5 lines or less, capturing the main points, topics, or purpose of the document. This should be clear, readable, and useful for a user to quickly understand what the document is about.
  - Return this as a string in the 'summary' field.

Document: {{media url=documentDataUri}}`,
    });

    const { output } = await prompt({ documentDataUri });
    return output!;
  }
);
