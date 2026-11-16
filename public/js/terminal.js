const term = new Terminal({
  cursorBlink: true,
  fontSize: 14,
  fontFamily: '"Fira Code", "Cascadia Code", monospace',
  theme: {
    background: '#1a1b26',
    foreground: '#a9b1d6',
    cursor: '#c0caf5',
    selectionBackground: '#33467c'
  },
  scrollback: 5000
});

const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);
term.open(document.getElementById('terminal'));
fitAddon.fit();

const statusEl = document.getElementById('status');
let ws = null;

function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`proto://{proto}://proto://{location.host}/ws`);

  ws.onopen = () => {
    statusEl.textContent = '● Conectado';
    statusEl.className = 'connected';
    term.writeln('\x1b[36mConectado ao sandbox.\x1b[0m');
    sendResize();
  };

  ws.onmessage = e => term.write(e.data);

  ws.onclose = () => {
    statusEl.textContent = '● Desconectado';
    statusEl.className = 'disconnected';
    term.writeln('\r\n\x1b[31mConexão encerrada. Clique em "Nova sessão".\x1b[0m');
  };

  ws.onerror = () => ws.close();
}

term.onData(data => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'input', data }));
  }
});

function sendResize() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'resize',
      cols: term.cols,
      rows: term.rows
    }));
  }
}

window.addEventListener('resize', () => {
  fitAddon.fit();
  sendResize();
});

document.getElementById('btn-new').addEventListener('click', () => {
  if (ws) ws.close();
  term.reset();
  connect();
});

connect();
