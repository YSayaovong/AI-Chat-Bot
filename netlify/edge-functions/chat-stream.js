export default async (request) => {
  try {
    const { sessionId, model = 'gpt-4o-mini', messages = [] } = await request.json();
    if (!sessionId) return json(400, { error: 'sessionId required' });

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return json(500, { error: 'OPENAI_API_KEY not set' });

    const oai = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, stream: true, messages })
    });

    if (!oai.ok || !oai.body) {
      const text = await oai.text();
      return sseBody([
        ['token', `[OpenAI error] ${text}`],
        ['end', {}]
      ]);
    }

    const encoder = new TextEncoder();
    let assistant = '';
    const stream = new ReadableStream({
      async start(controller) {
        const reader = oai.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split('\n')) {
            const t = line.trim();
            if (!t.startsWith('data:')) continue;
            const payload = t.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
              const json = JSON.parse(payload);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                assistant += delta;
                controller.enqueue(encoder.encode(`event: token\ndata: ${JSON.stringify(delta)}\n\n`));
              }
            } catch {}
          }
        }
        controller.enqueue(encoder.encode(`event: end\ndata: {}\n\n`));
        controller.close();
      }
    });

    return new Response(stream, sseHeaders());
  } catch (err) {
    return sseBody([
      ['token', `Server error: ${err.message}`],
      ['end', {}]
    ]);
  }
};

function sseHeaders() {
  return {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    }
  };
}
function sseBody(events) {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const [evt, data] of events) {
        controller.enqueue(enc.encode(`event: ${evt}\ndata: ${JSON.stringify(data)}\n\n`));
      }
      controller.close();
    }
  });
  return new Response(stream, sseHeaders());
}
function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
