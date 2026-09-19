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
