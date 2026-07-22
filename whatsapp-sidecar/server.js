const express = require('express');
const cors = require('cors');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
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

async function startSession(sessionId) {
  const authDir = path.join(AUTH_ROOT, sessionId);
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'error' }),
    browser: Browsers.ubuntu('DigitalStore'),
    generateHighQualityLinkPreview: false,
    markOnlineOnConnect: true,
  });

  sessions[sessionId] = sessions[sessionId] || {};
  sessions[sessionId].sock = sock;
  sessions[sessionId].connected = false;
  sessions[sessionId].qr = null;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      try {
        const dataUrl = await QRCode.toDataURL(qr);
        sessions[sessionId].qr = dataUrl;
        sessions[sessionId].connected = false;
        await postWebhook({ event: 'qr', sessionId, qr: dataUrl });
      } catch (e) {
        logger.error(e);
      }
    }
    if (connection === 'open') {
      sessions[sessionId].qr = null;
      sessions[sessionId].connected = true;
      await postWebhook({ event: 'connection', sessionId, status: 'connected' });
      logger.info(`Session ${sessionId} connected`);
    } else if (connection === 'close') {
      sessions[sessionId].connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      await postWebhook({ event: 'disconnect', sessionId, code, willReconnect: shouldReconnect });
      logger.warn(`Session ${sessionId} closed. reconnect=${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(() => startSession(sessionId).catch(err => logger.error(err)), 2000);
      } else {
        delete sessions[sessionId];
        try { fs.rmSync(authDir, { recursive: true, force: true }); } catch {}
      }
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    try {
      await postWebhook({ event: 'message', sessionId, message: m });
    } catch {}
  });

  return sock;
}

// ============ ROUTES ============
app.get('/', (req, res) => res.json({ status: 'baileys-sidecar-ok', sessions: Object.keys(sessions) }));

app.post('/session/start', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  try {
    if (sessions[sessionId] && sessions[sessionId].sock) {
      return res.json({ success: true, message: 'already running', connected: sessions[sessionId].connected });
    }
    await startSession(sessionId);
    res.json({ success: true, message: 'starting' });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/session/status/:id', (req, res) => {
  const s = sessions[req.params.id];
  if (!s) return res.json({ connected: false, qr: null, exists: false });
  res.json({ connected: !!s.connected, qr: s.qr, exists: true });
});

app.post('/session/restart/:id', async (req, res) => {
  const id = req.params.id;
  try {
    if (sessions[id] && sessions[id].sock) {
      try { sessions[id].sock.end(); } catch {}
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
    if (sessions[id] && sessions[id].sock) {
      try { await sessions[id].sock.logout(); } catch {}
      try { sessions[id].sock.end(); } catch {}
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
    if (sessions[id]?.sock) { try { sessions[id].sock.end(); } catch {} }
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
    res.json({ success: true });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Auto-restore previously created sessions
async function bootstrap() {
  if (!fs.existsSync(AUTH_ROOT)) return;
  const dirs = fs.readdirSync(AUTH_ROOT).filter(d => fs.statSync(path.join(AUTH_ROOT, d)).isDirectory());
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
