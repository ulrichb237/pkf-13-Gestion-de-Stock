import { TestBed } from '@angular/core/testing';
import { SessionService } from './session.service';

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('retourne null hors session', () => {
    expect(service.lireSession()).toBeNull();
    expect(service.lireAccessToken()).toBeNull();
    expect(service.lireRefreshToken()).toBeNull();
  });

  it('sauve puis relit une session complete', () => {
    service.sauverSession({ accessToken: 'at', refreshToken: 'rt' });

    expect(service.lireAccessToken()).toBe('at');
    expect(service.lireRefreshToken()).toBe('rt');
  });

  it('retourne null sur un contenu corrompu (pas de throw)', () => {
    localStorage.setItem('accessToken', '{json-cassé');

    expect(service.lireSession()).toBeNull();
    expect(service.lireAccessToken()).toBeNull();
  });

  it('purge les deux cles', () => {
    service.sauverSession({ accessToken: 'at', refreshToken: 'rt' });
    service.sauverUtilisateur({ id: 1, nom: 'Diop' });

    service.purger();

    expect(service.lireSession()).toBeNull();
    expect(service.lireUtilisateur()).toEqual({});
  });

  it('retourne un objet vide sans utilisateur connecte', () => {
    expect(service.lireUtilisateur()).toEqual({});
  });

  it('retourne un objet vide sur un utilisateur corrompu', () => {
    localStorage.setItem('connectedUser', 'pas-du-json');

    expect(service.lireUtilisateur()).toEqual({});
  });

  it('expose l URL de l API de l environnement courant', () => {
    expect(service.apiUrl).toBeTruthy();
  });
});
