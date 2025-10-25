import { getStore } from '@netlify/blobs';

export const handler = async (event) => {
  const store = getStore('ai-chat');
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  if (event.httpMethod === 'GET') {
    const sessionId = event.path.split('/').pop();
    const key = `messages/${sessionId}.json`;
    const arr = (await store.get(key, { type: 'json' })) || [];
    return { statusCode: 200, headers, body: JSON.stringify({ messages: arr }) };
  }

  if (event.httpMethod === 'POST') {
    const { sessionId, role, content } = JSON.parse(event.body || '{}');
    if (!sessionId || !role || typeof content !== 'string')
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'invalid payload' }) };

    const key = `messages/${sessionId}.json`;
    const arr = (await store.get(key, { type: 'json' })) || [];
    arr.push({ role, content, created_at: Date.now() });
    await store.setJSON(key, arr);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};
