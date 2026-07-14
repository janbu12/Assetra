export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const csrf = typeof document === 'undefined' ? '' : document.cookie.split('; ').find((value) => value.startsWith('assetra_csrf='))?.split('=')[1] || '';
  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'x-csrf-token': csrf } : {}), ...init?.headers } });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.message || 'Permintaan gagal');
  return response.json();
}
