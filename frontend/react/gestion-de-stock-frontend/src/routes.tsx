import { Routes, Route, Navigate, Outlet } from 'react-router';
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
        <Route element={<AppShell><Outlet /></AppShell>}>
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
