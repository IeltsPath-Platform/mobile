import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { selectLanHost, startLanGatewayProxy } from './lan-gateway-proxy.mjs';
import { checkGateway, checkLocalServices } from './backend-readiness.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const require = createRequire(import.meta.url);
process.env.NODE_ENV ??= 'development';
require('@expo/env').load(root);
const args = process.argv.slice(2);
const remote = args.includes('--remote') || args.includes('--tunnel');
const checkOnly = args.includes('--check');
const strict = args.includes('--strict-backend');
const web = args.includes('--web');
const emulator = process.env.EXPO_PUBLIC_DEVICE;
const port = Number(process.env.EXPO_PUBLIC_API_PORT || 8080);
let stopProxy;
let child;
let closing = false;
async function cleanup(code = 0) {
  if (closing) return;
  closing = true;
  if (child && child.exitCode === null) child.kill('SIGTERM');
  if (stopProxy) await stopProxy();
  process.exitCode = code;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => void cleanup(0));

try {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('EXPO_PUBLIC_API_PORT must be 1–65535.');
  const explicit = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  let configured;
  if (explicit) {
    try { configured = new URL(explicit); } catch { throw new Error('Invalid EXPO_PUBLIC_API_BASE_URL.'); }
    if (!['http:', 'https:'].includes(configured.protocol) || configured.username || configured.password || configured.search || configured.hash || configured.pathname !== '/' || /[<>]/.test(explicit)) {
      throw new Error('API URL must be an HTTP(S) origin without credentials, path or query.');
    }
  }
  if (remote && configured?.protocol !== 'https:') throw new Error('Remote/Metro tunnel requires EXPO_PUBLIC_API_BASE_URL=https://<your-api-host>. Metro tunnel does not expose the API.');
  if (args.includes('--ios') && process.platform !== 'darwin') {
    console.warn('iOS Simulator requires macOS. Starting Metro for Expo Go on your iPhone; scan the QR code.');
    args.splice(args.indexOf('--ios'), 1);
  }
  const external = configured && !['localhost', '127.0.0.1', '10.0.2.2'].includes(configured.hostname)
    && !/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(configured.hostname);
  const healthBase = remote || external ? configured.origin : `http://127.0.0.1:${port}`;
  const gateway = await checkGateway(healthBase);
  console.log(gateway.message);
  const problems = !remote && !external ? await checkLocalServices(path.resolve(root, '../backend')) : ['Remote service readiness requires authenticated API checks.'];
  for (const problem of problems) console.warn(`Backend: ${problem}`);
  if (checkOnly) {
    process.exitCode = gateway.ok && problems.length === 0 ? 0 : 1;
  } else {
    if (strict && (!gateway.ok || problems.length)) throw new Error('Backend not ready. See docs/backend-handoff.md.');
    if (!remote && !external && !web && !emulator) {
      const host = selectLanHost();
      if (configured && configured.hostname !== host) throw new Error('API URL does not match the selected LAN host. Remove the local API override or set MOBILE_LAN_HOST.');
      process.env.REACT_NATIVE_PACKAGER_HOSTNAME = host;
      if (!explicit) process.env.EXPO_PUBLIC_API_BASE_URL = `http://${host}:${port}`;
      stopProxy = await startLanGatewayProxy({ host, port });
    }
    if (closing) await stopProxy?.();
    else {
      const cliArgs = args.filter((arg) => !['--remote', '--check', '--strict-backend'].includes(arg));
      if (remote && !cliArgs.includes('--tunnel')) cliArgs.push('--tunnel');
      child = spawn(process.execPath, [require.resolve('expo/bin/cli'), 'start', ...cliArgs], { cwd: root, stdio: 'inherit', env: process.env, windowsHide: true });
      child.once('error', (error) => { console.error(error.message); void cleanup(1); });
      child.once('exit', (code) => void cleanup(code ?? 0));
    }
  }
} catch (error) {
  console.error(error.message);
  await cleanup(1);
}
