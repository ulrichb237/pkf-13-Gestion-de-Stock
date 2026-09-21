import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {ChangeDetectionStrategy, Component, OnInit, signal} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {CltfrsService} from '../../services/cltfrs/cltfrs.service';
import {ArticleDto} from '../../../gs-api/src/models/article-dto';
import {ArticleService} from '../../services/article/article.service';
import {LigneCommandeClientDto} from '../../../gs-api/src/models/ligne-commande-client-dto';
import {CommandeClientDto} from '../../../gs-api/src/models/commande-client-dto';
import {CmdcltfrsService} from '../../services/cmdcltfrs/cmdcltfrs.service';
import {CommandeFournisseurDto} from '../../../gs-api/src/models/commande-fournisseur-dto';

import { DetailCmdComponent } from '../detail-cmd/detail-cmd.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, NgFor, FormsModule, RouterLink, DetailCmdComponent],
  selector: 'app-nouvelle-cmd-clt-frs',
  templateUrl: './nouvelle-cmd-clt-frs.component.html',
  styleUrls: ['./nouvelle-cmd-clt-frs.component.scss']
})
export class NouvelleCmdCltFrsComponent implements OnInit {

  origin = '';
  selectedClientFournisseur: any = {};
  listClientsFournisseurs: Array<any> = [];
  searchedArticle: ArticleDto = {};
  listArticle: Array<ArticleDto> = [];
  codeArticle = '';
  quantite = '';
  codeCommande = '';

  /** Erreurs rattachees a un champ precis (affichees sous le champ concerne) */
  readonly erreurClientFrs = signal<string[]>([]);
  readonly erreurCodeArticle = signal<string[]>([]);
  readonly erreurQuantite = signal<string[]>([]);

  /** Purge les erreurs de champ */
  private purgerErreursChamps(): void {
    this.erreurClientFrs.set([]);
    this.erreurCodeArticle.set([]);
    this.erreurQuantite.set([]);
  }

  /** Lignes locales de la commande en creation (signal, recree a chaque mutation) */
  readonly lignesCommande = signal<Array<any>>([]);
  readonly totalCommande = signal(0);
  articleNotYetSelected = false;
  errorMsg: string = '';
  /** Erreurs non rattachees a un champ precis (bandeau general) */
  erreursGenerales: Array<string> = [];

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private cltFrsService: CltfrsService,
    private articleService: ArticleService,
    private cmdCltFrsService: CmdcltfrsService
  ) { }

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(data => {
      this.origin = data['origin'];
    });
    this.findAllClientsFournisseurs();
    this.findAllArticles();
  }

  findAllClientsFournisseurs(): void {
    if (this.origin === 'client') {
      this.cltFrsService.findAllClients()
      .subscribe(clients => {
        this.listClientsFournisseurs = clients;
      });
    } else if (this.origin === 'fournisseur' ) {
      this.cltFrsService.findAllFournisseurs()
      .subscribe(fournisseurs => {
        this.listClientsFournisseurs = fournisseurs;
      });
    }
  }

  findAllArticles(): void {
    this.articleService.findAllArticles()
    .subscribe(articles => {
      this.listArticle = articles;
    });
  }

  filtrerArticle(): void {
    if (this.codeArticle.length === 0) {
      this.findAllArticles();
    }
    this.listArticle = this.listArticle
    .filter(art => art.codeArticle?.includes(this.codeArticle) || art.designation?.includes(this.codeArticle));
  }

  ajouterLigneCommande(): void {
    this.purgerErreursChamps();
    if (!this.searchedArticle.id) {
      this.articleNotYetSelected = true;
      this.erreurCodeArticle.set(['Selectionnez un article dans la liste avant d ajouter une ligne']);
      return;
    }
    if (!this.quantite || +this.quantite < 1) {
      this.erreurQuantite.set(['Veuillez saisir une quantite superieure ou egale a 1']);
      return;
    }
    this.checkLigneCommande();
    this.calculerTotalCommande();

    this.searchedArticle = {};
    this.quantite = '';
    this.codeArticle = '';
    this.articleNotYetSelected = false;
    this.findAllArticles();
  }

  /** Retire une ligne locale (avant enregistrement de la commande) */
  retirerLigne(ligne: LigneCommandeClientDto): void {
    this.lignesCommande.update(list => list.filter(l => l !== ligne));
    this.calculerTotalCommande();
  }

  /** Met a jour la quantite d'une ligne locale (avant enregistrement) */
  majQuantiteLigne(event: { ligne: LigneCommandeClientDto; quantite: number }): void {
    event.ligne.quantite = event.quantite;
    // Nouvelle reference de tableau pour la reactivite OnPush
    this.lignesCommande.update(list => [...list]);
    this.calculerTotalCommande();
  }

  calculerTotalCommande(): void {
    let total = 0;
    this.lignesCommande().forEach(ligne => {
      if (ligne.prixUnitaire && ligne.quantite) {
        total += +ligne.prixUnitaire * +ligne.quantite;
      }
    });
    this.totalCommande.set(total);
  }

  private checkLigneCommande(): void {
    this.lignesCommande.update(list => {
      const ligneCmdAlreadyExists = list.find(lig => lig.article?.codeArticle === this.searchedArticle.codeArticle);
      if (ligneCmdAlreadyExists) {
        return list.map(lig =>
          lig.article?.codeArticle === this.searchedArticle.codeArticle
            ? { ...lig, quantite: +lig.quantite! + +this.quantite }
            : lig
        );
      }
      const ligneCmd: LigneCommandeClientDto = {
        article: this.searchedArticle,
        prixUnitaire: this.searchedArticle.prixUnitaireTtc,
        quantite: +this.quantite
      };
      return [...list, ligneCmd];
    });
  }

  selectArticleClick(article: ArticleDto): void {
    this.searchedArticle = article;
    this.codeArticle = article.codeArticle ? article.codeArticle : '';
    this.articleNotYetSelected = true;
  }

  enregistrerCommande(): void {
    this.erreursGenerales = [];
    this.purgerErreursChamps();
    if (!this.selectedClientFournisseur?.id) {
      this.erreurClientFrs.set(['Veuillez selectionner un ' + (this.origin === 'fournisseur' ? 'fournisseur' : 'client')]);
      return;
    }
    if (!this.lignesCommande().length) {
      this.erreurCodeArticle.set(['Ajoutez au moins un article a la commande']);
      return;
    }
    const commande = this.preparerCommande();
    if (this.origin === 'client') {
      this.cmdCltFrsService.enregistrerCommandeClient(commande as CommandeClientDto)
      .subscribe(cmd => {
        this.router.navigate(['commandesclient']);
      }, error => {
        this.errorMsg = CmdcltfrsService.errorMsg(error);
        this.erreursGenerales = [this.errorMsg];
      });
    } else if (this.origin === 'fournisseur') {
      this.cmdCltFrsService.enregistrerCommandeFournisseur(commande as CommandeFournisseurDto)
      .subscribe(cmd => {
        this.router.navigate(['commandesfournisseur']);
      }, error => {
        this.errorMsg = CmdcltfrsService.errorMsg(error);
        this.erreursGenerales = [this.errorMsg];
      });
    }
  }

  /** Retour vers la liste correspondante (bouton Annuler) */
  get returnUrl(): string {
    return this.origin === 'fournisseur' ? '/commandesfournisseur' : '/commandesclient';
  }

  private preparerCommande(): any {
    if (this.origin === 'client') {
      return  {
        client: this.selectedClientFournisseur,
        code: this.codeCommande,
        // Le backend (Spring Boot 4) attend une date ISO-8601 ; un nombre (epoch millis)
        // est interprete comme des secondes et rejete par MySQL pour ventes/mouvements
        dateCommande: new Date().toISOString(),
        etatCommande: 'EN_PREPARATION',
        ligneCommandeClients: this.lignesCommande()
      };
    } else if (this.origin === 'fournisseur') {
      return  {
        fournisseur: this.selectedClientFournisseur,
        code: this.codeCommande,
        // Voir remarque ci-dessus : date ISO-8601 attendue par le backend
        dateCommande: new Date().toISOString(),
        etatCommande: 'EN_PREPARATION',
        ligneCommandeFournisseurs: this.lignesCommande()
      };
    }
  }
}
