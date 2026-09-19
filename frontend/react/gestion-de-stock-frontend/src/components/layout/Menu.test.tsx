import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Menu } from './Menu';
import { mockAuth } from '../../test-utils/mock-auth';

vi.mock('../../hooks/use-auth');

function renderMenu(props: Parameters<typeof Menu>[0] = {}, route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Menu {...props} />
    </MemoryRouter>,
  );
}

describe('Menu', () => {
  beforeEach(() => {
    mockAuth();
  });

  it('affiche les 5 groupes du menu (menu.component.ts Angular)', () => {
    renderMenu();
    ['Tableau de bord', 'Articles', 'Clients', 'Fournisseurs', 'Parametrages'].forEach((titre) => {
      expect(screen.getByRole('button', { name: titre })).toBeInTheDocument();
    });
  });

  it('replie/deplie un groupe au clic et le signale via aria-expanded', async () => {
    renderMenu();
    const groupe = screen.getByRole('button', { name: 'Articles' });
    expect(groupe).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Mouvements du stock')).toBeVisible();

    await userEvent.click(groupe);
    expect(groupe).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Mouvements du stock')).not.toBeInTheDocument();

    await userEvent.click(groupe);
    expect(screen.getByText('Mouvements du stock')).toBeVisible();
  });

  it('marque uniquement le lien de la route courante avec aria-current', () => {
    renderMenu({}, '/articles');
    expect(screen.getByRole('link', { name: 'Articles' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Clients' })).not.toHaveAttribute('aria-current');
    // la racine ("Vue d'ensemble", to="/") ne doit pas etre active sur /articles
    expect(screen.getByRole('link', { name: "Vue d'ensemble" })).not.toHaveAttribute('aria-current');
  });

  it('garde le lien actif sur une sous-route (prefixe) sans activer la racine', () => {
    renderMenu({}, '/articles/nouveau');
    expect(screen.getByRole('link', { name: 'Articles' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: "Vue d'ensemble" })).not.toHaveAttribute('aria-current');
  });

  it("marque 'Vue d'ensemble' active sur la racine", () => {
    renderMenu({}, '/');
    expect(screen.getByRole('link', { name: "Vue d'ensemble" })).toHaveAttribute('aria-current', 'page');
  });

  it('appelle onNavigate au clic sur un lien', async () => {
    const onNavigate = vi.fn();
    renderMenu({ onNavigate });
    await userEvent.click(screen.getByRole('link', { name: 'Clients' }));
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("n'appelle pas onNavigate quand on replie un groupe", async () => {
    const onNavigate = vi.fn();
    renderMenu({ onNavigate });
    await userEvent.click(screen.getByRole('button', { name: 'Articles' }));
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('deconnecte au clic sur le bouton de deconnexion', async () => {
    const auth = mockAuth();
    renderMenu();
    await userEvent.click(screen.getByRole('button', { name: 'Se deconnecter' }));
    expect(auth.logout).toHaveBeenCalledOnce();
  });
});
