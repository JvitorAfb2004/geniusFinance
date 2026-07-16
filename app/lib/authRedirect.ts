const DEFAULT_AUTH_REDIRECT = '/dashboard';

export function getProtectedLoginPath(pathname: string, search: string) {
  const target = `${pathname}${search}`;
  return `/login?redirect=${encodeURIComponent(target)}`;
}

export function getLoginRedirectPath(redirect: string | null) {
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return DEFAULT_AUTH_REDIRECT;
  }
  return redirect;
}
