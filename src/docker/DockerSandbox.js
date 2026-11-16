const Docker = require('dockerode');
const config = require('../config');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

class DockerSandbox {
  async createContainer(sessionId) {
    const container = await docker.createContainer({
      name: `webterm-${sessionId}`,
      Image: config.containerImage,
      Tty: true,           
      OpenStdin: true,
      StdinOnce: false,
      User: 'sandbox',
      WorkingDir: '/home/sandbox',
      Env: ['TERM=xterm-256color', 'LANG=C.UTF-8'],
      HostConfig: {
        Memory: config.containerMemoryMB * 1024 * 1024,
        MemorySwap: config.containerMemoryMB * 1024 * 1024, 
        NanoCpus: Math.round(config.containerCPUs * 1e9),
        PidsLimit: 100,                    
        CapDrop: ['ALL'],                  
        SecurityOpt: ['no-new-privileges'], 
        NetworkMode: 'none',               
        ReadonlyRootfs: false,
        Tmpfs: {
          '/tmp': 'size=64m,rw,noexec,nosuid'
        }
      },
      Labels: {
        'webterm.session': sessionId,
        'webterm.created': new Date().toISOString()
      }
    });

    await container.start();
    return container;
  }

  async removeContainer(container) {
    try {
      await container.remove({ force: true });
    } catch (err) {
      if (err.statusCode !== 404) throw err;
    }
  }
  async killOrphanContainers() {
    const containers = await docker.listContainers({
      all: true,
      filters: { label: ['webterm.session'] }
    });
    for (const info of containers) {
      const c = docker.getContainer(info.Id);
      await c.remove({ force: true }).catch(() => {});
    }
  }
}

module.exports = new DockerSandbox();
