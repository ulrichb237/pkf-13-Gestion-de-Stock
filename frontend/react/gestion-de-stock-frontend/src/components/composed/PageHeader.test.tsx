import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('affiche le titre, la description et l\'action', () => {
    render(<PageHeader title="Articles" description="Liste des articles" action={<button>+ Nouvel article</button>} />);
    expect(screen.getByRole('heading', { name: 'Articles' })).toBeInTheDocument();
    expect(screen.getByText('Liste des articles')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Nouvel article' })).toBeInTheDocument();
  });

  it('fonctionne sans description ni action', () => {
    render(<PageHeader title="Profil" />);
    expect(screen.getByRole('heading', { name: 'Profil' })).toBeInTheDocument();
  });
});
