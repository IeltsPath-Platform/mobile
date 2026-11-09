export type ApiLocation = { url: string; error: string | null };

export function isLanIPv4(host: string): boolean {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168);
}

export function resolveApiUrl(input: {
  explicit?: string; metroHost?: string | null; platform: string;
  device?: string; port?: string; webHost?: string;
}): ApiLocation {
  const fail = (error: string): ApiLocation => ({ url: '', error });
  if (input.explicit?.trim()) {
    try {
      const url = new URL(input.explicit.trim());
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash
        || url.pathname !== '/' || /[<>]/.test(input.explicit)) throw new Error();
      return { url: url.origin, error: null };
    } catch {
      return fail('EXPO_PUBLIC_API_BASE_URL phải là địa chỉ gốc http:// hoặc https:// hợp lệ, không chứa mật khẩu, đường dẫn hay query.');
    }
  }
  const port = Number(input.port || '8080');
  if (!Number.isInteger(port) || port < 1 || port > 65535) return fail('EXPO_PUBLIC_API_PORT phải nằm trong khoảng 1–65535.');
  if (input.platform === 'web') {
    const host = input.webHost || 'localhost';
    if (host === 'localhost' || host === '127.0.0.1' || isLanIPv4(host)) return { url: `http://${host}:${port}`, error: null };
    return fail('Bản web từ xa cần EXPO_PUBLIC_API_BASE_URL trỏ đến API HTTPS.');
  }
  if (input.device === 'android-emulator') return { url: `http://10.0.2.2:${port}`, error: null };
  if (input.device === 'ios-simulator') return { url: `http://localhost:${port}`, error: null };
  let host = '';
  try { host = new URL(`http://${input.metroHost ?? ''}`).hostname; } catch { /* No reliable Metro host. */ }
  if (isLanIPv4(host)) return { url: `http://${host}:${port}`, error: null };
  return fail('Không xác định được API. Chạy npm start trên cùng Wi-Fi, hoặc đặt EXPO_PUBLIC_API_BASE_URL. Metro tunnel cần API HTTPS riêng.');
}
