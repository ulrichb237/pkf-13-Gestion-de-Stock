import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getStoredSession, purgeSession, buildAuthHeader } from './auth-middleware';
import { refreshSession, __resetRefreshState } from './auth-middleware';

describe('session locale', () => {
  beforeEach(() => localStorage.clear());

  it('retourne null si aucune session stockee', () => {
    expect(getStoredSession()).toBeNull();
  });

  it('lit la session depuis localStorage', () => {
    localStorage.setItem('accessToken', JSON.stringify({ accessToken: 'abc', refreshToken: 'xyz' }));
    expect(getStoredSession()).toEqual({ accessToken: 'abc', refreshToken: 'xyz' });
  });

  it('purgerSession vide accessToken et connectedUser', () => {
    localStorage.setItem('accessToken', '{}');
    localStorage.setItem('connectedUser', '{}');
    purgeSession();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('connectedUser')).toBeNull();
  });

  it('construit le header Authorization Bearer', () => {
    localStorage.setItem('accessToken', JSON.stringify({ accessToken: 'abc123', refreshToken: 'r' }));
    expect(buildAuthHeader()).toBe('Bearer abc123');
  });

  it('ne construit pas de header sans session', () => {
    expect(buildAuthHeader()).toBeNull();
  });
});

describe('refresh token single-flight', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('accessToken', JSON.stringify({ accessToken: 'old', refreshToken: 'r1' }));
    __resetRefreshState();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ne declenche qu'un seul appel reseau pour plusieurs refresh concurrents", async () => {
    const fetchMock = vi.fn().mockImplementation(
      () => Promise.resolve(new Response(JSON.stringify({ accessToken: 'new', refreshToken: 'r2' }), { status: 200 })),
    );
    vi.stubGlobal('fetch', fetchMock);

    const [a, b, c] = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toBe('new');
    expect(b).toBe('new');
    expect(c).toBe('new');
  });

  it('purge la session si le refresh echoue', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    await expect(refreshSession()).rejects.toThrow();
    expect(getStoredSession()).toBeNull();
  });

  it("l'etat de refresh est reellement remis a zero apres un echec (pas de deadlock)", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    await expect(refreshSession()).rejects.toThrow();

    // une nouvelle session est posee, un nouvel appel doit repartir (pas rester bloque sur la promesse morte)
    localStorage.setItem('accessToken', JSON.stringify({ accessToken: 'old2', refreshToken: 'r3' }));
    const fetchMock2 = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'new2', refreshToken: 'r4' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock2);

    const result = await refreshSession();
    expect(result).toBe('new2');
    expect(fetchMock2).toHaveBeenCalledTimes(1);
  });
});

/**
 * Tests d'integration du middleware lui-meme (onRequest/onResponse), via un
 * vrai apiClient. Contrairement aux blocs precedents qui appellent
 * refreshSession()/getStoredSession() directement, ceux-ci font vraiment
 * passer une requete par le middleware pour verifier ce qui part sur le
 * reseau lors du rejeu apres 401.
 *
 * openapi-fetch capture `globalThis.fetch` au moment de la creation du
 * client (dans createClient), pas a chaque appel. On doit donc stubber
 * `fetch` puis reimporter './client' avec des modules frais (vi.resetModules)
 * pour que le client nouvellement cree capture bien le mock.
 */
describe('authMiddleware (integration via apiClient)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sur 401, rafraichit puis rejoue le GET avec un seul header Authorization (pas de fusion virgule)', async () => {
    localStorage.setItem('accessToken', JSON.stringify({ accessToken: 'old-token', refreshToken: 'r1' }));

    let articlesCallCount = 0;
    let replayAuthHeader: string | null = null;
    // refreshSession() appelle fetch(urlString, init) (pas un objet Request),
    // alors que le client openapi-fetch appelle fetch(request). On normalise
    // les deux formes pour inspecter uniformement url/headers.
    const fetchMock = vi.fn(async (input: Request | string, init?: RequestInit) => {
      const req = input instanceof Request ? input : new Request(input, init);
      if (req.url.includes('/authentification/refresh')) {
        return new Response(JSON.stringify({ accessToken: 'new-token', refreshToken: 'r2' }), { status: 200 });
      }
      articlesCallCount += 1;
      if (articlesCallCount === 1) {
        return new Response('{}', { status: 401 });
      }
      replayAuthHeader = req.headers.get('Authorization');
      return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { apiClient } = await import('./client');
    const { data, error } = await apiClient.GET('/api/v1/articles');

    expect(error).toBeUndefined();
    expect(data).toEqual([]);
    expect(articlesCallCount).toBe(2);
    const refreshCalls = fetchMock.mock.calls.filter(
      ([r]) => (r instanceof Request ? r.url : String(r)).includes('/authentification/refresh'),
    );
    expect(refreshCalls).toHaveLength(1);
    // Ce test doit echouer contre le bug "fusion virgule" : sous l'ancienne
    // implementation, replayAuthHeader vaut "Bearer old-token, Bearer new-token".
    expect(replayAuthHeader).toBe('Bearer new-token');
  });

  it('sur 401, rafraichit puis rejoue effectivement un POST avec body (pas de requete deja consommee)', async () => {
    localStorage.setItem('accessToken', JSON.stringify({ accessToken: 'old-token', refreshToken: 'r1' }));

    let articlesCallCount = 0;
    let replayAuthHeader: string | null = null;
    let replayBody: unknown;
    const fetchMock = vi.fn(async (input: Request | string, init?: RequestInit) => {
      const req = input instanceof Request ? input : new Request(input, init);
      if (req.url.includes('/authentification/refresh')) {
        return new Response(JSON.stringify({ accessToken: 'new-token', refreshToken: 'r2' }), { status: 200 });
      }
      // Une vraie implementation de fetch lit le corps de la requete pour
      // l'envoyer sur le reseau : on le lit ici pour reproduire fidelement
      // la "consommation" du corps qui rend la requete d'origine irrejouable.
      const bodyText = await req.text();
      articlesCallCount += 1;
      if (articlesCallCount === 1) {
        return new Response('{}', { status: 401 });
      }
      replayAuthHeader = req.headers.get('Authorization');
      replayBody = JSON.parse(bodyText);
      return new Response(bodyText, { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { apiClient } = await import('./client');
    const article = {
      codeArticle: 'ART-1',
      designation: 'Test',
      prixUnitaireHt: 100,
      tauxTva: 20,
      prixUnitaireTtc: 120,
      category: { code: 'CAT-1' },
    };
    const { data, error } = await apiClient.POST('/api/v1/articles', { body: article });

    expect(error).toBeUndefined();
    // Ce test doit echouer contre le bug "requete deja consommee" : sous
    // l'ancienne implementation, le rejeu leve une TypeError avalee par le
    // catch, et articlesCallCount reste a 1 (le 401 d'origine est renvoye).
    expect(articlesCallCount).toBe(2);
    expect(replayAuthHeader).toBe('Bearer new-token');
    expect(replayBody).toEqual(article);
    expect(data).toEqual(article);
  });

  it("n'ajoute pas de header Authorization sur les appels d'authentification et ne les fait pas rejouer sur 401", async () => {
    localStorage.setItem('accessToken', JSON.stringify({ accessToken: 'old-token', refreshToken: 'r1' }));

    let connexionAuthHeader: string | null | undefined;
    let connexionCallCount = 0;
    const fetchMock = vi.fn(async (input: Request) => {
      connexionCallCount += 1;
      connexionAuthHeader = input.headers.get('Authorization');
      return new Response('{}', { status: 401 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { apiClient } = await import('./client');
    await apiClient.POST('/api/v1/authentification/connexion', {
      body: { login: 'a@b.fr', password: 'x' },
    });

    expect(connexionCallCount).toBe(1); // pas de rejoue, pas de refresh declenche
    expect(connexionAuthHeader).toBeNull();
  });
});
