import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import {Router} from '@angular/router';
import {ChangerMotDePasseUtilisateurDto} from '../../../../gs-api/src/models/changer-mot-de-passe-utilisateur-dto';
import {UserService} from '../../../services/user/user.service';
import {ChampMotDePasseComponent} from '../../../composants/champ-mot-de-passe/champ-mot-de-passe.component';

@Component({
  imports: [FormsModule, ChampMotDePasseComponent],
  selector: 'app-changer-mot-de-passe',
  templateUrl: './changer-mot-de-passe.component.html',
  styleUrls: ['./changer-mot-de-passe.component.scss']
})
export class ChangerMotDePasseComponent implements OnInit {

  changerMotDePasseDto: ChangerMotDePasseUtilisateurDto = {};
  ancienMotDePasse = '';

  /** Erreurs rattachees a un champ precis (affichees sous le champ concerne) */
  readonly erreurAncien = signal<string[]>([]);
  readonly erreurNouveau = signal<string[]>([]);
  readonly erreurConfirmation = signal<string[]>([]);

  /** Purge les erreurs de champ avant chaque tentative */
  private purgerErreursChamps(): void {
    this.erreurAncien.set([]);
    this.erreurNouveau.set([]);
    this.erreurConfirmation.set([]);
  }

  constructor(
    private router: Router,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    if (localStorage.getItem('origin') && localStorage.getItem('origin') === 'inscription') {
      this.ancienMotDePasse = 'som3R@nd0mP@$$word';
      localStorage.removeItem('origin');
    }
  }

  cancel(): void {
    this.router.navigate(['profil']);
  }

  changerMotDePasseUtilisateur(): void {
    this.purgerErreursChamps();
    // Validation locale : le backend ne renvoie pas d'erreur par champ sur
    // ce endpoint, on verifie donc les regles avant l'appel.
    if (!this.ancienMotDePasse) {
      this.erreurAncien.set(['Veuillez saisir votre ancien mot de passe']);
      return;
    }
    if (!this.changerMotDePasseDto.motDePasse || this.changerMotDePasseDto.motDePasse.length < 6) {
      this.erreurNouveau.set(['Le mot de passe doit contenir au moins 6 caracteres']);
      return;
    }
    if (this.changerMotDePasseDto.motDePasse !== this.changerMotDePasseDto.confirmMotDePasse) {
      this.erreurConfirmation.set(['Les deux mots de passe ne correspondent pas']);
      return;
    }
    this.changerMotDePasseDto.id = this.userService.getConnectedUser().id;
    this.userService.changerMotDePasse(this.changerMotDePasseDto)
    .subscribe({
      next: () => this.router.navigate(['profil']),
      error: () => this.erreurAncien.set(['Ancien mot de passe incorrect'])
    });
  }
}
