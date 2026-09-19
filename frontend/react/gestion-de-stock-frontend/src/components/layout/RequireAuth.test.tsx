import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { RequireAuth } from './RequireAuth';
import { useAuth, type AuthContextValue, type UtilisateurDto } from '../../hooks/use-auth';

vi.mock('../../hooks/use-auth'); // vi.spyOn sur un export ESM leve "cannot redefine property"

const USER = { id: 1, nom: 'Doe', prenom: 'Jo', email: 'jo@b.com' } as UtilisateurDto;

// Etats atteignables uniquement : isAuthenticated est derive de connectedUser.
function mockAuth(connectedUser: UtilisateurDto | null) {
  const value: AuthContextValue = {
    connectedUser,
    isAuthenticated: connectedUser !== null,
    login: vi.fn(),
    logout: vi.fn(),
  };
  vi.mocked(useAuth).mockReturnValue(value);
}

const protectedRender = vi.fn();
function Protected() {
  protectedRender();
  return <div>Page articles</div>;
}
function LoginPage() {
  const { pathname } = useLocation();
  return <div>Page login ({pathname})</div>;
}

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/articles']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/articles" element={<Protected />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  beforeEach(() => protectedRender.mockClear());

  it('laisse passer si authentifie', () => {
    mockAuth(USER);
    renderGuard();
    expect(screen.getByText('Page articles')).toBeInTheDocument();
    expect(screen.queryByText(/Page login/)).not.toBeInTheDocument();
  });

  it('redirige vers /login si non authentifie', () => {
    mockAuth(null);
    renderGuard();
    expect(screen.getByText('Page login (/login)')).toBeInTheDocument();
  });

  it('ne rend jamais le contenu protege quand il redirige', () => {
    mockAuth(null);
    renderGuard();
    expect(screen.queryByText('Page articles')).not.toBeInTheDocument();
    expect(protectedRender).not.toHaveBeenCalled();
  });
});
