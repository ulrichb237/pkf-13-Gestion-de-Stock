import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('fusionne des classes simples', () => {
    expect(cn('p-4', 'text-white')).toBe('p-4 text-white');
  });

  it('resout les conflits Tailwind (derniere classe gagne)', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('ignore les valeurs falsy', () => {
    // eslint-disable-next-line no-constant-binary-expression
    expect(cn('p-4', false && 'hidden', undefined, 'text-white')).toBe('p-4 text-white');
  });
});
