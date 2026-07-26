const express = require('express');
const cors = require('cors');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const axios = require('axios');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cors());

const PORT = process.env.PORT || 3001;
const WEBHOOK = process.env.WEBHOOK_URL || 'http://localhost:8001/api/whatsapp/webhook';
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || '';
const AUTH_ROOT = path.join(__dirname, 'sessions');
if (!fs.existsSync(AUTH_ROOT)) fs.mkdirSync(AUTH_ROOT, { recursive: true });

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// ============================================================
// GLOBAL SAFETY NET — nunca deixe o processo morrer por erro
// não capturado (Baileys, redes flutuantes, WebSocket, etc.)
// O supervisord reiniciaria de qualquer forma, mas mantê-lo
// vivo evita perder o estado in-memory das sessões.
// ============================================================
process.on('uncaughtException', (err) => {
  logger.error({ err: err.message, stack: err.stack }, 'uncaughtException — kept alive');
});
process.on('unhandledRejection', (reason) => {
  logger.error({ reason: String(reason) }, 'unhandledRejection — kept alive');
});

const sessions = {};

async function postWebhook(body) {
  try {
    await axios.post(WEBHOOK, body, {
      headers: { 'Content-Type': 'application/json', 'x-webhook-token': WEBHOOK_TOKEN },
      timeout: 5000,
    });
  } catch (e) {
    logger.warn({ err: e.message }, 'webhook_fail');
  }
}

// Backoff: 2s, 5s, 10s, 20s, 40s, 60s (cap)
function nextBackoff(prev) {
  const seq = [2000, 5000, 10000, 20000, 40000, 60000];
  const idx = Math.min(seq.length - 1, seq.indexOf(prev) + 1);
  return seq[idx === -1 ? 0 : idx];
}

async function startSession(sessionId, isReconnect = false) {
  const authDir = path.join(AUTH_ROOT, sessionId);
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion({ ignoreCache: false }).catch(() => ({ version: [2, 3000, 0] }));

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'error' }),
    browser: Browsers.ubuntu('MarkimagemTV'),
    generateHighQualityLinkPreview: false,
    markOnlineOnConnect: true,
    // Timeouts generosos para redes instáveis / proxies do Northflank
    keepAliveIntervalMs: 20_000,          // ping WebSocket a cada 20s (default é 30s)
    connectTimeoutMs: 60_000,             // 60s p/ estabelecer conexão
    defaultQueryTimeoutMs: 60_000,        // 60s p/ queries de protocolo
    retryRequestDelayMs: 500,
    maxMsgRetryCount: 5,
    emitOwnEvents: false,
    syncFullHistory: false,               // não baixa histórico completo (mais estável e leve)
  });

  const s = sessions[sessionId] || {};
  sessions[sessionId] = s;
  s.sock = sock;
  s.connected = false;
  if (!isReconnect) s.qr = null;
  s.reconnectDelay = s.reconnectDelay || 0;
  s.lastActivity = Date.now();
  s.reconnectAttempts = (s.reconnectAttempts || 0) + (isReconnect ? 1 : 0);

  // Keepalive interno: envia "presence available" periodicamente
  // para manter o WhatsApp acordado e o socket ativo, evitando
  // que proxies/loadbalancers derrubem por idle.
  if (s.presenceInterval) clearInterval(s.presenceInterval);
  s.presenceInterval = setInterval(async () => {
    if (!s.connected) return;
    try {
      await sock.sendPresenceUpdate('available');
      s.lastActivity = Date.now();
    } catch (e) {
      logger.warn({ err: e.message, sessionId }, 'presence_update_fail');
    }
  }, 45_000); // a cada 45s

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      try {
        const dataUrl = await QRCode.toDataURL(qr);
        s.qr = dataUrl;
        s.connected = false;
        await postWebhook({ event: 'qr', sessionId, qr: dataUrl });
      } catch (e) {
        logger.error({ err: e.message }, 'qr_fail');
      }
    }
    if (connection === 'open') {
      s.qr = null;
      s.connected = true;
      s.reconnectDelay = 0;
      s.reconnectAttempts = 0;
      s.lastActivity = Date.now();
      await postWebhook({ event: 'connection', sessionId, status: 'connected' });
      logger.info(`Session ${sessionId} connected`);
      // envia presença ao conectar
      try { await sock.sendPresenceUpdate('available'); } catch {}
    } else if (connection === 'close') {
      s.connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = code === DisconnectReason.loggedOut;
      const shouldReconnect = !isLoggedOut;
      await postWebhook({ event: 'disconnect', sessionId, code, willReconnect: shouldReconnect });
      logger.warn({ code, sessionId }, `Session closed. reconnect=${shouldReconnect}`);

      // clear presence interval do socket antigo
      if (s.presenceInterval) { clearInterval(s.presenceInterval); s.presenceInterval = null; }

      if (shouldReconnect) {
        s.reconnectDelay = nextBackoff(s.reconnectDelay);
        logger.info(`reconnect in ${s.reconnectDelay}ms (attempt ${s.reconnectAttempts + 1})`);
        setTimeout(() => {
          startSession(sessionId, true).catch(err => logger.error({ err: err.message }, 'reconnect_fail'));
        }, s.reconnectDelay);
      } else {
        // Só apaga a sessão se foi logout explícito no celular
        delete sessions[sessionId];
        try { fs.rmSync(authDir, { recursive: true, force: true }); } catch {}
      }
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    s.lastActivity = Date.now();
    try {
      await postWebhook({ event: 'message', sessionId, message: m });
    } catch {}
  });

  return sock;
}

// ============================================================
// WATCHDOG — a cada 60s inspeciona as sessões. Se uma está
// marcada como "connected" mas não teve atividade nos últimos
// 3 minutos, força reconnect. Assim, se o socket "silenciar"
// (comum em redes instáveis onde o close event não dispara),
// nós detectamos e revivemos.
// ============================================================
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of Object.entries(sessions)) {
    if (s.connected && now - (s.lastActivity || 0) > 180_000) {
      logger.warn(`Watchdog: session ${id} silent > 3min, forcing reconnect`);
      try { s.sock?.end(new Error('watchdog_timeout')); } catch {}
      // .end() dispara connection.close, que já cuida do reconnect com backoff
    }
  }
}, 60_000);

// ============ ROUTES ============
app.get('/', (req, res) => res.json({
  status: 'baileys-sidecar-ok',
  sessions: Object.keys(sessions).map(id => ({
    id,
    connected: !!sessions[id].connected,
    lastActivity: sessions[id].lastActivity,
    reconnectAttempts: sessions[id].reconnectAttempts || 0,
  })),
  uptime: process.uptime(),
}));

app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.post('/session/start', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  try {
    if (sessions[sessionId] && sessions[sessionId].sock && sessions[sessionId].connected) {
      return res.json({ success: true, message: 'already running', connected: true });
    }
    await startSession(sessionId);
    res.json({ success: true, message: 'starting' });
  } catch (e) {
    logger.error({ err: e.message });
    res.status(500).json({ error: e.message });
  }
});

app.get('/session/status/:id', (req, res) => {
  const s = sessions[req.params.id];
  if (!s) return res.json({ connected: false, qr: null, exists: false });
  res.json({
    connected: !!s.connected,
    qr: s.qr,
    exists: true,
    lastActivity: s.lastActivity,
    reconnectAttempts: s.reconnectAttempts || 0,
  });
});

app.post('/session/restart/:id', async (req, res) => {
  const id = req.params.id;
  try {
    if (sessions[id]) {
      if (sessions[id].presenceInterval) clearInterval(sessions[id].presenceInterval);
      try { sessions[id].sock?.end(); } catch {}
    }
    delete sessions[id];
    await startSession(id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/session/logout/:id', async (req, res) => {
  const id = req.params.id;
  try {
    if (sessions[id]) {
      if (sessions[id].presenceInterval) clearInterval(sessions[id].presenceInterval);
      try { await sessions[id].sock?.logout(); } catch {}
      try { sessions[id].sock?.end(); } catch {}
    }
    delete sessions[id];
    const authDir = path.join(AUTH_ROOT, id);
    try { fs.rmSync(authDir, { recursive: true, force: true }); } catch {}
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/session/:id', async (req, res) => {
  const id = req.params.id;
  try {
    if (sessions[id]) {
      if (sessions[id].presenceInterval) clearInterval(sessions[id].presenceInterval);
      try { sessions[id].sock?.end(); } catch {}
    }
    delete sessions[id];
    const authDir = path.join(AUTH_ROOT, id);
    try { fs.rmSync(authDir, { recursive: true, force: true }); } catch {}
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/message/send', async (req, res) => {
  const { sessionId, to, text } = req.body;
  const s = sessions[sessionId];
  if (!s || !s.connected) return res.status(400).json({ error: 'session_not_connected' });
  try {
    const digits = String(to).replace(/\D/g, '');
    const jid = `${digits}@s.whatsapp.net`;
    await s.sock.sendMessage(jid, { text });
    s.lastActivity = Date.now();
    res.json({ success: true });
  } catch (e) {
    logger.error({ err: e.message });
    res.status(500).json({ error: e.message });
  }
});

// Auto-restore previously created sessions on boot
async function bootstrap() {
  if (!fs.existsSync(AUTH_ROOT)) return;
  const dirs = fs.readdirSync(AUTH_ROOT).filter(d => {
    try { return fs.statSync(path.join(AUTH_ROOT, d)).isDirectory(); } catch { return false; }
  });
  for (const d of dirs) {
    try {
      await startSession(d);
      logger.info(`restored session ${d}`);
    } catch (e) {
      logger.error({ err: e.message, session: d }, 'restore_fail');
    }
  }
}

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Baileys sidecar listening on ${PORT} -> webhook=${WEBHOOK}`);
  bootstrap();
});
