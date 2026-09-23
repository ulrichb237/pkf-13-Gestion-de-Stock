import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpClient, HttpInterceptorFn, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { apiInterceptor } from './api.interceptor';

/** Fournit HttpClient avec l'intercepteur de l'application */
function httpAvecIntercepteur(intercepteur: HttpInterceptorFn): HttpClient {
  return TestBed.inject(HttpClient);
}

describe('apiInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  const URL_BACKEND = 'http://localhost:8081';

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('ajoute le header Authorization quand un access token existe', () => {
    localStorage.setItem('accessToken', JSON.stringify({ accessToken: 'jeton-valide' }));

    http.get(`${URL_BACKEND}/api/v1/articles`).subscribe();

    const requete = httpMock.expectOne(`${URL_BACKEND}/api/v1/articles`);
    expect(requete.request.headers.get('Authorization')).toBe('Bearer jeton-valide');
    requete.flush([]);
  });

  it('n ajoute pas de header sur un appel d authentification', () => {
    http.post(`${URL_BACKEND}/api/v1/authentification/connexion`, {}).subscribe();

    const requete = httpMock.expectOne(`${URL_BACKEND}/api/v1/authentification/connexion`);
    expect(requete.request.headers.get('Authorization')).toBeNull();
    requete.flush({});
  });

  it('ne modifie pas les requetes hors session', () => {
    http.get(`${URL_BACKEND}/api/v1/articles`).subscribe();

    const requete = httpMock.expectOne(`${URL_BACKEND}/api/v1/articles`);
    expect(requete.request.headers.get('Authorization')).toBeNull();
    requete.flush([]);
  });

  it('renouvelle la session puis rejoue la requete apres un 401', () => {
    localStorage.setItem('accessToken', JSON.stringify({ accessToken: 'expire', refreshToken: 'refresh-ok' }));

    http.get(`${URL_BACKEND}/api/v1/articles`).subscribe();

    const premiere = httpMock.expectOne(`${URL_BACKEND}/api/v1/articles`);
    premiere.flush({ message: 'expire' }, { status: 401, statusText: 'Unauthorized' });

    // Le refresh part sur l'URL ABSOLUE du backend (bug historique : URL relative)
    const refresh = httpMock.expectOne(`${URL_BACKEND}/api/v1/authentification/refresh`);
    expect(refresh.request.body).toEqual({ refreshToken: 'refresh-ok' });
    refresh.flush({ accessToken: 'nouveau-jeton', refreshToken: 'refresh-suivant' });

    // La requete initiale est rejouee avec le nouveau jeton
    const rejouee = httpMock.expectOne(`${URL_BACKEND}/api/v1/articles`);
    expect(rejouee.request.headers.get('Authorization')).toBe('Bearer nouveau-jeton');
    rejouee.flush([]);
  });

  it('purge la session si le refresh echoue', () => {
    localStorage.setItem('accessToken', JSON.stringify({ accessToken: 'expire', refreshToken: 'refresh-ko' }));

    http.get(`${URL_BACKEND}/api/v1/articles`).subscribe({
      error: () => { /* erreur attendue */ }
    });

    const premiere = httpMock.expectOne(`${URL_BACKEND}/api/v1/articles`);
    premiere.flush({}, { status: 401, statusText: 'Unauthorized' });

    const refresh = httpMock.expectOne(`${URL_BACKEND}/api/v1/authentification/refresh`);
    refresh.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('purge la session et echoue sans refresh token', () => {
    localStorage.setItem('accessToken', JSON.stringify({ accessToken: 'expire' }));

    let erreurRecue: unknown = null;
    http.get(`${URL_BACKEND}/api/v1/articles`).subscribe({
      error: (err) => { erreurRecue = err; }
    });

    httpMock.expectOne(`${URL_BACKEND}/api/v1/articles`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(erreurRecue).toBeTruthy();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});

void httpAvecIntercepteur;
