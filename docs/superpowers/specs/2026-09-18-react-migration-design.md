# Migration Angular → React (shadcn/ui) — "Console Pro"

- **Statut** : approuvé pour passage au plan d'implémentation
- **Date** : 2026-09-18 (amendé le 2026-09-18 — architecture de réutilisation, responsive, Figma Code Connect)
- **Source** : `frontend/angular/gestion-de-stock-frontend-v21/`
- **Cible** : `frontend/react/gestion-de-stock-frontend/` (nouveau projet, dossier `frontend/react/` actuellement vide)
- **Portée** : réécriture complète en React avec une nouvelle identité visuelle (shadcn/ui), iso-fonctionnelle avec l'app Angular actuelle, livrée en une seule passe (pas de lots partiels livrés à l'utilisateur). Des maquettes Figma précèdent le code, liées au code par Figma Code Connect (§10).

## 1. Contexte et périmètre fonctionnel

L'application Angular actuelle (Angular 21, zoneless, signals, `loadComponent`) est un back-office de gestion de stock : 20 routes protégées sous un shell (sidebar + topbar) + 3 routes publiques (login, inscription, mot de passe oublié). Elle consomme 64 des 67 endpoints d'un backend Spring Boot exposé sur `http://localhost:8081`, documenté par OpenAPI (`springdoc-openapi`, chemin `/v3/api-docs`).

Domaines fonctionnels à porter (source de vérité : `ENDPOINTS_COVERAGE.md` de l'app Angular) :

| Domaine | Routes Angular | Endpoints | Particularités à porter |
|---|---|---|---|
| Authentification | `/login`, `/inscrire`, `/motdepasseoublie` | connexion, inscription entreprise, mot de passe oublié/réinitialisation | JWT access+refresh en localStorage, refresh automatique sur 401 avec une seule requête de refresh partagée, redirection post-login **après** chargement du profil (pas de race condition) |
| Tableau de bord | `/accueil`, `/statistiques` | historiques ventes/commandes par article | KPI cards + 2 graphiques SVG (aires empilées entrées/sorties 7 jours) ; sélecteur d'article sur `/statistiques` (3 appels groupés à la sélection, pas au chargement) |
| Articles | `/articles`, `/nouvelarticle`, `/nouvelarticle/:idArticle` | CRUD + recherche par code + historiques | Formulaire création/édition, panneau détail avec historiques ventes/commandes |
| Catégories | `/categories`, `/nouvellecategorie(/:idCategory)` | CRUD + recherche par code + liste articles d'une catégorie | |
| Mouvements de stock | `/mvtstk` | stock réel + historique par article + entrée/sortie/correction +/- | Accordéon lazy par article (pas de N+1 au chargement) |
| Ventes | `/ventes`, `/nouvellevelle` | CRUD (pas d'update), recherche par code | |
| Clients | `/clients`, `/nouveauclient(/:id)` | CRUD | Composant partagé avec Fournisseurs (`origin: 'client'|'fournisseur'`) |
| Commandes clients | `/commandesclient`, `/nouvellecommandeclt` | CRUD + lignes (lazy) + workflow d'état + édition quantité inline + réaffectation client + remplacement article de ligne | **Le plus complexe** : voir §9 |
| Fournisseurs | `/fournisseurs`, `/nouveaufournisseur(/:id)` | CRUD | Même composant que Clients |
| Commandes fournisseurs | `/commandesfournisseur`, `/nouvellecommandefrs` | Symétrique commandes clients | Même logique de workflow |
| Utilisateurs | `/utilisateurs`, `/nouvelutilisateur(/:idUtilisateur)` | CRUD (admin), changement mot de passe | |
| Profil | `/profil`, `/changermotdepasse` | lecture profil connecté, changement mot de passe | |
| Entreprise | `/entreprise` | fiche entreprise de l'utilisateur connecté | |

Hors périmètre (déjà hors périmètre côté Angular, volontairement) : upload de photo réel (Flickr désactivé côté backend, aperçu local uniquement), administration multi-entreprises, suppression d'entreprise.

## 2. Stack technique

Toutes les dépendances en version stable la plus récente au moment de l'implémentation (vérifier `npm view <pkg> version` avant install plutôt que figer des numéros dans ce document) :

- **Vite** (build/dev server) + **React 19** + **TypeScript 5.9** strict
- **React Router v7**, mode déclaratif — arborescence de routes en miroir des chemins Angular actuels, lazy loading par page (`React.lazy` + `Suspense`), équivalent du `loadComponent`
- **TanStack Query v5** — cache serveur, remplace les services Angular + le `LoaderService` maison (`isFetching()` global de Query Client suffit comme indicateur de chargement)
- **Tailwind CSS v4** + **shadcn/ui** (composants copiés dans le repo via son CLI, pas une dépendance npm opaque)
- **React Hook Form 7 + Zod 4** — tous les formulaires, schémas de validation dérivés des types OpenAPI
- **openapi-typescript + openapi-fetch** — client API typé généré depuis `/v3/api-docs`
- **Sonner** — toasts (remplace `NotificationService`/`ToastsComponent`)
- **lucide-react** — icônes (remplace les classes FontAwesome `fas fa-*` du menu et les SVG inline)
- **Vitest + React Testing Library** — tests (continuité avec l'app Angular, qui utilise déjà Vitest)
- **eslint-plugin-tailwindcss** — bloque en CI les valeurs d'espacement/couleur arbitraires (§6)
- **date-fns** (ou équivalent léger) si un formatage de date au-delà de `Intl` est nécessaire — le contrat de dates backend est ISO-8601 (voir `MODIFICATIONS_BACKEND.md` §3 côté Angular)

## 3. Identité visuelle — "Console Pro"

Validée via maquette comparative (3 directions présentées, celle-ci retenue) :

- **Primary** : indigo `#6366f1` (+ variantes hover/active dérivées)
- **Sidebar** : encre quasi-noire `#111827`
- **Canvas** : blanc pur `#ffffff`, texte gris neutre (échelle `slate`/`gray`)
- **Sémantiques** : succès émeraude, avertissement ambre (alertes stock bas), danger rouge — utilisés pour les badges d'état de commande (`EN_PREPARATION` / `VALIDEE` / `LIVREE`) et les indicateurs de stock bas
- **Typo** : Inter (déjà chargée dans l'`index.html` actuel), tailles resserrées type shadcn (`text-sm` par défaut dans les tableaux)
- **Radius** : `rounded-lg` cohérent, esthétique épurée type console SaaS (proche Linear/Vercel)
- **Surfaces plates, jamais de dégradé** : contrairement à l'ancien `DESIGN.md` (mesh de gradient façon Stripe), toutes les surfaces (canvas, cartes, sidebar, boutons) sont des **fonds unis**. Aucune classe `bg-gradient-*` ni `linear-gradient()` inline dans le projet. L'élévation visuelle (cartes, modales, dropdowns) se communique uniquement par **ombre + bordure** (`shadow-sm border`), jamais par un dégradé de fond.

Composants shadcn à installer : `button`, `input`, `select`, `textarea`, `checkbox`, `switch`, `label`, `form`, `table`, `card`, `badge`, `dialog`, `alert-dialog`, `dropdown-menu`, `sheet` (menu mobile), `tabs`, `avatar`, `separator`, `skeleton`, `sonner`, `tooltip`, `command` (autocomplete articles), `pagination` (composant custom au-dessus des primitives shadcn, l'existant Angular n'a pas de logique de pagination serveur à reproduire au-delà de l'affichage).

Les tokens de couleur/typo/espacement sont déclarés comme variables Tailwind v4 (`@theme`) dans `src/styles/globals.css`, avec support `prefers-color-scheme`/`data-theme` si un mode sombre est ajouté plus tard (non demandé pour cette itération — prévoir la structure, pas l'implémentation). Ces mêmes variables sont répliquées comme **variables Figma** (§10) : une seule source de vérité pour les tokens, côté design et côté code.

## 4. Arborescence du projet

```
frontend/react/gestion-de-stock-frontend/
  src/
    api/
      schema.d.ts        # généré par openapi-typescript (ne pas éditer à la main)
      client.ts           # instance openapi-fetch + middleware auth/refresh/erreurs
      hooks/               # un fichier par ressource : useArticles.ts, useCategories.ts, ...
    components/
      ui/                  # NIVEAU 1 — primitifs shadcn (générés par son CLI, jamais de logique métier)
      composed/            # NIVEAU 2 — patrons réutilisables inter-domaines (voir §5)
      layout/              # AppShell, Sidebar (Menu), Header, PublicLayout
    pages/                 # NIVEAU 3 — un dossier par domaine, composition uniquement (voir §5)
      auth/                # login, inscription, mot-de-passe-oublie
      accueil/, statistiques/
      articles/            # liste + formulaire (create/edit unifiés)
      categories/
      mouvements-stock/
      ventes/
      clients/, fournisseurs/
      commandes/           # composant paramétré origin=client|fournisseur, miroir du composant partagé Angular
      utilisateurs/
      profil/
      entreprise/
    hooks/                 # useAuth, useDebounce, useConfirm, etc.
    lib/                   # cn(), formatters (montants, dates), query-client.ts
    styles/
      globals.css
    routes.tsx             # déclaration centralisée des routes (miroir de app.routes.ts)
    main.tsx
  index.html
  package.json
  tailwind.config / vite.config.ts
```

## 5. Architecture des composants — réutilisation en 3 couches

C'est la garantie structurelle (pas seulement conventionnelle) contre la divergence de style entre domaines : chaque couche ne peut consommer que la couche du dessous, jamais l'inverse, et jamais de logique dupliquée entre pages.

- **Niveau 1 — `components/ui/`** : primitifs shadcn purs (`Button`, `Input`, `Card`, `Badge`, `Table`...). Zéro logique métier, 100% pilotés par props et par les tokens du §6. Ne sont **jamais modifiés à la main pour un cas d'usage spécifique** — un besoin non couvert crée une variante de composant, pas une exception ponctuelle.
- **Niveau 2 — `components/composed/`** : assemblages génériques utilisés par **tous** les domaines, parce que Articles, Clients, Commandes, Utilisateurs partagent tous : une liste paginée, un en-tête de page, un panneau de détail, une confirmation de suppression, une recherche par code. Exemples à créer dès le Socle (§11) :
  - `PageHeader` (titre + description + action) — un seul endroit qui définit ce padding, utilisé par les 13 pages listées
  - `DataTable` (table + pagination + bascule responsive, voir §7) — une seule implémentation de pagination dans tout le projet
  - `ConfirmDialog` (remplace les confirmations inline Angular) — un seul comportement de confirmation partout
  - `DetailPanel` (panneau latéral de détail — article, commande...)
  - `RechercheParCode` (équivalent du `recherche-cmd` Angular, réutilisé sur commandes clients/fournisseurs/catégories)
- **Niveau 3 — `pages/<domaine>/`** : composition uniquement — assemble les patrons du niveau 2 avec les données (hooks `api/hooks/`). **N'a pas le droit de définir d'espacement en dur** (`className="p-[...]"`) : si un padding semble nécessaire à ce niveau, c'est le signe qu'un composant `composed/` manque.

Règle de revue de code : toute page qui répète une structure déjà présente dans 2 autres pages doit remonter cette structure en `composed/` avant merge — pas après.

## 6. Discipline d'espacement — anti-drift

Une échelle d'espacement unique, pas de valeurs magiques :

```css
/* src/styles/globals.css */
@theme {
  --spacing: 0.25rem; /* 4px — base de toute l'échelle : gap-1=4px, gap-4=16px, gap-6=24px... */
}
```

Règle bloquante en CI (`eslint-plugin-tailwindcss`, règle `no-arbitrary-value` activée en `error`) : **interdiction de `p-[13px]`, `mt-[7px]`, `style={{ padding: ... }}`, ou toute couleur hors palette du `@theme`**. Seules les classes de l'échelle Tailwind (`p-2`, `p-4`, `p-6`, `gap-2`...) et les tokens sémantiques (`bg-primary`, `text-muted-foreground`) sont autorisés. La CI casse la build sur violation — la garantie contre les erreurs de padding/margin est technique, pas une simple recommandation d'équipe.

## 7. Stratégie responsive

Le responsive est traité une fois, dans les composants `layout/` et `composed/`, jamais réimplémenté par page :

- **`AppShell`** (layout) : sidebar fixe en desktop (`lg:flex lg:w-64`), bascule en tiroir (`Sheet` shadcn) sous `lg` — remplace le `<aside class="shell-sidebar">` fixe actuel qui ne gère pas le mobile.
- **`DataTable`** (composed) : vue tableau classique au-dessus de `md`, bascule en liste de cartes empilées en dessous (`hidden md:block` / `md:hidden`) — évite les tableaux de commandes illisibles sur mobile (cas concret : la page commandes clients avec accordéon + boutons d'action doit rester utilisable sur un écran de 375px).
- **Formulaires** (`composed/FormLayout` si besoin) : une seule colonne sous `md`, deux colonnes au-dessus — cohérent sur les ~10 formulaires du projet (article, client, commande, utilisateur...).

Parce que cette logique vit au niveau 2 (`composed/`), les pages de domaine sont responsive **par construction**, sans y repenser à chaque nouveau domaine ajouté au fil du temps.

## 8. Routing, shell et auth

- **Chemins identiques** à l'Angular actuel (`/articles`, `/commandesclient`, `/nouvellecommandeclt`, etc.) — zéro rupture d'habitude, permet une comparaison directe pendant la migration.
- **`DashboardLayout`** (construit sur `AppShell`, §7) : sidebar (`Menu` — 5 groupes repliables, mêmes libellés/regroupements que `menu.component.ts`) + topbar (`Header` — recherche + utilisateur connecté + lien profil) + `<Outlet/>` + toasts globaux (Sonner) — équivalent de `page-dashboard.component`.
- **`PublicLayout`** : nu, pour login/inscription/mot de passe oublié.
- **Garde d'authentification** : composant `RequireAuth` (wrapper autour de `<Outlet/>` du groupe protégé) qui vérifie la présence d'un `accessToken` valide en `localStorage` et redirige vers `/login` sinon — équivalent du `authGuard` fonctionnel actuel.
- **Auth state** : `AuthProvider` (Context React) exposant `login`, `logout`, `connectedUser`, `isAuthenticated`, lisant/écrivant `localStorage` (`accessToken`, `connectedUser`). Le chargement du profil (`GET /utilisateurs/email/{email}`) se fait **avant** la navigation post-login (corrige la race condition déjà documentée côté Angular — ne pas la réintroduire).
- **Client API + intercepteur** (`src/api/client.ts`, middleware `openapi-fetch`) :
  - Injecte `Authorization: Bearer <accessToken>` sur toute requête hors `/authentification/*`.
  - Sur 401 (hors appels d'auth) : déclenche un refresh via `POST /authentification/refresh`, **une seule requête de refresh partagée** entre appels concurrents (promise mise en cache le temps du refresh, invalidée après), puis rejoue la requête d'origine. Si le refresh échoue, purge la session et redirige vers `/login` avec un toast "Session expirée".
  - Erreurs backend (400/500) → toast d'erreur via Sonner avec le message renvoyé par l'API (`err.error.message`) ou un message générique.

## 9. Cas complexe — Commandes clients/fournisseurs

Le composant `page-cmd-clt-frs` (495 lignes côté Angular) est le plus riche fonctionnellement et sert de référence pour le composant React équivalent (`pages/commandes/`, paramétré par `origin: 'client' | 'fournisseur'`) :

- Liste des commandes avec **accordéon** : les lignes de commande sont chargées **à l'ouverture** (lazy, avec cache côté TanStack Query — pas de N+1 au chargement de la liste).
- **Recherche par code** : composant réutilisable (`composed/RechercheParCode`, §5), résultat affiché seul (n'écrase pas la liste complète en cache).
- **Workflow d'état** : `EN_PREPARATION → VALIDEE → LIVREE`, un seul bouton proposant l'état suivant (dérivé côté client, pas de logique état→état codée en dur autre que la séquence), confirmation inline avant l'appel `PATCH` (via `composed/ConfirmDialog`). Une commande `LIVREE` n'affiche plus de bouton d'action (règle backend `COMMANDE_*_NON_MODIFIABLE`), juste un badge "Livrée". La livraison d'une commande client génère une sortie de stock côté backend — pas de logique stock à dupliquer côté front, juste recharger la liste après transition.
- **Édition de quantité inline** : clic sur la quantité d'une ligne → input inline → `PATCH .../quantite/{quantite}`.
- **Réaffectation** : bouton "Réaffecter" sur une commande non livrée → dialog de sélection client/fournisseur → `PATCH .../client|fournisseur/{id}`.
- **Remplacement d'article de ligne** : bouton "Remplacer" sur une ligne modifiable → dialog de sélection article → `PATCH .../lignes/{idLigne}/article/{idArticle}`.
- **Suppression** : ligne (`DELETE .../lignes/{idLigne}`) et commande entière (`DELETE .../{idCommande}`), toutes deux avec confirmation inline (`composed/ConfirmDialog` — pas de modale Bootstrap).

## 10. Plan Figma et pont Figma → React (Code Connect)

- **Un fichier Figma** : "Gestion de Stock — Console Pro".
- **Page "Fondations"** : styles de couleur (variables Figma **liées 1:1** aux tokens CSS du §3/§6 — même palette, même échelle d'espacement, pas de duplication manuelle), typographie, spacing/radius/shadow, composants de base en variantes (Button — primary/secondary/ghost/destructive × states, Input, Badge — succès/warning/danger/neutre, Card, Table row states, Dialog).
- **Pages suivantes**, groupées par domaine, un frame par écran — 23 écrans au total :
  - **Auth** (3) : Login, Inscription, Mot de passe oublié
  - **Tableau de bord** (2) : Accueil (KPI + graphiques), Statistiques
  - **Articles** (2) : Liste, Formulaire (création/édition unifié)
  - **Catégories** (2) : Liste, Formulaire
  - **Stock & Ventes** (2) : Mouvements de stock, Ventes (liste + formulaire nouvelle vente sur le même frame ou en variante)
  - **Clients / Fournisseurs** (2) : Liste (variante client/fournisseur), Formulaire
  - **Commandes** (2) : Liste avec accordéon + workflow (variante client/fournisseur), Formulaire nouvelle commande
  - **Paramétrages** (3) : Utilisateurs (liste + formulaire), Profil + changement mot de passe, Entreprise
- **Réutilisation de composants Figma** pour les patrons récurrents (liste + filtre + pagination, formulaire, fiche détail en panneau latéral) afin de rester dans le budget de 200 appels/jour du plan Figma actuel (siège Dev, plan Education) — ces composants Figma correspondent 1:1 aux composants `composed/` du §5.
- **Figma Code Connect** : dès que les primitifs `components/ui/` et les patrons `components/composed/` existent en code (fin du Socle, §11), chaque composant Figma correspondant est mappé à son composant React réel (fichiers `*.figma.tsx`, props traduites). À partir de ce moment, l'implémentation de chaque écran de domaine se fait par **lecture directe du mapping** (quel composant React, quelles props, quels tokens d'espacement/couleur) plutôt que par interprétation visuelle de la maquette — c'est le mécanisme concret qui élimine les erreurs de padding/margin entre le Figma et le code.
- Le fichier Figma (fondations + 23 écrans) est le livrable à valider par l'utilisateur **avant** le début du code des pages de domaine. Le socle technique (tooling, client API, auth, shell, primitifs `ui/`) peut démarrer en parallèle, il ne dépend pas des maquettes — c'est justement ce socle qui permet de poser le Code Connect dès que les fondations Figma sont prêtes.

## 11. Ordre de construction (plan d'implémentation)

Le livrable est iso-fonctionnel en une seule passe (pas de lots livrés séparément), mais la construction suit un ordre logique pour limiter les reprises :

1. **Socle** : scaffolding Vite/React/TS, Tailwind v4 + shadcn init, génération du client API (`openapi-typescript`), `AuthProvider` + `RequireAuth` + intercepteur refresh, `AppShell`/`DashboardLayout`/`PublicLayout`, routing complet (pages en stub), design tokens "Console Pro" (§3/§6), lint anti-valeurs-arbitraires (§6).
2. **Patrons de réutilisation** (`components/composed/`, §5) : `PageHeader`, `DataTable` (avec bascule responsive, §7), `ConfirmDialog`, `DetailPanel`, `RechercheParCode` — construits une fois, avant le premier domaine.
3. **Figma Code Connect** (§10) : mapping des primitifs `ui/` et patrons `composed/` aux composants Figma des Fondations, dès que le fichier Figma existe.
4. **Articles + Catégories** : patron CRUD de référence (liste, formulaire, détail, recherche par code), construit avec les patrons de l'étape 2 — sert de modèle aux domaines suivants.
5. **Mouvements de stock + Ventes**.
6. **Clients/Fournisseurs + Commandes** : le plus complexe (workflow d'état, édition inline, réaffectation, remplacement d'article — §9).
7. **Utilisateurs + Profil + Entreprise + Statistiques**.
8. **Polish transverse** : empty states, accessibilité (focus, aria), toasts d'erreur cohérents partout, vérification responsive systématique (mobile/tablette/desktop) sur les 13 pages de domaine.

## 12. Tests

Vitest + React Testing Library, en continuité avec l'app Angular actuelle. Niveau attendu : tests unitaires sur la logique non triviale (dérivation d'état de commande, refresh token partagé, formatters), tests de composant sur les formulaires (validation Zod) et sur le workflow de commande. Les composants `composed/` (§5) ont une priorité de test plus haute que les pages de domaine, car une régression s'y propage à tous les domaines qui les consomment. Pas d'exigence de couverture chiffrée dans ce document — à préciser si besoin au moment du plan d'implémentation.

## 13. Hors périmètre de cette spec

- Le contenu détaillé de chaque écran Figma (maquettes pixel-close) — produit au moment de l'exécution du plan, en suivant les fondations et la structure de cette spec.
- Le détail des schémas Zod par DTO — dérivés des types générés, à écrire au moment de l'implémentation de chaque domaine.
- Mode sombre — structure prévue (§3) mais non implémenté dans cette itération.
- Storybook / catalogue de composants — non demandé pour cette itération ; à envisager plus tard si le nombre de composants `composed/` croît significativement.
