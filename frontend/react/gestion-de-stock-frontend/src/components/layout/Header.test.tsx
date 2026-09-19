import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Header } from './Header';
import { mockAuth } from '../../test-utils/mock-auth';

vi.mock('../../hooks/use-auth');

describe('Header', () => {
  beforeEach(() => {
    mockAuth();
  });

  it("affiche le nom de l'utilisateur connecte", () => {
    render(<MemoryRouter><Header /></MemoryRouter>);
    expect(screen.getByText('Bonjour Doe')).toBeInTheDocument();
  });

  it('expose un champ de recherche avec un nom accessible', () => {
    render(<MemoryRouter><Header /></MemoryRouter>);
    expect(screen.getByRole('textbox', { name: 'Recherche' })).toBeInTheDocument();
  });

  it('lie le profil a /profil', () => {
    render(<MemoryRouter><Header /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Mon profil' })).toHaveAttribute('href', '/profil');
  });

  it('rend le contenu `leading` dans le flux, avant la recherche', () => {
    render(<MemoryRouter><Header leading={<button type="button">Lead</button>} /></MemoryRouter>);
    const lead = screen.getByRole('button', { name: 'Lead' });
    const recherche = screen.getByRole('textbox', { name: 'Recherche' });
    expect(lead.compareDocumentPosition(recherche) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
