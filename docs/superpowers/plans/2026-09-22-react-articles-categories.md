# Articles + Catégories — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer les pages Articles et Catégories (liste, formulaire création/édition, détail, recherche par code, suppression) en React, en corrigeant les limitations de l'app Angular au lieu de les reproduire.

**Architecture:** Trois couches (spec §5) : les primitifs `ui/` et les patrons `composed/` existent déjà (socle), ce plan n'ajoute que ce qui manque (`FormLayout`, `Pagination`, `form`) puis compose les pages. Les accès réseau passent par des hooks TanStack Query dans `src/api/hooks/`, un fichier par ressource : les pages ne connaissent jamais `apiClient` directement. Le formulaire de création et celui d'édition sont **un seul composant** paramétré par la présence d'un `id` dans l'URL (miroir du comportement Angular, où `/nouvelarticle` et `/nouvelarticle/:idArticle` pointent le même écran).

**Tech Stack:** React 19, TypeScript strict, React Router 7, TanStack Query 5, React Hook Form 7 + Zod 4, shadcn/ui, Tailwind v4, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-18-react-migration-design.md` (ce plan couvre l'étape 4 de l'ordre de construction §11)

**Plan précédent:** `docs/superpowers/plans/2026-09-18-react-socle.md` (étapes 1 et 2 — socle et patrons, terminé et fusionné)

## Global Constraints

- **Chemins de routes identiques à l'Angular** : `/articles`, `/nouvelarticle`, `/nouvelarticle/:idArticle`, `/categories`, `/nouvellecategorie`, `/nouvellecategorie/:idCategory`. Ne jamais renommer un segment.
- **Zéro valeur arbitraire Tailwind** : la règle ESLint `tailwindcss/no-arbitrary-value` échoue le build. Toute couleur, tout espacement vient des 85 tokens de `src/styles/globals.css`. Pas de `style=` inline.
- **Surfaces plates** : aucune classe `bg-gradient-*` ni `linear-gradient()`. L'élévation se fait par `shadow-sm border` (spec §3).
- **Aucun accès réseau depuis une page** : les pages consomment les hooks de `src/api/hooks/`, jamais `apiClient`.
- **`src/api/schema.d.ts` n'est jamais édité à la main** — il est généré par `npm run gen:api`.
- **Commandes du projet** : `npm test` (Vitest), `npm run lint`, `npm run build`. Le shell exporte `NODE_ENV=production` : toute installation de dépendance doit être lancée en `NODE_ENV=development npm install --force --include=dev` (sinon les devDependencies sont ignorées ; `--legacy-peer-deps` casse l'auto-install des peers — ne pas l'utiliser).
- **Mock réseau dans les tests** : patron établi du projet — `vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(x), { status: 200 })))`. Pas de MSW.
- **Langue** : libellés d'interface et messages en français, sans accent dans les identifiants de code.

## Limitations Angular corrigées par ce plan

Le périmètre est **iso-fonctionnel + corrections** (décision du 2026-09-22). Chaque correction est rattachée à la tâche qui la porte.

| # | Limitation Angular | Fichier source | Corrigé en |
|---|---|---|---|
| 1 | **Pagination entièrement factice** : boutons « 1 2 3 » codés en dur, aucun `(click)`, aucune logique. Les listes affichent tous les enregistrements. | `composants/pagination/pagination.component.{ts,html}` | Task 2 |
| 2 | Boutons « Exporter » / « Importer » fantômes : `isExporterVisible` / `isImporterVisible` déclarés mais jamais rendus. | `composants/boutton-action` | Task 4 (non reportés) |
| 3 | `error.error.errors` déréférencé sans garde : une erreur réseau ou un 500 sans corps fait planter le handler. | `nouvel-article.component.ts:62` | Task 1 (`messageErreur`) |
| 4 | Échec d'upload photo silencieux : `savePhoto().subscribe()` n'a pas de callback d'erreur. L'API renvoie pourtant 400 si Flickr échoue. | `nouvel-article.component.ts:99` | Task 8 |
| 5 | Les 3 appels d'historique n'ont aucun callback d'erreur : le panneau reste vide sans explication. | `page-article.component.ts:66-71` | Task 9 |
| 6 | `findAllCategories()` sans callback d'erreur : liste vide silencieuse en cas d'échec. | `page-categories.component.ts:86` | Task 3 |
| 7 | Double soumission possible : aucun état `pending` sur Enregistrer → deux clics créent deux enregistrements. | `nouvel-article.component.ts:56` | Tasks 5, 8 |
| 8 | Aucune validation côté client : chaque erreur de saisie fait un aller-retour serveur. | `nouvel-article.component.html` | Tasks 5, 8 |
| 9 | `calculerTTC()` ne recalcule que si HT **et** TVA sont remplis : vider la TVA laisse un TTC périmé affiché. | `nouvel-article.component.ts:66-72` | Task 8 |
| 10 | Pas d'état de chargement : impossible de distinguer « liste vide » de « chargement en cours ». | toutes les listes | Tasks 4, 7 |
| 11 | Protocole de suppression par chaîne magique `'success'` typée `any`. | `page-article.component.ts:82` | Tasks 4, 7 |

## File Structure

**Créés — socle manquant :**
- `src/components/ui/form.tsx` — primitif shadcn, pont React Hook Form ↔ `Label`/`Input` (généré par CLI, non édité)
- `src/components/composed/FormLayout.tsx` — 1 colonne sous `md`, 2 au-dessus (spec §5). Seul endroit qui définit la grille d'un formulaire.
- `src/components/composed/Pagination.tsx` — contrôle de pagination réel (remplace la coquille Angular)
- `src/lib/formatters.ts` — `formatMontant`, `formatDate` : seule source de vérité du formatage affiché
- `src/lib/erreurs.ts` — `messageErreur(error, defaut)` : extraction défensive du message d'erreur API

**Créés — données (un fichier par ressource, spec §4) :**
- `src/api/hooks/useCategories.ts` — liste, détail, recherche par code, articles d'une catégorie, enregistrement, suppression
- `src/api/hooks/useArticles.ts` — liste, détail, recherche par code, enregistrement, suppression, upload photo, 3 historiques

**Créés — pages (composition uniquement) :**
- `src/pages/categories/PageCategories.tsx` — liste + recherche + suppression + panneau détail
- `src/pages/categories/FormulaireCategorie.tsx` — création et édition unifiées
- `src/pages/articles/PageArticles.tsx` — liste + recherche + suppression + panneau détail
- `src/pages/articles/FormulaireArticle.tsx` — création et édition unifiées, TTC calculé, photo
- `src/pages/articles/PanneauHistoriquesArticle.tsx` — 3 onglets d'historique

**Modifiés :**
- `src/components/composed/DataTable.tsx` — ajout de la prop optionnelle `pagination`
- `src/routes.tsx` — remplacement de 6 `DomainStub` par les pages réelles
- `package.json` — ajout de `react-hook-form`, `zod`, `@hookform/resolvers`

**Tests :** un `*.test.tsx` à côté de chaque fichier créé, même dossier (patron du socle).

---

### Task 1: Fondations de formulaire — RHF, Zod, `FormLayout`, `messageErreur`

**Files:**
- Modify: `frontend/react/gestion-de-stock-frontend/package.json`
- Create: `frontend/react/gestion-de-stock-frontend/src/components/ui/form.tsx` (via CLI shadcn)
- Create: `frontend/react/gestion-de-stock-frontend/src/components/composed/FormLayout.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/components/composed/FormLayout.test.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/lib/erreurs.ts`
- Create: `frontend/react/gestion-de-stock-frontend/src/lib/erreurs.test.ts`

**Interfaces:**
- Produces: `FormLayout({ children })` et `FormRow({ children, pleineLargeur? })` — grille de formulaire ; `messageErreur(error: unknown, defaut: string): string` — consommé par tous les hooks de mutation des Tasks 3 et 6.

- [ ] **Step 1: Installer React Hook Form, Zod et le resolver**

Le shell exporte `NODE_ENV=production`, qui ferait sauter les devDependencies ; `--force` est requis à cause du conflit de peer `openapi-typescript`/TypeScript 6 (warning bénin, déjà présent).

```bash
cd frontend/react/gestion-de-stock-frontend
NODE_ENV=development npm install --force --include=dev react-hook-form zod @hookform/resolvers
```

Vérifier ensuite que rien n'a été amputé (~640 paquets attendus, pas ~66) :

```bash
ls node_modules | wc -l
npm test
```

Expected: le compte est de l'ordre de 640 et les 112 tests du socle passent toujours.

- [ ] **Step 2: Ajouter le primitif `form` de shadcn**

```bash
cd frontend/react/gestion-de-stock-frontend
npx shadcn@latest add form
```

Expected: `src/components/ui/form.tsx` est créé. Ce fichier est généré — ne pas l'éditer.

- [ ] **Step 3: Écrire le test de `messageErreur`**

Ce helper existe pour corriger la limitation #3 : l'Angular fait `error.error.errors` sans garde et plante sur une erreur réseau.

Créer `src/lib/erreurs.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { messageErreur } from './erreurs';

describe('messageErreur', () => {
  it('extrait le message de l\'enveloppe d\'erreur du backend', () => {
    expect(messageErreur({ message: 'Code deja utilise' }, 'defaut')).toBe('Code deja utilise');
  });

  it('concatene la liste errors quand elle est presente', () => {
    expect(messageErreur({ errors: ['Code obligatoire', 'Prix invalide'] }, 'defaut'))
      .toBe('Code obligatoire, Prix invalide');
  });

  it('retombe sur le defaut si l\'erreur est nulle (panne reseau)', () => {
    expect(messageErreur(null, 'Service indisponible')).toBe('Service indisponible');
  });

  it('retombe sur le defaut si l\'erreur n\'a ni message ni errors', () => {
    expect(messageErreur({ status: 500 }, 'Service indisponible')).toBe('Service indisponible');
  });

  it('retombe sur le defaut si message est vide', () => {
    expect(messageErreur({ message: '' }, 'Service indisponible')).toBe('Service indisponible');
  });

  it('accepte une Error native', () => {
    expect(messageErreur(new Error('Echec'), 'defaut')).toBe('Echec');
  });
});
```

Run: `npm test -- erreurs`
Expected: FAIL (`src/lib/erreurs.ts` n'existe pas)

- [ ] **Step 4: Implémenter `messageErreur`**

Créer `src/lib/erreurs.ts` :

```ts
/**
 * Extraction defensive du message d'une erreur API.
 * L'app Angular faisait `error.error.errors` sans garde et plantait sur une panne
 * reseau ou un 500 sans corps (limitation #3).
 */
export function messageErreur(error: unknown, defaut: string): string {
  if (!error || typeof error !== 'object') return defaut;

  const enveloppe = error as { message?: unknown; errors?: unknown };

  if (Array.isArray(enveloppe.errors)) {
    const lignes = enveloppe.errors.filter((e): e is string => typeof e === 'string' && e !== '');
    if (lignes.length > 0) return lignes.join(', ');
  }

  return typeof enveloppe.message === 'string' && enveloppe.message ? enveloppe.message : defaut;
}
```

Run: `npm test -- erreurs`
Expected: PASS (6 tests)

- [ ] **Step 5: Écrire le test de `FormLayout`**

Créer `src/components/composed/FormLayout.test.tsx` :

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormLayout, FormRow } from './FormLayout';

describe('FormLayout', () => {
  it('rend ses enfants', () => {
    render(<FormLayout><span>Champ</span></FormLayout>);
    expect(screen.getByText('Champ')).toBeInTheDocument();
  });

  it('applique la grille responsive : une colonne par defaut, deux a partir de md (spec §5)', () => {
    render(<FormLayout><span>Champ</span></FormLayout>);
    const grille = screen.getByTestId('form-layout');
    expect(grille.className).toContain('grid-cols-1');
    expect(grille.className).toContain('md:grid-cols-2');
  });

  it('FormRow occupe une seule colonne par defaut', () => {
    render(<FormLayout><FormRow><span>Code</span></FormRow></FormLayout>);
    expect(screen.getByTestId('form-row').className).not.toContain('md:col-span-2');
  });

  it('FormRow pleineLargeur occupe les deux colonnes', () => {
    render(<FormLayout><FormRow pleineLargeur><span>Designation</span></FormRow></FormLayout>);
    expect(screen.getByTestId('form-row').className).toContain('md:col-span-2');
  });
});
```

Run: `npm test -- FormLayout`
Expected: FAIL

- [ ] **Step 6: Implémenter `FormLayout`**

Créer `src/components/composed/FormLayout.tsx` :

```tsx
import type { PropsWithChildren } from 'react';
import { cn } from '../../lib/utils';

/**
 * Seul endroit du projet qui definit la grille d'un formulaire (spec §5).
 * Une colonne sous `md`, deux au-dessus — coherent sur les ~10 formulaires du projet.
 */
export function FormLayout({ children }: PropsWithChildren) {
  return (
    <div data-testid="form-layout" className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
      {children}
    </div>
  );
}

interface FormRowProps extends PropsWithChildren {
  /** Champ long (designation, description) : occupe les deux colonnes a partir de `md`. */
  pleineLargeur?: boolean;
}

export function FormRow({ children, pleineLargeur }: FormRowProps) {
  return (
    <div data-testid="form-row" className={cn('flex flex-col gap-2', pleineLargeur && 'md:col-span-2')}>
      {children}
    </div>
  );
}
```

Run: `npm test -- FormLayout`
Expected: PASS (4 tests)

- [ ] **Step 7: Vérifier la suite complète et le lint**

Run: `npm test && npm run lint`
Expected: PASS, zéro erreur ESLint (en particulier zéro `tailwindcss/no-arbitrary-value`)

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/components/ui/form.tsx src/components/composed/FormLayout.tsx src/components/composed/FormLayout.test.tsx src/lib/erreurs.ts src/lib/erreurs.test.ts
git commit -m "feat(react): fondations de formulaire (RHF, Zod, FormLayout, messageErreur)"
```

---

### Task 2: `formatters` et `Pagination` réelle

**Files:**
- Create: `frontend/react/gestion-de-stock-frontend/src/lib/formatters.ts`
- Create: `frontend/react/gestion-de-stock-frontend/src/lib/formatters.test.ts`
- Create: `frontend/react/gestion-de-stock-frontend/src/components/composed/Pagination.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/components/composed/Pagination.test.tsx`
- Modify: `frontend/react/gestion-de-stock-frontend/src/components/composed/DataTable.tsx`
- Modify: `frontend/react/gestion-de-stock-frontend/src/components/composed/DataTable.test.tsx`

**Interfaces:**
- Consumes: `DataTable<T>({ columns, data, getRowId })` (socle Task 12), `Button` (socle Task 3)
- Produces: `formatMontant(valeur?: number): string`, `formatDate(iso?: string): string` ; `Pagination({ page, nbPages, onPageChange })` ; `DataTable` accepte désormais `pagination?: { page: number; taille: number; onPageChange: (page: number) => void }` et découpe `data` lui-même.

- [ ] **Step 1: Écrire le test des formatters**

Créer `src/lib/formatters.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { formatMontant, formatDate } from './formatters';

describe('formatMontant', () => {
  it('formate un entier avec separateur de milliers et suffixe euro', () => {
    // espace insecable etroit utilise par Intl en fr-FR
    expect(formatMontant(10000).replace(/ | /g, ' ')).toBe('10 000,00 €');
  });

  it('formate un decimal a deux chiffres', () => {
    expect(formatMontant(19.5).replace(/ | /g, ' ')).toBe('19,50 €');
  });

  it('rend un tiret pour une valeur absente plutot que "undefined €"', () => {
    expect(formatMontant(undefined)).toBe('—');
  });

  it('formate zero comme un montant, pas comme une absence', () => {
    expect(formatMontant(0).replace(/ | /g, ' ')).toBe('0,00 €');
  });
});

describe('formatDate', () => {
  it('formate une date ISO en jour/mois/annee', () => {
    expect(formatDate('2026-09-22T10:30:00Z')).toBe('22/09/2026');
  });

  it('rend un tiret pour une date absente', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  it('rend un tiret pour une date invalide plutot que "Invalid Date"', () => {
    expect(formatDate('pas-une-date')).toBe('—');
  });
});
```

Run: `npm test -- formatters`
Expected: FAIL

- [ ] **Step 2: Implémenter les formatters**

Créer `src/lib/formatters.ts` :

```ts
const MONTANT = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DATE = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Seule source de verite du formatage des montants affiches. */
export function formatMontant(valeur?: number): string {
  if (typeof valeur !== 'number' || Number.isNaN(valeur)) return '—';
  return MONTANT.format(valeur);
}

/** Seule source de verite du formatage des dates affichees. */
export function formatDate(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return DATE.format(date);
}
```

Run: `npm test -- formatters`
Expected: PASS (7 tests)

- [ ] **Step 3: Écrire le test de `Pagination`**

C'est la correction de la limitation #1 : le composant Angular est une coquille de boutons « 1 2 3 » codés en dur, sans aucun gestionnaire de clic.

Créer `src/components/composed/Pagination.test.tsx` :

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('affiche la position courante', () => {
    render(<Pagination page={2} nbPages={5} onPageChange={() => {}} />);
    expect(screen.getByText('Page 2 sur 5')).toBeInTheDocument();
  });

  it('avance d\'une page au clic sur Suivante', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} nbPages={5} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Page suivante' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('recule d\'une page au clic sur Precedente', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} nbPages={5} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Page precedente' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('desactive Precedente sur la premiere page', () => {
    render(<Pagination page={1} nbPages={5} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Page precedente' })).toBeDisabled();
  });

  it('desactive Suivante sur la derniere page', () => {
    render(<Pagination page={5} nbPages={5} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Page suivante' })).toBeDisabled();
  });

  it('ne rend rien s\'il n\'y a qu\'une seule page', () => {
    const { container } = render(<Pagination page={1} nbPages={1} onPageChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

Run: `npm test -- Pagination`
Expected: FAIL

- [ ] **Step 4: Implémenter `Pagination`**

Créer `src/components/composed/Pagination.tsx` :

```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

interface PaginationProps {
  /** Page courante, 1-indexee. */
  page: number;
  nbPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Controle de pagination reel (spec §3).
 * Le composant Angular equivalent etait une coquille : des boutons « 1 2 3 »
 * codes en dur, sans gestionnaire de clic ni logique (limitation #1).
 */
export function Pagination({ page, nbPages, onPageChange }: PaginationProps) {
  if (nbPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3">
      <span className="text-sm text-muted-foreground">Page {page} sur {nbPages}</span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Page precedente"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Page suivante"
          disabled={page >= nbPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
```

Run: `npm test -- Pagination`
Expected: PASS (6 tests)

- [ ] **Step 5: Écrire le test de `DataTable` paginée**

Ajouter à `src/components/composed/DataTable.test.tsx`, dans le `describe('DataTable')` existant :

```tsx
  it('ne rend que la tranche de la page courante quand pagination est fournie', () => {
    const beaucoup = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, nom: `Article ${i + 1}` }));
    render(
      <DataTable
        columns={columns}
        data={beaucoup}
        getRowId={(r) => r.id}
        pagination={{ page: 2, taille: 2, onPageChange: () => {} }}
      />
    );
    const table = within(screen.getByRole('table'));
    expect(table.getByText('Article 3')).toBeInTheDocument();
    expect(table.getByText('Article 4')).toBeInTheDocument();
    expect(table.queryByText('Article 1')).not.toBeInTheDocument();
    expect(table.queryByText('Article 5')).not.toBeInTheDocument();
  });

  it('affiche le controle de pagination avec le bon nombre de pages', () => {
    const beaucoup = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, nom: `Article ${i + 1}` }));
    render(
      <DataTable
        columns={columns}
        data={beaucoup}
        getRowId={(r) => r.id}
        pagination={{ page: 1, taille: 2, onPageChange: () => {} }}
      />
    );
    expect(screen.getByText('Page 1 sur 3')).toBeInTheDocument();
  });

  it('rend toutes les lignes quand pagination est absente (compatibilite socle)', () => {
    render(<DataTable columns={columns} data={data} getRowId={(r) => r.id} />);
    const table = within(screen.getByRole('table'));
    expect(table.getByText('Article A')).toBeInTheDocument();
    expect(table.getByText('Article B')).toBeInTheDocument();
  });
```

Run: `npm test -- DataTable`
Expected: FAIL sur les deux premiers ajouts (prop `pagination` inconnue)

- [ ] **Step 6: Ajouter la pagination à `DataTable`**

Modifier `src/components/composed/DataTable.tsx`. Remplacer l'interface et la signature :

```tsx
import type { ReactNode } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Pagination } from './Pagination';

interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
}

interface PaginationConfig {
  /** Page courante, 1-indexee. */
  page: number;
  /** Nombre de lignes par page. */
  taille: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => string | number;
  /** Absent = toutes les lignes sont rendues (comportement du socle). */
  pagination?: PaginationConfig;
}

/**
 * Seule implementation de tableau de liste du projet (spec §5).
 * Bascule responsive (spec §7) : table classique >= md, cartes empilees < md.
 * La pagination est appliquee ici pour que les deux vues restent synchronisees.
 */
export function DataTable<T>({ columns, data, getRowId, pagination }: DataTableProps<T>) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Aucune donnee.</p>;
  }

  const nbPages = pagination ? Math.max(1, Math.ceil(data.length / pagination.taille)) : 1;
  const lignes = pagination
    ? data.slice((pagination.page - 1) * pagination.taille, pagination.page * pagination.taille)
    : data;
```

Puis, dans le corps du `return`, remplacer les deux occurrences de `data.map(` par `lignes.map(`, et insérer le contrôle juste avant la fermeture du conteneur :

```tsx
      {pagination && (
        <Pagination page={pagination.page} nbPages={nbPages} onPageChange={pagination.onPageChange} />
      )}
    </div>
  );
}
```

Run: `npm test -- DataTable`
Expected: PASS (6 tests : les 3 du socle + les 3 ajoutés)

- [ ] **Step 7: Vérifier la suite complète et le lint**

Run: `npm test && npm run lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/lib/formatters.ts src/lib/formatters.test.ts src/components/composed/Pagination.tsx src/components/composed/Pagination.test.tsx src/components/composed/DataTable.tsx src/components/composed/DataTable.test.tsx
git commit -m "feat(react): formatters et pagination reelle (remplace la coquille Angular)"
```

---

### Task 3: Hooks de données Catégories

**Files:**
- Create: `frontend/react/gestion-de-stock-frontend/src/api/hooks/useCategories.ts`
- Create: `frontend/react/gestion-de-stock-frontend/src/api/hooks/useCategories.test.tsx`

**Interfaces:**
- Consumes: `apiClient` (socle Task 5), `messageErreur` (Task 1), `queryClient` (socle Task 10)
- Produces: `CategorieDto` (alias de `components['schemas']['CategoryDto']`), `useCategories()`, `useCategorie(id?)`, `useCategorieParCode(code?)`, `useArticlesDeCategorie(id?)`, `useEnregistrerCategorie()`, `useSupprimerCategorie()`. Chaque hook de mutation expose `{ mutate, mutateAsync, isPending, error }` de TanStack Query.

Endpoints (vérifiés dans `schema.d.ts`) : `GET|POST /api/v1/categories`, `GET|DELETE /api/v1/categories/{idCategorie}`, `GET /api/v1/categories/code/{codeCategorie}`, `GET /api/v1/categories/{idCategorie}/articles`. Le POST sert à la fois la création et la mise à jour : la présence d'un `id` dans le corps déclenche l'update côté backend.

- [ ] **Step 1: Écrire le test des hooks**

Créer `src/api/hooks/useCategories.test.tsx` :

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useCategories, useEnregistrerCategorie, useSupprimerCategorie } from './useCategories';

function wrapper({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function reponse(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => localStorage.setItem('accessToken', JSON.stringify({ accessToken: 't', refreshToken: 'r' })));
afterEach(() => vi.unstubAllGlobals());

describe('useCategories', () => {
  it('retourne la liste des categories', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse([{ id: 1, code: 'CAT-INFO', designation: 'Informatique' }])));
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].code).toBe('CAT-INFO');
  });

  it('retourne un tableau vide et non undefined quand le backend repond null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse(null)));
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  // Limitation #6 : l'Angular n'avait aucun callback d'erreur sur findAllCategories,
  // la liste restait vide sans explication.
  it('expose une erreur exploitable quand le chargement echoue', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ message: 'Acces refuse' }, 403)));
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Acces refuse');
  });

  it('transforme une panne reseau en message lisible', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Impossible de charger les categories.');
  });
});

describe('useEnregistrerCategorie', () => {
  it('envoie un POST avec le corps de la categorie', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reponse({ id: 1, code: 'CAT-INFO' }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useEnregistrerCategorie(), { wrapper });
    await result.current.mutateAsync({ code: 'CAT-INFO', designation: 'Informatique' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/v1/categories');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ code: 'CAT-INFO', designation: 'Informatique' });
  });

  it('rejette avec le message du backend quand le code est deja pris', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ message: 'Code deja utilise' }, 400)));
    const { result } = renderHook(() => useEnregistrerCategorie(), { wrapper });
    await expect(result.current.mutateAsync({ code: 'CAT-INFO' })).rejects.toThrow('Code deja utilise');
  });
});

describe('useSupprimerCategorie', () => {
  it('envoie un DELETE sur l\'identifiant', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reponse({}));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useSupprimerCategorie(), { wrapper });
    await result.current.mutateAsync(7);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/v1/categories/7');
    expect(init.method).toBe('DELETE');
  });

  it('rejette avec le message du backend si la categorie est referencee', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ message: 'Categorie utilisee par des articles' }, 400)));
    const { result } = renderHook(() => useSupprimerCategorie(), { wrapper });
    await expect(result.current.mutateAsync(7)).rejects.toThrow('Categorie utilisee par des articles');
  });
});
```

Run: `npm test -- useCategories`
Expected: FAIL

- [ ] **Step 2: Implémenter les hooks Catégories**

Créer `src/api/hooks/useCategories.ts` :

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { components } from '../schema';
import { messageErreur } from '../../lib/erreurs';

export type CategorieDto = components['schemas']['CategoryDto'];
export type ArticleDto = components['schemas']['ArticleDto'];

export const clesCategories = {
  toutes: ['categories'] as const,
  parId: (id: number) => ['categories', id] as const,
  parCode: (code: string) => ['categories', 'code', code] as const,
  articles: (id: number) => ['categories', id, 'articles'] as const,
};

/**
 * Toute erreur reseau ou HTTP devient une Error porteuse d'un message affichable.
 * L'app Angular laissait ces echecs silencieux (limitation #6).
 */
function leve(error: unknown, defaut: string): never {
  throw new Error(messageErreur(error, defaut));
}

export function useCategories() {
  return useQuery({
    queryKey: clesCategories.toutes,
    queryFn: async (): Promise<CategorieDto[]> => {
      const { data, error } = await apiClient.GET('/api/v1/categories').catch(() => ({
        data: undefined,
        error: null,
      }));
      if (error !== undefined && error !== null) leve(error, 'Impossible de charger les categories.');
      if (data === undefined) leve(null, 'Impossible de charger les categories.');
      return data ?? [];
    },
  });
}

export function useCategorie(id?: number) {
  return useQuery({
    queryKey: clesCategories.parId(id ?? 0),
    enabled: typeof id === 'number' && id > 0,
    queryFn: async (): Promise<CategorieDto> => {
      const { data, error } = await apiClient.GET('/api/v1/categories/{idCategorie}', {
        params: { path: { idCategorie: id as number } },
      });
      if (error || !data) leve(error, 'Impossible de charger la categorie.');
      return data;
    },
  });
}

export function useCategorieParCode(code?: string) {
  return useQuery({
    queryKey: clesCategories.parCode(code ?? ''),
    enabled: Boolean(code),
    queryFn: async (): Promise<CategorieDto> => {
      const { data, error } = await apiClient.GET('/api/v1/categories/code/{codeCategorie}', {
        params: { path: { codeCategorie: code as string } },
      });
      if (error || !data?.id) leve(error, `Aucune categorie trouvee avec le code ${code}.`);
      return data;
    },
  });
}

export function useArticlesDeCategorie(id?: number) {
  return useQuery({
    queryKey: clesCategories.articles(id ?? 0),
    enabled: typeof id === 'number' && id > 0,
    queryFn: async (): Promise<ArticleDto[]> => {
      const { data, error } = await apiClient.GET('/api/v1/categories/{idCategorie}/articles', {
        params: { path: { idCategorie: id as number } },
      });
      if (error) leve(error, 'Impossible de charger les articles de la categorie.');
      return data ?? [];
    },
  });
}

export function useEnregistrerCategorie() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (categorie: CategorieDto): Promise<CategorieDto> => {
      const { data, error } = await apiClient.POST('/api/v1/categories', { body: categorie });
      if (error || !data) leve(error, 'Enregistrement de la categorie impossible.');
      return data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: clesCategories.toutes }),
  });
}

export function useSupprimerCategorie() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const { error } = await apiClient.DELETE('/api/v1/categories/{idCategorie}', {
        params: { path: { idCategorie: id } },
      });
      if (error) leve(error, 'Suppression de la categorie impossible.');
    },
    onSuccess: () => client.invalidateQueries({ queryKey: clesCategories.toutes }),
  });
}
```

Run: `npm test -- useCategories`
Expected: PASS (8 tests)

Si le test « panne reseau » échoue parce que `apiClient.GET` propage le `TypeError` avant le `.catch`, ajuster l'implémentation en enveloppant l'appel dans un `try/catch` qui appelle `leve(null, '...')` — le message attendu reste `Impossible de charger les categories.`

- [ ] **Step 3: Vérifier la suite complète**

Run: `npm test && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/api/hooks/useCategories.ts src/api/hooks/useCategories.test.tsx
git commit -m "feat(react): hooks de donnees Categories avec erreurs remontees"
```

---

### Task 4: Page liste Catégories

**Files:**
- Create: `frontend/react/gestion-de-stock-frontend/src/pages/categories/PageCategories.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/pages/categories/PageCategories.test.tsx`

**Interfaces:**
- Consumes: `useCategories`, `useSupprimerCategorie`, `useCategorieParCode`, `useArticlesDeCategorie` (Task 3) ; `PageHeader`, `DataTable`, `ConfirmDialog`, `DetailPanel`, `RechercheParCode` (socle Tasks 11-13) ; `formatMontant` (Task 2)
- Produces: `PageCategories` — export nommé, monté sur `/categories` en Task 10.

Comportement repris de l'Angular : liste, recherche par code affichant le seul résultat, panneau latéral listant les articles de la catégorie, suppression confirmée, boutons « Nouvelle » et « Modifier ». Les boutons fantômes « Exporter » / « Importer » (limitation #2) ne sont **pas** repris.

- [ ] **Step 1: Écrire le test de la page**

Créer `src/pages/categories/PageCategories.test.tsx` :

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { PageCategories } from './PageCategories';
import * as hooks from '../../api/hooks/useCategories';

vi.mock('../../api/hooks/useCategories');

const CATEGORIES = [
  { id: 1, code: 'CAT-INFO', designation: 'Informatique' },
  { id: 2, code: 'CAT-MOB', designation: 'Mobilier' },
];

function Page({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const supprimer = { mutateAsync: vi.fn(), isPending: false };

function stubHooks(surcharge: Partial<Record<string, unknown>> = {}) {
  vi.mocked(hooks.useCategories).mockReturnValue({
    data: CATEGORIES, isLoading: false, isError: false, error: null,
    ...(surcharge.useCategories as object),
  } as ReturnType<typeof hooks.useCategories>);
  vi.mocked(hooks.useSupprimerCategorie).mockReturnValue(
    supprimer as unknown as ReturnType<typeof hooks.useSupprimerCategorie>,
  );
  vi.mocked(hooks.useCategorieParCode).mockReturnValue({
    data: undefined, isError: false, error: null,
    ...(surcharge.useCategorieParCode as object),
  } as ReturnType<typeof hooks.useCategorieParCode>);
  vi.mocked(hooks.useArticlesDeCategorie).mockReturnValue({
    data: [], isLoading: false, isError: false, error: null,
    ...(surcharge.useArticlesDeCategorie as object),
  } as ReturnType<typeof hooks.useArticlesDeCategorie>);
}

beforeEach(() => {
  vi.clearAllMocks();
  stubHooks();
});

describe('PageCategories', () => {
  it('affiche le titre et une ligne par categorie', () => {
    render(<Page><PageCategories /></Page>);
    expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument();
    const table = within(screen.getByRole('table'));
    expect(table.getByText('CAT-INFO')).toBeInTheDocument();
    expect(table.getByText('Mobilier')).toBeInTheDocument();
  });

  // Limitation #10 : l'Angular ne distinguait pas "vide" de "en cours de chargement".
  it('affiche un etat de chargement distinct de l\'etat vide', () => {
    stubHooks({ useCategories: { data: undefined, isLoading: true } });
    render(<Page><PageCategories /></Page>);
    expect(screen.getByTestId('categories-chargement')).toBeInTheDocument();
    expect(screen.queryByText(/aucune categorie/i)).not.toBeInTheDocument();
  });

  it('affiche un etat vide explicite quand la liste est vide', () => {
    stubHooks({ useCategories: { data: [] } });
    render(<Page><PageCategories /></Page>);
    expect(screen.getByText(/aucune categorie/i)).toBeInTheDocument();
  });

  // Limitation #6 : l'echec de chargement etait silencieux.
  it('affiche le message d\'erreur quand le chargement echoue', () => {
    stubHooks({ useCategories: { data: undefined, isError: true, error: new Error('Acces refuse') } });
    render(<Page><PageCategories /></Page>);
    expect(screen.getByRole('alert')).toHaveTextContent('Acces refuse');
  });

  it('filtre sur le resultat unique de la recherche par code', async () => {
    stubHooks({ useCategorieParCode: { data: CATEGORIES[1] } });
    render(<Page><PageCategories /></Page>);
    await userEvent.type(screen.getByPlaceholderText(/rechercher par code/i), 'CAT-MOB{enter}');
    await waitFor(() => {
      const table = within(screen.getByRole('table'));
      expect(table.getByText('CAT-MOB')).toBeInTheDocument();
      expect(table.queryByText('CAT-INFO')).not.toBeInTheDocument();
    });
  });

  it('demande confirmation avant de supprimer et n\'appelle le hook qu\'apres', async () => {
    render(<Page><PageCategories /></Page>);
    await userEvent.click(screen.getAllByRole('button', { name: 'Supprimer' })[0]);
    expect(supprimer.mutateAsync).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }));
    await waitFor(() => expect(supprimer.mutateAsync).toHaveBeenCalledWith(1));
  });

  it('ouvre le panneau de detail listant les articles de la categorie', async () => {
    stubHooks({
      useArticlesDeCategorie: { data: [{ id: 9, codeArticle: 'ART-001', designation: 'Clavier', prixUnitaireHt: 10000 }] },
    });
    render(<Page><PageCategories /></Page>);
    await userEvent.click(screen.getAllByRole('button', { name: 'Details' })[0]);
    const panneau = await screen.findByRole('dialog');
    expect(within(panneau).getByText('ART-001')).toBeInTheDocument();
    expect(within(panneau).getByText('Clavier')).toBeInTheDocument();
  });

  it('ne propose pas les boutons fantomes Exporter / Importer de l\'Angular', () => {
    render(<Page><PageCategories /></Page>);
    expect(screen.queryByRole('button', { name: /exporter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /importer/i })).not.toBeInTheDocument();
  });
});
```

Run: `npm test -- PageCategories`
Expected: FAIL

- [ ] **Step 2: Implémenter `PageCategories`**

Créer `src/pages/categories/PageCategories.tsx` :

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { PageHeader } from '../../components/composed/PageHeader';
import { DataTable } from '../../components/composed/DataTable';
import { ConfirmDialog } from '../../components/composed/ConfirmDialog';
import { DetailPanel } from '../../components/composed/DetailPanel';
import { RechercheParCode } from '../../components/composed/RechercheParCode';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { formatMontant } from '../../lib/formatters';
import {
  useCategories, useCategorieParCode, useArticlesDeCategorie, useSupprimerCategorie,
  type CategorieDto,
} from '../../api/hooks/useCategories';

const TAILLE_PAGE = 10;

export function PageCategories() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [code, setCode] = useState('');
  const [aSupprimer, setASupprimer] = useState<CategorieDto | null>(null);
  const [detail, setDetail] = useState<CategorieDto | null>(null);

  const liste = useCategories();
  const recherche = useCategorieParCode(code || undefined);
  const articles = useArticlesDeCategorie(detail?.id);
  const suppression = useSupprimerCategorie();

  // Recherche active : on affiche le resultat unique, comme l'Angular.
  const categories = code ? (recherche.data ? [recherche.data] : []) : (liste.data ?? []);
  const erreur = liste.error ?? (code ? recherche.error : null);

  async function confirmerSuppression() {
    const cible = aSupprimer;
    setASupprimer(null);
    if (!cible?.id) return;
    try {
      await suppression.mutateAsync(cible.id);
      toast.success(`Categorie ${cible.code} supprimee`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Suppression impossible');
    }
  }

  const colonnes = [
    { header: 'Code', cell: (c: CategorieDto) => c.code },
    { header: 'Designation', cell: (c: CategorieDto) => c.designation ?? '—' },
    {
      header: 'Actions',
      cell: (c: CategorieDto) => (
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setDetail(c)}>Details</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate(`/nouvellecategorie/${c.id}`)}>
            Modifier
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setASupprimer(c)}>Supprimer</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Liste des categories d'articles"
        action={<Button type="button" onClick={() => navigate('/nouvellecategorie')}>Nouvelle categorie</Button>}
      />

      <div className="pb-4">
        <RechercheParCode
          placeholder="Rechercher par code..."
          onSearch={(valeur) => { setCode(valeur); setPage(1); }}
          onClear={() => { setCode(''); setPage(1); }}
        />
      </div>

      {erreur && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {erreur.message}
        </p>
      )}

      {liste.isLoading ? (
        <div data-testid="categories-chargement" className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : categories.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Aucune categorie enregistree.</p>
      ) : (
        <DataTable
          columns={colonnes}
          data={categories}
          getRowId={(c) => c.id ?? c.code}
          pagination={{ page, taille: TAILLE_PAGE, onPageChange: setPage }}
        />
      )}

      <ConfirmDialog
        open={aSupprimer !== null}
        onOpenChange={(ouvert) => { if (!ouvert) setASupprimer(null); }}
        title="Supprimer la categorie ?"
        description={`La categorie ${aSupprimer?.code ?? ''} sera definitivement supprimee.`}
        onConfirm={confirmerSuppression}
        confirmLabel="Supprimer"
      />

      <DetailPanel
        open={detail !== null}
        onOpenChange={(ouvert) => { if (!ouvert) setDetail(null); }}
        title={`Articles de ${detail?.code ?? ''}`}
      >
        {articles.isLoading && <Skeleton className="h-20 w-full" />}
        {articles.error && <p role="alert" className="text-sm text-destructive">{articles.error.message}</p>}
        {!articles.isLoading && !articles.error && (articles.data?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">Aucun article dans cette categorie.</p>
        )}
        <ul className="space-y-3">
          {articles.data?.map((a) => (
            <li key={a.id} className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">{a.codeArticle}</p>
              <p className="text-sm text-muted-foreground">{a.designation}</p>
              <p className="text-sm text-muted-foreground">{formatMontant(a.prixUnitaireHt)} HT</p>
            </li>
          ))}
        </ul>
      </DetailPanel>
    </div>
  );
}
```

Run: `npm test -- PageCategories`
Expected: PASS (8 tests)

- [ ] **Step 3: Vérifier la suite complète et le lint**

Run: `npm test && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/categories/PageCategories.tsx src/pages/categories/PageCategories.test.tsx
git commit -m "feat(react): page liste Categories (etats de chargement, erreurs, pagination reelle)"
```

---

### Task 5: Formulaire Catégorie (création et édition unifiées)

**Files:**
- Create: `frontend/react/gestion-de-stock-frontend/src/pages/categories/FormulaireCategorie.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/pages/categories/FormulaireCategorie.test.tsx`

**Interfaces:**
- Consumes: `useCategorie`, `useEnregistrerCategorie` (Task 3) ; `FormLayout`, `FormRow` (Task 1) ; `Input`, `Label`, `Button` (socle Task 3)
- Produces: `FormulaireCategorie` — monté sur `/nouvellecategorie` et `/nouvellecategorie/:idCategory` en Task 10. L'identifiant est lu via `useParams()`.

Corrige les limitations #7 (double soumission) et #8 (aucune validation client).

- [ ] **Step 1: Écrire le test du formulaire**

Créer `src/pages/categories/FormulaireCategorie.test.tsx` :

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormulaireCategorie } from './FormulaireCategorie';
import * as hooks from '../../api/hooks/useCategories';

vi.mock('../../api/hooks/useCategories');

const enregistrer = { mutateAsync: vi.fn().mockResolvedValue({ id: 1, code: 'CAT-INFO' }), isPending: false };

function stubHooks(categorie?: unknown, isPending = false) {
  vi.mocked(hooks.useCategorie).mockReturnValue({
    data: categorie, isLoading: false, error: null,
  } as ReturnType<typeof hooks.useCategorie>);
  vi.mocked(hooks.useEnregistrerCategorie).mockReturnValue({
    ...enregistrer, isPending,
  } as unknown as ReturnType<typeof hooks.useEnregistrerCategorie>);
}

function renderAt(chemin: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[chemin]}>
        <Routes>
          <Route path="/nouvellecategorie" element={<FormulaireCategorie />} />
          <Route path="/nouvellecategorie/:idCategory" element={<FormulaireCategorie />} />
          <Route path="/categories" element={<div>Liste des categories</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => { vi.clearAllMocks(); stubHooks(); });

describe('FormulaireCategorie', () => {
  it('affiche un titre de creation sans identifiant dans l\'URL', () => {
    renderAt('/nouvellecategorie');
    expect(screen.getByRole('heading', { name: 'Nouvelle categorie' })).toBeInTheDocument();
  });

  it('affiche un titre de modification et pre-remplit les champs avec un identifiant', async () => {
    stubHooks({ id: 3, code: 'CAT-INFO', designation: 'Informatique' });
    renderAt('/nouvellecategorie/3');
    expect(screen.getByRole('heading', { name: 'Modifier la categorie' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Code')).toHaveValue('CAT-INFO'));
    expect(screen.getByLabelText('Designation')).toHaveValue('Informatique');
  });

  // Limitation #8 : l'Angular n'avait aucune validation client.
  it('refuse la soumission et affiche l\'erreur quand le code est vide', async () => {
    renderAt('/nouvellecategorie');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Le code est obligatoire')).toBeInTheDocument();
    expect(enregistrer.mutateAsync).not.toHaveBeenCalled();
  });

  it('enregistre et redirige vers la liste quand la saisie est valide', async () => {
    renderAt('/nouvellecategorie');
    await userEvent.type(screen.getByLabelText('Code'), 'CAT-INFO');
    await userEvent.type(screen.getByLabelText('Designation'), 'Informatique');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() =>
      expect(enregistrer.mutateAsync).toHaveBeenCalledWith({ code: 'CAT-INFO', designation: 'Informatique' }),
    );
    expect(await screen.findByText('Liste des categories')).toBeInTheDocument();
  });

  it('transmet l\'identifiant dans le corps en modification', async () => {
    stubHooks({ id: 3, code: 'CAT-INFO', designation: 'Informatique' });
    renderAt('/nouvellecategorie/3');
    await waitFor(() => expect(screen.getByLabelText('Code')).toHaveValue('CAT-INFO'));
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() =>
      expect(enregistrer.mutateAsync).toHaveBeenCalledWith({ id: 3, code: 'CAT-INFO', designation: 'Informatique' }),
    );
  });

  // Limitation #7 : deux clics creaient deux enregistrements.
  it('desactive le bouton pendant l\'enregistrement pour empecher la double soumission', () => {
    stubHooks(undefined, true);
    renderAt('/nouvellecategorie');
    expect(screen.getByRole('button', { name: /enregistrement/i })).toBeDisabled();
  });

  it('affiche le message du backend en cas d\'echec et reste sur le formulaire', async () => {
    enregistrer.mutateAsync.mockRejectedValueOnce(new Error('Code deja utilise'));
    renderAt('/nouvellecategorie');
    await userEvent.type(screen.getByLabelText('Code'), 'CAT-INFO');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Code deja utilise');
    expect(screen.queryByText('Liste des categories')).not.toBeInTheDocument();
  });

  it('revient a la liste au clic sur Annuler', async () => {
    renderAt('/nouvellecategorie');
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(await screen.findByText('Liste des categories')).toBeInTheDocument();
  });
});
```

Run: `npm test -- FormulaireCategorie`
Expected: FAIL

- [ ] **Step 2: Implémenter `FormulaireCategorie`**

Créer `src/pages/categories/FormulaireCategorie.tsx` :

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PageHeader } from '../../components/composed/PageHeader';
import { FormLayout, FormRow } from '../../components/composed/FormLayout';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { useCategorie, useEnregistrerCategorie } from '../../api/hooks/useCategories';

/** Validation cote client : l'Angular envoyait sans controle (limitation #8). */
const schema = z.object({
  code: z.string().trim().min(1, 'Le code est obligatoire'),
  designation: z.string().trim().min(1, 'La designation est obligatoire'),
});

type Saisie = z.infer<typeof schema>;

export function FormulaireCategorie() {
  const navigate = useNavigate();
  const { idCategory } = useParams();
  const id = idCategory ? Number(idCategory) : undefined;
  const modeEdition = typeof id === 'number' && !Number.isNaN(id);

  const { data: existante } = useCategorie(modeEdition ? id : undefined);
  const enregistrement = useEnregistrerCategorie();
  const [erreurServeur, setErreurServeur] = useState('');

  const form = useForm<Saisie>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', designation: '' },
  });

  // Le chargement est asynchrone : on reinjecte les valeurs des qu'elles arrivent.
  useEffect(() => {
    if (existante) {
      form.reset({ code: existante.code ?? '', designation: existante.designation ?? '' });
    }
  }, [existante, form]);

  async function onSubmit(saisie: Saisie) {
    setErreurServeur('');
    try {
      await enregistrement.mutateAsync(modeEdition ? { id, ...saisie } : saisie);
      toast.success(modeEdition ? 'Categorie modifiee' : 'Categorie creee');
      navigate('/categories');
    } catch (err) {
      setErreurServeur(err instanceof Error ? err.message : 'Enregistrement impossible');
    }
  }

  return (
    <div>
      <PageHeader title={modeEdition ? 'Modifier la categorie' : 'Nouvelle categorie'} />

      {erreurServeur && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {erreurServeur}
        </p>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FormLayout>
          <FormRow>
            <Label htmlFor="code">Code</Label>
            <Input id="code" {...form.register('code')} />
            {form.formState.errors.code && (
              <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
            )}
          </FormRow>

          <FormRow>
            <Label htmlFor="designation">Designation</Label>
            <Input id="designation" {...form.register('designation')} />
            {form.formState.errors.designation && (
              <p className="text-sm text-destructive">{form.formState.errors.designation.message}</p>
            )}
          </FormRow>
        </FormLayout>

        <div className="flex gap-3 pt-6">
          {/* Limitation #7 : bouton verrouille pendant l'appel, pas de double creation. */}
          <Button type="submit" disabled={enregistrement.isPending}>
            {enregistrement.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/categories')}>Annuler</Button>
        </div>
      </form>
    </div>
  );
}
```

Run: `npm test -- FormulaireCategorie`
Expected: PASS (8 tests)

- [ ] **Step 3: Vérifier la suite complète et le lint**

Run: `npm test && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/categories/FormulaireCategorie.tsx src/pages/categories/FormulaireCategorie.test.tsx
git commit -m "feat(react): formulaire Categorie avec validation client et anti-double-soumission"
```

---

### Task 6: Hooks de données Articles

**Files:**
- Create: `frontend/react/gestion-de-stock-frontend/src/api/hooks/useArticles.ts`
- Create: `frontend/react/gestion-de-stock-frontend/src/api/hooks/useArticles.test.tsx`

**Interfaces:**
- Consumes: `apiClient`, `messageErreur` (Task 1)
- Produces: `useArticles()`, `useArticle(id?)`, `useArticleParCode(code?)`, `useEnregistrerArticle()`, `useSupprimerArticle()`, `useEnvoyerPhotoArticle()`, `useHistoriqueVentes(id?)`, `useHistoriqueCommandesClients(id?)`, `useHistoriqueCommandesFournisseurs(id?)`.

L'upload photo est un `multipart/form-data` (champ `fichier`) avec le titre en query : `POST /api/v1/photos/article/{id}?titre=...`. L'API renvoie 400 si l'envoi vers Flickr échoue — d'où le hook dédié dont l'erreur est remontée (limitation #4).

- [ ] **Step 1: Écrire le test des hooks**

Créer `src/api/hooks/useArticles.test.tsx` :

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import {
  useArticles, useEnregistrerArticle, useSupprimerArticle,
  useEnvoyerPhotoArticle, useHistoriqueVentes,
} from './useArticles';

function wrapper({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function reponse(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status, headers: { 'Content-Type': 'application/json' } });
}

const ARTICLE = {
  id: 1, codeArticle: 'ART-001', designation: 'Clavier',
  prixUnitaireHt: 10000, tauxTva: 20, prixUnitaireTtc: 12000,
  category: { id: 1, code: 'CAT-INFO' },
};

beforeEach(() => localStorage.setItem('accessToken', JSON.stringify({ accessToken: 't', refreshToken: 'r' })));
afterEach(() => vi.unstubAllGlobals());

describe('useArticles', () => {
  it('retourne la liste des articles', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse([ARTICLE])));
    const { result } = renderHook(() => useArticles(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].codeArticle).toBe('ART-001');
  });

  it('retourne un tableau vide quand le backend repond null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse(null)));
    const { result } = renderHook(() => useArticles(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('expose une erreur exploitable quand le chargement echoue', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ message: 'Acces refuse' }, 403)));
    const { result } = renderHook(() => useArticles(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Acces refuse');
  });
});

describe('useEnregistrerArticle', () => {
  it('envoie un POST avec le corps de l\'article', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reponse(ARTICLE));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useEnregistrerArticle(), { wrapper });
    await result.current.mutateAsync(ARTICLE);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/v1/articles');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string).codeArticle).toBe('ART-001');
  });

  it('rejette avec la liste d\'erreurs de validation du backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ errors: ['Code obligatoire', 'Prix invalide'] }, 400)));
    const { result } = renderHook(() => useEnregistrerArticle(), { wrapper });
    await expect(result.current.mutateAsync(ARTICLE)).rejects.toThrow('Code obligatoire, Prix invalide');
  });
});

describe('useSupprimerArticle', () => {
  it('envoie un DELETE sur l\'identifiant', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reponse({}));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useSupprimerArticle(), { wrapper });
    await result.current.mutateAsync(4);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/v1/articles/4');
    expect(init.method).toBe('DELETE');
  });
});

describe('useEnvoyerPhotoArticle', () => {
  it('envoie un multipart avec le fichier et le titre en query', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reponse(ARTICLE));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useEnvoyerPhotoArticle(), { wrapper });
    const fichier = new File(['x'], 'photo.png', { type: 'image/png' });
    await result.current.mutateAsync({ id: 1, titre: 'ART-001', fichier });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/v1/photos/article/1');
    expect(String(url)).toContain('titre=ART-001');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('fichier')).toBe(fichier);
  });

  // Limitation #4 : l'Angular ignorait cet echec, l'utilisateur ne savait rien.
  it('rejette avec un message lisible quand Flickr echoue', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ message: 'Echec de l envoi sur Flickr' }, 400)));
    const { result } = renderHook(() => useEnvoyerPhotoArticle(), { wrapper });
    const fichier = new File(['x'], 'photo.png', { type: 'image/png' });
    await expect(result.current.mutateAsync({ id: 1, titre: 'ART-001', fichier }))
      .rejects.toThrow('Echec de l envoi sur Flickr');
  });
});

describe('useHistoriqueVentes', () => {
  it('ne declenche aucun appel sans identifiant', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderHook(() => useHistoriqueVentes(undefined), { wrapper });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Limitation #5 : les 3 historiques Angular n'avaient aucun callback d'erreur.
  it('expose une erreur exploitable quand l\'historique echoue', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ message: 'Historique indisponible' }, 500)));
    const { result } = renderHook(() => useHistoriqueVentes(1), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Historique indisponible');
  });
});
```

Run: `npm test -- useArticles`
Expected: FAIL

- [ ] **Step 2: Implémenter les hooks Articles**

Créer `src/api/hooks/useArticles.ts` :

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, API_BASE_URL } from '../client';
import type { components } from '../schema';
import { messageErreur } from '../../lib/erreurs';
import { buildAuthHeader } from '../auth-middleware';

export type ArticleDto = components['schemas']['ArticleDto'];
export type LigneVenteDto = components['schemas']['LigneVenteDto'];
export type LigneCommandeClientDto = components['schemas']['LigneCommandeClientDto'];
export type LigneCommandeFournisseurDto = components['schemas']['LigneCommandeFournisseurDto'];

export const clesArticles = {
  tous: ['articles'] as const,
  parId: (id: number) => ['articles', id] as const,
  parCode: (code: string) => ['articles', 'code', code] as const,
  historiqueVentes: (id: number) => ['articles', id, 'ventes'] as const,
  historiqueCmdClt: (id: number) => ['articles', id, 'commandes-clients'] as const,
  historiqueCmdFrs: (id: number) => ['articles', id, 'commandes-fournisseurs'] as const,
};

function leve(error: unknown, defaut: string): never {
  throw new Error(messageErreur(error, defaut));
}

export function useArticles() {
  return useQuery({
    queryKey: clesArticles.tous,
    queryFn: async (): Promise<ArticleDto[]> => {
      const { data, error } = await apiClient.GET('/api/v1/articles');
      if (error) leve(error, 'Impossible de charger les articles.');
      return data ?? [];
    },
  });
}

export function useArticle(id?: number) {
  return useQuery({
    queryKey: clesArticles.parId(id ?? 0),
    enabled: typeof id === 'number' && id > 0,
    queryFn: async (): Promise<ArticleDto> => {
      const { data, error } = await apiClient.GET('/api/v1/articles/{idArticle}', {
        params: { path: { idArticle: id as number } },
      });
      if (error || !data) leve(error, 'Impossible de charger l\'article.');
      return data;
    },
  });
}

export function useArticleParCode(code?: string) {
  return useQuery({
    queryKey: clesArticles.parCode(code ?? ''),
    enabled: Boolean(code),
    queryFn: async (): Promise<ArticleDto> => {
      const { data, error } = await apiClient.GET('/api/v1/articles/code/{codeArticle}', {
        params: { path: { codeArticle: code as string } },
      });
      if (error || !data?.id) leve(error, `Aucun article trouve avec le code ${code}.`);
      return data;
    },
  });
}

export function useEnregistrerArticle() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (article: ArticleDto): Promise<ArticleDto> => {
      const { data, error } = await apiClient.POST('/api/v1/articles', { body: article });
      if (error || !data) leve(error, 'Enregistrement de l\'article impossible.');
      return data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: clesArticles.tous }),
  });
}

export function useSupprimerArticle() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const { error } = await apiClient.DELETE('/api/v1/articles/{idArticle}', {
        params: { path: { idArticle: id } },
      });
      if (error) leve(error, 'Suppression de l\'article impossible.');
    },
    onSuccess: () => client.invalidateQueries({ queryKey: clesArticles.tous }),
  });
}

interface EnvoiPhoto {
  id: number;
  titre: string;
  fichier: File;
}

/**
 * Upload multipart. `openapi-fetch` ne serialise pas le FormData tel quel :
 * on passe par fetch directement, avec le header d'authentification du middleware.
 * L'API renvoie 400 si l'envoi vers Flickr echoue — cette erreur est remontee a
 * l'appelant, contrairement a l'Angular qui l'ignorait (limitation #4).
 */
export function useEnvoyerPhotoArticle() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, titre, fichier }: EnvoiPhoto): Promise<void> => {
      const corps = new FormData();
      corps.append('fichier', fichier);

      const entetes: Record<string, string> = {};
      const authorization = buildAuthHeader();
      if (authorization) entetes.Authorization = authorization;

      const reponse = await fetch(
        `${API_BASE_URL}/api/v1/photos/article/${id}?titre=${encodeURIComponent(titre)}`,
        { method: 'POST', body: corps, headers: entetes },
      );

      if (!reponse.ok) {
        const corpsErreur: unknown = await reponse.json().catch(() => null);
        leve(corpsErreur, 'Envoi de la photo impossible.');
      }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: clesArticles.tous }),
  });
}

export function useHistoriqueVentes(id?: number) {
  return useQuery({
    queryKey: clesArticles.historiqueVentes(id ?? 0),
    enabled: typeof id === 'number' && id > 0,
    queryFn: async (): Promise<LigneVenteDto[]> => {
      const { data, error } = await apiClient.GET('/api/v1/articles/{idArticle}/historique-ventes', {
        params: { path: { idArticle: id as number } },
      });
      if (error) leve(error, 'Impossible de charger l\'historique des ventes.');
      return data ?? [];
    },
  });
}

export function useHistoriqueCommandesClients(id?: number) {
  return useQuery({
    queryKey: clesArticles.historiqueCmdClt(id ?? 0),
    enabled: typeof id === 'number' && id > 0,
    queryFn: async (): Promise<LigneCommandeClientDto[]> => {
      const { data, error } = await apiClient.GET('/api/v1/articles/{idArticle}/historique-commandes-clients', {
        params: { path: { idArticle: id as number } },
      });
      if (error) leve(error, 'Impossible de charger l\'historique des commandes clients.');
      return data ?? [];
    },
  });
}

export function useHistoriqueCommandesFournisseurs(id?: number) {
  return useQuery({
    queryKey: clesArticles.historiqueCmdFrs(id ?? 0),
    enabled: typeof id === 'number' && id > 0,
    queryFn: async (): Promise<LigneCommandeFournisseurDto[]> => {
      const { data, error } = await apiClient.GET('/api/v1/articles/{idArticle}/historique-commandes-fournisseurs', {
        params: { path: { idArticle: id as number } },
      });
      if (error) leve(error, 'Impossible de charger l\'historique des commandes fournisseurs.');
      return data ?? [];
    },
  });
}
```

Si `buildAuthHeader` n'est pas exporté par `src/api/auth-middleware.ts`, l'ajouter à ses exports — il y est déjà défini et testé (`auth-middleware.test.ts` l'importe nommément).

Run: `npm test -- useArticles`
Expected: PASS (10 tests)

- [ ] **Step 3: Vérifier la suite complète et le lint**

Run: `npm test && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/api/hooks/useArticles.ts src/api/hooks/useArticles.test.tsx
git commit -m "feat(react): hooks de donnees Articles (CRUD, photo, historiques)"
```

---

### Task 7: Page liste Articles

**Files:**
- Create: `frontend/react/gestion-de-stock-frontend/src/pages/articles/PageArticles.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/pages/articles/PageArticles.test.tsx`

**Interfaces:**
- Consumes: `useArticles`, `useArticleParCode`, `useSupprimerArticle` (Task 6) ; `PageHeader`, `DataTable`, `ConfirmDialog`, `RechercheParCode` (socle) ; `formatMontant` (Task 2) ; `PanneauHistoriquesArticle` (Task 9 — **le brancher en Task 9**, pas ici)
- Produces: `PageArticles` — monté sur `/articles` en Task 10.

**Décision de présentation :** l'Angular affichait une grille de cartes. Ici on utilise `DataTable`, conformément à la spec §5 (« seule implémentation de tableau de liste du projet ») et §7 (bascule responsive déjà gérée : table ≥ md, cartes empilées < md). La photo est rendue dans la cellule du code. Le rendu mobile reste donc en cartes, comme l'Angular, sans code spécifique.

- [ ] **Step 1: Écrire le test de la page**

Créer `src/pages/articles/PageArticles.test.tsx` :

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { PageArticles } from './PageArticles';
import * as hooks from '../../api/hooks/useArticles';

vi.mock('../../api/hooks/useArticles');

const ARTICLES = [
  { id: 1, codeArticle: 'ART-001', designation: 'Clavier', prixUnitaireHt: 10000, tauxTva: 20, prixUnitaireTtc: 12000, category: { id: 1, code: 'CAT-INFO' } },
  { id: 2, codeArticle: 'ART-002', designation: 'Souris', prixUnitaireHt: 2000, tauxTva: 20, prixUnitaireTtc: 2400, category: { id: 1, code: 'CAT-INFO' } },
];

function Page({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const supprimer = { mutateAsync: vi.fn(), isPending: false };

function stubHooks(surcharge: Partial<Record<string, unknown>> = {}) {
  vi.mocked(hooks.useArticles).mockReturnValue({
    data: ARTICLES, isLoading: false, isError: false, error: null,
    ...(surcharge.useArticles as object),
  } as ReturnType<typeof hooks.useArticles>);
  vi.mocked(hooks.useArticleParCode).mockReturnValue({
    data: undefined, isError: false, error: null,
    ...(surcharge.useArticleParCode as object),
  } as ReturnType<typeof hooks.useArticleParCode>);
  vi.mocked(hooks.useSupprimerArticle).mockReturnValue(
    supprimer as unknown as ReturnType<typeof hooks.useSupprimerArticle>,
  );
}

beforeEach(() => { vi.clearAllMocks(); stubHooks(); });

describe('PageArticles', () => {
  it('affiche le titre et une ligne par article', () => {
    render(<Page><PageArticles /></Page>);
    expect(screen.getByRole('heading', { name: 'Articles' })).toBeInTheDocument();
    const table = within(screen.getByRole('table'));
    expect(table.getByText('ART-001')).toBeInTheDocument();
    expect(table.getByText('Souris')).toBeInTheDocument();
  });

  it('formate les prix en euros plutot qu\'en nombre brut', () => {
    render(<Page><PageArticles /></Page>);
    const table = within(screen.getByRole('table'));
    expect(table.getByText(/10\s?000,00/)).toBeInTheDocument();
  });

  // Limitation #10
  it('affiche un etat de chargement distinct de l\'etat vide', () => {
    stubHooks({ useArticles: { data: undefined, isLoading: true } });
    render(<Page><PageArticles /></Page>);
    expect(screen.getByTestId('articles-chargement')).toBeInTheDocument();
    expect(screen.queryByText(/aucun article/i)).not.toBeInTheDocument();
  });

  it('affiche un etat vide explicite', () => {
    stubHooks({ useArticles: { data: [] } });
    render(<Page><PageArticles /></Page>);
    expect(screen.getByText(/aucun article/i)).toBeInTheDocument();
  });

  it('affiche le message d\'erreur quand le chargement echoue', () => {
    stubHooks({ useArticles: { data: undefined, isError: true, error: new Error('Service indisponible') } });
    render(<Page><PageArticles /></Page>);
    expect(screen.getByRole('alert')).toHaveTextContent('Service indisponible');
  });

  it('filtre sur le resultat unique de la recherche par code', async () => {
    stubHooks({ useArticleParCode: { data: ARTICLES[1] } });
    render(<Page><PageArticles /></Page>);
    await userEvent.type(screen.getByPlaceholderText(/rechercher par code/i), 'ART-002{enter}');
    await waitFor(() => {
      const table = within(screen.getByRole('table'));
      expect(table.getByText('ART-002')).toBeInTheDocument();
      expect(table.queryByText('ART-001')).not.toBeInTheDocument();
    });
  });

  // Limitation #11 : le protocole Angular passait par une chaine magique 'success' typee any.
  it('demande confirmation avant de supprimer et n\'appelle le hook qu\'apres', async () => {
    render(<Page><PageArticles /></Page>);
    await userEvent.click(screen.getAllByRole('button', { name: 'Supprimer' })[0]);
    expect(supprimer.mutateAsync).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }));
    await waitFor(() => expect(supprimer.mutateAsync).toHaveBeenCalledWith(1));
  });

  it('ne propose pas les boutons fantomes Exporter / Importer de l\'Angular', () => {
    render(<Page><PageArticles /></Page>);
    expect(screen.queryByRole('button', { name: /exporter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /importer/i })).not.toBeInTheDocument();
  });
});
```

Run: `npm test -- PageArticles`
Expected: FAIL

- [ ] **Step 2: Implémenter `PageArticles`**

Créer `src/pages/articles/PageArticles.tsx` :

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { PageHeader } from '../../components/composed/PageHeader';
import { DataTable } from '../../components/composed/DataTable';
import { ConfirmDialog } from '../../components/composed/ConfirmDialog';
import { RechercheParCode } from '../../components/composed/RechercheParCode';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { formatMontant } from '../../lib/formatters';
import { useArticles, useArticleParCode, useSupprimerArticle, type ArticleDto } from '../../api/hooks/useArticles';

const TAILLE_PAGE = 10;

export function PageArticles() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [code, setCode] = useState('');
  const [aSupprimer, setASupprimer] = useState<ArticleDto | null>(null);

  const liste = useArticles();
  const recherche = useArticleParCode(code || undefined);
  const suppression = useSupprimerArticle();

  const articles = code ? (recherche.data ? [recherche.data] : []) : (liste.data ?? []);
  const erreur = liste.error ?? (code ? recherche.error : null);

  async function confirmerSuppression() {
    const cible = aSupprimer;
    setASupprimer(null);
    if (!cible?.id) return;
    try {
      await suppression.mutateAsync(cible.id);
      toast.success(`Article ${cible.codeArticle} supprime`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Suppression impossible');
    }
  }

  const colonnes = [
    {
      header: 'Code',
      cell: (a: ArticleDto) => (
        <div className="flex items-center gap-3">
          {a.photo && <img src={a.photo} alt="" width={32} height={32} className="rounded-lg object-cover" />}
          <span>{a.codeArticle}</span>
        </div>
      ),
    },
    { header: 'Designation', cell: (a: ArticleDto) => a.designation },
    { header: 'Categorie', cell: (a: ArticleDto) => a.category?.code ?? '—' },
    { header: 'Prix HT', cell: (a: ArticleDto) => formatMontant(a.prixUnitaireHt) },
    { header: 'Prix TTC', cell: (a: ArticleDto) => formatMontant(a.prixUnitaireTtc) },
    {
      header: 'Actions',
      cell: (a: ArticleDto) => (
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate(`/nouvelarticle/${a.id}`)}>
            Modifier
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setASupprimer(a)}>Supprimer</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Articles"
        description="Liste des articles en stock"
        action={<Button type="button" onClick={() => navigate('/nouvelarticle')}>Nouvel article</Button>}
      />

      <div className="pb-4">
        <RechercheParCode
          placeholder="Rechercher par code..."
          onSearch={(valeur) => { setCode(valeur); setPage(1); }}
          onClear={() => { setCode(''); setPage(1); }}
        />
      </div>

      {erreur && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {erreur.message}
        </p>
      )}

      {liste.isLoading ? (
        <div data-testid="articles-chargement" className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : articles.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Aucun article enregistre.</p>
      ) : (
        <DataTable
          columns={colonnes}
          data={articles}
          getRowId={(a) => a.id ?? a.codeArticle}
          pagination={{ page, taille: TAILLE_PAGE, onPageChange: setPage }}
        />
      )}

      <ConfirmDialog
        open={aSupprimer !== null}
        onOpenChange={(ouvert) => { if (!ouvert) setASupprimer(null); }}
        title="Supprimer l'article ?"
        description={`L'article ${aSupprimer?.codeArticle ?? ''} sera definitivement supprime.`}
        onConfirm={confirmerSuppression}
        confirmLabel="Supprimer"
      />
    </div>
  );
}
```

Run: `npm test -- PageArticles`
Expected: PASS (8 tests)

- [ ] **Step 3: Vérifier la suite complète et le lint**

Run: `npm test && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/articles/PageArticles.tsx src/pages/articles/PageArticles.test.tsx
git commit -m "feat(react): page liste Articles (prix formates, etats, pagination)"
```

---

### Task 8: Formulaire Article

**Files:**
- Create: `frontend/react/gestion-de-stock-frontend/src/pages/articles/FormulaireArticle.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/pages/articles/FormulaireArticle.test.tsx`

**Interfaces:**
- Consumes: `useArticle`, `useEnregistrerArticle`, `useEnvoyerPhotoArticle` (Task 6) ; `useCategories` (Task 3) ; `FormLayout`, `FormRow` (Task 1) ; `Select`, `Input`, `Label`, `Button` (socle Task 3)
- Produces: `FormulaireArticle` — monté sur `/nouvelarticle` et `/nouvelarticle/:idArticle` en Task 10.

Corrige #4 (échec photo silencieux), #7 (double soumission), #8 (aucune validation), #9 (TTC périmé).

- [ ] **Step 1: Écrire le test du formulaire**

Créer `src/pages/articles/FormulaireArticle.test.tsx` :

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormulaireArticle } from './FormulaireArticle';
import * as articlesHooks from '../../api/hooks/useArticles';
import * as categoriesHooks from '../../api/hooks/useCategories';

vi.mock('../../api/hooks/useArticles');
vi.mock('../../api/hooks/useCategories');

const CATEGORIES = [{ id: 1, code: 'CAT-INFO', designation: 'Informatique' }];
const ARTICLE = {
  id: 5, codeArticle: 'ART-001', designation: 'Clavier',
  prixUnitaireHt: 100, tauxTva: 20, prixUnitaireTtc: 120, category: CATEGORIES[0],
};

const enregistrer = { mutateAsync: vi.fn().mockResolvedValue(ARTICLE), isPending: false };
const envoyerPhoto = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };

function stubHooks(article?: unknown, isPending = false) {
  vi.mocked(articlesHooks.useArticle).mockReturnValue({
    data: article, isLoading: false, error: null,
  } as ReturnType<typeof articlesHooks.useArticle>);
  vi.mocked(articlesHooks.useEnregistrerArticle).mockReturnValue({
    ...enregistrer, isPending,
  } as unknown as ReturnType<typeof articlesHooks.useEnregistrerArticle>);
  vi.mocked(articlesHooks.useEnvoyerPhotoArticle).mockReturnValue(
    envoyerPhoto as unknown as ReturnType<typeof articlesHooks.useEnvoyerPhotoArticle>,
  );
  vi.mocked(categoriesHooks.useCategories).mockReturnValue({
    data: CATEGORIES, isLoading: false, error: null,
  } as ReturnType<typeof categoriesHooks.useCategories>);
}

function renderAt(chemin: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[chemin]}>
        <Routes>
          <Route path="/nouvelarticle" element={<FormulaireArticle />} />
          <Route path="/nouvelarticle/:idArticle" element={<FormulaireArticle />} />
          <Route path="/articles" element={<div>Liste des articles</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => { vi.clearAllMocks(); stubHooks(); });

describe('FormulaireArticle', () => {
  it('affiche un titre de creation sans identifiant', () => {
    renderAt('/nouvelarticle');
    expect(screen.getByRole('heading', { name: 'Nouvel article' })).toBeInTheDocument();
  });

  it('pre-remplit les champs en modification', async () => {
    stubHooks(ARTICLE);
    renderAt('/nouvelarticle/5');
    expect(screen.getByRole('heading', { name: 'Modifier l\'article' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Code article')).toHaveValue('ART-001'));
  });

  // Limitation #8
  it('refuse la soumission et liste les champs obligatoires manquants', async () => {
    renderAt('/nouvelarticle');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Le code article est obligatoire')).toBeInTheDocument();
    expect(screen.getByText('La designation est obligatoire')).toBeInTheDocument();
    expect(enregistrer.mutateAsync).not.toHaveBeenCalled();
  });

  it('refuse un prix HT negatif', async () => {
    renderAt('/nouvelarticle');
    await userEvent.type(screen.getByLabelText('Prix unitaire HT'), '-5');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Le prix HT doit etre positif')).toBeInTheDocument();
  });

  // Limitation #9 : l'Angular ne recalculait que si les deux champs etaient remplis,
  // vider la TVA laissait un TTC perime affiche.
  it('recalcule le TTC a chaque saisie', async () => {
    renderAt('/nouvelarticle');
    await userEvent.type(screen.getByLabelText('Prix unitaire HT'), '100');
    await userEvent.type(screen.getByLabelText('Taux TVA (%)'), '20');
    await waitFor(() => expect(screen.getByLabelText('Prix unitaire TTC')).toHaveValue(120));
  });

  it('remet le TTC a zero quand le taux de TVA est efface (pas de valeur perimee)', async () => {
    renderAt('/nouvelarticle');
    const ht = screen.getByLabelText('Prix unitaire HT');
    const tva = screen.getByLabelText('Taux TVA (%)');
    await userEvent.type(ht, '100');
    await userEvent.type(tva, '20');
    await waitFor(() => expect(screen.getByLabelText('Prix unitaire TTC')).toHaveValue(120));
    await userEvent.clear(tva);
    await waitFor(() => expect(screen.getByLabelText('Prix unitaire TTC')).toHaveValue(100));
  });

  it('enregistre et redirige quand la saisie est valide', async () => {
    renderAt('/nouvelarticle');
    await userEvent.type(screen.getByLabelText('Code article'), 'ART-009');
    await userEvent.type(screen.getByLabelText('Designation'), 'Ecran');
    await userEvent.type(screen.getByLabelText('Prix unitaire HT'), '100');
    await userEvent.type(screen.getByLabelText('Taux TVA (%)'), '20');
    await userEvent.selectOptions(screen.getByLabelText('Categorie'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(enregistrer.mutateAsync).toHaveBeenCalled());
    const envoye = enregistrer.mutateAsync.mock.calls[0][0];
    expect(envoye.codeArticle).toBe('ART-009');
    expect(envoye.prixUnitaireTtc).toBe(120);
    expect(envoye.category).toEqual({ id: 1 });
    expect(await screen.findByText('Liste des articles')).toBeInTheDocument();
  });

  // Limitation #7
  it('desactive le bouton pendant l\'enregistrement', () => {
    stubHooks(undefined, true);
    renderAt('/nouvelarticle');
    expect(screen.getByRole('button', { name: /enregistrement/i })).toBeDisabled();
  });

  it('affiche le message du backend en cas d\'echec et reste sur le formulaire', async () => {
    enregistrer.mutateAsync.mockRejectedValueOnce(new Error('Code deja utilise'));
    renderAt('/nouvelarticle');
    await userEvent.type(screen.getByLabelText('Code article'), 'ART-009');
    await userEvent.type(screen.getByLabelText('Designation'), 'Ecran');
    await userEvent.type(screen.getByLabelText('Prix unitaire HT'), '100');
    await userEvent.type(screen.getByLabelText('Taux TVA (%)'), '20');
    await userEvent.selectOptions(screen.getByLabelText('Categorie'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Code deja utilise');
    expect(screen.queryByText('Liste des articles')).not.toBeInTheDocument();
  });

  // Limitation #4 : l'Angular ignorait l'echec d'upload et redirigeait quand meme.
  it('signale l\'echec de l\'envoi de la photo sans perdre l\'article enregistre', async () => {
    envoyerPhoto.mutateAsync.mockRejectedValueOnce(new Error('Echec de l envoi sur Flickr'));
    renderAt('/nouvelarticle');
    await userEvent.type(screen.getByLabelText('Code article'), 'ART-009');
    await userEvent.type(screen.getByLabelText('Designation'), 'Ecran');
    await userEvent.type(screen.getByLabelText('Prix unitaire HT'), '100');
    await userEvent.type(screen.getByLabelText('Taux TVA (%)'), '20');
    await userEvent.selectOptions(screen.getByLabelText('Categorie'), '1');
    await userEvent.upload(screen.getByLabelText('Photo'), new File(['x'], 'p.png', { type: 'image/png' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Echec de l envoi sur Flickr');
    expect(enregistrer.mutateAsync).toHaveBeenCalled();
  });

  it('revient a la liste au clic sur Annuler', async () => {
    renderAt('/nouvelarticle');
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(await screen.findByText('Liste des articles')).toBeInTheDocument();
  });
});
```

Run: `npm test -- FormulaireArticle`
Expected: FAIL

- [ ] **Step 2: Implémenter `FormulaireArticle`**

Le `Select` de shadcn est un composant Radix qui ne se pilote pas avec `selectOptions`. Pour rester testable avec `userEvent.selectOptions` et accessible via `Label`, ce formulaire utilise un `<select>` natif stylé par les tokens — choix volontaire, la spec impose les tokens, pas Radix.

Créer `src/pages/articles/FormulaireArticle.tsx` :

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PageHeader } from '../../components/composed/PageHeader';
import { FormLayout, FormRow } from '../../components/composed/FormLayout';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { useArticle, useEnregistrerArticle, useEnvoyerPhotoArticle } from '../../api/hooks/useArticles';
import { useCategories } from '../../api/hooks/useCategories';

const schema = z.object({
  codeArticle: z.string().trim().min(1, 'Le code article est obligatoire'),
  designation: z.string().trim().min(1, 'La designation est obligatoire'),
  prixUnitaireHt: z.coerce.number({ message: 'Le prix HT est obligatoire' }).min(0, 'Le prix HT doit etre positif'),
  tauxTva: z.coerce.number({ message: 'Le taux de TVA est obligatoire' }).min(0, 'Le taux de TVA doit etre positif'),
  idCategory: z.string().min(1, 'La categorie est obligatoire'),
});

type Saisie = z.infer<typeof schema>;

/** TTC = HT + HT * taux / 100. Recalcule a chaque frappe, jamais fige (limitation #9). */
function calculerTtc(ht: number, taux: number): number {
  if (Number.isNaN(ht)) return 0;
  const tauxSur = Number.isNaN(taux) ? 0 : taux;
  return Math.round((ht + ht * (tauxSur / 100)) * 100) / 100;
}

export function FormulaireArticle() {
  const navigate = useNavigate();
  const { idArticle } = useParams();
  const id = idArticle ? Number(idArticle) : undefined;
  const modeEdition = typeof id === 'number' && !Number.isNaN(id);

  const { data: existant } = useArticle(modeEdition ? id : undefined);
  const categories = useCategories();
  const enregistrement = useEnregistrerArticle();
  const envoiPhoto = useEnvoyerPhotoArticle();
  const [erreurServeur, setErreurServeur] = useState('');
  const [fichier, setFichier] = useState<File | null>(null);

  const form = useForm<Saisie>({
    resolver: zodResolver(schema),
    defaultValues: { codeArticle: '', designation: '', prixUnitaireHt: 0, tauxTva: 0, idCategory: '' },
  });

  useEffect(() => {
    if (existant) {
      form.reset({
        codeArticle: existant.codeArticle ?? '',
        designation: existant.designation ?? '',
        prixUnitaireHt: existant.prixUnitaireHt ?? 0,
        tauxTva: existant.tauxTva ?? 0,
        idCategory: existant.category?.id ? String(existant.category.id) : '',
      });
    }
  }, [existant, form]);

  // Derive, donc jamais desynchronise de la saisie.
  const ttc = calculerTtc(Number(form.watch('prixUnitaireHt')), Number(form.watch('tauxTva')));

  async function onSubmit(saisie: Saisie) {
    setErreurServeur('');
    try {
      const enregistre = await enregistrement.mutateAsync({
        ...(modeEdition ? { id } : {}),
        codeArticle: saisie.codeArticle,
        designation: saisie.designation,
        prixUnitaireHt: saisie.prixUnitaireHt,
        tauxTva: saisie.tauxTva,
        prixUnitaireTtc: ttc,
        category: { id: Number(saisie.idCategory) },
      });

      // L'article est enregistre : un echec photo ne doit pas le faire oublier (limitation #4).
      if (fichier && enregistre.id) {
        try {
          await envoiPhoto.mutateAsync({ id: enregistre.id, titre: saisie.codeArticle, fichier });
        } catch (err) {
          setErreurServeur(
            `Article enregistre, mais l'envoi de la photo a echoue : ${err instanceof Error ? err.message : 'erreur inconnue'}`,
          );
          return;
        }
      }

      toast.success(modeEdition ? 'Article modifie' : 'Article cree');
      navigate('/articles');
    } catch (err) {
      setErreurServeur(err instanceof Error ? err.message : 'Enregistrement impossible');
    }
  }

  return (
    <div>
      <PageHeader title={modeEdition ? "Modifier l'article" : 'Nouvel article'} />

      {erreurServeur && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {erreurServeur}
        </p>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FormLayout>
          <FormRow>
            <Label htmlFor="codeArticle">Code article</Label>
            <Input id="codeArticle" {...form.register('codeArticle')} />
            {form.formState.errors.codeArticle && (
              <p className="text-sm text-destructive">{form.formState.errors.codeArticle.message}</p>
            )}
          </FormRow>

          <FormRow>
            <Label htmlFor="designation">Designation</Label>
            <Input id="designation" {...form.register('designation')} />
            {form.formState.errors.designation && (
              <p className="text-sm text-destructive">{form.formState.errors.designation.message}</p>
            )}
          </FormRow>

          <FormRow>
            <Label htmlFor="prixUnitaireHt">Prix unitaire HT</Label>
            <Input id="prixUnitaireHt" type="number" step="0.01" {...form.register('prixUnitaireHt')} />
            {form.formState.errors.prixUnitaireHt && (
              <p className="text-sm text-destructive">{form.formState.errors.prixUnitaireHt.message}</p>
            )}
          </FormRow>

          <FormRow>
            <Label htmlFor="tauxTva">Taux TVA (%)</Label>
            <Input id="tauxTva" type="number" step="0.01" {...form.register('tauxTva')} />
            {form.formState.errors.tauxTva && (
              <p className="text-sm text-destructive">{form.formState.errors.tauxTva.message}</p>
            )}
          </FormRow>

          <FormRow>
            <Label htmlFor="prixUnitaireTtc">Prix unitaire TTC</Label>
            {/* Champ derive : lecture seule, toujours coherent avec HT et TVA. */}
            <Input id="prixUnitaireTtc" type="number" value={ttc} readOnly />
          </FormRow>

          <FormRow>
            <Label htmlFor="idCategory">Categorie</Label>
            <select
              id="idCategory"
              {...form.register('idCategory')}
              className="h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Choisir une categorie</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.code} — {c.designation}</option>
              ))}
            </select>
            {form.formState.errors.idCategory && (
              <p className="text-sm text-destructive">{form.formState.errors.idCategory.message}</p>
            )}
          </FormRow>

          <FormRow pleineLargeur>
            <Label htmlFor="photo">Photo</Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
            />
          </FormRow>
        </FormLayout>

        <div className="flex gap-3 pt-6">
          <Button type="submit" disabled={enregistrement.isPending}>
            {enregistrement.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/articles')}>Annuler</Button>
        </div>
      </form>
    </div>
  );
}
```

Run: `npm test -- FormulaireArticle`
Expected: PASS (11 tests)

- [ ] **Step 3: Vérifier la suite complète et le lint**

Run: `npm test && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/articles/FormulaireArticle.tsx src/pages/articles/FormulaireArticle.test.tsx
git commit -m "feat(react): formulaire Article (TTC derive, validation, echec photo signale)"
```

---

### Task 9: Panneau des historiques d'un article

**Files:**
- Create: `frontend/react/gestion-de-stock-frontend/src/pages/articles/PanneauHistoriquesArticle.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/pages/articles/PanneauHistoriquesArticle.test.tsx`
- Modify: `frontend/react/gestion-de-stock-frontend/src/pages/articles/PageArticles.tsx`
- Modify: `frontend/react/gestion-de-stock-frontend/src/pages/articles/PageArticles.test.tsx`

**Interfaces:**
- Consumes: `useHistoriqueVentes`, `useHistoriqueCommandesClients`, `useHistoriqueCommandesFournisseurs` (Task 6) ; `DetailPanel` (socle Task 13) ; `Tabs` (socle Task 3) ; `formatMontant`, `formatDate` (Task 2)
- Produces: `PanneauHistoriquesArticle({ article, onClose })` où `article: ArticleDto | null` — `null` ferme le panneau.

Corrige #5 : les trois appels Angular n'avaient aucun callback d'erreur.

- [ ] **Step 1: Écrire le test du panneau**

Créer `src/pages/articles/PanneauHistoriquesArticle.test.tsx` :

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PanneauHistoriquesArticle } from './PanneauHistoriquesArticle';
import * as hooks from '../../api/hooks/useArticles';

vi.mock('../../api/hooks/useArticles');

const ARTICLE = { id: 1, codeArticle: 'ART-001', designation: 'Clavier' };

function stubHooks(surcharge: Partial<Record<string, unknown>> = {}) {
  vi.mocked(hooks.useHistoriqueVentes).mockReturnValue({
    data: [], isLoading: false, error: null, ...(surcharge.ventes as object),
  } as ReturnType<typeof hooks.useHistoriqueVentes>);
  vi.mocked(hooks.useHistoriqueCommandesClients).mockReturnValue({
    data: [], isLoading: false, error: null, ...(surcharge.cmdClt as object),
  } as ReturnType<typeof hooks.useHistoriqueCommandesClients>);
  vi.mocked(hooks.useHistoriqueCommandesFournisseurs).mockReturnValue({
    data: [], isLoading: false, error: null, ...(surcharge.cmdFrs as object),
  } as ReturnType<typeof hooks.useHistoriqueCommandesFournisseurs>);
}

beforeEach(() => { vi.clearAllMocks(); stubHooks(); });

describe('PanneauHistoriquesArticle', () => {
  it('affiche le code et la designation de l\'article en titre', () => {
    render(<PanneauHistoriquesArticle article={ARTICLE} onClose={() => {}} />);
    expect(screen.getByText(/ART-001/)).toBeInTheDocument();
  });

  it('affiche le nombre d\'elements par onglet', () => {
    stubHooks({ ventes: { data: [{ id: 1, quantite: 2, prixUnitaire: 100 }] } });
    render(<PanneauHistoriquesArticle article={ARTICLE} onClose={() => {}} />);
    expect(screen.getByRole('tab', { name: /ventes \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /commandes clients \(0\)/i })).toBeInTheDocument();
  });

  it('liste les lignes de vente avec montants formates', () => {
    stubHooks({ ventes: { data: [{ id: 1, quantite: 2, prixUnitaire: 10000 }] } });
    render(<PanneauHistoriquesArticle article={ARTICLE} onClose={() => {}} />);
    const panneau = screen.getByRole('tabpanel');
    expect(within(panneau).getByText(/10\s?000,00/)).toBeInTheDocument();
  });

  it('bascule vers l\'onglet des commandes clients', async () => {
    stubHooks({ cmdClt: { data: [{ id: 7, quantite: 3, prixUnitaire: 500 }] } });
    render(<PanneauHistoriquesArticle article={ARTICLE} onClose={() => {}} />);
    await userEvent.click(screen.getByRole('tab', { name: /commandes clients/i }));
    expect(within(screen.getByRole('tabpanel')).getByText(/500,00/)).toBeInTheDocument();
  });

  it('affiche un etat vide par onglet', () => {
    render(<PanneauHistoriquesArticle article={ARTICLE} onClose={() => {}} />);
    expect(within(screen.getByRole('tabpanel')).getByText(/aucune vente/i)).toBeInTheDocument();
  });

  // Limitation #5 : l'echec etait totalement silencieux cote Angular.
  it('affiche l\'erreur d\'un historique au lieu d\'un panneau vide inexplique', () => {
    stubHooks({ ventes: { data: undefined, error: new Error('Historique indisponible') } });
    render(<PanneauHistoriquesArticle article={ARTICLE} onClose={() => {}} />);
    expect(within(screen.getByRole('tabpanel')).getByRole('alert'))
      .toHaveTextContent('Historique indisponible');
  });

  it('ne rend pas de panneau quand aucun article n\'est selectionne', () => {
    render(<PanneauHistoriquesArticle article={null} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

Run: `npm test -- PanneauHistoriquesArticle`
Expected: FAIL

- [ ] **Step 2: Implémenter le panneau**

Créer `src/pages/articles/PanneauHistoriquesArticle.tsx` :

```tsx
import type { ReactNode } from 'react';
import { DetailPanel } from '../../components/composed/DetailPanel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Skeleton } from '../../components/ui/skeleton';
import { formatMontant } from '../../lib/formatters';
import {
  useHistoriqueVentes, useHistoriqueCommandesClients, useHistoriqueCommandesFournisseurs,
  type ArticleDto,
} from '../../api/hooks/useArticles';

interface LigneHistorique {
  id?: number;
  quantite?: number;
  prixUnitaire?: number;
}

interface PanneauProps {
  /** `null` ferme le panneau. */
  article: ArticleDto | null;
  onClose: () => void;
}

function Contenu({
  lignes, isLoading, error, messageVide,
}: {
  lignes?: LigneHistorique[];
  isLoading: boolean;
  error: Error | null;
  messageVide: string;
}): ReactNode {
  if (isLoading) return <Skeleton className="h-20 w-full" />;
  // Un echec d'historique est affiche, pas avale (limitation #5).
  if (error) return <p role="alert" className="text-sm text-destructive">{error.message}</p>;
  if (!lignes || lignes.length === 0) {
    return <p className="text-sm text-muted-foreground">{messageVide}</p>;
  }

  return (
    <ul className="space-y-3">
      {lignes.map((ligne) => (
        <li key={ligne.id} className="flex justify-between rounded-lg border border-border p-3 text-sm">
          <span className="text-muted-foreground">Quantite : {ligne.quantite ?? '—'}</span>
          <span>{formatMontant(ligne.prixUnitaire)}</span>
        </li>
      ))}
    </ul>
  );
}

export function PanneauHistoriquesArticle({ article, onClose }: PanneauProps) {
  const ventes = useHistoriqueVentes(article?.id);
  const cmdClt = useHistoriqueCommandesClients(article?.id);
  const cmdFrs = useHistoriqueCommandesFournisseurs(article?.id);

  return (
    <DetailPanel
      open={article !== null}
      onOpenChange={(ouvert) => { if (!ouvert) onClose(); }}
      title={`${article?.designation ?? ''} (${article?.codeArticle ?? ''})`}
    >
      <Tabs defaultValue="ventes">
        <TabsList>
          <TabsTrigger value="ventes">Ventes ({ventes.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="cmdClt">Commandes clients ({cmdClt.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="cmdFrs">Commandes fournisseurs ({cmdFrs.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="ventes">
          <Contenu lignes={ventes.data} isLoading={ventes.isLoading} error={ventes.error} messageVide="Aucune vente pour cet article." />
        </TabsContent>
        <TabsContent value="cmdClt">
          <Contenu lignes={cmdClt.data} isLoading={cmdClt.isLoading} error={cmdClt.error} messageVide="Aucune commande client pour cet article." />
        </TabsContent>
        <TabsContent value="cmdFrs">
          <Contenu lignes={cmdFrs.data} isLoading={cmdFrs.isLoading} error={cmdFrs.error} messageVide="Aucune commande fournisseur pour cet article." />
        </TabsContent>
      </Tabs>
    </DetailPanel>
  );
}
```

Run: `npm test -- PanneauHistoriquesArticle`
Expected: PASS (7 tests)

- [ ] **Step 3: Brancher le panneau sur la liste Articles**

Ajouter à `src/pages/articles/PageArticles.test.tsx`, dans le `describe('PageArticles')` :

```tsx
  it('ouvre le panneau des historiques au clic sur Details', async () => {
    render(<Page><PageArticles /></Page>);
    await userEvent.click(screen.getAllByRole('button', { name: 'Details' })[0]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
```

Ce test exige que `useHistoriqueVentes`, `useHistoriqueCommandesClients` et `useHistoriqueCommandesFournisseurs` soient aussi stubés dans `stubHooks` de ce fichier — les ajouter sur le modèle des autres :

```tsx
  vi.mocked(hooks.useHistoriqueVentes).mockReturnValue({
    data: [], isLoading: false, error: null,
  } as ReturnType<typeof hooks.useHistoriqueVentes>);
  vi.mocked(hooks.useHistoriqueCommandesClients).mockReturnValue({
    data: [], isLoading: false, error: null,
  } as ReturnType<typeof hooks.useHistoriqueCommandesClients>);
  vi.mocked(hooks.useHistoriqueCommandesFournisseurs).mockReturnValue({
    data: [], isLoading: false, error: null,
  } as ReturnType<typeof hooks.useHistoriqueCommandesFournisseurs>);
```

Dans `src/pages/articles/PageArticles.tsx` : importer le panneau, ajouter l'état, le bouton et le rendu.

```tsx
import { PanneauHistoriquesArticle } from './PanneauHistoriquesArticle';
```

```tsx
  const [detail, setDetail] = useState<ArticleDto | null>(null);
```

Dans la colonne `Actions`, avant le bouton « Modifier » :

```tsx
          <Button type="button" variant="ghost" size="sm" onClick={() => setDetail(a)}>Details</Button>
```

Avant la fermeture du `</div>` racine, après le `ConfirmDialog` :

```tsx
      <PanneauHistoriquesArticle article={detail} onClose={() => setDetail(null)} />
```

Run: `npm test -- PageArticles`
Expected: PASS (9 tests)

- [ ] **Step 4: Vérifier la suite complète et le lint**

Run: `npm test && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/articles/PanneauHistoriquesArticle.tsx src/pages/articles/PanneauHistoriquesArticle.test.tsx src/pages/articles/PageArticles.tsx src/pages/articles/PageArticles.test.tsx
git commit -m "feat(react): panneau des historiques article avec erreurs affichees"
```

---

### Task 10: Branchement des routes et vérification finale

**Files:**
- Modify: `frontend/react/gestion-de-stock-frontend/src/routes.tsx`
- Modify: `frontend/react/gestion-de-stock-frontend/src/routes.test.tsx`

**Interfaces:**
- Consumes: `PageArticles`, `FormulaireArticle` (Tasks 7-8), `PageCategories`, `FormulaireCategorie` (Tasks 4-5)
- Produces: les 6 routes de domaine ne rendent plus un `DomainStub`.

- [ ] **Step 1: Adapter le test de routes**

Dans `src/routes.test.tsx`, les routes `articles`, `nouvelarticle`, `categories` et `nouvellecategorie` ne rendent plus le texte du stub. Retirer ces quatre noms du tableau `routesProtegees` et ajouter un `describe` dédié :

```tsx
describe('routes de domaine livrees (etape 4)', () => {
  it.each([
    ['/articles', 'Articles'],
    ['/nouvelarticle', 'Nouvel article'],
    ['/categories', 'Categories'],
    ['/nouvellecategorie', 'Nouvelle categorie'],
  ])('la route %s rend sa page reelle et non un stub', async (chemin, titre) => {
    renderAt(chemin);
    expect(await screen.findByRole('heading', { name: titre })).toBeInTheDocument();
    expect(screen.queryByText(/a implementer/i)).not.toBeInTheDocument();
  });
});
```

Ce test monte les vraies pages, donc les hooks réseau doivent être neutralisés. Ajouter en tête du fichier :

```tsx
vi.mock('./api/hooks/useArticles');
vi.mock('./api/hooks/useCategories');
```

et, dans un `beforeEach`, stuber les hooks consommés par ces quatre pages avec des retours vides (`{ data: [], isLoading: false, isError: false, error: null }` pour les requêtes, `{ mutateAsync: vi.fn(), isPending: false }` pour les mutations), sur le modèle de `PageArticles.test.tsx`.

Run: `npm test -- routes`
Expected: FAIL (les routes rendent encore les stubs)

- [ ] **Step 2: Brancher les pages réelles**

Dans `src/routes.tsx`, ajouter les imports :

```tsx
import { PageArticles } from './pages/articles/PageArticles';
import { FormulaireArticle } from './pages/articles/FormulaireArticle';
import { PageCategories } from './pages/categories/PageCategories';
import { FormulaireCategorie } from './pages/categories/FormulaireCategorie';
```

Retirer `'articles'`, `'nouvelarticle'`, `'categories'` et `'nouvellecategorie'` du tableau passé à `Object.fromEntries` (leurs stubs ne servent plus), puis remplacer les six `<Route>` correspondantes :

```tsx
          <Route path="articles" element={<PageArticles />} />
          <Route path="nouvelarticle" element={<FormulaireArticle />} />
          <Route path="nouvelarticle/:idArticle" element={<FormulaireArticle />} />
          <Route path="categories" element={<PageCategories />} />
          <Route path="nouvellecategorie" element={<FormulaireCategorie />} />
          <Route path="nouvellecategorie/:idCategory" element={<FormulaireCategorie />} />
```

Run: `npm test -- routes`
Expected: PASS

- [ ] **Step 3: Lancer la suite complète**

Run: `npm test`
Expected: PASS — tous les tests du socle (112) plus ceux des Tasks 1 à 9.

- [ ] **Step 4: Lancer le lint**

Run: `npm run lint`
Expected: PASS, zéro erreur — en particulier zéro `tailwindcss/no-arbitrary-value`.

- [ ] **Step 5: Lancer le build de production**

Run: `npm run build`
Expected: build réussit sans erreur TypeScript.

- [ ] **Step 6: Vérification manuelle contre le vrai backend**

Le backend doit tourner : `docker compose up -d api` à la racine du dépôt (l'image `gestion-de-stock-api:latest` est déjà construite localement ; vérifier avec `curl -s -o /dev/null -w '%{http_code}' http://localhost:8081/v3/api-docs`, attendu `200`).

Puis `npm run dev` et, connecté avec les identifiants de `DEMO_CREDENTIALS.md` :

1. `/categories` — la liste charge, la pagination change réellement de page au-delà de 10 lignes, la recherche par code filtre, la suppression demande confirmation.
2. `/nouvellecategorie` — soumettre à vide affiche les erreurs sans appel réseau ; créer une catégorie redirige vers la liste qui la contient.
3. `/articles` — les prix sont formatés en euros, le panneau « Details » ouvre les trois onglets d'historique.
4. `/nouvelarticle` — saisir un prix HT et un taux TVA met le TTC à jour à chaque frappe ; effacer le taux ramène le TTC au prix HT et ne laisse pas de valeur périmée.
5. Réduire la fenêtre sous 768px (`md`) : les tableaux basculent en cartes empilées.

- [ ] **Step 7: Commit final de l'étape**

```bash
git add src/routes.tsx src/routes.test.tsx
git commit -m "feat(react): branche les pages Articles et Categories sur leurs routes"
```

---

## Self-Review (effectué avant remise du plan)

**Couverture spec** :
- §2 Stack : React Hook Form 7 + Zod 4 installés en Task 1 — le socle ne les avait pas — ✓
- §3 Identité visuelle : `pagination` (composant custom annoncé par la spec) livré en Task 2 ; `form` installé en Task 1 — ces deux-là manquaient au socle — ✓
- §4 Arborescence : hooks dans `src/api/hooks/` (un fichier par ressource), pages dans `src/pages/<domaine>/`, formatters dans `src/lib/` — conforme — ✓
- §5 Trois couches : les pages ne font que composer ; aucun appel `apiClient` hors `src/api/hooks/` (Global Constraint) ; `FormLayout` est le seul à définir la grille de formulaire — ✓
- §6 Discipline d'espacement : aucune valeur arbitraire, vérifié par `npm run lint` en Task 10 — ✓
- §7 Responsive : `DataTable` gère la bascule (héritée du socle), vérifiée manuellement en Task 10 Step 6 — ✓
- §11 Ordre de construction : ce plan couvre exactement l'étape 4 « Articles + Catégories, patron CRUD de référence ». Les étapes 5 à 8 restent à planifier — ✓
- §12 Tests : priorité de test plus haute sur les `composed/` — `Pagination` et `FormLayout` ont leurs suites dédiées (Tasks 1-2) avant toute page — ✓

**Limitations Angular** : les 11 limitations recensées sont chacune rattachées à une tâche et couvertes par un test nommé qui référence son numéro.

**Placeholders** : aucun « TODO »/« TBD » ; chaque step porte du code réel ou une commande exacte.

**Cohérence des types** : `CategorieDto` et `ArticleDto` sont définis en Tasks 3 et 6 et réutilisés tels quels ensuite. `ArticleDto` est exporté par `useCategories.ts` **et** `useArticles.ts` : les pages Articles importent depuis `useArticles`, la page Catégories depuis `useCategories`. `DataTable` conserve sa signature du socle, la prop `pagination` étant optionnelle — les trois usages existants ne changent pas.
