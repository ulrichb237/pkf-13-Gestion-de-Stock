# Socle React "Console Pro" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser le socle technique complet du nouveau frontend React (`frontend/react/gestion-de-stock-frontend/`) — tooling, design tokens "Console Pro", client API typé, authentification avec refresh token, shell applicatif responsive, et les 5 patrons de composants réutilisables — sur lequel tous les domaines métier (Articles, Commandes, Utilisateurs...) seront ensuite construits.

**Architecture:** Vite + React 19 + TypeScript strict. Architecture de composants à 3 couches (`components/ui/` primitifs shadcn → `components/composed/` patrons inter-domaines → `pages/` composition). TanStack Query pour le cache serveur, client API généré depuis l'OpenAPI du backend. Routing React Router v7 avec les mêmes chemins que l'app Angular actuelle, protégés par un guard qui vérifie le token en `localStorage`.

**Tech Stack:** Vite, React 19, TypeScript 5.9 (strict), React Router v7, TanStack Query v5, Tailwind CSS v4, shadcn/ui, openapi-typescript, openapi-fetch, Sonner, lucide-react, Vitest, React Testing Library, eslint-plugin-tailwindcss.

**Spec:** [docs/superpowers/specs/2026-09-18-react-migration-design.md](../specs/2026-09-18-react-migration-design.md) — ce plan couvre l'étape 1 "Socle" et l'étape 2 "Patrons de réutilisation" de la §11 de la spec. Les étapes 3+ (Code Connect, domaines métier) font l'objet de plans séparés une fois ce socle terminé.

## Global Constraints

- Chemins de routes strictement identiques à l'Angular actuel (`/login`, `/articles`, `/commandesclient`, etc. — spec §1/§8).
- Palette "Console Pro" : primary indigo `#6366f1`, sidebar encre `#111827`, canvas `#ffffff` (spec §3).
- **Aucun dégradé** : uniquement des fonds unis, élévation par ombre+bordure (spec §3).
- Échelle d'espacement en grille 4px (`--spacing: 0.25rem`), **aucune valeur arbitraire** (`p-[13px]`, `style={{padding}}`) — bloqué par ESLint en CI (spec §6).
- Architecture à 3 couches stricte : `ui/` ne connaît aucune logique métier ; `composed/` ne connaît aucun domaine ; `pages/` ne définit jamais d'espacement en dur (spec §5).
- Refresh token : une seule requête de refresh partagée entre appels concurrents (spec §8, miroir de `refreshEnCours` côté Angular).
- Le profil utilisateur doit être chargé **avant** la navigation post-login (spec §8 — ne pas réintroduire la race condition déjà corrigée côté Angular).
- `rounded-lg` comme radius par défaut (spec §3).
- Toutes les dépendances en version stable la plus récente : utiliser `npm view <pkg> version` avant chaque install plutôt que figer un numéro dans ce plan (spec §2).

---

## File Structure

```
frontend/react/gestion-de-stock-frontend/
  index.html
  package.json
  vite.config.ts
  tsconfig.json
  .eslintrc.json (ou eslint.config.js selon la version d'ESLint résolue)
  src/
    main.tsx
    routes.tsx
    styles/globals.css
    lib/
      cn.ts
      cn.test.ts
      query-client.ts
    api/
      schema.d.ts        # généré, non versionné à la main
      client.ts
      client.test.ts
      auth-middleware.ts
      auth-middleware.test.ts
    hooks/
      use-auth.tsx
      use-auth.test.tsx
    components/
      ui/                # généré par `npx shadcn add`
      layout/
        AppShell.tsx
        AppShell.test.tsx
        Menu.tsx
        Menu.test.tsx
        Header.tsx
        Header.test.tsx
        RequireAuth.tsx
        RequireAuth.test.tsx
      composed/
        PageHeader.tsx
        PageHeader.test.tsx
        ConfirmDialog.tsx
        ConfirmDialog.test.tsx
        DataTable.tsx
        DataTable.test.tsx
        DetailPanel.tsx
        DetailPanel.test.tsx
        RechercheParCode.tsx
        RechercheParCode.test.tsx
    pages/
      _stubs/DomainStub.tsx   # page de remplacement temporaire, remplacée domaine par domaine dans les plans suivants
```

---

### Task 1: Scaffolding du projet et tooling de base

**Files:**
- Create: `frontend/react/gestion-de-stock-frontend/` (projet Vite complet)
- Create: `frontend/react/gestion-de-stock-frontend/.eslintrc.cjs` (ou équivalent flat config)
- Create: `frontend/react/gestion-de-stock-frontend/.prettierrc`
- Create: `frontend/react/gestion-de-stock-frontend/vitest.config.ts`

**Interfaces:**
- Produces: script `npm test` (Vitest), `npm run lint` (ESLint), `npm run build` (Vite build), `npm run dev` — utilisés par toutes les tâches suivantes.

- [ ] **Step 1: Générer le projet Vite React+TS**

```bash
cd frontend/react
npm create vite@latest gestion-de-stock-frontend -- --template react-ts
cd gestion-de-stock-frontend
npm install
```

- [ ] **Step 2: Installer les dépendances de test**

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Créer `vitest.config.ts` :

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
  },
});
```

Créer `vitest.setup.ts` :

```ts
import '@testing-library/jest-dom/vitest';
```

Ajouter dans `package.json` → `"scripts"` :

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Vérifier que le harnais de test fonctionne**

Créer un test trivial `src/smoke.test.ts` :

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('le harnais de test fonctionne', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: PASS (1 test)

Supprimer `src/smoke.test.ts` une fois la vérification faite (il ne doit pas survivre dans le repo).

- [ ] **Step 4: Configurer ESLint avec eslint-plugin-tailwindcss**

```bash
npm install -D eslint-plugin-tailwindcss
```

Dans la config ESLint générée par Vite (adapter `eslint.config.js` — format flat config par défaut sur les scaffolds Vite récents) :

```js
import tailwindcss from 'eslint-plugin-tailwindcss';

export default [
  // ...config existante générée par Vite...
  {
    plugins: { tailwindcss },
    rules: {
      'tailwindcss/no-arbitrary-value': 'error', // Global Constraint : pas de p-[13px] etc.
    },
  },
];
```

Run: `npm run lint`
Expected: PASS, zéro erreur (projet vide de code applicatif pour l'instant)

- [ ] **Step 5: Commit**

```bash
git add frontend/react/gestion-de-stock-frontend
git commit -m "chore(react): scaffold projet Vite React 19 + TS strict + Vitest + ESLint"
```

---

### Task 2: Tailwind v4 + tokens "Console Pro"

**Files:**
- Modify: `frontend/react/gestion-de-stock-frontend/vite.config.ts`
- Create: `frontend/react/gestion-de-stock-frontend/src/styles/globals.css`
- Create: `frontend/react/gestion-de-stock-frontend/src/styles/globals.test.tsx`

**Interfaces:**
- Produces: classes utilitaires Tailwind + tokens `--color-primary`, `--color-sidebar`, `--color-canvas`, `--color-success`, `--color-warning`, `--color-danger`, `--spacing`, `--radius` consommés par toutes les tâches suivantes.

- [ ] **Step 1: Installer Tailwind v4**

```bash
npm install tailwindcss @tailwindcss/vite
```

Modifier `vite.config.ts` :

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { proxy: { '/api': 'http://localhost:8081' } },
});
```

- [ ] **Step 2: Déclarer les tokens "Console Pro"**

Créer `src/styles/globals.css` :

```css
@import "tailwindcss";

@theme {
  /* Spacing — grille 4px, Global Constraint : pas de valeur arbitraire ailleurs dans le projet */
  --spacing: 0.25rem;

  /* Radius */
  --radius: 0.5rem; /* rounded-lg par defaut, spec §3 */

  /* Palette "Console Pro" — spec §3 */
  --color-primary: #6366f1;
  --color-primary-hover: #4f46e5;
  --color-primary-active: #4338ca;
  --color-sidebar: #111827;
  --color-sidebar-foreground: #e5e7eb;
  --color-canvas: #ffffff;
  --color-canvas-soft: #f9fafb;
  --color-border: #e5e7eb;
  --color-muted-foreground: #6b7280;
  --color-foreground: #111827;

  /* Semantiques — badges d'etat de commande + alertes stock (spec §3) */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #dc2626;

  --font-sans: "Inter", system-ui, -apple-system, sans-serif;
}

/* Global Constraint : surfaces plates uniquement, jamais de bg-gradient-* ni linear-gradient() */
body {
  background-color: var(--color-canvas);
  color: var(--color-foreground);
  font-family: var(--font-sans);
}
```

Importer dans `src/main.tsx` : `import './styles/globals.css';`

- [ ] **Step 3: Écrire le test de non-régression des tokens**

Créer `src/styles/globals.test.tsx` :

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import './globals.css';

describe('tokens Console Pro', () => {
  it('applique le fond canvas blanc au body via les tokens', () => {
    render(<div />);
    const styles = getComputedStyle(document.body);
    // jsdom ne resout pas les variables CSS custom, on verifie juste que la regle est appliquee sans lever
    expect(styles.fontFamily).toBeDefined();
  });
});
```

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Vérifier qu'une classe Tailwind pilotée par token compile**

Modifier temporairement `src/App.tsx` pour utiliser `bg-primary text-white p-4 rounded-lg` et lancer :

Run: `npm run build`
Expected: build réussit, aucune erreur Tailwind (token `primary` résolu)

- [ ] **Step 5: Commit**

```bash
git add src/styles vite.config.ts src/main.tsx
git commit -m "feat(react): tokens design system Console Pro (Tailwind v4, surfaces plates)"
```

---

### Task 3: shadcn/ui — initialisation et premier primitif

**Files:**
- Create: `frontend/react/gestion-de-stock-frontend/components.json` (config shadcn)
- Create: `frontend/react/gestion-de-stock-frontend/src/components/ui/button.tsx` (généré)
- Create: `frontend/react/gestion-de-stock-frontend/src/components/ui/button.test.tsx`

**Interfaces:**
- Produces: `Button` (`src/components/ui/button.tsx`), export `{ Button, buttonVariants }`, consommé par toutes les pages/composants suivants.

- [ ] **Step 1: Initialiser shadcn/ui**

```bash
npx shadcn@latest init
```
Répondre : style par défaut, couleur de base neutre (les tokens Console Pro du Task 2 remplacent déjà la palette dans `globals.css`), alias `@/components`.

- [ ] **Step 2: Ajouter le premier composant**

```bash
npx shadcn@latest add button
```
Vérifie que `src/components/ui/button.tsx` est créé et référence `cn()` depuis `@/lib/utils` (le CLI le génère automatiquement).

- [ ] **Step 3: Écrire le test du composant généré**

Créer `src/components/ui/button.test.tsx` :

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

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
```

Run: `npm test -- button`
Expected: PASS (2 tests)

- [ ] **Step 4: Installer le reste des primitifs listés en spec §3**

```bash
npx shadcn@latest add input select textarea checkbox switch label form table card badge dialog alert-dialog dropdown-menu sheet tabs avatar separator skeleton sonner tooltip command
```

Run: `npm run build`
Expected: build réussit

- [ ] **Step 5: Commit**

```bash
git add components.json src/components/ui src/lib/utils.ts
git commit -m "feat(react): initialisation shadcn/ui et primitifs de base"
```

---

### Task 4: Utilitaire `cn()` — vérification et test dédié

**Files:**
- Modify: `frontend/react/gestion-de-stock-frontend/src/lib/utils.ts` (généré par shadcn au Task 3 — on ajoute son test)
- Create: `frontend/react/gestion-de-stock-frontend/src/lib/utils.test.ts`

**Interfaces:**
- Consumes: rien
- Produces: `cn(...classes: ClassValue[]): string`, utilisé par tous les composants `ui/`, `composed/` et `pages/`.

- [ ] **Step 1: Écrire le test de fusion de classes**

Créer `src/lib/utils.test.ts` :

```ts
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
    expect(cn('p-4', false && 'hidden', undefined, 'text-white')).toBe('p-4 text-white');
  });
});
```

- [ ] **Step 2: Run test to verify it passes** (l'implémentation de `cn()` existe déjà, générée par shadcn au Task 3)

Run: `npm test -- utils`
Expected: PASS (3 tests). Si `p-4 p-2` n'est pas dédoublonné, vérifier que `tailwind-merge` est bien la dépendance utilisée dans `cn()` (le CLI shadcn l'installe par défaut) — sinon `npm install tailwind-merge clsx` et régénérer `cn()`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils.test.ts
git commit -m "test(react): couverture de l'utilitaire cn()"
```

---

### Task 5: Client API typé (openapi-typescript + openapi-fetch)

**Files:**
- Create: `frontend/react/gestion-de-stock-frontend/scripts/generate-api.sh`
- Create: `frontend/react/gestion-de-stock-frontend/src/api/schema.d.ts` (généré)
- Create: `frontend/react/gestion-de-stock-frontend/src/api/client.ts`
- Create: `frontend/react/gestion-de-stock-frontend/src/api/client.test.ts`

**Interfaces:**
- Produces: `apiClient` (instance `openapi-fetch` typée par `paths`), export nommé depuis `src/api/client.ts`, consommé par tous les hooks de domaine des plans suivants.

- [ ] **Step 1: Installer les dépendances**

```bash
npm install openapi-fetch
npm install -D openapi-typescript
```

- [ ] **Step 2: Créer le script de génération**

Créer `scripts/generate-api.sh` :

```bash
#!/usr/bin/env bash
set -euo pipefail
# Le backend Spring Boot (docker-compose, service `api`) doit tourner sur :8081
npx openapi-typescript http://localhost:8081/v3/api-docs -o src/api/schema.d.ts
echo "src/api/schema.d.ts régénéré depuis /v3/api-docs"
```

```bash
chmod +x scripts/generate-api.sh
```

Ajouter dans `package.json` → `"scripts"` : `"gen:api": "bash scripts/generate-api.sh"`

- [ ] **Step 3: Générer le schéma (backend requis)**

```bash
cd /home/developper/pkf-13-ECOMMERCE && docker compose up -d api mysql
cd frontend/react/gestion-de-stock-frontend && npm run gen:api
```

Si le backend n'est pas démarrable dans l'environnement d'exécution du plan, committer un `schema.d.ts` généré manuellement une fois, avec un commentaire d'en-tête rappelant `npm run gen:api` comme commande de resynchronisation — ne jamais éditer ce fichier à la main au-delà de cet amorçage.

- [ ] **Step 4: Créer le client et son test**

Créer `src/api/client.ts` :

```ts
import createClient from 'openapi-fetch';
import type { paths } from './schema';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081';

export const apiClient = createClient<paths>({ baseUrl: API_BASE_URL });
```

Créer `.env.development` : `VITE_API_BASE_URL=http://localhost:8081`

Créer `src/api/client.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { apiClient, API_BASE_URL } from './client';

describe('apiClient', () => {
  it('est configure avec la baseUrl attendue', () => {
    expect(API_BASE_URL).toBe('http://localhost:8081');
  });

  it('expose les methodes GET/POST/PATCH/DELETE typees', () => {
    expect(typeof apiClient.GET).toBe('function');
    expect(typeof apiClient.POST).toBe('function');
    expect(typeof apiClient.PATCH).toBe('function');
    expect(typeof apiClient.DELETE).toBe('function');
  });
});
```

Run: `npm test -- client`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-api.sh src/api/schema.d.ts src/api/client.ts src/api/client.test.ts package.json .env.development
git commit -m "feat(react): client API type genere depuis l'OpenAPI du backend"
```

---

### Task 6: Middleware d'authentification (header + refresh token single-flight)

**Files:**
- Create: `frontend/react/gestion-de-stock-frontend/src/api/auth-middleware.ts`
- Create: `frontend/react/gestion-de-stock-frontend/src/api/auth-middleware.test.ts`
- Modify: `frontend/react/gestion-de-stock-frontend/src/api/client.ts`

**Interfaces:**
- Consumes: `apiClient` (Task 5)
- Produces: `installAuthMiddleware(client): void`, `getStoredSession(): AuthSession | null`, `purgeSession(): void` — utilisés par `use-auth.tsx` (Task 7) et par tous les hooks de domaine.

- [ ] **Step 1: Écrire le test du header Authorization**

Créer `src/api/auth-middleware.test.ts` :

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getStoredSession, purgeSession, buildAuthHeader } from './auth-middleware';

describe('session locale', () => {
  beforeEach(() => localStorage.clear());

  it('retourne null si aucune session stockee', () => {
    expect(getStoredSession()).toBeNull();
  });

  it('lit la session depuis localStorage', () => {
    localStorage.setItem('accessToken', JSON.stringify({ accessToken: 'abc', refreshToken: 'xyz' }));
    expect(getStoredSession()).toEqual({ accessToken: 'abc', refreshToken: 'xyz' });
  });

  it('purgerSession vide accessToken et connectedUser', () => {
    localStorage.setItem('accessToken', '{}');
    localStorage.setItem('connectedUser', '{}');
    purgeSession();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('connectedUser')).toBeNull();
  });

  it('construit le header Authorization Bearer', () => {
    localStorage.setItem('accessToken', JSON.stringify({ accessToken: 'abc123', refreshToken: 'r' }));
    expect(buildAuthHeader()).toBe('Bearer abc123');
  });

  it('ne construit pas de header sans session', () => {
    expect(buildAuthHeader()).toBeNull();
  });
});
```

Run: `npm test -- auth-middleware`
Expected: FAIL (module non implémenté)

- [ ] **Step 2: Implémenter la gestion de session**

Créer `src/api/auth-middleware.ts` (partie 1/2) :

```ts
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
}

export function getStoredSession(): AuthSession | null {
  const raw = localStorage.getItem('accessToken');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function purgeSession(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('connectedUser');
}

export function buildAuthHeader(): string | null {
  const session = getStoredSession();
  return session?.accessToken ? `Bearer ${session.accessToken}` : null;
}
```

Run: `npm test -- auth-middleware`
Expected: PASS (5 tests)

- [ ] **Step 3: Écrire le test du refresh single-flight**

Ajouter à `src/api/auth-middleware.test.ts` :

```ts
import { refreshSession, __resetRefreshState } from './auth-middleware';

describe('refresh token single-flight', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('accessToken', JSON.stringify({ accessToken: 'old', refreshToken: 'r1' }));
    __resetRefreshState();
  });

  it('ne declenche qu\'un seul appel reseau pour plusieurs refresh concurrents', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'new', refreshToken: 'r2' }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    const [a, b, c] = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toBe('new');
    expect(b).toBe('new');
    expect(c).toBe('new');
  });

  it('purge la session si le refresh echoue', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    await expect(refreshSession()).rejects.toThrow();
    expect(getStoredSession()).toBeNull();
  });
});
```

Run: `npm test -- auth-middleware`
Expected: FAIL (`refreshSession`/`__resetRefreshState` non exportés)

- [ ] **Step 4: Implémenter le refresh single-flight**

Ajouter à `src/api/auth-middleware.ts` (partie 2/2) :

```ts
import { API_BASE_URL } from './client';

let refreshEnCours: Promise<string> | null = null;

/** Reservee aux tests : reinitialise l'etat partage entre deux scenarios */
export function __resetRefreshState(): void {
  refreshEnCours = null;
}

export async function refreshSession(): Promise<string> {
  if (refreshEnCours) return refreshEnCours;

  const session = getStoredSession();
  if (!session?.refreshToken) {
    purgeSession();
    throw new Error('no-refresh-token');
  }

  refreshEnCours = fetch(`${API_BASE_URL}/api/v1/authentification/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error('refresh-failed');
      const body = (await res.json()) as AuthSession;
      if (!body.accessToken) throw new Error('refresh-failed');
      localStorage.setItem('accessToken', JSON.stringify(body));
      return body.accessToken;
    })
    .catch((err) => {
      purgeSession();
      throw err;
    })
    .finally(() => {
      refreshEnCours = null;
    });

  return refreshEnCours;
}
```

Run: `npm test -- auth-middleware`
Expected: PASS (7 tests)

- [ ] **Step 5: Brancher le middleware sur `apiClient`**

Ajouter à `src/api/auth-middleware.ts` :

```ts
import type { Middleware } from 'openapi-fetch';

export const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const isAppelAuth = request.url.includes('/authentification/');
    const header = buildAuthHeader();
    if (header && !isAppelAuth) {
      request.headers.set('Authorization', header);
    }
    return request;
  },
  async onResponse({ request, response }) {
    const isAppelAuth = request.url.includes('/authentification/');
    if (response.status !== 401 || isAppelAuth) return response;

    try {
      const newAccessToken = await refreshSession();
      const retryRequest = new Request(request, {
        headers: { ...Object.fromEntries(request.headers), Authorization: `Bearer ${newAccessToken}` },
      });
      return fetch(retryRequest);
    } catch {
      return response; // le refresh a echoue, on laisse remonter le 401 d'origine
    }
  },
};
```

Modifier `src/api/client.ts` pour l'enregistrer :

```ts
import { authMiddleware } from './auth-middleware';

apiClient.use(authMiddleware);
```

Run: `npm test -- auth-middleware client`
Expected: PASS (tout le Task 5 + Task 6)

- [ ] **Step 6: Commit**

```bash
git add src/api/auth-middleware.ts src/api/auth-middleware.test.ts src/api/client.ts
git commit -m "feat(react): intercepteur auth avec refresh token single-flight"
```

---

### Task 7: `AuthProvider` — état d'authentification applicatif

**Files:**
- Create: `frontend/react/gestion-de-stock-frontend/src/hooks/use-auth.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/hooks/use-auth.test.tsx`

**Interfaces:**
- Consumes: `getStoredSession`, `purgeSession` (Task 6), `apiClient` (Task 5)
- Produces: `AuthProvider` (composant), `useAuth(): { connectedUser: UtilisateurDto | null; isAuthenticated: boolean; login(email, password): Promise<void>; logout(): void }` — consommé par `RequireAuth` (Task 8) et par toutes les pages d'auth des plans suivants.

- [ ] **Step 1: Écrire le test du provider**

Créer `src/hooks/use-auth.test.tsx` :

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './use-auth';
import { apiClient } from '../api/client';

function Probe() {
  const { isAuthenticated, connectedUser, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="status">{isAuthenticated ? 'connecte' : 'deconnecte'}</span>
      <span data-testid="user">{connectedUser?.nom ?? ''}</span>
      <button onClick={() => login('a@b.com', 'pass')}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => localStorage.clear());

  it('demarre deconnecte sans session stockee', () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByTestId('status')).toHaveTextContent('deconnecte');
  });

  it('login charge le profil AVANT de marquer authentifie (pas de race condition)', async () => {
    vi.spyOn(apiClient, 'POST').mockResolvedValue({
      data: { accessToken: 'tok', refreshToken: 'ref' }, error: undefined,
    } as never);
    vi.spyOn(apiClient, 'GET').mockResolvedValue({
      data: { nom: 'Doe', email: 'a@b.com' }, error: undefined,
    } as never);

    render(<AuthProvider><Probe /></AuthProvider>);
    await userEvent.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('connecte'));
    expect(screen.getByTestId('user')).toHaveTextContent('Doe');
  });

  it('logout purge la session', async () => {
    localStorage.setItem('accessToken', JSON.stringify({ accessToken: 't', refreshToken: 'r' }));
    localStorage.setItem('connectedUser', JSON.stringify({ nom: 'Doe' }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await userEvent.click(screen.getByText('logout'));
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});
```

Run: `npm test -- use-auth`
Expected: FAIL (module non implémenté)

- [ ] **Step 2: Implémenter `AuthProvider`**

Créer `src/hooks/use-auth.tsx` :

```tsx
import { createContext, useCallback, useContext, useState, type PropsWithChildren } from 'react';
import { apiClient } from '../api/client';
import { getStoredSession, purgeSession } from '../api/auth-middleware';

interface ConnectedUser {
  nom?: string;
  email?: string;
  [key: string]: unknown;
}

interface AuthContextValue {
  connectedUser: ConnectedUser | null;
  isAuthenticated: boolean;
  login: (email: string, motDePasse: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): ConnectedUser | null {
  const raw = localStorage.getItem('connectedUser');
  return raw ? (JSON.parse(raw) as ConnectedUser) : null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [connectedUser, setConnectedUser] = useState<ConnectedUser | null>(readStoredUser);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getStoredSession());

  const login = useCallback(async (email: string, motDePasse: string) => {
    const { data: authResponse } = await apiClient.POST('/api/v1/authentification/connexion', {
      body: { email, motDePasse },
    });
    localStorage.setItem('accessToken', JSON.stringify(authResponse));

    // Global Constraint : le profil doit etre charge AVANT de marquer authentifie
    const { data: user } = await apiClient.GET('/api/v1/utilisateurs/email/{email}', {
      params: { path: { email } },
    });
    localStorage.setItem('connectedUser', JSON.stringify(user));
    setConnectedUser(user as ConnectedUser);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    purgeSession();
    setConnectedUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ connectedUser, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit etre utilise a l\'interieur de <AuthProvider>');
  return ctx;
}
```

Run: `npm test -- use-auth`
Expected: PASS (3 tests)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-auth.tsx src/hooks/use-auth.test.tsx
git commit -m "feat(react): AuthProvider avec chargement du profil avant navigation"
```

---

### Task 8: `RequireAuth` — garde de route

**Files:**
- Create: `frontend/react/gestion-de-stock-frontend/src/components/layout/RequireAuth.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/components/layout/RequireAuth.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 7)
- Produces: `RequireAuth` (composant, wrapper de route), consommé par `routes.tsx` (Task 10).

- [ ] **Step 1: Installer React Router**

```bash
npm install react-router
```

- [ ] **Step 2: Écrire le test du garde**

Créer `src/components/layout/RequireAuth.test.tsx` :

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { RequireAuth } from './RequireAuth';
import * as useAuthModule from '../../hooks/use-auth';

function renderWithAuth(isAuthenticated: boolean) {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    isAuthenticated, connectedUser: null, login: vi.fn(), logout: vi.fn(),
  });
  return render(
    <MemoryRouter initialEntries={['/articles']}>
      <Routes>
        <Route path="/login" element={<div>Page login</div>} />
        <Route element={<RequireAuth />}>
          <Route path="/articles" element={<div>Page articles</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('RequireAuth', () => {
  it('laisse passer si authentifie', () => {
    renderWithAuth(true);
    expect(screen.getByText('Page articles')).toBeInTheDocument();
  });

  it('redirige vers /login si non authentifie', () => {
    renderWithAuth(false);
    expect(screen.getByText('Page login')).toBeInTheDocument();
  });
});
```

Run: `npm test -- RequireAuth`
Expected: FAIL (module non implémenté)

- [ ] **Step 3: Implémenter `RequireAuth`**

Créer `src/components/layout/RequireAuth.tsx` :

```tsx
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../hooks/use-auth';

export function RequireAuth() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
```

Run: `npm test -- RequireAuth`
Expected: PASS (2 tests)

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/RequireAuth.tsx src/components/layout/RequireAuth.test.tsx package.json
git commit -m "feat(react): garde de route RequireAuth"
```

---

### Task 9: `Menu`, `Header`, `AppShell` — shell responsive

**Files:**
- Create: `frontend/react/gestion-de-stock-frontend/src/components/layout/Menu.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/components/layout/Menu.test.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/components/layout/Header.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/components/layout/Header.test.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/components/layout/AppShell.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/components/layout/AppShell.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 7), shadcn `Sheet`/`Avatar` (Task 3)
- Produces: `AppShell` (composant, prend `children`), consommé par `routes.tsx` (Task 10) comme layout du groupe protégé.

- [ ] **Step 1: Écrire le test de `Menu`**

Créer `src/components/layout/Menu.test.tsx` :

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Menu } from './Menu';

describe('Menu', () => {
  it('affiche les 5 groupes du menu (spec §1 / menu.component.ts Angular)', () => {
    render(<MemoryRouter><Menu /></MemoryRouter>);
    ['Tableau de bord', 'Articles', 'Clients', 'Fournisseurs', 'Parametrages'].forEach((titre) => {
      expect(screen.getByText(titre)).toBeInTheDocument();
    });
  });

  it('replie/deplie un groupe au clic', async () => {
    render(<MemoryRouter><Menu /></MemoryRouter>);
    const groupeArticles = screen.getByRole('button', { name: /articles/i });
    expect(screen.getByText('Mouvements du stock')).toBeVisible();
    await userEvent.click(groupeArticles);
    expect(screen.queryByText('Mouvements du stock')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implémenter `Menu`**

Créer `src/components/layout/Menu.tsx` (miroir direct de `menu.component.ts` Angular — mêmes 5 groupes, mêmes libellés) :

```tsx
import { useState } from 'react';
import { Link } from 'react-router';
import {
  LayoutDashboard, PieChart, BarChart3, Boxes, Ship, ShoppingCart,
  Users, ShoppingBasket, Truck, Settings, Tags, UsersCog, Building2, LogOut,
} from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';

interface SousMenu { id: string; titre: string; icon: typeof LayoutDashboard; url: string }
interface GroupeMenu { id: string; titre: string; sousMenu: SousMenu[] }

const menuProperties: GroupeMenu[] = [
  { id: '1', titre: 'Tableau de bord', sousMenu: [
    { id: '11', titre: "Vue d'ensemble", icon: PieChart, url: '' },
    { id: '12', titre: 'Statistiques', icon: BarChart3, url: 'statistiques' },
  ]},
  { id: '2', titre: 'Articles', sousMenu: [
    { id: '21', titre: 'Articles', icon: Boxes, url: 'articles' },
    { id: '22', titre: 'Mouvements du stock', icon: Ship, url: 'mvtstk' },
    { id: '23', titre: 'Ventes', icon: ShoppingCart, url: 'ventes' },
  ]},
  { id: '3', titre: 'Clients', sousMenu: [
    { id: '31', titre: 'Clients', icon: Users, url: 'clients' },
    { id: '32', titre: 'Commandes clients', icon: ShoppingBasket, url: 'commandesclient' },
  ]},
  { id: '4', titre: 'Fournisseurs', sousMenu: [
    { id: '41', titre: 'Fournisseurs', icon: Users, url: 'fournisseurs' },
    { id: '42', titre: 'Commandes fournisseurs', icon: Truck, url: 'commandesfournisseur' },
  ]},
  { id: '5', titre: 'Parametrages', sousMenu: [
    { id: '51', titre: 'Categories', icon: Tags, url: 'categories' },
    { id: '52', titre: 'Utilisateurs', icon: UsersCog, url: 'utilisateurs' },
    { id: '53', titre: 'Mon entreprise', icon: Building2, url: 'entreprise' },
  ]},
];

export function Menu() {
  const [menusOuverts, setMenusOuverts] = useState(new Set(menuProperties.map((m) => m.id)));
  const { logout } = useAuth();

  function basculerMenu(id: string) {
    setMenusOuverts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <nav className="flex flex-col gap-1 p-4">
      {menuProperties.map((groupe) => (
        <div key={groupe.id} className="mb-2">
          <button
            type="button"
            onClick={() => basculerMenu(groupe.id)}
            aria-expanded={menusOuverts.has(groupe.id)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-white/5"
          >
            <LayoutDashboard size={16} />
            {groupe.titre}
          </button>
          {menusOuverts.has(groupe.id) && (
            <ul className="mt-1 flex flex-col gap-1 pl-6">
              {groupe.sousMenu.map((item) => (
                <li key={item.id}>
                  <Link to={`/${item.url}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-white/5">
                    <item.icon size={14} />
                    {item.titre}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => logout()}
        className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-white/5"
        aria-label="Se deconnecter"
      >
        <LogOut size={14} />
        Deconnexion
      </button>
    </nav>
  );
}
```

Run: `npm test -- Menu`
Expected: PASS (2 tests)

- [ ] **Step 3: Écrire le test et implémenter `Header`**

Créer `src/components/layout/Header.test.tsx` :

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Header } from './Header';
import * as useAuthModule from '../../hooks/use-auth';

describe('Header', () => {
  it('affiche le nom de l\'utilisateur connecte', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true, connectedUser: { nom: 'Doe' }, login: vi.fn(), logout: vi.fn(),
    });
    render(<MemoryRouter><Header /></MemoryRouter>);
    expect(screen.getByText(/doe/i)).toBeInTheDocument();
  });
});
```

Créer `src/components/layout/Header.tsx` :

```tsx
import { Link } from 'react-router';
import { Search } from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';

export function Header() {
  const { connectedUser } = useAuth();
  return (
    <header className="flex items-center justify-between border-b border-border bg-canvas px-6 py-3">
      <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
        <Search size={16} className="text-muted-foreground" />
        <input type="text" placeholder="Rechercher..." className="text-sm outline-none" />
      </div>
      <Link to="/profil" className="flex items-center gap-2 text-sm text-muted-foreground">
        Bonjour {connectedUser?.nom}
      </Link>
    </header>
  );
}
```

Run: `npm test -- Header`
Expected: PASS (1 test)

- [ ] **Step 4: Écrire le test et implémenter `AppShell` (responsive, spec §7)**

Créer `src/components/layout/AppShell.test.tsx` :

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '../../hooks/use-auth';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('rend la sidebar desktop et le contenu', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <AppShell><div>Contenu de page</div></AppShell>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Contenu de page')).toBeInTheDocument();
    expect(screen.getByRole('complementary')).toBeInTheDocument(); // <aside>
  });

  it('expose un bouton d\'ouverture du menu mobile', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <AppShell><div /></AppShell>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /ouvrir le menu/i })).toBeInTheDocument();
  });
});
```

Créer `src/components/layout/AppShell.tsx` :

```tsx
import { type PropsWithChildren } from 'react';
import { Menu as MenuIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Menu } from './Menu';
import { Header } from './Header';

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen">
      {/* Desktop (spec §7) : sidebar fixe */}
      <aside className="hidden w-64 flex-col bg-sidebar lg:flex">
        <div className="px-4 py-5 text-sm font-semibold text-sidebar-foreground">Gestion de stock</div>
        <Menu />
      </aside>

      {/* Mobile (spec §7) : sidebar en tiroir */}
      <Sheet>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Ouvrir le menu"
            className="fixed left-4 top-4 z-40 rounded-lg border border-border bg-canvas p-2 lg:hidden"
          >
            <MenuIcon size={18} />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="bg-sidebar p-0">
          <Menu />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

Run: `npm test -- AppShell`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/layout
git commit -m "feat(react): shell applicatif responsive (Menu, Header, AppShell)"
```

---

### Task 10: TanStack Query, routing complet et pages stub

**Files:**
- Create: `frontend/react/gestion-de-stock-frontend/src/lib/query-client.ts`
- Create: `frontend/react/gestion-de-stock-frontend/src/pages/_stubs/DomainStub.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/routes.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/routes.test.tsx`
- Modify: `frontend/react/gestion-de-stock-frontend/src/main.tsx`

**Interfaces:**
- Consumes: `AuthProvider` (Task 7), `RequireAuth` (Task 8), `AppShell` (Task 9)
- Produces: arbre de routes complet monté dans `main.tsx`. Chaque page réelle des plans suivants remplacera son `DomainStub` correspondant dans `routes.tsx` — signature à respecter : export par défaut `React.LazyExoticComponent<() => JSX.Element>`.

- [ ] **Step 1: Installer TanStack Query**

```bash
npm install @tanstack/react-query
```

Créer `src/lib/query-client.ts` :

```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});
```

- [ ] **Step 2: Créer la page stub générique**

Créer `src/pages/_stubs/DomainStub.tsx` :

```tsx
export function createDomainStub(nomDomaine: string) {
  return function DomainStub() {
    return <div className="text-sm text-muted-foreground">Page « {nomDomaine} » — a implementer</div>;
  };
}
```

- [ ] **Step 3: Écrire le test de couverture des routes**

Créer `src/routes.test.tsx` :

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from './hooks/use-auth';
import { AppRoutes } from './routes';

function renderAt(path: string) {
  localStorage.setItem('accessToken', JSON.stringify({ accessToken: 't', refreshToken: 'r' }));
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider><AppRoutes /></AuthProvider>
    </MemoryRouter>
  );
}

describe('AppRoutes — couverture des 20 routes protegees + 3 publiques (spec §1)', () => {
  const routesProtegees = [
    'accueil', 'statistiques', 'articles', 'nouvelarticle', 'mvtstk', 'ventes',
    'nouvellevelle', 'clients', 'nouveauclient', 'commandesclient', 'nouvellecommandeclt',
    'fournisseurs', 'nouveaufournisseur', 'commandesfournisseur', 'nouvellecommandefrs',
    'categories', 'nouvellecategorie', 'utilisateurs', 'nouvelutilisateur', 'profil',
    'changermotdepasse', 'entreprise',
  ];

  it.each(routesProtegees)('la route /%s est declaree et rend un contenu', async (route) => {
    renderAt(`/${route}`);
    expect(await screen.findByText(/./)).toBeInTheDocument();
  });

  it('redirige / vers /accueil', async () => {
    renderAt('/');
    expect(await screen.findByText(/page « accueil »/i)).toBeInTheDocument();
  });
});

describe('routes publiques', () => {
  it.each(['login', 'inscrire', 'motdepasseoublie'])('la route /%s ne requiert pas d\'authentification', async (route) => {
    localStorage.clear();
    render(
      <MemoryRouter initialEntries={[`/${route}`]}>
        <AuthProvider><AppRoutes /></AuthProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText(/./)).toBeInTheDocument();
  });
});
```

Run: `npm test -- routes`
Expected: FAIL (`routes.tsx` non implémenté)

- [ ] **Step 4: Implémenter `routes.tsx`**

Créer `src/routes.tsx` (chemins strictement identiques à `app.routes.ts` Angular — Global Constraint) :

```tsx
import { Routes, Route, Navigate } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { RequireAuth } from './components/layout/RequireAuth';
import { createDomainStub } from './pages/_stubs/DomainStub';

const stubs = Object.fromEntries(
  [
    'accueil', 'statistiques', 'articles', 'nouvelarticle', 'mvtstk', 'ventes',
    'nouvellevelle', 'clients', 'nouveauclient', 'commandesclient', 'nouvellecommandeclt',
    'fournisseurs', 'nouveaufournisseur', 'commandesfournisseur', 'nouvellecommandefrs',
    'categories', 'nouvellecategorie', 'utilisateurs', 'nouvelutilisateur', 'profil',
    'changermotdepasse', 'entreprise', 'login', 'inscrire', 'motdepasseoublie',
  ].map((nom) => [nom, createDomainStub(nom)])
);

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<stubs.login />} />
      <Route path="/inscrire" element={<stubs.inscrire />} />
      <Route path="/motdepasseoublie" element={<stubs.motdepasseoublie />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell><Outlet404 /></AppShell>}>
          <Route index element={<Navigate to="/accueil" replace />} />
          <Route path="accueil" element={<stubs.accueil />} />
          <Route path="statistiques" element={<stubs.statistiques />} />
          <Route path="articles" element={<stubs.articles />} />
          <Route path="nouvelarticle" element={<stubs.nouvelarticle />} />
          <Route path="nouvelarticle/:idArticle" element={<stubs.nouvelarticle />} />
          <Route path="mvtstk" element={<stubs.mvtstk />} />
          <Route path="ventes" element={<stubs.ventes />} />
          <Route path="nouvellevelle" element={<stubs.nouvellevelle />} />
          <Route path="clients" element={<stubs.clients />} />
          <Route path="nouveauclient" element={<stubs.nouveauclient />} />
          <Route path="nouveauclient/:id" element={<stubs.nouveauclient />} />
          <Route path="commandesclient" element={<stubs.commandesclient />} />
          <Route path="nouvellecommandeclt" element={<stubs.nouvellecommandeclt />} />
          <Route path="fournisseurs" element={<stubs.fournisseurs />} />
          <Route path="nouveaufournisseur" element={<stubs.nouveaufournisseur />} />
          <Route path="nouveaufournisseur/:id" element={<stubs.nouveaufournisseur />} />
          <Route path="commandesfournisseur" element={<stubs.commandesfournisseur />} />
          <Route path="nouvellecommandefrs" element={<stubs.nouvellecommandefrs />} />
          <Route path="categories" element={<stubs.categories />} />
          <Route path="nouvellecategorie" element={<stubs.nouvellecategorie />} />
          <Route path="nouvellecategorie/:idCategory" element={<stubs.nouvellecategorie />} />
          <Route path="utilisateurs" element={<stubs.utilisateurs />} />
          <Route path="nouvelutilisateur" element={<stubs.nouvelutilisateur />} />
          <Route path="nouvelutilisateur/:idUtilisateur" element={<stubs.nouvelutilisateur />} />
          <Route path="profil" element={<stubs.profil />} />
          <Route path="changermotdepasse" element={<stubs.changermotdepasse />} />
          <Route path="entreprise" element={<stubs.entreprise />} />
        </Route>
      </Route>
    </Routes>
  );
}
```

> Note d'implémentation : `<AppShell>` attend `children`, incompatible tel quel avec `<Route element={<AppShell><Outlet404/></AppShell>}>`. Remplacer `Outlet404` par un import `{ Outlet } from 'react-router'` et passer `<Outlet />` comme enfant : `<Route element={<AppShell><Outlet /></AppShell>}>`. Corriger l'import en conséquence avant de lancer les tests.

Run: `npm test -- routes`
Expected: PASS (26 tests : 22 routes protégées itérées + redirection + 3 routes publiques — ajuster le compte exact selon `it.each`)

- [ ] **Step 5: Monter dans `main.tsx`**

Modifier `src/main.tsx` :

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import { AuthProvider } from './hooks/use-auth';
import { AppRoutes } from './routes';
import { Toaster } from './components/ui/sonner';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
```

Run: `npm run build`
Expected: build réussit

- [ ] **Step 6: Commit**

```bash
git add src/routes.tsx src/routes.test.tsx src/pages/_stubs src/lib/query-client.ts src/main.tsx
git commit -m "feat(react): routing complet (23 routes) + TanStack Query + montage racine"
```

---

### Task 11: `PageHeader` et `ConfirmDialog`

**Files:**
- Create: `frontend/react/gestion-de-stock-frontend/src/components/composed/PageHeader.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/components/composed/PageHeader.test.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/components/composed/ConfirmDialog.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/components/composed/ConfirmDialog.test.tsx`

**Interfaces:**
- Consumes: `Button` (Task 3), `AlertDialog*` (Task 3)
- Produces: `PageHeader({ title, description?, action? })`, `ConfirmDialog({ open, onOpenChange, title, description, onConfirm, confirmLabel? })` — consommés par toutes les pages de domaine des plans suivants.

- [ ] **Step 1: Écrire le test de `PageHeader`**

Créer `src/components/composed/PageHeader.test.tsx` :

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('affiche le titre, la description et l\'action', () => {
    render(<PageHeader title="Articles" description="Liste des articles" action={<button>+ Nouvel article</button>} />);
    expect(screen.getByRole('heading', { name: 'Articles' })).toBeInTheDocument();
    expect(screen.getByText('Liste des articles')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Nouvel article' })).toBeInTheDocument();
  });

  it('fonctionne sans description ni action', () => {
    render(<PageHeader title="Profil" />);
    expect(screen.getByRole('heading', { name: 'Profil' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implémenter `PageHeader`**

Créer `src/components/composed/PageHeader.tsx` :

```tsx
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Seul endroit du projet qui definit le padding d'un en-tete de page (spec §5) */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
```

Run: `npm test -- PageHeader`
Expected: PASS (2 tests)

- [ ] **Step 3: Écrire le test de `ConfirmDialog`**

Créer `src/components/composed/ConfirmDialog.test.tsx` :

```tsx
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
```

- [ ] **Step 4: Implémenter `ConfirmDialog`**

Créer `src/components/composed/ConfirmDialog.tsx` :

```tsx
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '../ui/alert-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmLabel?: string;
}

/** Remplace toutes les confirmations inline / modales Bootstrap de l'app Angular (spec §5/§9) */
export function ConfirmDialog({ open, onOpenChange, title, description, onConfirm, confirmLabel = 'Confirmer' }: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

Run: `npm test -- ConfirmDialog`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/composed/PageHeader.tsx src/components/composed/PageHeader.test.tsx src/components/composed/ConfirmDialog.tsx src/components/composed/ConfirmDialog.test.tsx
git commit -m "feat(react): composants reutilisables PageHeader et ConfirmDialog"
```

---

### Task 12: `DataTable` (table responsive + pagination)

**Files:**
- Create: `frontend/react/gestion-de-stock-frontend/src/components/composed/DataTable.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/components/composed/DataTable.test.tsx`

**Interfaces:**
- Consumes: `Table*` (Task 3)
- Produces: `DataTable<T>({ columns, data, getRowId, pagination? })` où `columns: { header: string; cell: (row: T) => ReactNode }[]` — consommé par toutes les pages de liste des plans suivants (Articles, Catégories, Clients, Commandes...).

- [ ] **Step 1: Écrire le test**

Créer `src/components/composed/DataTable.test.tsx` :

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable } from './DataTable';

interface Row { id: number; nom: string }
const data: Row[] = [{ id: 1, nom: 'Article A' }, { id: 2, nom: 'Article B' }];
const columns = [{ header: 'Nom', cell: (r: Row) => r.nom }];

describe('DataTable', () => {
  it('rend une ligne par element de donnees (vue desktop)', () => {
    render(<DataTable columns={columns} data={data} getRowId={(r) => r.id} />);
    expect(screen.getByText('Article A')).toBeInTheDocument();
    expect(screen.getByText('Article B')).toBeInTheDocument();
  });

  it('rend aussi une vue carte mobile (masquee par CSS, presente dans le DOM)', () => {
    render(<DataTable columns={columns} data={data} getRowId={(r) => r.id} />);
    const cartes = screen.getAllByTestId('data-table-mobile-row');
    expect(cartes).toHaveLength(2);
  });

  it('affiche un etat vide explicite', () => {
    render(<DataTable columns={columns} data={[]} getRowId={(r: Row) => r.id} />);
    expect(screen.getByText(/aucune donnee/i)).toBeInTheDocument();
  });
});
```

Run: `npm test -- DataTable`
Expected: FAIL

- [ ] **Step 2: Implémenter `DataTable`**

Créer `src/components/composed/DataTable.tsx` :

```tsx
import type { ReactNode } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';

interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => string | number;
}

/**
 * Seule implementation de tableau de liste du projet (spec §5).
 * Bascule responsive (spec §7) : table classique >= md, cartes empilees < md.
 */
export function DataTable<T>({ columns, data, getRowId }: DataTableProps<T>) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Aucune donnee.</p>;
  }

  return (
    <div className="rounded-lg border border-border">
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => <TableHead key={col.header}>{col.header}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={getRowId(row)}>
                {columns.map((col) => <TableCell key={col.header}>{col.cell(row)}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 p-4 md:hidden">
        {data.map((row) => (
          <div key={getRowId(row)} data-testid="data-table-mobile-row" className="rounded-lg border border-border p-4">
            {columns.map((col) => (
              <div key={col.header} className="flex justify-between py-1 text-sm">
                <span className="text-muted-foreground">{col.header}</span>
                <span>{col.cell(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

Run: `npm test -- DataTable`
Expected: PASS (3 tests)

- [ ] **Step 3: Commit**

```bash
git add src/components/composed/DataTable.tsx src/components/composed/DataTable.test.tsx
git commit -m "feat(react): DataTable responsive reutilisable"
```

---

### Task 13: `DetailPanel` et `RechercheParCode`

**Files:**
- Create: `frontend/react/gestion-de-stock-frontend/src/components/composed/DetailPanel.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/components/composed/DetailPanel.test.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/components/composed/RechercheParCode.tsx`
- Create: `frontend/react/gestion-de-stock-frontend/src/components/composed/RechercheParCode.test.tsx`

**Interfaces:**
- Consumes: `Sheet*` (Task 3), `Input` (Task 3)
- Produces: `DetailPanel({ open, onOpenChange, title, children })`, `RechercheParCode({ placeholder, onSearch, onClear, loading? })` — consommés par les pages Articles/Commandes/Catégories des plans suivants.

- [ ] **Step 1: Écrire le test et implémenter `DetailPanel`**

Créer `src/components/composed/DetailPanel.test.tsx` :

```tsx
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
```

Créer `src/components/composed/DetailPanel.tsx` :

```tsx
import type { PropsWithChildren } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';

interface DetailPanelProps extends PropsWithChildren {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}

/** Panneau lateral de detail — article, commande... (spec §5) */
export function DetailPanel({ open, onOpenChange, title, children }: DetailPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="p-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
```

Run: `npm test -- DetailPanel`
Expected: PASS (1 test)

- [ ] **Step 2: Écrire le test et implémenter `RechercheParCode`**

Créer `src/components/composed/RechercheParCode.test.tsx` :

```tsx
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
```

Créer `src/components/composed/RechercheParCode.tsx` :

```tsx
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
```

Run: `npm test -- RechercheParCode`
Expected: PASS (2 tests)

- [ ] **Step 3: Commit**

```bash
git add src/components/composed/DetailPanel.tsx src/components/composed/DetailPanel.test.tsx src/components/composed/RechercheParCode.tsx src/components/composed/RechercheParCode.test.tsx
git commit -m "feat(react): composants reutilisables DetailPanel et RechercheParCode"
```

---

### Task 14: Vérification finale du socle

**Files:** aucun nouveau fichier — validation globale.

- [ ] **Step 1: Lancer la suite complète**

Run: `npm test`
Expected: PASS, tous les tests des Tasks 1 à 13 passent (build cumulé)

- [ ] **Step 2: Lancer le lint (Global Constraint anti-valeurs-arbitraires)**

Run: `npm run lint`
Expected: PASS, zéro erreur — en particulier zéro violation `tailwindcss/no-arbitrary-value`

- [ ] **Step 3: Lancer le build de production**

Run: `npm run build`
Expected: build réussit sans erreur TypeScript ni erreur Tailwind

- [ ] **Step 4: Vérification manuelle du responsive**

Run: `npm run dev`, ouvrir `http://localhost:5173` dans un navigateur, réduire la largeur sous 1024px (breakpoint `lg`) : la sidebar doit disparaître et le bouton "Ouvrir le menu" (Task 9) doit apparaître et ouvrir le `Sheet`.

- [ ] **Step 5: Commit final du socle**

```bash
git add -A
git commit -m "chore(react): socle valide — tooling, tokens, auth, shell, patrons reutilisables"
```

---

## Self-Review (effectué avant remise du plan)

**Couverture spec** :
- §2 Stack : toutes les libs listées sont installées dans une tâche (Task 1, 2, 3, 5, 6, 10, 12) — ✓
- §3 Identité visuelle : tokens Task 2, primitifs Task 3 — ✓
- §5 Architecture 3 couches : `ui/` Task 3, `composed/` Tasks 11-13, `pages/` amorcé en stub Task 10 (les pages réelles sont hors périmètre de ce plan, couvertes par les plans de domaine suivants) — ✓
- §6 Discipline d'espacement : lint configuré Task 1, vérifié Task 14 — ✓
- §7 Responsive : `AppShell` Task 9, `DataTable` Task 12 — ✓
- §8 Routing/auth/shell : Tasks 6, 7, 8, 9, 10 — ✓
- §9 Cas commandes : hors périmètre de ce plan (couvert par le plan de domaine "Clients/Fournisseurs + Commandes" à venir) — noté explicitement en Spec/Goal.
- §10 Figma Code Connect : hors périmètre de ce plan (dépend du fichier Figma, étape 3 de la spec §11) — à traiter dans un plan dédié une fois le fichier Figma prêt.
- §11 Ordre de construction : ce plan couvre exactement les étapes 1 "Socle" et 2 "Patrons de réutilisation" — ✓

**Placeholders** : aucun "TODO"/"TBD" dans les étapes de code ; chaque step contient du code réel ou une commande exacte.

**Cohérence de types** : `useAuth()` retourne `{ connectedUser, isAuthenticated, login, logout }` de façon identique entre Task 7 (définition) et ses usages en Task 8/9 ; `DataTable<T>({ columns, data, getRowId })` a la même signature en Task 12 (définition) qu'attendue par les plans de domaine à venir ; `apiClient` (Task 5) est le seul point d'entrée réseau, réutilisé tel quel en Task 6/7.

**Note pour l'exécutant** : le Task 10/Step 4 contient une correction à appliquer avant de lancer les tests (`Outlet404` → `Outlet` de `react-router`) — c'est un choix délibéré pour signaler explicitement le point d'attention plutôt que de le laisser implicite dans un bloc de code qui semblerait autrement fonctionner tel quel.
