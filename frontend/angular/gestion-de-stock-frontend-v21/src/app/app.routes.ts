import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Guard fonctionnel (best practice Angular >= 15) : remplace
 * l'ancien ApplicationGuardService (classe CanActivate).
 */
export const authGuard = (): boolean | ReturnType<Router['parseUrl']> => {
  const router = inject(Router);
  if (localStorage.getItem('accessToken')) {
    return true;
  }
  return router.parseUrl('/login');
};

/**
 * Guard de la landing page : un visiteur deja connecte est renvoye
 * directement au tableau de bord au lieu de revoir la page publique.
 */
export const redirectSiConnecte = (): boolean | ReturnType<Router['parseUrl']> => {
  const router = inject(Router);
  if (localStorage.getItem('accessToken')) {
    return router.parseUrl('/accueil');
  }
  return true;
};

/**
 * Lazy loading systematique via loadComponent (recommandation officielle
 * du MCP Angular / guide best practices) : chaque page est un chunk separe,
 * charge a la premiere navigation. Le guard est reevalue a chaque niveau.
 */
export const routes: Routes = [
  // Racine publique : landing page (les connectes sont rediriges vers /accueil).
  // Placee AVANT le parent path:'' du dashboard, sinon il capterait '/' via
  // sa redirection interne ; pathMatch full limite la concordance a '/' exact.
  { path: '', pathMatch: 'full', loadComponent: () => import('./pages/page-landing/page-landing.component').then(m => m.PageLandingComponent), canActivate: [redirectSiConnecte] },
  { path: 'landing', loadComponent: () => import('./pages/page-landing/page-landing.component').then(m => m.PageLandingComponent), canActivate: [redirectSiConnecte] },
  { path: 'login', loadComponent: () => import('./pages/page-login/page-login.component').then(m => m.PageLoginComponent) },
  { path: 'motdepasseoublie', loadComponent: () => import('./pages/page-mot-de-passe-oublie/page-mot-de-passe-oublie.component').then(m => m.PageMotDePasseOublieComponent) },
  { path: 'inscrire', loadComponent: () => import('./pages/page-inscription/page-inscription.component').then(m => m.PageInscriptionComponent) },
  {
    path: '',
    loadComponent: () => import('./pages/page-dashboard/page-dashboard.component').then(m => m.PageDashboardComponent),
    canActivate: [authGuard],
    children: [
      { path: 'statistiques', loadComponent: () => import('./pages/page-statistiques/page-statistiques.component').then(m => m.PageStatistiquesComponent), canActivate: [authGuard] },
      { path: 'articles', loadComponent: () => import('./pages/articles/page-article/page-article.component').then(m => m.PageArticleComponent), canActivate: [authGuard] },
      { path: 'nouvelarticle', loadComponent: () => import('./pages/articles/nouvel-article/nouvel-article.component').then(m => m.NouvelArticleComponent), canActivate: [authGuard] },
      { path: 'nouvelarticle/:idArticle', loadComponent: () => import('./pages/articles/nouvel-article/nouvel-article.component').then(m => m.NouvelArticleComponent), canActivate: [authGuard] },
      { path: 'mvtstk', loadComponent: () => import('./pages/mvtstk/page-mvtstk/page-mvtstk.component').then(m => m.PageMvtstkComponent), canActivate: [authGuard] },
      { path: 'ventes', loadComponent: () => import('./pages/ventes/page-ventes/page-ventes.component').then(m => m.PageVentesComponent), canActivate: [authGuard] },
      { path: 'nouvellevelle', loadComponent: () => import('./pages/ventes/nouvelle-vente/nouvelle-vente.component').then(m => m.NouvelleVenteComponent), canActivate: [authGuard] },
      { path: 'clients', loadComponent: () => import('./pages/client/page-client/page-client.component').then(m => m.PageClientComponent), canActivate: [authGuard] },
      { path: 'nouveauclient', loadComponent: () => import('./composants/nouveau-clt-frs/nouveau-clt-frs.component').then(m => m.NouveauCltFrsComponent), canActivate: [authGuard], data: { origin: 'client' } },
      { path: 'nouveauclient/:id', loadComponent: () => import('./composants/nouveau-clt-frs/nouveau-clt-frs.component').then(m => m.NouveauCltFrsComponent), canActivate: [authGuard], data: { origin: 'client' } },
      { path: 'commandesclient', loadComponent: () => import('./pages/page-cmd-clt-frs/page-cmd-clt-frs.component').then(m => m.PageCmdCltFrsComponent), canActivate: [authGuard], data: { origin: 'client' } },
      { path: 'nouvellecommandeclt', loadComponent: () => import('./composants/nouvelle-cmd-clt-frs/nouvelle-cmd-clt-frs.component').then(m => m.NouvelleCmdCltFrsComponent), canActivate: [authGuard], data: { origin: 'client' } },
      { path: 'fournisseurs', loadComponent: () => import('./pages/fournisseur/page-fournisseur/page-fournisseur.component').then(m => m.PageFournisseurComponent), canActivate: [authGuard] },
      { path: 'nouveaufournisseur', loadComponent: () => import('./composants/nouveau-clt-frs/nouveau-clt-frs.component').then(m => m.NouveauCltFrsComponent), canActivate: [authGuard], data: { origin: 'fournisseur' } },
      { path: 'nouveaufournisseur/:id', loadComponent: () => import('./composants/nouveau-clt-frs/nouveau-clt-frs.component').then(m => m.NouveauCltFrsComponent), canActivate: [authGuard], data: { origin: 'fournisseur' } },
      { path: 'commandesfournisseur', loadComponent: () => import('./pages/page-cmd-clt-frs/page-cmd-clt-frs.component').then(m => m.PageCmdCltFrsComponent), canActivate: [authGuard], data: { origin: 'fournisseur' } },
      { path: 'nouvellecommandefrs', loadComponent: () => import('./composants/nouvelle-cmd-clt-frs/nouvelle-cmd-clt-frs.component').then(m => m.NouvelleCmdCltFrsComponent), canActivate: [authGuard], data: { origin: 'fournisseur' } },
      { path: 'categories', loadComponent: () => import('./pages/categories/page-categories/page-categories.component').then(m => m.PageCategoriesComponent), canActivate: [authGuard] },
      { path: 'nouvellecategorie', loadComponent: () => import('./pages/categories/noouvelle-category/noouvelle-category.component').then(m => m.NoouvelleCategoryComponent), canActivate: [authGuard] },
      { path: 'nouvellecategorie/:idCategory', loadComponent: () => import('./pages/categories/noouvelle-category/noouvelle-category.component').then(m => m.NoouvelleCategoryComponent), canActivate: [authGuard] },
      { path: 'utilisateurs', loadComponent: () => import('./pages/utilisateur/page-utilisateur/page-utilisateur.component').then(m => m.PageUtilisateurComponent), canActivate: [authGuard] },
      { path: 'nouvelutilisateur', loadComponent: () => import('./pages/utilisateur/nouvel-utilisateur/nouvel-utilisateur.component').then(m => m.NouvelUtilisateurComponent), canActivate: [authGuard] },
      { path: 'nouvelutilisateur/:idUtilisateur', loadComponent: () => import('./pages/utilisateur/nouvel-utilisateur/nouvel-utilisateur.component').then(m => m.NouvelUtilisateurComponent), canActivate: [authGuard] },
      { path: 'profil', loadComponent: () => import('./pages/profil/page-profil/page-profil.component').then(m => m.PageProfilComponent), canActivate: [authGuard] },
      { path: 'changermotdepasse', loadComponent: () => import('./pages/profil/changer-mot-de-passe/changer-mot-de-passe.component').then(m => m.ChangerMotDePasseComponent), canActivate: [authGuard] },
      { path: 'entreprise', loadComponent: () => import('./pages/entreprise/page-entreprise/page-entreprise.component').then(m => m.PageEntrepriseComponent), canActivate: [authGuard] },
      { path: 'accueil', loadComponent: () => import('./pages/page-accueil/page-accueil.component').then(m => m.PageAccueilComponent), canActivate: [authGuard] },
      { path: '', pathMatch: 'full', redirectTo: 'accueil' }
    ]
  }
];
