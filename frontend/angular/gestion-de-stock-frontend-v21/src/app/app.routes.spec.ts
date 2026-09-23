import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard, redirectSiConnecte } from './app.routes';
import { SessionService } from './services/session/session.service';

describe('Guards de session', () => {
  let session: SessionService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    session = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('authGuard', () => {
    it('laisse passer si un access token existe', () => {
      session.sauverSession({ accessToken: 'token-test', refreshToken: 'refresh-test' });

      const resultat = TestBed.runInInjectionContext(() => authGuard());

      expect(resultat).toBe(true);
    });

    it('renvoie vers /login sans jeton', () => {
      const resultat = TestBed.runInInjectionContext(() => authGuard());

      expect(resultat).toBeInstanceOf(UrlTree);
      expect((resultat as UrlTree).toString()).toBe('/login');
    });

    it('renvoie vers /login si le contenu stocke est corrompu', () => {
      localStorage.setItem('accessToken', 'pas-du-json');

      const resultat = TestBed.runInInjectionContext(() => authGuard());

      expect(resultat).toBeInstanceOf(UrlTree);
    });
  });

  describe('redirectSiConnecte', () => {
    it('laisse passer un visiteur non connecte', () => {
      const resultat = TestBed.runInInjectionContext(() => redirectSiConnecte());

      expect(resultat).toBe(true);
    });

    it('redirige un visiteur deja connecte vers /accueil', () => {
      session.sauverSession({ accessToken: 'token-test', refreshToken: 'refresh-test' });

      const resultat = TestBed.runInInjectionContext(() => redirectSiConnecte());

      expect(resultat).toBeInstanceOf(UrlTree);
      expect((resultat as UrlTree).toString()).toBe('/accueil');
    });
  });
});
