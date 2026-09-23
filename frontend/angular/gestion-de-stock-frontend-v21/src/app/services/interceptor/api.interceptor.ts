import { inject } from '@angular/core';
import {
  HttpClient,
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpResponse
} from '@angular/common/http';
import { Observable, tap, switchMap, catchError, throwError, finalize } from 'rxjs';

import { AuthenticationResponse } from '../../../gs-api/src/models/authentication-response';
import { LoaderService } from '../../composants/loader/service/loader.service';
import { NotificationService } from '../notification/notification.service';
import { SessionService } from '../session/session.service';

/**
 * Intercepteur fonctionnel (best practice Angular >= 15, recommandation MCP Angular) :
 * remplace l'ancien HttpInterceptorService (classe + HTTP_INTERCEPTORS DI).
 *
 * Rôles :
 * - injecte le header Authorization: Bearer <accessToken> depuis la session ;
 * - sur 401, renouvelle automatiquement la session via le refresh token puis rejoue
 *   la requête (un seul refresh à la fois : les requêtes concurrentes attendent le sien) ;
 * - si le refresh échoue, purge la session locale (déconnexion effective) ;
 * - affiche/masque le loader global autour de chaque requête HTTP ;
 * - notifie l'utilisateur des erreurs backend via le service de toasts.
 */

/** État partagé du refresh : évite N refresh concurrents sur N 401 simultanés */
let refreshEnCours: Observable<string> | null = null;

function lancerRefresh(http: HttpClient, session: SessionService): Observable<string> {
  if (refreshEnCours) {
    return refreshEnCours;
  }

  const refreshToken = session.lireRefreshToken();
  if (!refreshToken) {
    session.purger();
    return throwError(() => new Error('no-refresh-token'));
  }

  // URL absolue via SessionService : l'ancien code postait sur "/api/v1/..."
  // (relatif donc meme origine que le serveur Angular, pas le backend 8081) :
  // le refresh ne pouvait aboutir qu'en dev avec un proxy, sinon 404 silencieux.
  refreshEnCours = http
    .post<AuthenticationResponse>(`${session.apiUrl}/api/v1/authentification/refresh`, { refreshToken })
    .pipe(
      tap((reponse) => {
        session.remplacerSession(reponse);
      }),
      switchMap((reponse) => {
        if (!reponse?.accessToken) {
          session.purger();
          return throwError(() => new Error('refresh-failed'));
        }
        return new Observable<string>((abonne) => {
          abonne.next(reponse.accessToken as string);
          abonne.complete();
        });
      }),
      catchError((erreur) => {
        session.purger();
        return throwError(() => erreur ?? new Error('refresh-failed'));
      }),
      finalize(() => {
        refreshEnCours = null;
      })
    );
  return refreshEnCours;
}

export const apiInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const loaderService = inject(LoaderService);
  const notificationService = inject(NotificationService);
  const http = inject(HttpClient);
  const session = inject(SessionService);

  loaderService.show();

  const isAppelAuth = req.url.includes('/authentification/');
  const token = session.lireAccessToken();
  let authReq = req;
  if (token && !isAppelAuth) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return traiter(authReq, next, http, session).pipe(
    tap({
      next: (event: HttpEvent<unknown>) => {
        if (event instanceof HttpResponse) {
          loaderService.hide();
        }
      },
      error: (err: { error?: { message?: string; httpCode?: number }; message?: string }) => {
        loaderService.hide();
        // Session expirée et refresh impossible : message dédié + retour au login
        if (err?.error?.httpCode === 401 || err?.message === 'refresh-failed') {
          notificationService.info('Session expirée, veuillez vous reconnecter');
          return;
        }
        const message = err?.error?.message || err?.message || 'Une erreur est survenue';
        notificationService.error(message);
      }
    }),
    finalize(() => loaderService.hide())
  );
};

/** Chaîne une requête avec retry unique après refresh sur 401 */
function traiter(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  http: HttpClient,
  session: SessionService
): Observable<HttpEvent<unknown>> {
  return next(req).pipe(
    catchError((erreur: { status?: number }) => {
      const isAppelAuth = req.url.includes('/authentification/');
      if (erreur?.status !== 401 || isAppelAuth) {
        return throwError(() => erreur);
      }
      return lancerRefresh(http, session).pipe(
        switchMap((accessToken) => {
          const rejouee = req.clone({
            setHeaders: { Authorization: `Bearer ${accessToken}` }
          });
          return next(rejouee);
        })
      );
    })
  );
}
