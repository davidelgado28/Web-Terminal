require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  sessionTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30', 10),
  maxSessionsPerIP: parseInt(process.env.MAX_SESSIONS_PER_IP || '2', 10),
  containerImage: process.env.CONTAINER_IMAGE || 'web-terminal-sandbox:latest',
  containerMemoryMB: parseInt(process.env.CONTAINER_MEMORY_MB || '256', 10),
  containerCPUs: parseFloat(process.env.CONTAINER_CPUS || '0.5'),
  containerTimeoutSeconds: parseInt(process.env.CONTAINER_TIMEOUT_SECONDS || '1800', 10),
};
