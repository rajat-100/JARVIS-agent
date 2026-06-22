import type { NextApiRequest, NextApiResponse } from 'next';
import {
  clearMemories,
  createMemory,
  inferCategory,
  readMemories,
  type MemoryRecord,
} from '../../lib/memoryStore';

type MemoryResponse = {
  memories: MemoryRecord[];
  memory?: MemoryRecord;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MemoryResponse>
) {
  if (req.method === 'GET') {
    const memories = await readMemories();
    res.status(200).json({ memories });
    return;
  }

  if (req.method === 'POST') {
    const content = String(req.body?.content ?? '').trim();

    if (!content) {
      res.status(400).json({ memories: [], message: 'Memory content is required.' });
      return;
    }

    const category = req.body?.category || inferCategory(content);
    const memory = await createMemory(content, category);
    const memories = await readMemories();
    res.status(201).json({ memory, memories });
    return;
  }

  if (req.method === 'DELETE') {
    await clearMemories();
    res.status(200).json({ memories: [], message: 'All memories cleared.' });
    return;
  }

  res.status(405).json({ memories: [], message: 'Method not allowed.' });
}
