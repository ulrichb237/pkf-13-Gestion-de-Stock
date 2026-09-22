import { useState, type KeyboardEvent } from 'react';
import { Input } from '../ui/input';

interface RechercheParCodeProps {
  placeholder: string;
  onSearch: (code: string) => void;
  onClear: () => void;
  loading?: boolean;
}

/** Recherche par code — commandes clients/fournisseurs, categories (spec §5/§9) */
export function RechercheParCode({ placeholder, onSearch, onClear, loading }: RechercheParCodeProps) {
  const [valeur, setValeur] = useState('');

  function handleChange(nouvelleValeur: string) {
    setValeur(nouvelleValeur);
    if (nouvelleValeur.trim() === '') onClear();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && valeur.trim() !== '') onSearch(valeur.trim());
  }

  return (
    <Input
      value={valeur}
      placeholder={placeholder}
      disabled={loading}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={handleKeyDown}
    />
  );
}
