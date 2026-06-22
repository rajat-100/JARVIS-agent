import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createMemory,
  readMemories,
  searchMemories,
  type MemoryRecord,
} from '../../lib/memoryStore';

type AgentResponse = {
  reply: string;
  memories?: MemoryRecord[];
  memoryCount?: number;
};

const extractMemory = (message: string) => {
  const match = message.match(/\bremember(?: that)?\s+(.+)/i);
  return match?.[1]?.trim();
};

const wantsMemorySummary = (message: string) => {
  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes('what do you know about me') ||
    normalizedMessage.includes('what have you remembered') ||
    normalizedMessage.includes('summarize my memory')
  );
};

const formatMemorySummary = (memories: MemoryRecord[]) => {
  if (memories.length === 0) {
    return 'I do not have any personal memories saved yet. Say “remember that...” and I will start building your profile.';
  }

  const topMemories = memories
    .slice(0, 6)
    .map((memory) => `${memory.category}: ${memory.content}`)
    .join('; ');

  return `Here is what I know so far: ${topMemories}.`;
};

const buildPersonalReply = (message: string, memories: MemoryRecord[]) => {
  if (memories.length === 0) {
    return `I heard you: "${message}". I do not know much about you yet, so tell me things to remember and I will personalize future answers.`;
  }

  const context = memories
    .map((memory) => `${memory.category}: ${memory.content}`)
    .join('; ');

  return `Based on what I remember about you (${context}), here is my response: "${message}" is now connected to your personal context. As we add the real model backend, I will use these memories to make the answer more specific to Rajat.`;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AgentResponse>
) {
  if (req.method !== 'POST') {
    res.status(405).json({ reply: 'Use POST to talk to your agent.' });
    return;
  }

  const message = String(req.body?.message ?? '').trim();

  if (!message) {
    res.status(400).json({ reply: 'Tell me what you want to work on first.' });
    return;
  }

  const savedMemory = extractMemory(message);
  if (savedMemory) {
    const memory = await createMemory(savedMemory);
    const memories = await readMemories();
    res.status(200).json({
      reply: `I have remembered that ${savedMemory}.`,
      memories: [memory],
      memoryCount: memories.length,
    });
    return;
  }

  const allMemories = await readMemories();
  if (wantsMemorySummary(message)) {
    res.status(200).json({
      reply: formatMemorySummary(allMemories),
      memories: allMemories.slice(0, 6),
      memoryCount: allMemories.length,
    });
    return;
  }

  const relevantMemories = await searchMemories(message);

  res.status(200).json({
    reply: buildPersonalReply(message, relevantMemories),
    memories: relevantMemories,
    memoryCount: allMemories.length,
  });
}
