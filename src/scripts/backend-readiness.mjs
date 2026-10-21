import { spawn } from 'node:child_process';

export async function checkGateway(base) {
  try {
    const response = await fetch(`${base}/actuator/health`, { signal: AbortSignal.timeout(5000) });
    const body = await response.json();
    return { ok: response.ok && body.status === 'UP', message: `Gateway HTTP ${response.status}: ${body.status ?? 'unknown'}` };
  } catch {
    return { ok: false, message: 'Gateway unreachable/timeout. Ask the BE team to start the backend and verify the API URL.' };
  }
}

export function checkLocalServices(backendDirectory) {
  return new Promise((resolve) => {
    const child = spawn('docker', ['compose', 'ps', '--all', '--format', 'json'], {
      cwd: backendDirectory, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'],
    });
    let output = '';
    const timeout = setTimeout(() => child.kill(), 10000);
    child.stdout.on('data', (data) => { output += data; });
    child.once('error', () => { clearTimeout(timeout); resolve(['Docker unavailable: backend service readiness not verified.']); });
    child.once('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) return resolve(['Cannot inspect Docker services. Ask BE to check Docker Desktop and Compose.']);
      try {
        const parsed = output.trim().startsWith('[') ? JSON.parse(output) : output.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
        const required = ['postgres', 'rabbitmq', 'config-server', 'eureka-server', 'api-gateway', 'access-service', 'user-service', 'community-service', 'notification-service', 'game-service', 'content-service', 'library-service', 'assessment-service', 'learning-service'];
        resolve(required.flatMap((name) => {
          const service = parsed.find((row) => row.Service === name);
          return service?.State === 'running' && service?.Health === 'healthy' ? [] : [`${name}: ${service?.State ?? 'missing'} / ${service?.Health || 'not healthy'}`];
        }));
      } catch { resolve(['Unable to parse Docker status; backend readiness not verified.']); }
    });
  });
}
