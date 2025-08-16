export async function summarizeText({ apiKey, apiBase, model, text, length = 'medium' }) {
  const trimmed = (text || '').slice(0, 120_000); // safety cap
  const target = { short: 5, medium: 10, long: 15 }[length] || 10;

  const system = `You are a precise note-taker. Produce ${target} crisp bullet points that cover key ideas, arguments, data, and conclusions from the transcript. No fluff; keep each bullet to one sentence.`;

  const res = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: trimmed || 'Summarize the visible page content.' }
      ],
      temperature: 0.2
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`LLM API error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  // Split bullets from model output robustly
  const bullets = content
    .split(/\n+/)
    .map(s => s.replace(/^\s*[-*•\d\.]+\s*/, '').trim())
    .filter(Boolean)
    .slice(0, target);
  return bullets.length ? bullets : [content.trim()].filter(Boolean);
}