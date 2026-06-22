import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export type MemoryRecord = {
  id: string;
  category: 'preference' | 'identity' | 'goal' | 'project' | 'routine' | 'note';
  content: string;
  importance: number;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
};

const dataDirectory = path.join(process.cwd(), 'data');
const memoryPath = path.join(dataDirectory, 'personal-memory.json');

const categoryHints: Array<[MemoryRecord['category'], string[]]> = [
  ['preference', ['prefer', 'like', 'love', 'hate', 'style', 'voice']],
  ['goal', ['goal', 'want to', 'trying to', 'need to', 'plan']],
  ['project', ['project', 'app', 'agent', 'jarvis', 'build']],
  ['routine', ['daily', 'morning', 'night', 'routine', 'habit']],
  ['identity', ['i am', 'my name', 'work as', 'student', 'developer']],
];

const normalize = (value: string) => value.toLowerCase().replace(/[^\w\s]/g, '');

const tokenize = (value: string) =>
  normalize(value)
    .split(/\s+/)
    .filter((word) => word.length > 2);

const ensureMemoryFile = async () => {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(memoryPath, 'utf8');
  } catch {
    await writeFile(memoryPath, '[]', 'utf8');
  }
};

export const inferCategory = (content: string): MemoryRecord['category'] => {
  const normalizedContent = normalize(content);

  for (const [category, hints] of categoryHints) {
    if (hints.some((hint) => normalizedContent.includes(hint))) {
      return category;
    }
  }

  return 'note';
};

export const readMemories = async (): Promise<MemoryRecord[]> => {
  await ensureMemoryFile();
  const rawMemory = await readFile(memoryPath, 'utf8');
  return JSON.parse(rawMemory) as MemoryRecord[];
};

export const writeMemories = async (memories: MemoryRecord[]) => {
  await ensureMemoryFile();
  await writeFile(memoryPath, JSON.stringify(memories, null, 2), 'utf8');
};

export const createMemory = async (
  content: string,
  category = inferCategory(content),
  importance = 3
) => {
  const now = new Date().toISOString();
  const memories = await readMemories();
  const memory: MemoryRecord = {
    id: `${Date.now()}`,
    category,
    content,
    importance,
    createdAt: now,
    updatedAt: now,
  };

  memories.unshift(memory);
  await writeMemories(memories);
  return memory;
};

export const searchMemories = async (query: string, limit = 5) => {
  const memories = await readMemories();
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    return memories.slice(0, limit);
  }

  return memories
    .map((memory) => {
      const memoryTokens = tokenize(`${memory.category} ${memory.content}`);
      const overlap = queryTokens.filter((token) => memoryTokens.includes(token)).length;
      const categoryBoost = normalize(query).includes(memory.category) ? 1 : 0;

      return {
        memory,
        score: overlap + categoryBoost + memory.importance / 10,
      };
    })
    .filter(({ score }) => score > 0.25)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ memory }) => memory);
};

export const clearMemories = async () => {
  await writeMemories([]);
};
