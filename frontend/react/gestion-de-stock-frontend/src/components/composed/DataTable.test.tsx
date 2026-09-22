import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { DataTable } from './DataTable';

interface Row { id: number; nom: string }
const data: Row[] = [{ id: 1, nom: 'Article A' }, { id: 2, nom: 'Article B' }];
const columns = [{ header: 'Nom', cell: (r: Row) => r.nom }];

describe('DataTable', () => {
  it('rend une ligne par element de donnees (vue desktop)', () => {
    render(<DataTable columns={columns} data={data} getRowId={(r) => r.id} />);
    // jsdom n'applique pas les media queries : la vue mobile reste dans le DOM
    // (masquee par CSS) en parallele de la table, d'ou le scope sur <table>.
    const table = within(screen.getByRole('table'));
    expect(table.getByText('Article A')).toBeInTheDocument();
    expect(table.getByText('Article B')).toBeInTheDocument();
  });

  it('rend aussi une vue carte mobile (masquee par CSS, presente dans le DOM)', () => {
    render(<DataTable columns={columns} data={data} getRowId={(r) => r.id} />);
    const cartes = screen.getAllByTestId('data-table-mobile-row');
    expect(cartes).toHaveLength(2);
  });

  it('affiche un etat vide explicite', () => {
    render(<DataTable columns={columns} data={[]} getRowId={(r: Row) => r.id} />);
    expect(screen.getByText(/aucune donnee/i)).toBeInTheDocument();
  });
});
