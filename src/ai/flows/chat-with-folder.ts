'use server';

/**
 * @fileOverview Implements the ChatWithFolder flow, allowing users to ask questions about all documents within a folder.
 *
 * - chatWithFolder - A function that handles the chat with folder process.
 * - ChatWithFolderInput - The input type for the chatWithFolder function.
 * - ChatWithFolderOutput - The return type for the chatWithFolder function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatWithFolderInputSchema = z.object({
  query: z.string().describe('The user query about the documents in the folder.'),
  documentsJson: z.string().describe('The JSON representation of all the document content in the folder.'),
});
export type ChatWithFolderInput = z.infer<typeof ChatWithFolderInputSchema>;

const ChatWithFolderOutputSchema = z.object({
  answer: z.string().describe('The answer to the user query based on the folder content.'),
});
export type ChatWithFolderOutput = z.infer<typeof ChatWithFolderOutputSchema>;

export async function chatWithFolder(input: ChatWithFolderInput): Promise<ChatWithFolderOutput> {
  return chatWithFolderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'chatWithFolderPrompt',
  input: {schema: ChatWithFolderInputSchema},
  output: {schema: ChatWithFolderOutputSchema},
  prompt: `You are a helpful document assistant. Use the provided content from multiple documents within a folder to answer the user's question.

Documents Content (in JSON format):
{{{documentsJson}}}

Question: {{{query}}}

Answer: `,
});

const chatWithFolderFlow = ai.defineFlow(
  {
    name: 'chatWithFolderFlow',
    inputSchema: ChatWithFolderInputSchema,
    outputSchema: ChatWithFolderOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
