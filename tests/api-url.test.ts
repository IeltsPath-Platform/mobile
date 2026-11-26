import { describe, expect, it } from 'vitest';
import { resolveApiUrl } from '../src/lib/api-url';

describe('API URL resolution', () => {
  it.each(['android', 'ios'])('uses private Metro host for %s', (platform) => {
    expect(resolveApiUrl({ platform, metroHost: '192.168.2.10:8081' }).url).toBe('http://192.168.2.10:8080');
  });
  it.each(['abc.exp.direct:80', 'localhost:8081', undefined])('rejects uncertain native host %s', (metroHost) => {
    expect(resolveApiUrl({ platform: 'ios', metroHost }).error).toBeTruthy();
  });
  it('explicit HTTPS takes precedence over tunnel', () => {
    expect(resolveApiUrl({ platform: 'ios', explicit: 'https://api.example.com/', metroHost: 'abc.exp.direct' }).url).toBe('https://api.example.com');
  });
  it.each([['android-emulator', '10.0.2.2'], ['ios-simulator', 'localhost']])('supports explicit %s', (device, host) => {
    expect(resolveApiUrl({ platform: 'android', device, port: '9090' }).url).toBe(`http://${host}:9090`);
  });
  it.each(['ftp://api.example.com', 'https://user:secret@api.example.com', 'https://api.example.com/path', 'https://<project>.com'])('rejects malformed/unsafe origin %s', (explicit) => {
    expect(resolveApiUrl({ platform: 'ios', explicit }).error).toBeTruthy();
  });
  it('does not silently use localhost for a remote web page', () => {
    expect(resolveApiUrl({ platform: 'web', webHost: 'preview.example.com' }).error).toBeTruthy();
  });
});

describe('API URL resolution in a release build', () => {
  it('accepts only an explicit https address', () => {
    expect(resolveApiUrl({ platform: 'android', explicit: 'https://api.example.com', release: true }).url).toBe('https://api.example.com');
    expect(resolveApiUrl({ platform: 'android', explicit: 'http://192.168.1.5:8080', release: true }).url).toBe('');
  });
  it('never guesses a LAN host and hides developer commands', () => {
    const result = resolveApiUrl({ platform: 'android', metroHost: '192.168.2.10:8081', release: true });
    expect(result.url).toBe('');
    expect(result.error).not.toMatch(/npm|EXPO_PUBLIC/);
  });
});
