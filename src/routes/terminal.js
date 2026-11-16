const express = require('express');
const { WebSocketServer } = require('ws');
const sessionManager = require('../session/SessionManager');
const rateLimit = require('../middleware/rateLimit');
const config = require('../config');

const router = express.Router();

function attachWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost');
    const sessionId = url.searchParams.get('session');

    if (req.url.startsWith('/ws')) {
      wss.handleUpgrade(req, socket, head, ws => {
        handleConnection(ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  async function handleConnection(ws, req) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

    try {
      const session = await sessionManager.createSession(ip);

      session.on('data', chunk => {
        if (ws.readyState === ws.OPEN) ws.send(chunk.toString());
      });

      session.on('end', () => {
        ws.send('\r\n\x1b[33m[Sessão encerrada]\x1b[0m\r\n');
        ws.close();
      });

      session.on('error', err => {
        console.error('Session error:', err);
        ws.close();
      });

      ws.on('message', msg => {
        const parsed = JSON.parse(msg.toString());
        if (parsed.type === 'input') {
          session.touch(); 
          session.write(parsed.data);
        } else if (parsed.type === 'resize') {
          resizeExec(session, parsed.cols, parsed.rows);
        }
      });

      ws.on('close', async () => {
        await session.destroy();
      });

      ws.send(JSON.stringify({ type: 'session', id: session.id }));
    } catch (err) {
      if (err.message === 'LIMITE_DE_SESSOES') {
        ws.send('\x1b[31mLimite de sessões atingido. Tente mais tarde.\x1b[0m\r\n');
      } else {
        console.error('Erro ao criar sessão:', err);
        ws.send('\x1b[31mErro ao criar sessão.\x1b[0m\r\n');
      }
      ws.close();
    }
  }
  async function resizeExec(session, cols, rows) {
    try {
      const docker = session.container.dockerode || require('dockerode')();
      await docker.getExec(session.execId).resize({ Width: cols, Height: rows });
    } catch {}
  }

  return wss;
}

router.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

router.get('/health', (req, res) => {
  res.json(sessionManager.getStats());
});

module.exports = { router, attachWebSocket };
