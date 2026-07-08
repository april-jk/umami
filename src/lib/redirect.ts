export function isSafeRedirectUrl(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//') && !url.includes(':');
}
