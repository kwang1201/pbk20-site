// Vercel serverless function: bilingual translation via Claude Haiku
// POST /api/translate  body: { text: "..." }
// Response: { ko: "...", en: "...", detected: "ko" | "en" }
//
// Requires ANTHROPIC_API_KEY env var set in Vercel project settings.

module.exports = async function handler(req, res) {
  // CORS — allow the static site to call this same-origin or otherwise
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const body = req.body || {};
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) return res.status(400).json({ error: 'text required' });
  if (text.length > 4000) return res.status(400).json({ error: 'text too long' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    return res.status(500).json({ error: 'server config missing' });
  }

  // Simple heuristic: Korean Hangul block presence → Korean source
  const hasHangul = /[ㄱ-힝]/.test(text);
  const sourceLang = hasHangul ? 'ko' : 'en';
  const sourceName = sourceLang === 'ko' ? 'Korean' : 'English';
  const targetName = sourceLang === 'ko' ? 'English' : 'Korean';

  const userPrompt = `Translate the following ${sourceName} message to ${targetName}. This is a heartfelt congratulatory or commemorative message for Promega BioSystems Korea's 20th anniversary. Preserve the warmth, sincerity, and personal tone. Keep it natural, not literal. Do not add quotes or explanations. Return ONLY the translated text on a single block.\n\n${text}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 600,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      console.error('Anthropic API error', r.status, errText);
      return res.status(502).json({ error: 'upstream', status: r.status });
    }
    const data = await r.json();
    const translation = (data.content && data.content[0] && data.content[0].text || '').trim();
    if (!translation) {
      return res.status(502).json({ error: 'empty translation' });
    }

    return res.status(200).json({
      ko: sourceLang === 'ko' ? text : translation,
      en: sourceLang === 'ko' ? translation : text,
      detected: sourceLang,
    });
  } catch (e) {
    console.error('translate exception', e);
    return res.status(500).json({ error: e && e.message || 'unknown error' });
  }
};
