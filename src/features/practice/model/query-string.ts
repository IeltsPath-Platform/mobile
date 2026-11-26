/** `a=1&b=x%20y` from the defined values, without relying on URLSearchParams (React Native's is incomplete). */
export function queryString(values: Record<string, string | number | boolean | null | undefined>) {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}
