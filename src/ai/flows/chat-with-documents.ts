
'use server';

/**
 * @fileOverview Implements the ChatWithDocuments flow, allowing users to ask questions about uploaded documents and receive answers based on extracted data.
 *
 * - chatWithDocuments - A function that handles the chat with documents process.
 * - ChatWithDocumentsInput - The input type for the chatWithDocuments function.
 * - ChatWithDocumentsOutput - The return type for the chatWithDocuments function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';


// MOCK WEB SEARCH TOOL - In a real app, this would use a real search API.
const webSearch = ai.defineTool(
  {
    name: 'webSearch',
    description: 'Searches the web for information.',
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.string(),
  },
  async ({ query }) => {
    console.log(`[Web Search] Searching for: ${query}`);
    // This is a mock response.
    if (query.toLowerCase().includes('genkit')) {
        return 'Genkit is an open source framework from Google that helps you build, deploy, and monitor production-ready AI applications.';
    }
    if (query.toLowerCase().includes('firebase')) {
        return 'Firebase is an app development platform that helps you build and grow apps and games users love. Backed by Google and trusted by millions of businesses around the world.';
    }
    return `No results found for "${query}". Try searching for "Genkit" or "Firebase".`;
  }
);


const ChatWithDocumentsInputSchema = z.object({
  query: z.string().describe('The user query about the documents.'),
  documentJson: z.string().describe('The JSON representation of the document content.'),
});
export type ChatWithDocumentsInput = z.infer<typeof ChatWithDocumentsInputSchema>;

const ChatWithDocumentsOutputSchema = z.object({
  answer: z.string().describe('The answer to the user query based on the document content.'),
});
export type ChatWithDocumentsOutput = z.infer<typeof ChatWithDocumentsOutputSchema>;

export async function chatWithDocuments(input: ChatWithDocumentsInput): Promise<ChatWithDocumentsOutput> {
  return chatWithDocumentsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'chatWithDocumentsPrompt',
  input: {schema: ChatWithDocumentsInputSchema},
  output: {schema: ChatWithDocumentsOutputSchema},
  tools: [webSearch],
  prompt: `You are a helpful document assistant. First, use the provided document content to answer the user's question. If the document doesn't contain the answer, you can use the webSearch tool to find relevant information from the internet.

Document Content:
{{{documentJson}}}

Question: {{{query}}}

Answer: `,
});

const chatWithDocumentsFlow = ai.defineFlow(
  {
    name: 'chatWithDocumentsFlow',
    inputSchema: ChatWithDocumentsInputSchema,
    outputSchema: ChatWithDocumentsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
