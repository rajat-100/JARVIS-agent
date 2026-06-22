import type { NextApiRequest, NextApiResponse } from 'next';

type AgentResponse = {
  reply: string;
};

export default function handler(
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

  res.status(200).json({
    reply: `Logged: "${message}". Next step is connecting this layer to your real memory, tools, and model backend.`,
  });
}
