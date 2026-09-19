import { createContext, useContext } from 'react';
import type { components } from '../api/schema';

export type UtilisateurDto = components['schemas']['UtilisateurDto'];

export interface AuthContextValue {
  connectedUser: UtilisateurDto | null;
  isAuthenticated: boolean;
  /** Leve une Error (message du backend si present) et ne laisse rien dans le stockage en cas d'echec. */
  login: (login: string, password: string) => Promise<void>;
  /** Synchrone pour l'appelant : la revocation cote serveur part en tache de fond. */
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit etre utilise a l'interieur de <AuthProvider>");
  return ctx;
}
