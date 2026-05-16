import { auth } from './firebase';

// Em dev, usa localhost:3001. Em prod, usa a variável VITE_API_BASE.
const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

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
