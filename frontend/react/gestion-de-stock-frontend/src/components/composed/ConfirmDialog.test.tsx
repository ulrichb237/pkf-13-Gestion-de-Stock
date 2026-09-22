import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('declenche onConfirm au clic sur le bouton de confirmation', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog open onOpenChange={() => {}} title="Supprimer l'article ?"
        description="Cette action est irreversible." onConfirm={onConfirm} confirmLabel="Supprimer" />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('n\'affiche rien si open=false', () => {
    render(
      <ConfirmDialog open={false} onOpenChange={() => {}} title="X" description="Y" onConfirm={() => {}} />
    );
    expect(screen.queryByText('X')).not.toBeInTheDocument();
  });
});
