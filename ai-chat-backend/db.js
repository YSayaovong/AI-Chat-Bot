import { JSONFileSync, LowSync } from 'lowdb';
import fs from 'node:fs';
import path from 'node:path';

const DB_FILE = path.resolve('db.json');

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify({ sessions: {}, messages: {} }, null, 2)
  );
}

const adapter = new JSONFileSync(DB_FILE);
const db = new LowSync(adapter);
db.read();
db.data ||= { sessions: {}, messages: {} };

export function upsertSession(id) {
  if (!db.data.sessions[id]) {
    db.data.sessions[id] = { id, created_at: Date.now() };
    db.data.messages[id] = [];
    db.write();
  }
}

export function listMessages(sessionId) {
  return db.data.messages[sessionId] || [];
}

export function addMessage(sessionId, role, content) {
  if (!db.data.messages[sessionId]) db.data.messages[sessionId] = [];
  db.data.messages[sessionId].push({ role, content, created_at: Date.now() });
  db.write();
}

export default db;
