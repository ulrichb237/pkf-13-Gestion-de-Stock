import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';

/**
 * Champ de mot de passe reutilisable avec icone "oeil" :
 * un clic affiche le mot de passe, un second clic le masque.
 *
 * La valeur est exposee via un model() => binding two-way standard :
 *   <app-champ-mot-de-passe [(valeur)]="motDePasse"></app-champ-mot-de-passe>
 * Aucune logique metier ici : le composant ne fait que gerer l'affichage.
 */
@Component({
  selector: 'app-champ-mot-de-passe',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './champ-mot-de-passe.component.html',
  styleUrls: ['./champ-mot-de-passe.component.scss']
})
export class ChampMotDePasseComponent {

  /** Valeur du champ (two-way binding via model) ; undefined accepte pour les DTO optionnels */
  readonly valeur = model<string | undefined>(undefined);

  /** Texte indicatif affiche dans le champ */
  readonly placeholder = input<string>('Mot de passe');

  /** Valeur de l'attribut autocomplete (current-password / new-password) */
  readonly autocomplete = input<string>('current-password');

  /** Identifiant optionnel du champ (accessibilite / labels) */
  readonly inputId = input<string | undefined>(undefined);

  /** Etat d'erreur : passe la bordure du champ en rouge (classe input-error globale) */
  readonly erreur = input<boolean | undefined>(false);

  /** Etat d'affichage : false = masque (points), true = visible */
  readonly afficher = signal(false);

  basculerAffichage(): void {
    this.afficher.update(etat => !etat);
  }
}
// touch
