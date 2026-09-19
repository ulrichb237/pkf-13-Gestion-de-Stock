import { describe, it, expect, beforeEach, vi } from 'vitest';
import { onSessionPurged, purgeSession } from './auth-middleware';

describe('onSessionPurged', () => {
  beforeEach(() => localStorage.clear());

  it('notifie les abonnes a chaque purge', () => {
    const listener = vi.fn();
    const unsubscribe = onSessionPurged(listener);
    purgeSession();
    purgeSession();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('ne notifie plus apres desabonnement', () => {
    const listener = vi.fn();
    onSessionPurged(listener)();
    purgeSession();
    expect(listener).not.toHaveBeenCalled();
  });

  it('un abonne qui leve ne bloque ni la purge ni les autres abonnes', () => {
    localStorage.setItem('accessToken', '{}');
    const bad = vi.fn(() => {
      throw new Error('boom');
    });
    const good = vi.fn();
    const u1 = onSessionPurged(bad);
    const u2 = onSessionPurged(good);
    expect(() => purgeSession()).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('accessToken')).toBeNull();
    u1();
    u2();
  });
});
