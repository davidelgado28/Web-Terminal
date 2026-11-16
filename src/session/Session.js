const { EventEmitter } = require('events');
const Docker = require('dockerode');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

class Session extends EventEmitter {
  constructor(id, container, ip, timeoutMs) {
    super();
    this.id = id;
    this.container = container;
    this.ip = ip;
    this.stream = null;
    this.execId = null;
    this.timeoutHandle = null;
    this.idleTimeoutMs = timeoutMs;
    this.touch();
  }

  async attach() {
    const exec = await this.container.exec({
      Cmd: ['/bin/bash', '-i'],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      Env: ['TERM=xterm-256color']
    });

    this.execId = exec.id;

    this.stream = await exec.start({ Tty: true, hijack: true, stdin: true });

    this.stream.on('data', chunk => this.emit('data', chunk));
    this.stream.on('end', () => this.emit('end'));
    this.stream.on('error', err => this.emit('error', err));
  }

  write(data) {
    if (this.stream) this.stream.write(data);
  }

  async resize(cols, rows) {
    if (this.execId) {
      await docker.getExec(this.execId).resize({ Width: cols, Height: rows });
    }
  }

  touch() {
    clearTimeout(this.timeoutHandle);
    this.timeoutHandle = setTimeout(() => this.destroy(), this.idleTimeoutMs);
  }

  async destroy() {
    clearTimeout(this.timeoutHandle);
    if (this.stream) {
      try { this.stream.end(); } catch {}
      this.stream = null;
    }
    this.emit('destroyed');
  }
}
module.exports = Session;
