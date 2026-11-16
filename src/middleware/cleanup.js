const sessionManager = require('../session/SessionManager');
const DockerSandbox = require('../docker/DockerSandbox');

function startCleanupLoop() {
  setInterval(async () => {
    await DockerSandbox.killOrphanContainers().catch(console.error);
  }, 5 * 60 * 1000);
}

module.exports = { startCleanupLoop };
