import net from 'node:net';
import os from 'node:os';

const PORT = 8080;
const TARGET_HOST = '127.0.0.1';
const TARGET_PORT = 8080;

function pipe(socket) {
  const upstream = net.connect(TARGET_PORT, TARGET_HOST);
  const closeBoth = () => {
    socket.destroy();
    upstream.destroy();
  };
  upstream.on('connect', () => {
    socket.pipe(upstream);
    upstream.pipe(socket);
  });
  socket.on('error', closeBoth);
  upstream.on('error', closeBoth);
  socket.on('close', () => upstream.destroy());
  upstream.on('close', () => socket.destroy());
}

const hosts = new Set();
for (const entries of Object.values(os.networkInterfaces())) {
  for (const entry of entries ?? []) {
    if (entry.family === 'IPv4' && !entry.internal) hosts.add(entry.address);
  }
}

if (hosts.size === 0) {
  console.error('No LAN address to bind.');
  process.exit(1);
}

for (const host of hosts) {
  const server = net.createServer(pipe);
  server.on('error', (error) => {
    console.error(`listen ${host}:${PORT} failed: ${error.message}`);
  });
  server.listen(PORT, host, () => {
    console.log(`proxy ${host}:${PORT} -> ${TARGET_HOST}:${TARGET_PORT}`);
  });
}
