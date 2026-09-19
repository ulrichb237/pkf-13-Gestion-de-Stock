import { useState } from 'react';
import { NavLink } from 'react-router';
import {
  LayoutDashboard, PieChart, BarChart3, Boxes, Ship, ShoppingCart,
  Users, ShoppingBasket, Truck, Settings, Tags, UserCog, Building2, LogOut,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../hooks/use-auth';

interface SousMenu { id: string; titre: string; icon: LucideIcon; url: string }
interface GroupeMenu { id: string; titre: string; icon: LucideIcon; sousMenu: SousMenu[] }

// Miroir de menu.component.ts (Angular) : memes 5 groupes, memes libelles.
const menuProperties: GroupeMenu[] = [
  { id: '1', titre: 'Tableau de bord', icon: LayoutDashboard, sousMenu: [
    { id: '11', titre: "Vue d'ensemble", icon: PieChart, url: '/' },
    { id: '12', titre: 'Statistiques', icon: BarChart3, url: '/statistiques' },
  ]},
  { id: '2', titre: 'Articles', icon: Boxes, sousMenu: [
    { id: '21', titre: 'Articles', icon: Boxes, url: '/articles' },
    { id: '22', titre: 'Mouvements du stock', icon: Ship, url: '/mvtstk' },
    { id: '23', titre: 'Ventes', icon: ShoppingCart, url: '/ventes' },
  ]},
  { id: '3', titre: 'Clients', icon: Users, sousMenu: [
    { id: '31', titre: 'Clients', icon: Users, url: '/clients' },
    { id: '32', titre: 'Commandes clients', icon: ShoppingBasket, url: '/commandesclient' },
  ]},
  { id: '4', titre: 'Fournisseurs', icon: Truck, sousMenu: [
    { id: '41', titre: 'Fournisseurs', icon: Users, url: '/fournisseurs' },
    { id: '42', titre: 'Commandes fournisseurs', icon: Truck, url: '/commandesfournisseur' },
  ]},
  { id: '5', titre: 'Parametrages', icon: Settings, sousMenu: [
    { id: '51', titre: 'Categories', icon: Tags, url: '/categories' },
    { id: '52', titre: 'Utilisateurs', icon: UserCog, url: '/utilisateurs' },
    { id: '53', titre: 'Mon entreprise', icon: Building2, url: '/entreprise' },
  ]},
];

const SIDEBAR_BUTTON = 'w-full justify-start px-3 text-sidebar-foreground hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground';

interface MenuProps {
  /** Appele au clic sur un lien de navigation (ex. pour fermer le tiroir mobile). */
  onNavigate?: () => void;
}

export function Menu({ onNavigate }: MenuProps) {
  // Etat par instance : la sidebar desktop et le tiroir mobile sont independants.
  const [menusOuverts, setMenusOuverts] = useState(() => new Set(menuProperties.map((m) => m.id)));
  const { logout } = useAuth();

  function basculerMenu(id: string) {
    setMenusOuverts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <nav aria-label="Menu principal" className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
      {menuProperties.map((groupe) => (
        <div key={groupe.id} className="flex flex-col gap-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => basculerMenu(groupe.id)}
            aria-expanded={menusOuverts.has(groupe.id)}
            className={SIDEBAR_BUTTON}
          >
            <groupe.icon />
            {groupe.titre}
          </Button>
          {menusOuverts.has(groupe.id) && (
            <ul className="flex flex-col gap-1 pl-4">
              {groupe.sousMenu.map((item) => (
                <li key={item.id}>
                  <NavLink
                    to={item.url}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground',
                        isActive && 'bg-sidebar-foreground/15 font-medium text-sidebar-foreground',
                      )
                    }
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.titre}
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        onClick={() => logout()}
        aria-label="Se deconnecter"
        className={cn(SIDEBAR_BUTTON, 'mt-auto')}
      >
        <LogOut />
        Deconnexion
      </Button>
    </nav>
  );
}
