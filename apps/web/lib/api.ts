export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
let refreshing: Promise<boolean> | null = null;

function csrfToken() {
  return typeof document === 'undefined' ? '' : document.cookie.split('; ').find((value) => value.startsWith('assetra_csrf='))?.split('=')[1] || '';
}

async function refreshSession() {
  if (!refreshing) {
    refreshing = fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const request = () => {
    const csrf = csrfToken();
    return fetch(`${API_URL}${path}`, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'x-csrf-token': csrf } : {}), ...init?.headers } });
  };
  let response = await request();
  if (response.status === 401 && !path.startsWith('/auth/')) {
    if (await refreshSession()) response = await request();
    else if (typeof window !== 'undefined') window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  }
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.message || 'Permintaan gagal');
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
