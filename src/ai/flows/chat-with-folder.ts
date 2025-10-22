'use server';

/**
 * @fileOverview Implements the ChatWithFolder flow, allowing users to ask questions about all documents within a folder.
 *
 * - chatWithFolder - A function that handles the chat with folder process.
 * - ChatWithFolderInput - The input type for the chatWithFolder function.
 * - ChatWithFolderOutput - The return type for the chatWithFolder function.
 */

import {ai} from '@/ai/genkit';
import { generateOpenAIAnswer, isOpenAIEnabled } from '@/ai/openai-utils';
import {z} from 'genkit';

const ChatWithFolderInputSchema = z.object({
  query: z.string().describe('The user query about the documents in the folder.'),
  documentsJson: z.string().describe('The JSON representation of all the document content in the folder.'),
  workspaceContext: z.string().optional(),
  extraContext: z.string().optional(),
});
export type ChatWithFolderInput = z.infer<typeof ChatWithFolderInputSchema>;

const ChatWithFolderOutputSchema = z.object({
  answer: z.string().describe('The answer to the user query based on the folder content.'),
});
export type ChatWithFolderOutput = z.infer<typeof ChatWithFolderOutputSchema>;

export async function chatWithFolder(input: ChatWithFolderInput): Promise<ChatWithFolderOutput> {
  if (isOpenAIEnabled()) {
    try {
      return await chatWithFolderOpenAI(input);
    } catch (err) {
      console.warn('OpenAI chatWithFolder failed, falling back to Genkit prompt.', err);
    }
  }
  return chatWithFolderFlow(input);
}

const parseJson = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
};

async function chatWithFolderOpenAI(input: ChatWithFolderInput): Promise<ChatWithFolderOutput> {
  const contextSections = [
    {
      title: 'Folder documents content',
      payload: parseJson(input.documentsJson),
    },
    {
      title: 'Workspace context',
      payload: parseJson(input.workspaceContext),
    },
    {
      title: 'Additional context',
      payload: parseJson(input.extraContext),
    },
  ];

  const { answer } = await generateOpenAIAnswer({
    query: input.query,
    contextSections,
  });

  return { answer };
}

const prompt = ai.definePrompt({
  name: 'chatWithFolderPrompt',
  input: {schema: ChatWithFolderInputSchema},
  output: {schema: ChatWithFolderOutputSchema},
  prompt: `You are a helpful document assistant. Use the provided content from multiple documents within a folder to answer the user's question.

Workspace Context:
{{{workspaceContext}}}

Additional Context:
{{{extraContext}}}

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
