import { vi } from 'vitest';
import { useAuth, type AuthContextValue, type UtilisateurDto } from '../hooks/use-auth';

export const TEST_USER = { id: 1, nom: 'Doe', prenom: 'Jo', email: 'jo@b.com' } as UtilisateurDto;

/**
 * A appeler apres `vi.mock('.../hooks/use-auth')` dans le fichier de test.
 * Seuls des etats atteignables sont exprimables : `isAuthenticated` est derive de `connectedUser`.
 */
export function mockAuth(connectedUser: UtilisateurDto | null = TEST_USER) {
  const value: AuthContextValue = {
    connectedUser,
    isAuthenticated: connectedUser !== null,
    login: vi.fn(),
    logout: vi.fn(),
  };
  vi.mocked(useAuth).mockReturnValue(value);
  return value;
}
