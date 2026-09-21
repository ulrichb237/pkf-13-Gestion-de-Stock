import { NgIf, NgFor, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ArticleService} from '../../../services/article/article.service';
import {ArticleDto} from '../../../../gs-api/src/models/article-dto';
import {CategoryDto} from '../../../../gs-api/src/models/category-dto';
import {CategoryService} from '../../../services/category/category.service';
import {PhotosService} from '../../../../gs-api/src/services/photos.service';
import SavePhotoParams = PhotosService.SavePhotoParams;

/** Clefs de champs du formulaire article (pour l'affichage des erreurs sous le champ) */
type ChampArticle = 'designation' | 'prixUnitaireHt' | 'tauxTva' | 'prixUnitaireTtc' | 'categorie';

/**
 * Associe un message du backend (ArticleValidator) au champ concerne.
 * Ordre important : on teste les libelles les plus specifiques d'abord.
 */
const REGLES_CHAMP_ARTICLE: Array<{ champ: ChampArticle; motif: RegExp }> = [
  { champ: 'designation', motif: /designation/i },
  { champ: 'prixUnitaireHt', motif: /prix unitaire HT/i },
  { champ: 'tauxTva', motif: /taux TVA/i },
  { champ: 'prixUnitaireTtc', motif: /prix unitaire TTC/i },
  { champ: 'categorie', motif: /categorie/i }
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, NgFor, NgClass, FormsModule],
  selector: 'app-nouvel-article',
  templateUrl: './nouvel-article.component.html',
  styleUrls: ['./nouvel-article.component.scss']
})
export class NouvelArticleComponent implements OnInit {

  articleDto: ArticleDto = {};
  categorieDto: CategoryDto = {};
  listeCategorie: Array<CategoryDto> = [];
  errorMsg: Array<string> = [];
  file: File | null = null;
  imgUrl: string | ArrayBuffer = 'assets/product.png';

  /** Erreurs rattachees a un champ (affichees sous le champ concerne) */
  erreursChamps: Partial<Record<ChampArticle, string[]>> = {};
  /** Erreurs non rattachees a un champ precis (bandeau general) */
  erreursGenerales: Array<string> = [];

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private articleService: ArticleService,
    private categoryService: CategoryService,
    private photoService: PhotosService
  ) { }

  ngOnInit(): void {
    this.categoryService.findAll()
    .subscribe(categories => {
      this.listeCategorie = categories;
    });

    const idArticle = this.activatedRoute.snapshot.params['idArticle'];
    if (idArticle) {
      this.articleService.findArticleById(idArticle)
      .subscribe(article => {
        this.articleDto = article;
        this.categorieDto = this.articleDto.category ? this.articleDto.category : {};
      });
    }
  }

  cancel(): void {
    this.router.navigate(['articles']);
  }

  /**
   * Repartit les messages du backend sous le champ concerne (ArticleValidator).
   * Un message non reconnu reste dans le bandeau general.
   */
  private repartirErreurs(messages: Array<string>): void {
    const parChamp: Partial<Record<ChampArticle, string[]>> = {};
    const generales: Array<string> = [];

    for (const message of messages) {
      const regle = REGLES_CHAMP_ARTICLE.find(r => r.motif.test(message));
      if (regle) {
        (parChamp[regle.champ] ??= []).push(message);
      } else {
        generales.push(message);
      }
    }

    this.erreursChamps = parChamp;
    this.erreursGenerales = generales;
    this.errorMsg = messages;
  }

  /** Erreurs du champ donne, pour le template */
  erreurDe(champ: ChampArticle): Array<string> {
    return this.erreursChamps[champ] ?? [];
  }

  /** Classe input-error a appliquer au champ tant que son erreur est affichee */
  classeErreur(champ: ChampArticle): Record<string, boolean> {
    return { 'input-error': this.erreurDe(champ).length > 0 };
  }

  enregistrerArticle(): void {
    this.erreursChamps = {};
    this.erreursGenerales = [];
    this.articleDto.category = this.categorieDto;
    this.articleService.enregistrerArticle(this.articleDto)
    .subscribe(art => {
      this.savePhoto(art.id, art.codeArticle);
    }, error => {
      this.repartirErreurs(error?.error?.errors ?? []);
    });
  }

  calculerTTC(): void {
    if (this.articleDto.prixUnitaireHt && this.articleDto.tauxTva) {
      // prixHT + (prixHT * (tauxTVA / 100))
      this.articleDto.prixUnitaireTtc =
        +this.articleDto.prixUnitaireHt + (+(this.articleDto.prixUnitaireHt * (this.articleDto.tauxTva / 100)));
    }
  }


  onFileInput(files: FileList | null): void {
    if (files) {
      this.file = files.item(0);
      if (this.file) {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(this.file);
        fileReader.onload = (event) => {
          if (fileReader.result) {
            this.imgUrl = fileReader.result;
          }
        };
      }
    }
  }

  savePhoto(idArticle?: number, titre?: string): void {
    if (idArticle && titre && this.file) {
      const params: SavePhotoParams = {
        id: idArticle,
        file: this.file,
        title: titre,
        context: 'article'
      };
      this.photoService.savePhoto(params)
      .subscribe(res => {
        this.router.navigate(['articles']);
      });
    } else {
      this.router.navigate(['articles']);
    }
  }
}
