import { useState, type PropsWithChildren } from 'react';
import { Menu as MenuIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from './Menu';
import { Header } from './Header';

function Brand() {
  return <div className="px-4 py-5 text-sm font-semibold text-sidebar-foreground">Gestion de stock</div>;
}

export function AppShell({ children }: PropsWithChildren) {
  const [tiroirOuvert, setTiroirOuvert] = useState(false);

  const declencheurTiroir = (
    <Sheet open={tiroirOuvert} onOpenChange={setTiroirOuvert}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="Ouvrir le menu" className="shrink-0 lg:hidden">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="gap-0 bg-sidebar p-0 text-sidebar-foreground">
        <SheetTitle className="sr-only">Menu principal</SheetTitle>
        <SheetDescription className="sr-only">Navigation entre les sections de l'application</SheetDescription>
        <Brand />
        <Menu onNavigate={() => setTiroirOuvert(false)} />
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="flex min-h-screen bg-canvas-soft">
      {/* Desktop : sidebar dans le flux */}
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar lg:flex">
        <Brand />
        <Menu />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile : le declencheur du tiroir vit dans l'en-tete, jamais en position fixed */}
        <Header leading={declencheurTiroir} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
