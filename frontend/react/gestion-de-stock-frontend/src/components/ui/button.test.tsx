import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';
// Preuve que l'alias '@' resout aussi sous Vitest (risque nomme Task 3),
// independamment de tsc/Vite : `cn` est importe ici via le meme alias que
// celui que les composants generes shadcn utiliseraient (`@/lib/utils`).
import { cn } from '@/lib/utils';

describe('alias "@" (Task 3 — risque nomme)', () => {
  it("resout '@/lib/utils' sous Vitest", () => {
    const disabled = false;
    expect(cn('a', disabled && 'b', 'c')).toBe('a c');
  });
});

describe('Button', () => {
  it('rend son contenu et declenche onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Enregistrer</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applique la variante destructive', () => {
    render(<Button variant="destructive">Supprimer</Button>);
    expect(screen.getByRole('button', { name: 'Supprimer' }).className).toContain('destructive');
  });
});
