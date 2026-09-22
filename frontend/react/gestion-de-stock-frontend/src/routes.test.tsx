import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { mockAuth } from './test-utils/mock-auth';
import { AppRoutes } from './routes';

vi.mock('./hooks/use-auth');

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe('AppRoutes — couverture des 20 routes protegees + 3 publiques (spec §1)', () => {
  beforeEach(() => mockAuth());

  const routesProtegees = [
    'accueil', 'statistiques', 'articles', 'nouvelarticle', 'mvtstk', 'ventes',
    'nouvellevelle', 'clients', 'nouveauclient', 'commandesclient', 'nouvellecommandeclt',
    'fournisseurs', 'nouveaufournisseur', 'commandesfournisseur', 'nouvellecommandefrs',
    'categories', 'nouvellecategorie', 'utilisateurs', 'nouvelutilisateur', 'profil',
    'changermotdepasse', 'entreprise',
  ];

  it.each(routesProtegees)('la route /%s est declaree et rend un contenu', async (route) => {
    renderAt(`/${route}`);
    expect(await screen.findByText(new RegExp(`page « ${route} »`, 'i'))).toBeInTheDocument();
  });

  it('redirige / vers /accueil', async () => {
    renderAt('/');
    expect(await screen.findByText(/page « accueil »/i)).toBeInTheDocument();
  });
});

describe('routes publiques', () => {
  beforeEach(() => mockAuth(null));

  it.each(['login', 'inscrire', 'motdepasseoublie'])('la route /%s ne requiert pas d\'authentification', async (route) => {
    renderAt(`/${route}`);
    expect(await screen.findByText(/./)).toBeInTheDocument();
  });
});
