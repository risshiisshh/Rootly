/**
 * Utility to get environment variables dynamically.
 * In the browser (client-side), it reads from `window.ENV` populated at runtime.
 * On the server-side, it reads directly from `process.env`.
 */
export function getClientEnv(key: string): string | undefined {
  if (typeof window !== 'undefined') {
    return (window as any).ENV?.[key];
  }
  return process.env[key];
}
