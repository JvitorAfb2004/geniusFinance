import { auth } from './firebase';

// No Remix, API e frontend compartilham a mesma origem.
// VITE_API_BASE permite override para VPS/proxy separado.
const BASE = import.meta.env.VITE_API_BASE || '';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : '';

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));

  if (!res.ok || data.error) {
    throw new Error(data.error || `Erro ${res.status}`);
  }

  return data;
}
