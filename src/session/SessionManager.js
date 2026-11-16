const { randomUUID } = require('crypto');
const Session = require('./Session');
const DockerSandbox = require('../docker/DockerSandbox');
const config = require('../config');

class SessionManager {
  constructor() {
    this.sessions = new Map();           
    this.ipCounts = new Map();           
  }

  canCreate(ip) {
    return (this.ipCounts.get(ip) || 0) < config.maxSessionsPerIP;
  }

  async createSession(ip) {
    if (!this.canCreate(ip)) {
      throw new Error('LIMITE_DE_SESSOES');
    }

    const sessionId = randomUUID();
    const container = await DockerSandbox.createContainer(sessionId);

    const session = new Session(
      sessionId,
      container,
      ip,
      config.containerTimeoutSeconds * 1000
    );

    session.on('destroyed', () => {
      DockerSandbox.removeContainer(container).catch(() => {});
      this.sessions.delete(sessionId);
      this.ipCounts.set(ip, Math.max(0, (this.ipCounts.get(ip) || 1) - 1));
    });

    await session.attach();
    this.sessions.set(sessionId, session);
    this.ipCounts.set(ip, (this.ipCounts.get(ip) || 0) + 1);

    return session;
  }

  get(sessionId) {
    return this.sessions.get(sessionId);
  }

  getStats() {
    return {
      activeSessions: this.sessions.size,
      totalSessionsEverCreated: undefined 
    };
  }
}
module.exports = new SessionManager();
