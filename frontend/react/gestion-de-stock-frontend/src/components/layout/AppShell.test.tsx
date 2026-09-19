import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { AppShell } from './AppShell';
import { mockAuth } from '../../test-utils/mock-auth';

vi.mock('../../hooks/use-auth');

function Location() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AppShell>
        <div>Contenu de page</div>
        <Location />
      </AppShell>
    </MemoryRouter>,
  );
}

const trigger = () => screen.getByRole('button', { name: 'Ouvrir le menu' });

// NB : jsdom n'applique pas Tailwind. Ces tests ne prouvent PAS que `hidden lg:flex` /
// `lg:hidden` masquent la bonne region a la bonne largeur ; ils couvrent le comportement.
describe('AppShell', () => {
  beforeEach(() => {
    mockAuth();
  });

  it('rend le contenu, la sidebar desktop et le header', () => {
    renderShell();
    expect(screen.getByText('Contenu de page')).toBeInTheDocument();
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it("place le declencheur du tiroir dans le header, sans positionnement fixed/absolute (R41)", () => {
    renderShell();
    expect(within(screen.getByRole('banner')).getByRole('button', { name: 'Ouvrir le menu' })).toBe(trigger());
    const classes = trigger().className.split(/\s+/);
    expect(classes).not.toContain('fixed');
    expect(classes).not.toContain('absolute');
    expect(classes).toContain('lg:hidden');
  });

  it('ouvre le tiroir avec un titre accessible (R43)', async () => {
    renderShell();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(trigger());
    expect(await screen.findByRole('dialog', { name: 'Menu principal' })).toBeInTheDocument();
  });

  it('ferme le tiroir apres navigation via un lien (R42)', async () => {
    renderShell();
    await userEvent.click(trigger());
    const dialog = await screen.findByRole('dialog', { name: 'Menu principal' });
    await userEvent.click(within(dialog).getByRole('link', { name: 'Clients' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/clients');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('garde le tiroir ouvert quand on replie un groupe (pas de fermeture parasite)', async () => {
    renderShell();
    await userEvent.click(trigger());
    const dialog = await screen.findByRole('dialog', { name: 'Menu principal' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Articles' }));
    expect(screen.getByRole('dialog', { name: 'Menu principal' })).toBeInTheDocument();
  });

  it("l'etat des groupes est propre a chaque instance de Menu (R-risque 5)", async () => {
    renderShell();
    await userEvent.click(trigger());
    const dialog = await screen.findByRole('dialog', { name: 'Menu principal' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Articles' }));
    // La sidebar desktop garde son groupe deplie (aria-hidden pendant que le tiroir est ouvert : hidden:true).
    expect(within(screen.getByRole('complementary', { hidden: true })).getByText('Mouvements du stock')).toBeInTheDocument();
    expect(within(dialog).queryByText('Mouvements du stock')).not.toBeInTheDocument();
  });
});
