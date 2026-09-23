import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import {Router} from '@angular/router';
import {VentesServiceApp} from '../../../services/ventes/ventes.service';
import {ArticleService} from '../../../services/article/article.service';
import {ArticleDto} from '../../../../gs-api/src/models/article-dto';
import {LigneVenteDto} from '../../../../gs-api/src/models/ligne-vente-dto';
import {VentesDto} from '../../../../gs-api/src/models/ventes-dto';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, NgFor, FormsModule, RouterLink],
  selector: 'app-nouvelle-vente',
  templateUrl: './nouvelle-vente.component.html',
  styleUrls: ['./nouvelle-vente.component.scss']
})
export class NouvelleVenteComponent implements OnInit {

  codeVente = '';
  commentaire = '';
  searchedArticle: ArticleDto = {};
  listArticle: Array<ArticleDto> = [];
  codeArticle = '';
  quantite = '';

  lignesVente: Array<LigneVenteDto> = [];
  totalVente = 0;
  articleNotYetSelected = false;
  errorMsg: Array<string> = [];

  /** Erreurs rattachees a un champ precis (affichees sous le champ concerne) */
  readonly erreurCodeArticle = signal<string[]>([]);
  readonly erreurQuantite = signal<string[]>([]);
  /** Erreurs non rattachees a un champ precis (bandeau general). Les seules
   *  violations attendues (date auto, articles introuvables) ne correspondent
   *  a aucun champ du formulaire. */
  erreursGenerales: Array<string> = [];

  constructor(
    private router: Router,
    private ventesService: VentesServiceApp,
    private articleService: ArticleService
  ) { }

  ngOnInit(): void {
    this.findAllArticles();
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
      return;
    }
    this.listArticle = this.listArticle
    .filter(art => art.codeArticle?.includes(this.codeArticle) || art.designation?.includes(this.codeArticle));
  }

  selectArticleClick(article: ArticleDto): void {
    this.searchedArticle = article;
    this.codeArticle = article.codeArticle ? article.codeArticle : '';
    this.articleNotYetSelected = true;
  }

  ajouterLigneVente(): void {
    this.erreurCodeArticle.set([]);
    this.erreurQuantite.set([]);
    if (!this.searchedArticle.id) {
      // On ferme la liste d'autocomplete pour que le message d'erreur reste lisible
      this.articleNotYetSelected = true;
      this.erreurCodeArticle.set(['Selectionnez un article dans la liste avant d ajouter une ligne']);
      return;
    }
    if (!this.quantite || +this.quantite < 1) {
      this.erreurQuantite.set(['Veuillez saisir une quantite superieure ou egale a 1']);
      return;
    }
    const ligneExistante = this.lignesVente.find(lig => lig.article?.codeArticle === this.searchedArticle.codeArticle);
    if (ligneExistante) {
      this.lignesVente.forEach(lig => {
        if (lig && lig.article?.codeArticle === this.searchedArticle.codeArticle) {
          // @ts-ignore
          lig.quantite = lig.quantite + +this.quantite;
        }
      });
    } else {
      const ligneVente: LigneVenteDto = {
        article: this.searchedArticle,
        prixUnitaire: this.searchedArticle.prixUnitaireTtc,
        quantite: +this.quantite
      };
      this.lignesVente.push(ligneVente);
    }
    this.calculerTotalVente();
    this.searchedArticle = {};
    this.quantite = '';
    this.codeArticle = '';
    this.articleNotYetSelected = false;
    this.findAllArticles();
  }

  calculerTotalVente(): void {
    this.totalVente = 0;
    this.lignesVente.forEach(ligne => {
      if (ligne.prixUnitaire && ligne.quantite) {
        this.totalVente += +ligne.prixUnitaire * +ligne.quantite;
      }
    });
  }

  enregistrerVente(): void {
    this.erreursGenerales = [];
    if (!this.lignesVente.length) {
      this.erreursGenerales = ['Ajoutez au moins un article avant d enregistrer la vente'];
      return;
    }
    const vente: VentesDto = {
      // Le backend attend une date ISO-8601 (voir VentesValidator : dateVente
      // obligatoire) ; le DTO genere type la propriete en number.
      dateVente: new Date().toISOString() as unknown as number,
      code: this.codeVente,
      commentaire: this.commentaire,
      ligneVentes: this.lignesVente
    };
    this.ventesService.enregistrerVente(vente)
    .subscribe(venteCree => {
      this.router.navigate(['ventes']);
    }, error => {
      this.erreursGenerales = error?.error?.errors || ['Erreur lors de l enregistrement de la vente'];
      this.errorMsg = this.erreursGenerales;
    });
  }
}
