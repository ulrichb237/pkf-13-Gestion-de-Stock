import type { Middleware } from 'openapi-fetch';
import { API_BASE_URL } from './config'; // jamais depuis './client' : cycle d'import (client importe ce module)

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
}

export function getStoredSession(): AuthSession | null {
  const raw = localStorage.getItem('accessToken');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function purgeSession(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('connectedUser');
}

export function buildAuthHeader(): string | null {
  const session = getStoredSession();
  return session?.accessToken ? `Bearer ${session.accessToken}` : null;
}

let refreshEnCours: Promise<string> | null = null;

/** Reservee aux tests : reinitialise l'etat partage entre deux scenarios */
export function __resetRefreshState(): void {
  refreshEnCours = null;
}

export async function refreshSession(): Promise<string> {
  if (refreshEnCours) return refreshEnCours;

  const session = getStoredSession();
  if (!session?.refreshToken) {
    purgeSession();
    throw new Error('no-refresh-token');
  }

  refreshEnCours = fetch(`${API_BASE_URL}/api/v1/authentification/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error('refresh-failed');
      const body = (await res.json()) as AuthSession;
      if (!body.accessToken) throw new Error('refresh-failed');
      localStorage.setItem('accessToken', JSON.stringify(body));
      return body.accessToken;
    })
    .catch((err: unknown) => {
      purgeSession();
      throw err;
    })
    .finally(() => {
      refreshEnCours = null;
    });

  return refreshEnCours;
}

export const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const isAppelAuth = request.url.includes('/authentification/');
    const header = buildAuthHeader();
    if (header && !isAppelAuth) {
      request.headers.set('Authorization', header);
    }
    return request;
  },
  async onResponse({ request, response }) {
    const isAppelAuth = request.url.includes('/authentification/');
    if (response.status !== 401 || isAppelAuth) return response;

    try {
      const newAccessToken = await refreshSession();
      const retryRequest = new Request(request, {
        headers: { ...Object.fromEntries(request.headers), Authorization: `Bearer ${newAccessToken}` },
      });
      return fetch(retryRequest);
    } catch {
      return response; // le refresh a echoue, on laisse remonter le 401 d'origine
    }
  },
};
