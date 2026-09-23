import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AuthenticationResponse } from '../../../gs-api/src/models/authentication-response';
import { UtilisateurDto } from '../../../gs-api/src/models/utilisateur-dto';

/**
 * Acces unique et type au stockage de session (localStorage).
 * Remplace les appels localStorage eparses qui dupliquent JSON.parse / try-catch
 * dans l'intercepteur, le UserService et les guards.
 *
 * Note securite : localStorage est lisible par tout script charge (XSS).
 * Le backend devra a terme poser le refresh token en cookie httpOnly ;
 * en attendant, ce service isole au moins la mecanique en un point.
 */
const CLE_TOKEN = 'accessToken';
const CLE_UTILISATEUR = 'connectedUser';

@Injectable({ providedIn: 'root' })
export class SessionService {

  /** URL du backend, partagee par le client genere via ApiConfiguration */
  readonly apiUrl: string = environment.apiUrl;

  /** Reponse d'authentification complete (access + refresh), ou null */
  lireSession(): AuthenticationResponse | null {
    const brut = localStorage.getItem(CLE_TOKEN);
    if (!brut) {
      return null;
    }
    try {
      return JSON.parse(brut) as AuthenticationResponse;
    } catch {
      return null;
    }
  }

  /** Access token seul, ou null */
  lireAccessToken(): string | null {
    return this.lireSession()?.accessToken ?? null;
  }

  /** Refresh token seul, ou null */
  lireRefreshToken(): string | null {
    return this.lireSession()?.refreshToken ?? null;
  }

  sauverSession(reponse: AuthenticationResponse): void {
    localStorage.setItem(CLE_TOKEN, JSON.stringify(reponse));
  }

  /** Met a jour uniquement le couple de jetons apres un refresh (conserve les autres champs) */
  remplacerSession(reponse: AuthenticationResponse): void {
    this.sauverSession(reponse);
  }

  lireUtilisateur(): UtilisateurDto {
    const brut = localStorage.getItem(CLE_UTILISATEUR);
    if (!brut) {
      return {};
    }
    try {
      return JSON.parse(brut) as UtilisateurDto;
    } catch {
      return {};
    }
  }

  sauverUtilisateur(utilisateur: UtilisateurDto): void {
    localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(utilisateur));
  }

  /** Supprime toute trace de session locale */
  purger(): void {
    localStorage.removeItem(CLE_TOKEN);
    localStorage.removeItem(CLE_UTILISATEUR);
  }
}
