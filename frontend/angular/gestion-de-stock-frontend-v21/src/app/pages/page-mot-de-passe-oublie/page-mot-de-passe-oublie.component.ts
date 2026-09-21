import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { UserService } from '../../services/user/user.service';
import { ForgotPasswordResponse } from '../../../gs-api/src/models/forgot-password-response';
import { ChampMotDePasseComponent } from '../../composants/champ-mot-de-passe/champ-mot-de-passe.component';

/**
 * Parcours "mot de passe oublie" en 2 etapes :
 * 1. l'utilisateur saisit son email, un code a 6 chiffres est genere (valable 15 min) ;
 * 2. il saisit le code + son nouveau mot de passe.
 *
 * Sans serveur SMTP configure, le backend renvoie le code dans la reponse :
 * il est affiche dans un encadre info pour permettre au parcours de fonctionner.
 */
@Component({
  imports: [NgClass, FormsModule, RouterLink, ChampMotDePasseComponent],
  selector: 'app-page-mot-de-passe-oublie',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-mot-de-passe-oublie.component.html',
  styleUrls: ['./page-mot-de-passe-oublie.component.scss']
})
export class PageMotDePasseOublieComponent {

  email = '';
  code = '';
  nouveauMotDePasse = '';
  confirmation = '';

  readonly etape = signal<1 | 2>(1);
  readonly codeAffiche = signal<string>('');
  readonly message = signal<string>('');
  readonly erreur = signal<string>('');
  readonly chargement = signal<boolean>(false);

  /** Erreurs rattachees a un champ precis (affichees sous le champ concerne) */
  readonly erreurEmail = signal<string[]>([]);
  readonly erreurCode = signal<string[]>([]);
  readonly erreurMotDePasse = signal<string[]>([]);
  readonly erreurConfirmation = signal<string[]>([]);

  /** Purge toutes les erreurs de champ */
  private purgerErreursChamps(): void {
    this.erreurEmail.set([]);
    this.erreurCode.set([]);
    this.erreurMotDePasse.set([]);
    this.erreurConfirmation.set([]);
  }

  constructor(private userService: UserService) { }

  demanderCode(): void {
    this.purgerErreursChamps();
    if (!this.email) {
      this.erreurEmail.set(['Veuillez saisir votre email']);
      return;
    }
    this.chargement.set(true);
    this.erreur.set('');
    this.userService.forgotPassword(this.email).subscribe({
      next: (reponse: ForgotPasswordResponse) => {
        this.chargement.set(false);
        this.message.set(reponse?.message || 'Si un compte existe, un code vient d\'etre genere.');
        if (reponse?.code) {
          // SMTP non configure : le code est affiche directement (voir MODIFICATIONS_BACKEND.md)
          this.codeAffiche.set(reponse.code);
          this.code = reponse.code;
        }
        this.etape.set(2);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set('Erreur lors de la demande, veuillez reessayer');
      }
    });
  }

  reinitialiser(): void {
    this.purgerErreursChamps();
    if (!this.code) {
      this.erreurCode.set(['Veuillez saisir le code recu']);
      return;
    }
    if (this.nouveauMotDePasse.length < 6) {
      this.erreurMotDePasse.set(['Le mot de passe doit contenir au moins 6 caracteres']);
      return;
    }
    if (this.nouveauMotDePasse !== this.confirmation) {
      this.erreurMotDePasse.set(['Le mot de passe doit contenir au moins 6 caracteres']);
      this.erreurConfirmation.set(['Les deux mots de passe ne correspondent pas']);
      return;
    }
    this.chargement.set(true);
    this.erreur.set('');
    this.userService.reinitialiserMotDePasse(this.code, this.nouveauMotDePasse).subscribe({
      next: () => {
        this.chargement.set(false);
        this.message.set('Mot de passe reinitialise avec succes. Vous pouvez vous connecter.');
      },
      error: (err) => {
        this.chargement.set(false);
        this.erreur.set(err?.error?.message || 'Code invalide ou expire, demandez-en un nouveau');
      }
    });
  }
}
