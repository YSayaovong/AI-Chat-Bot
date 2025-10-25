import { getStore } from '@netlify/blobs';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, body: 'Method Not Allowed' };

  const { sessionId } = JSON.parse(event.body || '{}');
  if (!sessionId)
    return { statusCode: 400, body: JSON.stringify({ error: 'sessionId required' }) };

  const store = getStore('ai-chat');
  const sKey = `sessions/${sessionId}.json`;
  const exists = await store.get(sKey);

  if (!exists) {
    await store.setJSON(sKey, { id: sessionId, created_at: Date.now() });
    await store.setJSON(`messages/${sessionId}.json`, []);
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ ok: true, sessionId })
  };
};
