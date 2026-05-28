// Vercel serverless function: bilingual translation via Claude Sonnet 4.5
// POST /api/translate  body: { text: "..." }
// Response: { ko: "...", en: "...", detected: "ko" | "en" }
//
// Requires ANTHROPIC_API_KEY env var set in Vercel project settings.

const SYSTEM_PROMPT = `You are a professional translator specializing in heartfelt, emotionally-resonant business communications between Korea and the English-speaking world. You translate the meaning and feeling, not just words. You produce natural prose that reads as if written by a native speaker.

Context: You are translating messages submitted for Promega BioSystems Korea (PBK)'s 20th anniversary celebration. The audience includes Bill Linton (Promega CEO/Founder) and Promega colleagues worldwide. These are personal, sincere messages — congratulations, memories, hopes for the future. They are not marketing copy.

Style guidelines:
- Translate meaning, not word-by-word. Render natural target-language prose, not literal.
- Preserve the emotional register: warmth, sincerity, occasional informal warmth.
- Korean honorifics/formal endings → render as warm but not overly formal English (e.g., "I'm grateful for…" rather than "I would like to express my deepest gratitude…").
- English casual/professional tone → render as 정중하면서도 따뜻한 한국어. Use natural ending (-습니다 / -요) depending on context.
- Keep length close to source. Do not pad.
- Preserve line breaks if present.

Brand glossary — keep these EXACTLY as written, in both directions:
- PBK, Promega, Maxwell
- AS1000, AS2000, AS3000, AS4500, AS6000, AS8000, AS8500
- Maxwell RSC, Maxwell RSC 48, Maxwell CSC96
- HSM 2.0, MX-16
- ISO 13485, FDA, IVD
- Bill Linton (do not translate name)

Output format: ONLY the translated text. No quotes, no labels, no preface, no explanation. Just the message itself, ready to display.`;

module.exports = async function handler(req, res) {
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

  // Detect source language: Korean Hangul block → ko; otherwise en
  const hasHangul = /[ㄱ-힝]/.test(text);
  const sourceLang = hasHangul ? 'ko' : 'en';
  const sourceName = sourceLang === 'ko' ? 'Korean' : 'English';
  const targetName = sourceLang === 'ko' ? 'English' : 'Korean';

  const userPrompt = `Translate this ${sourceName} message into ${targetName}, following all style guidelines. Return only the translation.\n\n---\n${text}\n---`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        temperature: 0.4,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      console.error('Anthropic API error', r.status, errText);
      return res.status(502).json({ error: 'upstream', status: r.status });
    }
    const data = await r.json();
    let translation = (data.content && data.content[0] && data.content[0].text || '').trim();
    // Strip surrounding quotes if the model included them
    translation = translation.replace(/^["'""''](.*)["'""''‍]$/s, '$1').trim();
    if (!translation) return res.status(502).json({ error: 'empty translation' });

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
