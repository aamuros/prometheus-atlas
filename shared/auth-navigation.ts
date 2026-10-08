// Shared browser/Worker validation for post-login destinations. Never redirect
// to another origin, an API endpoint, or an authentication route.
function hasUnsafeCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (character === '\\' || code <= 32 || code === 127) return true;
  }
  return false;
}

export function safeReturnTo(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    hasUnsafeCharacters(value)
  )
    return '/';
  try {
    const url = new URL(value, 'https://atlas.invalid');
    const path = decodeURIComponent(url.pathname);
    if (
      url.origin !== 'https://atlas.invalid' ||
      path.startsWith('//') ||
      hasUnsafeCharacters(path) ||
      path === '/sign-in' ||
      path.startsWith('/sign-in/') ||
      path === '/api' ||
      path.startsWith('/api/') ||
      path === '/cdn-cgi' ||
      path.startsWith('/cdn-cgi/')
    )
      return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

export function signInHref(returnTo: unknown): string {
  return `/api/auth/sign-in?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`;
}
