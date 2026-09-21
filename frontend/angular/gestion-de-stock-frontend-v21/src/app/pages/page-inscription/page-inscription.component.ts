import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ChangeDetectionStrategy, Component, signal, WritableSignal } from '@angular/core';
import {EntrepriseDto} from '../../../gs-api/src/models/entreprise-dto';
import {EntrepriseService} from '../../services/entreprise/entreprise.service';
import {AdresseDto} from '../../../gs-api/src/models/adresse-dto';
import {ChampMotDePasseComponent} from '../../composants/champ-mot-de-passe/champ-mot-de-passe.component';

/**
 * Clefs de champs du formulaire d'inscription : chaque message d'erreur du
 * backend est rattache au champ concerne pour etre affiche juste en dessous.
 */
type ChampInscription =
  'nom' | 'codeFiscal' | 'email' | 'numTel' | 'description' |
  'adresse1' | 'adresse2' | 'ville' | 'codePostale' | 'pays' |
  'motDePasse' | 'confirmation';

/**
 * Associe un message d'erreur du backend a un champ du formulaire.
 * L'ordre des regles compte : on teste les cas les plus specifiques d'abord.
 */
const REGLES_CHAMP: Array<{ champ: ChampInscription; motif: RegExp }> = [
  { champ: 'confirmation', motif: /correspondent pas|confirmation/i },
  { champ: 'motDePasse', motif: /mot de passe/i },
  { champ: 'codeFiscal', motif: /code fiscal/i },
  { champ: 'description', motif: /description/i },
  { champ: 'numTel', motif: /telephone/i },
  { champ: 'email', motif: /e-?mail/i },
  { champ: 'adresse2', motif: /adresse 2/i },
  { champ: 'adresse1', motif: /adresse 1/i },
  { champ: 'ville', motif: /ville/i },
  { champ: 'codePostale', motif: /code postal/i },
  { champ: 'pays', motif: /pays/i },
  { champ: 'nom', motif: /nom/i }
];

@Component({
  imports: [NgClass, FormsModule, RouterLink, ChampMotDePasseComponent],
  selector: 'app-page-inscription',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-inscription.component.html',
  styleUrls: ['./page-inscription.component.scss']
})
export class PageInscriptionComponent {

  entrepriseDto: EntrepriseDto = {};
  adresse: AdresseDto = {};

  /** Mot de passe choisi par l'utilisateur pour son compte admin (envoye via motDePasseAdmin) */
  motDePasse = '';
  confirmation = '';

  /** Erreurs de validation backend — signal : ecrit depuis un callback HTTP (zoneless-safe) */
  readonly errorsMsg = signal<Array<string>>([]);

  /** Erreurs rattachees a chaque champ (affichees sous le champ concerne) */
  readonly erreursChamps = signal<Partial<Record<ChampInscription, string[]>>>({});

  /** Erreurs non rattachees a un champ precis (bandeau general au-dessus du formulaire) */
  readonly erreursGenerales = signal<string[]>([]);

  constructor(
    private entrepriseService: EntrepriseService,
    private router: Router
  ) { }

  /**
   * Repartit les messages d'erreur recus du backend sous le champ concerne.
   * Les regles viennent des validateurs backend (EntrepriseValidator,
   * AdresseValidator...) ; un message non reconnu reste dans le bandeau general.
   */
  private repartirErreurs(messages: Array<string>): void {
    const parChamp: Partial<Record<ChampInscription, string[]>> = {};
    const generales: string[] = [];

    for (const message of messages) {
      const regle = REGLES_CHAMP.find(r => r.motif.test(message));
      if (regle) {
        (parChamp[regle.champ] ??= []).push(message);
      } else {
        generales.push(message);
      }
    }

    this.erreursChamps.set(parChamp);
    this.erreursGenerales.set(generales);
    this.errorsMsg.set(messages);
  }

  /** Erreurs du champ donne, pour le template */
  erreurDe(champ: ChampInscription): string[] {
    return this.erreursChamps()[champ] ?? [];
  }

  /** Classe input-error a appliquer au champ tant que son erreur est affichee */
  classeErreur(champ: ChampInscription): Record<string, boolean> {
    return { 'input-error': this.erreurDe(champ).length > 0 };
  }

  inscrire(): void {
    this.erreursChamps.set({});
    this.erreursGenerales.set([]);

    if (this.motDePasse.length < 6) {
      this.repartirErreurs(['Le mot de passe doit contenir au moins 6 caracteres']);
      return;
    }
    if (this.motDePasse !== this.confirmation) {
      this.repartirErreurs(['Les deux mots de passe ne correspondent pas']);
      return;
    }
    this.entrepriseDto.adresse = this.adresse;
    this.entrepriseDto.motDePasseAdmin = this.motDePasse;
    this.entrepriseService.sinscrire(this.entrepriseDto)
    .subscribe(entrepriseDto => {
      // Inscription reussie : le backend a cree l'entreprise et le compte admin
      // avec le mot de passe choisi par l'utilisateur (champ motDePasseAdmin).
      this.router.navigate(['login']);
    }, error => {
      // Le backend renvoie une ErrorDto { code, httpCode, message, errors[] } :
      // soit une liste de violations de validation, soit un message unique.
      const errors = error?.error?.errors;
      this.repartirErreurs(
        Array.isArray(errors) && errors.length
          ? errors
          : [error?.error?.message || 'Erreur lors de l inscription']
      );
    });
  }
}
