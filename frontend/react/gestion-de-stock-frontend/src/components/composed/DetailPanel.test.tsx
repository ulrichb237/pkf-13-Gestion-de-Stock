import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DetailPanel } from './DetailPanel';

describe('DetailPanel', () => {
  it('affiche le titre et le contenu quand ouvert', () => {
    render(<DetailPanel open onOpenChange={() => {}} title="Article #42"><p>Detail</p></DetailPanel>);
    expect(screen.getByText('Article #42')).toBeInTheDocument();
    expect(screen.getByText('Detail')).toBeInTheDocument();
  });
});
