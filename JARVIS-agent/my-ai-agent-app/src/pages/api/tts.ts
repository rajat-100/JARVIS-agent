import type { NextApiRequest, NextApiResponse } from 'next';

type ErrorResponse = {
  message: string;
};

const ELEVENLABS_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Buffer | ErrorResponse>
) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Use POST to generate speech.' });
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
  const text = String(req.body?.text ?? '').trim();

  if (!text) {
    res.status(400).json({ message: 'Text is required.' });
    return;
  }

  if (!apiKey) {
    res.status(501).json({ message: 'ELEVENLABS_API_KEY is not configured.' });
    return;
  }

  const response = await fetch(
    `${ELEVENLABS_TTS_URL}/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    res.status(response.status).json({
      message: errorText || 'Text-to-speech generation failed.',
    });
    return;
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(audioBuffer);
}
