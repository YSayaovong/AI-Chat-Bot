// === Frontend config (no secrets here) ===
const API_BASE = 'http://localhost:8787'; // match your server PORT/.env
const DEFAULT_SYSTEM = 'You are a concise, helpful AI assistant.';
const $ = id => document.getElementById(id);
const nanoid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// --- Elements ---
const sidebar = $('sidebar'), scrim = $('scrim'), toggleBtn = $('toggleSidebar');
const chatList = $('chatList'), newChatBtn = $('newChatBtn');
const rail = $('rail'), statusEl = $('status'), scroll = $('scroll');
const input = $('input'), sendBtn = $('send'), stopBtn = $('stop'), regenBtn = $('regen');
const modelSel = $('model');

// --- State ---
let chats = loadChats();
let activeId = localStorage.getItem('activeChatId') || createChat().id;
let ctrl = null;

// --- Init ---
renderSidebar();
openChat(activeId);
ensureSession(activeId).catch(()=>{});

// ---------------- Storage ----------------
function loadChats(){ try{ return JSON.parse(localStorage.getItem('chats')||'[]'); }catch{return[]} }
function saveChats(){ localStorage.setItem('chats', JSON.stringify(chats)); }
function getMsgs(id){ try{ return JSON.parse(localStorage.getItem('session:'+id)||'[]'); }catch{return[]} }
function setMsgs(id, msgs){ localStorage.setItem('session:'+id, JSON.stringify(msgs)); }

// ---------------- Chat CRUD --------------
function createChat(){
  const id = nanoid();
  const meta = { id, title:'New chat', createdAt: Date.now() };
  chats.unshift(meta); saveChats();
  localStorage.setItem('activeChatId', id);
  setMsgs(id, [{ role:'system', content: DEFAULT_SYSTEM }]);
  return meta;
}
function renameChat(id, title){
  const c = chats.find(x => x.id===id); if(!c) return;
  c.title = title || c.title; saveChats(); renderSidebar();
}
function deleteChat(id){
  chats = chats.filter(x=>x.id!==id); saveChats();
  localStorage.removeItem('session:'+id);
  if(activeId===id){ const next=chats[0]||createChat(); openChat(next.id); } else { renderSidebar(); }
}
function renderSidebar(){
  chatList.innerHTML = '';
  chats.forEach(meta=>{
    const el = document.createElement('div');
    el.className = 'chat-item' + (meta.id===activeId?' active':'');
    el.title = meta.title;

    const title = document.createElement('div');
    title.className = 'chat-title';
    title.textContent = meta.title;

    const act = document.createElement('div');
    act.style.display = 'flex'; act.style.gap = '6px';

    const rn = iconBtn('✏️', 'Rename', () => {
      const t = prompt('Rename chat', meta.title) || meta.title;
      renameChat(meta.id, t);
    });
    const del = iconBtn('🗑️', 'Delete', () => {
      if (confirm('Delete this chat?')) deleteChat(meta.id);
    });

    el.addEventListener('click', ()=>openChat(meta.id));
    act.append(rn, del);
    el.append(title, act);
    chatList.appendChild(el);
  });
}
function iconBtn(symbol, title, onClick){
  const b = document.createElement('button');
  b.className = 'btn-icon'; b.title = title; b.textContent = symbol;
  b.addEventListener('click', e=>{ e.stopPropagation(); onClick(); });
  return b;
}

// --------------- Open chat / history ---------------
async function openChat(id){
  activeId = id; localStorage.setItem('activeChatId', id);
  renderSidebar();
  rail.innerHTML = '';
  addRow('system', DEFAULT_SYSTEM);
  const local = getMsgs(id);
  if (local.length <= 1) addRow('assistant', 'Hello! Ask me anything.');
  else local.filter(m=>m.role!=='system').forEach(m=> addRow(m.role, m.content));
  closeSidebar();
  ensureSession(id).then(loadServerHistory).catch(()=>{});
}

async function ensureSession(sessionId){
  await fetch(`${API_BASE}/api/session`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ sessionId })
  });
}

async function loadServerHistory(){
  try{
    const r = await fetch(`${API_BASE}/api/messages/${activeId}`);
    const data = await r.json();
    if (Array.isArray(data?.messages) && data.messages.length){
      const merged = [ { role:'system', content:DEFAULT_SYSTEM }, ...data.messages ];
      setMsgs(activeId, merged);
      if (rail.children.length <= 2){
        rail.innerHTML = '';
        addRow('system', DEFAULT_SYSTEM);
        merged.filter(m=>m.role!=='system').forEach(m=> addRow(m.role, m.content));
      }
      const firstUser = merged.find(m=>m.role==='user');
      const meta = chats.find(c=>c.id===activeId);
      if (firstUser && meta?.title==='New chat') renameChat(activeId, firstUser.content.slice(0,30));
    }
  } catch(e){ /* optional: toast */ }
}

// ---------------- UI helpers ----------------
function addRow(role, text){
  const row = document.createElement('div'); row.className = 'row ' + role;
  const av = document.createElement('div'); av.className = 'avatar'; av.textContent = role==='user'?'U':(role==='assistant'?'A':'S');
  const bb = document.createElement('div'); bb.className = 'bubble'; bb.textContent = text || '';
  row.append(av, bb); rail.appendChild(row);
  scroll.scrollTop = scroll.scrollHeight;
  return bb;
}
function setLoading(on){
  statusEl.classList.toggle('hidden', !on);
  sendBtn.disabled = on; regenBtn.disabled = on; stopBtn.disabled = !on;
}
function stopStream(){ if (ctrl){ ctrl.abort(); ctrl=null; } setLoading(false); }
function openSidebar(){ sidebar.classList.add('open'); }
function closeSidebar(){ sidebar.classList.remove('open'); }

// ---------------- Streaming send ----------------
async function send(messageText, isRegen=false){
  const text = (messageText ?? input.value ?? '').trim();
  if (!text && !isRegen) return;
  stopStream();

  let msgs = getMsgs(activeId);
  if (msgs.length===0) msgs = [{ role:'system', content: DEFAULT_SYSTEM }];

  if (!isRegen){
    addRow('user', text);
    msgs = [...msgs, { role:'user', content: text }];
    setMsgs(activeId, msgs);
    input.value = '';
  } else {
    // remove last assistant row and last assistant message
    for (let i = rail.children.length - 1; i >= 0; i--){
      const node = rail.children[i];
      if (node.classList.contains('assistant')) { node.remove(); break; }
    }
    for (let i = msgs.length - 1; i >= 0; i--){
      if (msgs[i].role === 'assistant'){ msgs.splice(i,1); break; }
    }
    setMsgs(activeId, msgs);
  }

  const bubble = addRow('assistant', '');
  setLoading(true);
  ctrl = new AbortController();
  try {
    const resp = await fetch(`${API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: activeId, model: modelSel.value, messages: msgs }),
      signal: ctrl.signal
    });
    if (!resp.ok || !resp.body){
      bubble.textContent = 'Error: ' + (await resp.text());
      setLoading(false); return;
    }

    // Read SSE stream
    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let full = '';
    while (true){
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = dec.decode(value);
      // server emits lines like:
      // event: token \n data: "..." \n\n
      for (const evt of chunk.split('\n\n')){
        if (!evt.trim()) continue;
        const typeLine = evt.split('\n').find(l=>l.startsWith('event:'));
        const dataLine = evt.split('\n').find(l=>l.startsWith('data:')) || 'data: {}';
        const type = typeLine ? typeLine.replace('event:','').trim() : '';
        const data = JSON.parse(dataLine.slice(5).trim() || '""');

        if (type === 'token'){
          full += data;
          bubble.textContent += data;
          scroll.scrollTop = scroll.scrollHeight;
        } else if (type === 'end'){
          const current = getMsgs(activeId);
          setMsgs(activeId, [...current, { role:'assistant', content: full }]);
        }
      }
    }
  } catch(e){
    if (e.name !== 'AbortError'){
      bubble.textContent += '\nNetwork error. Is the server running?';
    }
  } finally {
    setLoading(false); ctrl = null;
    const meta = chats.find(c=>c.id===activeId);
    if (meta && meta.title==='New chat'){
      const firstUser = getMsgs(activeId).find(m=>m.role==='user');
      if (firstUser) renameChat(activeId, firstUser.content.slice(0,30));
    }
  }
}

// ---------------- Events ----------------
sendBtn.addEventListener('click', ()=>send());
input.addEventListener('keydown', (e)=>{ if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); } });
stopBtn.addEventListener('click', stopStream);
regenBtn.addEventListener('click', ()=>send('', true));
newChatBtn.addEventListener('click', ()=>{ const c=createChat(); renderSidebar(); openChat(c.id); });
// Optional: mobile sidebar toggles if you’ve added the button
if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
if (scrim) scrim.addEventListener('click', closeSidebar);
