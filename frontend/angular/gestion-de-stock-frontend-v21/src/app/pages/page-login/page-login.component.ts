import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {UserService} from '../../services/user/user.service';
import {ChampMotDePasseComponent} from '../../composants/champ-mot-de-passe/champ-mot-de-passe.component';
import {AuthenticationRequest} from '../../../gs-api/src/models/authentication-request';

@Component({
  imports: [NgIf, FormsModule, RouterLink, ChampMotDePasseComponent],
  selector: 'app-page-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-login.component.html',
  styleUrls: ['./page-login.component.scss']
})
export class PageLoginComponent {

  authenticationRequest: AuthenticationRequest = {};
  errorMessage = '';

  /** Erreurs rattachees a un champ precis (affichees sous le champ concerne) */
  readonly erreurLogin = signal<string[]>([]);
  readonly erreurMotDePasse = signal<string[]>([]);

  private readonly destroyRef = inject(DestroyRef);

  /** Purge les erreurs de champ avant chaque tentative */
  private purgerErreursChamps(): void {
    this.erreurLogin.set([]);
    this.erreurMotDePasse.set([]);
  }

  constructor(
    private userService: UserService,
    private router: Router
  ) { }

  login(): void {
    this.purgerErreursChamps();
    if (!this.authenticationRequest.login?.trim()) {
      this.erreurLogin.set(['Veuillez saisir votre email']);
      return;
    }
    if (!this.authenticationRequest.password) {
      this.erreurMotDePasse.set(['Veuillez saisir votre mot de passe']);
      return;
    }
    // Les deux souscriptions sont rattachees au cycle de vie du composant :
    // plus aucune fuite si l'utilisateur quitte la page pendant l'appel.
    this.userService.login(this.authenticationRequest)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.userService.setAccessToken(data);
          // Le profil est charge AVANT la navigation : sinon la page d'arrivee
          // demarre sans connectedUser (race constatee sur entreprise / header).
          this.getUserByEmail();
        },
        error: () => {
          // Le backend ne precise pas quel champ est en cause : les deux champs
          // sont marques en erreur en plus du message general.
          this.errorMessage = 'Login et / ou mot de passe incorrecte';
          this.erreurLogin.set([' ']);
          this.erreurMotDePasse.set([' ']);
        }
      });
  }

  getUserByEmail(): void {
    this.userService.getUserByEmail(this.authenticationRequest.login)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: user => {
          this.userService.setConnectedUser(user);
          this.router.navigate(['']);
        },
        error: () => {
          // Profil indisponible : on ne bloque pas la connexion, l'utilisateur
          // verra une erreur explicite sur les pages dependantes du profil.
          this.router.navigate(['']);
        }
      });
  }

}
