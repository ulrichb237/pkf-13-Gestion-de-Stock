import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Landing page publique (route '/', sans guard) :
 * presente le produit et oriente vers la connexion / l'inscription.
 * Un utilisateur deja connecte est renvoye vers le tableau de bord
 * (voir le guard redirectSiConnecte dans app.routes.ts).
 *
 * Charte : DESIGN.md (Stripi-inspired) — encre marine, indigo electrique,
 * mesh gradient atmospherique, titres fins a interlettrage negatif.
 * Les donnees affichees sont purement decoratives (maquette d'apercu).
 */
@Component({
  imports: [RouterLink],
  selector: 'app-page-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-landing.component.html',
  styleUrls: ['./page-landing.component.scss']
})
export class PageLandingComponent {

  /** Annee courante affichee dans le pied de page */
  readonly annee = new Date().getFullYear();

  /** Modules presentes dans la section fonctionnalites */
  readonly fonctionnalites = [
    {
      titre: 'Articles & categories',
      description: 'Catalogue produit avec codes auto-generes, prix TTC et photos.',
      icone: 'boite'
    },
    {
      titre: 'Ventes',
      description: 'Enregistrez vos ventes en quelques clics et suivez le chiffre d\'affaires.',
      icone: 'vente'
    },
    {
      titre: 'Commandes clients & fournisseurs',
      description: 'Suivi d\'etat des commandes, de la preparation a la livraison.',
      icone: 'commande'
    },
    {
      titre: 'Mouvements de stock',
      description: 'Entrees, sorties et ajustements : le stock reel reste toujours a jour.',
      icone: 'fleches'
    },
    {
      titre: 'Clients & fournisseurs',
      description: 'Fiches completes avec adresses, contacts et photos.',
      icone: 'carnet'
    },
    {
      titre: 'Tableau de bord',
      description: 'KPI, alertes de seuil critique et graphiques sur donnees reelles.',
      icone: 'graphique'
    }
  ];

  /** Trois etapes du parcours de prise en main */
  readonly etapes = [
    {
      numero: '01',
      titre: 'Creez votre entreprise',
      description: 'Nom, adresse, monnaie : l\'espace de travail est pret en une minute.'
    },
    {
      numero: '02',
      titre: 'Ajoutez vos articles',
      description: 'Constituez votre catalogue et fixez vos seuils d\'alerte de stock.'
    },
    {
      numero: '03',
      titre: 'Vendez et suivez',
      description: 'Ventes, commandes et stock se synchronisent en temps reel.'
    }
  ];

}
