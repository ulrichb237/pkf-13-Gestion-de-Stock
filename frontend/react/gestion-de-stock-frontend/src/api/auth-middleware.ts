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

/**
 * Clones des requetes authentifiees en attente de reponse, indexees par l'id
 * fourni par openapi-fetch pour cette requete.
 *
 * openapi-fetch transmet le meme objet `Request` a `fetch` puis a `onResponse`
 * (pas de clone cote client) : une fois la reponse recue, le corps de cette
 * requete est deja consomme et ne peut plus servir a rejouer un appel avec
 * body (POST/PUT/PATCH). On clone donc la requete des `onRequest`, avant
 * qu'elle ne soit envoyee, pour pouvoir la rejouer plus tard.
 *
 * L'entree est retiree sur chaque sortie possible d'`onResponse` (401 gere,
 * reponse non-401, requete d'authentification) et via `onError` si `fetch`
 * echoue avant meme qu'une reponse n'existe — sinon l'entree fuit en memoire.
 */
const requetesEnAttente = new Map<string, Request>();

export const authMiddleware: Middleware = {
  async onRequest({ request, id }) {
    const isAppelAuth = request.url.includes('/authentification/');
    const header = buildAuthHeader();
    if (header && !isAppelAuth) {
      request.headers.set('Authorization', header);
    }
    if (!isAppelAuth) {
      requetesEnAttente.set(id, request.clone());
    }
    return request;
  },
  async onResponse({ request, response, id }) {
    const requeteOriginale = requetesEnAttente.get(id);
    requetesEnAttente.delete(id);

    const isAppelAuth = request.url.includes('/authentification/');
    if (response.status !== 401 || isAppelAuth || !requeteOriginale) return response;

    try {
      const newAccessToken = await refreshSession();
      // Headers.set() remplace la valeur existante (contrairement a un objet
      // litteral construit via Object.fromEntries(headers), qui produirait
      // une cle "authorization" distincte de "Authorization" et ferait
      // fusionner les deux valeurs en "Bearer <old>, Bearer <new>").
      const retryHeaders = new Headers(requeteOriginale.headers);
      retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
      const retryRequest = new Request(requeteOriginale, { headers: retryHeaders });
      return await fetch(retryRequest);
    } catch (err) {
      // Une TypeError ici signale un bug dans notre propre code de rejeu
      // (ex: requete deja consommee) : elle ne doit pas etre confondue avec
      // un echec de refresh legitime (identifiants invalides, reseau, ...),
      // donc on la laisse remonter au lieu de renvoyer silencieusement le 401.
      if (err instanceof TypeError) throw err;
      return response; // le refresh a echoue, on laisse remonter le 401 d'origine
    }
  },
  async onError({ id }) {
    requetesEnAttente.delete(id);
  },
};
