import net from 'node:net';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

export function selectLanHost(interfaces = os.networkInterfaces(), requested = process.env.MOBILE_LAN_HOST) {
  const candidates = Object.entries(interfaces).flatMap(([name, entries]) =>
    (entries ?? []).filter((entry) => entry.family === 'IPv4' && !entry.internal)
      .map((entry) => ({ name, host: entry.address })));
  if (requested) {
    if (!candidates.some((item) => item.host === requested)) throw new Error('MOBILE_LAN_HOST must be an IPv4 address assigned to this machine.');
    return requested;
  }
  const physical = candidates.filter(({ name }) => !/virtual|vethernet|wsl|docker|vpn|tun|tap|loopback|bluetooth|vmware|vbox/i.test(name));
  if (physical.length !== 1) throw new Error(`Found ${physical.length} possible LAN addresses. Set MOBILE_LAN_HOST to your Wi-Fi/Ethernet IPv4 address.`);
  return physical[0].host;
}

export async function startLanGatewayProxy({ host = selectLanHost(), port = 8080, targetPort = port } = {}) {
  const sockets = new Set();
  const server = net.createServer((socket) => {
    const upstream = net.connect(targetPort, '127.0.0.1');
    for (const peer of [socket, upstream]) {
      sockets.add(peer);
      peer.on('close', () => sockets.delete(peer));
    }
    const close = () => { socket.destroy(); upstream.destroy(); };
    socket.on('error', close);
    upstream.on('error', close);
    socket.on('close', () => upstream.destroy());
    upstream.on('close', () => socket.destroy());
    // Raw TCP preserves uploads and WebSocket Upgrade frames.
    socket.pipe(upstream).pipe(socket);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  console.log(`API proxy: ${host}:${port} -> 127.0.0.1:${targetPort}`);
  return () => new Promise((resolve) => {
    for (const socket of sockets) socket.destroy();
    server.close(resolve);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startLanGatewayProxy({ port: Number(process.env.EXPO_PUBLIC_API_PORT || 8080) }).then((stop) => {
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await stop(); process.exit(0); });
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
