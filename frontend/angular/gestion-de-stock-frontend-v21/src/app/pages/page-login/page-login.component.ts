import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {UserService} from '../../services/user/user.service';
import {ChampMotDePasseComponent} from '../../composants/champ-mot-de-passe/champ-mot-de-passe.component';
import {AuthenticationRequest} from '../../../gs-api/src/models/authentication-request';
import {Router} from '@angular/router';

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

  /** Purge les erreurs de champ avant chaque tentative */
  private purgerErreursChamps(): void {
    this.erreurLogin.set([]);
    this.erreurMotDePasse.set([]);
  }

  constructor(
    private userService: UserService,
    private router: Router
  ) { }

  // tslint:disable-next-line:typedef
  login() {
    this.purgerErreursChamps();
    if (!this.authenticationRequest.login?.trim()) {
      this.erreurLogin.set(['Veuillez saisir votre email']);
      return;
    }
    if (!this.authenticationRequest.password) {
      this.erreurMotDePasse.set(['Veuillez saisir votre mot de passe']);
      return;
    }
    this.userService.login(this.authenticationRequest).subscribe((data) => {
      this.userService.setAccessToken(data);
      // Le profil est charge AVANT la navigation : sinon la page d'arrivee
      // demarre sans connectedUser (race constatee sur entreprise / header).
      this.getUserByEmail();
    }, error => {
      // Le backend ne precise pas quel champ est en cause : les deux champs
      // sont marques en erreur en plus du message general.
      this.errorMessage = 'Login et / ou mot de passe incorrecte';
      this.erreurLogin.set([' ']);
      this.erreurMotDePasse.set([' ']);
    });
  }

  getUserByEmail(): void {
    this.userService.getUserByEmail(this.authenticationRequest.login)
    .subscribe(user => {
      this.userService.setConnectedUser(user);
      this.router.navigate(['']);
    }, () => {
      // Profil indisponible : on ne bloque pas la connexion, l'utilisateur
      // verra une erreur explicite sur les pages dependantes du profil.
      this.router.navigate(['']);
    });
  }

}

