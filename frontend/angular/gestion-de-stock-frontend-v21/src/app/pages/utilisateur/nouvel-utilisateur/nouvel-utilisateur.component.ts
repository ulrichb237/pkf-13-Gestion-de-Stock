import { NgIf, NgFor, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { UtilisateurDto } from '../../../../gs-api/src/models/utilisateur-dto';
import { AdresseDto } from '../../../../gs-api/src/models/adresse-dto';
import { UserService } from '../../../services/user/user.service';
import { NotificationService } from '../../../services/notification/notification.service';
import { ChampMotDePasseComponent } from '../../../composants/champ-mot-de-passe/champ-mot-de-passe.component';

/** Clefs de champs du formulaire utilisateur (erreurs sous le champ) */
type ChampsUtilisateur =
  'nom' | 'prenom' | 'email' | 'dateDeNaissance' | 'motDePasse' |
  'adresse1' | 'adresse2' | 'ville' | 'codePostale' | 'pays';

/**
 * Associe un message du backend (UtilisateurValidator / AdresseValidator) au
 * champ concerne. Ordre important : les libelles les plus specifiques d'abord.
 */
const REGLES_CHAMP_UTILISATEUR: Array<{ champ: ChampsUtilisateur; motif: RegExp }> = [
  { champ: 'motDePasse', motif: /mot de passe/i },
  { champ: 'dateDeNaissance', motif: /date de naissance/i },
  { champ: 'email', motif: /e-?mail/i },
  { champ: 'adresse2', motif: /adresse 2/i },
  { champ: 'adresse1', motif: /adresse 1/i },
  { champ: 'ville', motif: /ville/i },
  { champ: 'codePostale', motif: /code postal/i },
  { champ: 'pays', motif: /pays/i },
  { champ: 'prenom', motif: /prenom/i },
  { champ: 'nom', motif: /nom/i }
];

/**
 * Creation / fiche utilisateur (admin).
 * POST /api/v1/utilisateurs a la creation ; en edition, la modification du
 * mot de passe passe par la page dediee /changermotdepasse.
 *
 * Alignement backend : le champ mot de passe s'appelle `moteDePasse` (typo
 * historique du DTO backend), l'entreprise est un objet et la date de
 * naissance est obligatoire (UtilisateurValidator).
 */
@Component({
  imports: [NgIf, NgFor, NgClass, FormsModule, ChampMotDePasseComponent],
  selector: 'app-nouvel-utilisateur',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nouvel-utilisateur.component.html',
  styleUrls: ['./nouvel-utilisateur.component.scss']
})
export class NouvelUtilisateurComponent implements OnInit {

  readonly utilisateurDto = signal<UtilisateurDto>({});
  readonly motDePasse = signal('');
  readonly confirmMotDePasse = signal('');
  readonly errorMsg = signal('');
  readonly chargement = signal(false);
  readonly modeEdition = signal(false);

  /** Erreurs rattachees a un champ (affichees sous le champ concerne) */
  readonly erreursChamps = signal<Partial<Record<ChampsUtilisateur, string[]>>>({});
  /** Erreurs non rattachees a un champ precis (bandeau general) */
  readonly erreursGenerales = signal<string[]>([]);

  /** Valeur pour l'input date (YYYY-MM-DD) derivee de l'Instant du DTO */
  readonly dateNaissanceInput = computed(() => {
    const instant = this.utilisateurDto().dateDeNaissance;
    if (!instant) {
      return '';
    }
    return new Date(instant as unknown as string).toISOString().slice(0, 10);
  });

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private userService: UserService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    const id = this.activatedRoute.snapshot.paramMap.get('idUtilisateur');
    if (id) {
      this.modeEdition.set(true);
      this.chargement.set(true);
      this.userService.findUtilisateurById(+id).subscribe(utilisateur => {
        this.utilisateurDto.set(utilisateur || {});
        this.chargement.set(false);
      }, error => {
        this.errorMsg.set(error?.error?.message || 'Erreur lors du chargement');
        this.chargement.set(false);
      });
    }
  }

  champ(champ: string, event: Event): void {
    const valeur = (event.target as HTMLInputElement).value;
    this.utilisateurDto.update(u => ({ ...u, [champ]: valeur }));
  }

  champAdresse(champ: keyof AdresseDto, event: Event): void {
    const valeur = (event.target as HTMLInputElement).value;
    this.utilisateurDto.update(u => ({
      ...u,
      adresse: { ...u.adresse, [champ]: valeur }
    }));
  }

  champDateNaissance(event: Event): void {
    const valeur = (event.target as HTMLInputElement).value;
    // Le backend attend un Instant : minuit UTC du jour selectionne
    const instant = valeur ? new Date(valeur + 'T00:00:00Z').toISOString() : undefined;
    this.utilisateurDto.update(u => ({
      ...u,
      dateDeNaissance: instant as unknown as number
    }));
  }

  /**
   * Repartit les messages du backend sous le champ concerne.
   * Un message non reconnu reste dans le bandeau general.
   */
  private repartirErreurs(messages: Array<string>): void {
    const parChamp: Partial<Record<ChampsUtilisateur, string[]>> = {};
    const generales: string[] = [];

    for (const message of messages) {
      const regle = REGLES_CHAMP_UTILISATEUR.find(r => r.motif.test(message));
      if (regle) {
        (parChamp[regle.champ] ??= []).push(message);
      } else {
        generales.push(message);
      }
    }

    this.erreursChamps.set(parChamp);
    this.erreursGenerales.set(generales);
    this.errorMsg.set(messages.join(' '));
  }

  /** Erreurs du champ donne, pour le template */
  erreurDe(champ: ChampsUtilisateur): Array<string> {
    return this.erreursChamps()[champ] ?? [];
  }

  /** Classe input-error a appliquer au champ tant que son erreur est affichee */
  classeErreur(champ: ChampsUtilisateur): Record<string, boolean> {
    return { 'input-error': this.erreurDe(champ).length > 0 };
  }

  enregistrer(): void {
    this.errorMsg.set('');
    this.erreursChamps.set({});
    this.erreursGenerales.set([]);
    const utilisateur = { ...this.utilisateurDto() };

    if (!utilisateur.nom || !utilisateur.prenom || !utilisateur.email) {
      this.repartirErreurs(['Le nom, le prenom et l email sont obligatoires']);
      return;
    }
    if (!utilisateur.dateDeNaissance) {
      this.repartirErreurs(['La date de naissance est obligatoire']);
      return;
    }

    if (!this.modeEdition()) {
      if (!this.motDePasse() || this.motDePasse().length < 6) {
        this.repartirErreurs(['Le mot de passe doit contenir au moins 6 caracteres']);
        return;
      }
      if (this.motDePasse() !== this.confirmMotDePasse()) {
        this.repartirErreurs(['Les mots de passe ne correspondent pas']);
        return;
      }
      utilisateur.moteDePasse = this.motDePasse();
    }

    // Rattachement a l'entreprise de l'admin connecte (multi-entreprise)
    if (!utilisateur.entreprise?.id) {
      const idEntreprise = this.userService.getConnectedUser()?.entreprise?.id;
      if (idEntreprise) {
        utilisateur.entreprise = { id: idEntreprise };
      }
    }

    this.chargement.set(true);
    this.userService.saveUtilisateur(utilisateur)
      .subscribe(() => {
        this.chargement.set(false);
        this.notificationService.success('Utilisateur enregistre');
        this.router.navigate(['utilisateurs']);
      }, error => {
        this.chargement.set(false);
        const errors = error?.error?.errors;
        this.repartirErreurs(
          Array.isArray(errors) && errors.length ? errors : [error?.error?.message || 'Erreur lors de l enregistrement']
        );
      });
  }

  cancel(): void {
    this.router.navigate(['utilisateurs']);
  }
}
