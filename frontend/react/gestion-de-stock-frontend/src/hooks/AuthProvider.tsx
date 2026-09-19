import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { apiClient } from '../api/client';
import { getStoredSession, onSessionPurged, purgeSession } from '../api/auth-middleware';
import { AuthContext, type AuthContextValue, type UtilisateurDto } from './use-auth';

const MESSAGE_CONNEXION = 'Connexion impossible. Verifiez vos identifiants ou reessayez plus tard.';

function messageDe(error: unknown, defaut: string): string {
  const message = (error as { message?: unknown } | null | undefined)?.message;
  return typeof message === 'string' && message ? message : defaut;
}

/** Session restauree seulement si jeton ET profil valides : jamais "connecte" sans connectedUser. */
function readStoredUser(): UtilisateurDto | null {
  if (!getStoredSession()) return null;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem('connectedUser') ?? 'null');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return typeof (parsed as { email?: unknown }).email === 'string' ? (parsed as UtilisateurDto) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  // Etat unique : isAuthenticated derive de connectedUser, donc les deux ne peuvent pas diverger.
  const [connectedUser, setConnectedUser] = useState<UtilisateurDto | null>(readStoredUser);

  // R36 : suit la purge declenchee par le middleware (refresh echoue).
  useEffect(() => onSessionPurged(() => setConnectedUser(null)), []);

  const login = useCallback(async (login: string, password: string) => {
    let authResponse;
    try {
      const res = await apiClient.POST('/api/v1/authentification/connexion', {
        body: { login, password },
      });
      if (!res.data?.accessToken || !res.data.refreshToken) {
        throw new Error(messageDe(res.error, MESSAGE_CONNEXION));
      }
      authResponse = res.data;
    } catch (err) {
      // Rien n'a ete ecrit a ce stade. Un echec reseau devient un message exploitable.
      throw err instanceof TypeError ? new Error(MESSAGE_CONNEXION) : err;
    }

    // Instantane brut de la session precedente : un echec au stade profil doit la laisser intacte.
    const precedent = {
      accessToken: localStorage.getItem('accessToken'),
      connectedUser: localStorage.getItem('connectedUser'),
    };
    // Le middleware lit le jeton dans localStorage : il doit y etre avant l'appel du profil.
    localStorage.setItem('accessToken', JSON.stringify(authResponse));
    try {
      const email = authResponse.email;
      if (!email) throw new Error(MESSAGE_CONNEXION);
      const res = await apiClient.GET('/api/v1/utilisateurs/email/{email}', {
        params: { path: { email } },
      });
      if (!res.data) throw new Error(messageDe(res.error, MESSAGE_CONNEXION));
      localStorage.setItem('connectedUser', JSON.stringify(res.data));
      // Profil charge AVANT de basculer en authentifie (pas de page sans connectedUser).
      setConnectedUser(res.data);
    } catch (err) {
      // Restauration (pas purgeSession : elle notifie et deconnecterait l'etat React).
      for (const [cle, valeur] of Object.entries(precedent)) {
        if (valeur === null) localStorage.removeItem(cle);
        else localStorage.setItem(cle, valeur);
      }
      throw err instanceof TypeError ? new Error(MESSAGE_CONNEXION) : err;
    }
  }, []);

  const logout = useCallback(() => {
    const refreshToken = getStoredSession()?.refreshToken;
    purgeSession();
    setConnectedUser(null);
    if (refreshToken) {
      // R35 : revocation cote serveur en tache de fond, sans jamais bloquer ni echouer.
      void Promise.resolve(
        apiClient.POST('/api/v1/authentification/deconnexion', { body: { refreshToken } }),
      ).catch(() => undefined);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ connectedUser, isAuthenticated: connectedUser !== null, login, logout }),
    [connectedUser, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
