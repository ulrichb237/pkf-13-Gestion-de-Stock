import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '../../hooks/use-auth';

interface HeaderProps {
  /** Contenu place en debut de ligne, dans le flux (ex. declencheur du tiroir mobile). */
  leading?: ReactNode;
}

export function Header({ leading }: HeaderProps) {
  const { connectedUser } = useAuth();
  const initiales = `${connectedUser?.prenom?.[0] ?? ''}${connectedUser?.nom?.[0] ?? ''}`.toUpperCase();

  return (
    <header className="flex items-center gap-3 border-b border-border bg-canvas px-4 py-3 md:px-6">
      {leading}
      {/* Recherche non fonctionnelle, comme dans l'Angular d'origine. */}
      <div className="relative min-w-0 max-w-sm flex-1">
        <Search aria-hidden="true" className="pointer-events-none absolute left-2 top-2 size-4 text-muted-foreground" />
        <Input type="text" placeholder="Rechercher..." aria-label="Recherche" className="pl-8" />
      </div>
      <Link to="/profil" aria-label="Mon profil" className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
        <span className="hidden sm:inline">Bonjour {connectedUser?.nom}</span>
        <Avatar>
          <AvatarFallback>{initiales}</AvatarFallback>
        </Avatar>
      </Link>
    </header>
  );
}
