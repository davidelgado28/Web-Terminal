const http = require('http');
const express = require('express');
const config = require('./config');
const { router, attachWebSocket } = require('./routes/terminal');
const { startCleanupLoop } = require('./middleware/cleanup');
const DockerSandbox = require('./docker/DockerSandbox');

const app = express();
const server = http.createServer(app);

app.use(express.static('public'));
app.use('/', router);

attachWebSocket(server);
startCleanupLoop();

DockerSandbox.killOrphanContainers().catch(console.error);

server.listen(config.port, () => {
  console.log(`Web Terminal rodando em http://localhost:${config.port}`);
});

async function shutdown() {
  console.log('\nEncerrando.');
  const sessionManager = require('./session/SessionManager');
  for (const session of sessionManager.sessions.values()) {
    await session.destroy();
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
