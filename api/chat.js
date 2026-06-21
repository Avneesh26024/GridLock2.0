// api/chat.js — Vercel serverless function
// Proxies chat requests from the frontend to the Gemini API.
// The API key never appears in any frontend file.

// Reads from Vercel environment variable GEMINI_API_KEY — set this in the Vercel
// project dashboard under Settings > Environment Variables after deployment.
// Never commit the actual key to source control.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODEL   = 'gemini-2.5-flash-lite';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_INSTRUCTION = `You are an AI assistant for the Bengaluru Traffic Police Parking Intelligence System, built for the Flipkart Gridlock Hackathon. You have access to structured analysis of 298,450 parking violations recorded across Bengaluru between November 2023 and April 2024. Answer questions factually and concisely using only the data provided below. Cite specific numbers and hotspot/location names where relevant. If a question cannot be answered with the available data, say so honestly rather than guessing or making up information. Keep responses clear and appropriately sized — 2-4 sentences for simple factual questions, more detail only when genuinely needed.`;

module.exports = async function handler(req, res) {
  // CORS headers (useful for local dev)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  // Guard: ensure API key is configured
  if (!GEMINI_API_KEY) {
    console.error('[chat.js] GEMINI_API_KEY is not set.');
    return res.status(500).json({ error: 'API key not configured on server. Set GEMINI_API_KEY in environment variables.' });
  }

  // Parse body (Vercel provides parsed JSON body automatically)
  const { question, context } = req.body || {};

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ error: 'Missing or invalid question field.' });
  }

  // Build prompt: system instruction + structured context + user question
  const contextStr = JSON.stringify(context ?? {}, null, 2);
  const fullPrompt = [
    SYSTEM_INSTRUCTION,
    '',
    '--- STRUCTURED ANALYSIS DATA (use this as your only factual source) ---',
    contextStr,
    '--- END OF DATA ---',
    '',
    `User question: ${question.trim()}`,
  ].join('\n');

  const url = `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`;

  try {
    const geminiRes = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature:     0.2,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!geminiRes.ok) {
      // Log status for server-side debugging; never forward raw error body to client
      const errSnippet = await geminiRes.text().catch(() => '');
      console.error(`[chat.js] Gemini API returned ${geminiRes.status}:`, errSnippet.slice(0, 300));
      return res.status(502).json({ error: 'The AI service is temporarily unavailable. Please try again in a moment.' });
    }

    const data   = await geminiRes.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;

    if (!answer) {
      console.warn('[chat.js] Gemini returned no candidate text. Full response:', JSON.stringify(data).slice(0, 400));
      return res.status(502).json({ error: 'No response generated — please try rephrasing your question.' });
    }

    return res.status(200).json({ answer });

  } catch (err) {
    // Network or runtime error — do not leak stack trace to client
    console.error('[chat.js] Unexpected error:', err.message);
    return res.status(500).json({ error: 'Internal server error. Please try again later.' });
  }
};
