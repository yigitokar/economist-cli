import { getUserAccessToken, getSupabaseUrl } from './supabaseClient';

export async function postWithAuth<T>(path: string, body: unknown): Promise<T> {
  const base = getSupabaseUrl();
  const token = await getUserAccessToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${base}/functions/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    // ignore
  }
  if (!res.ok) {
    throw new Error(json?.error || res.statusText || 'Request failed');
  }
  return json as T;
}

export async function getWithAuth<T>(path: string): Promise<T> {
  const base = getSupabaseUrl();
  const token = await getUserAccessToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${base}/functions/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    // ignore
  }
  if (!res.ok) {
    throw new Error(json?.error || res.statusText || 'Request failed');
  }
  return json as T;
}
