import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RechercheParCode } from './RechercheParCode';

describe('RechercheParCode', () => {
  it('appelle onSearch avec le code saisi a la validation', async () => {
    const onSearch = vi.fn();
    render(<RechercheParCode placeholder="Rechercher par code..." onSearch={onSearch} onClear={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText('Rechercher par code...'), 'ART-001{enter}');
    expect(onSearch).toHaveBeenCalledWith('ART-001');
  });

  it('appelle onClear quand le champ est vide', async () => {
    const onClear = vi.fn();
    render(<RechercheParCode placeholder="x" onSearch={() => {}} onClear={onClear} />);
    const input = screen.getByPlaceholderText('x');
    await userEvent.type(input, 'a');
    await userEvent.clear(input);
    expect(onClear).toHaveBeenCalled();
  });
});
