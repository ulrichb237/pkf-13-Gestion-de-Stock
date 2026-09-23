import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {CategoryDto} from '../../../../gs-api/src/models/category-dto';
import {CategoryService} from '../../../services/category/category.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, NgFor, FormsModule],
  selector: 'app-nouvelle-category',
  templateUrl: './nouvelle-category.component.html',
  styleUrls: ['./nouvelle-category.component.scss']
})
export class NouvelleCategoryComponent implements OnInit {

  categoryDto: CategoryDto = {};
  errorMsg: Array<string> = [];
  /** Erreurs non rattachees a un champ precis (bandeau general) */
  erreursGenerales: Array<string> = [];

  /** Erreurs rattachees a un champ precis (affichees sous le champ concerne) */
  readonly erreurCode = signal<string[]>([]);
  readonly erreurDesignation = signal<string[]>([]);

  /** Purge les erreurs de champ avant chaque tentative */
  private purgerErreursChamps(): void {
    this.erreurCode.set([]);
    this.erreurDesignation.set([]);
  }
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private categoryService: CategoryService
  ) { }

  ngOnInit(): void {
    const idCategory = this.activatedRoute.snapshot.params['idCategory'];
    if (idCategory) {
      this.categoryService.findById(idCategory)
      .subscribe(cat => {
        this.categoryDto = cat;
      });
    }
  }

  cancel(): void {
    this.router.navigate(['categories']);
  }

  enregistrerCategory(): void {
    this.erreursGenerales = [];
    this.purgerErreursChamps();
    // Validation locale : CategoryValidator ne rejette rien cote backend,
    // les champs obligatoires sont donc verifies ici.
    if (!this.categoryDto.code?.trim()) {
      this.erreurCode.set(['Veuillez renseigner le code de la categorie']);
      return;
    }
    if (!this.categoryDto.designation?.trim()) {
      this.erreurDesignation.set(['Veuillez renseigner la description de la categorie']);
      return;
    }
    this.categoryService.enregistrerCategory(this.categoryDto)
    .subscribe(res => {
      this.router.navigate(['categories']);
    }, error => {
      // Les rares erreurs backend ne correspondent a aucun champ : bandeau general.
      this.erreursGenerales = error?.error?.errors ?? ['Erreur lors de l enregistrement de la categorie'];
      this.errorMsg = this.erreursGenerales;
    });
  }
}
