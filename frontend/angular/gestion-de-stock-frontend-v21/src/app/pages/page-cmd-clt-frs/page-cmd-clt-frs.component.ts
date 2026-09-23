import { NgIf, NgFor } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {CmdcltfrsService} from '../../services/cmdcltfrs/cmdcltfrs.service';
import {CommandeClientDto} from '../../../gs-api/src/models/commande-client-dto';
import {LigneCommandeClientDto} from '../../../gs-api/src/models/ligne-commande-client-dto';
import { NotificationService } from '../../services/notification/notification.service';
import { Observable } from 'rxjs';
import { ClientDto } from '../../../gs-api/src/models/client-dto';
import { FournisseurDto } from '../../../gs-api/src/models/fournisseur-dto';
import { ArticleDto } from '../../../gs-api/src/models/article-dto';
import { CltfrsService } from '../../services/cltfrs/cltfrs.service';
import { ArticleService } from '../../services/article/article.service';
import { OptionRemplacement, DialogRemplacementComponent } from '../../composants/dialog-remplacement/dialog-remplacement.component';

import { RechercheCmdComponent } from '../../composants/recherche-cmd/recherche-cmd.component';

import { BouttonActionComponent } from '../../composants/boutton-action/boutton-action.component';

import { DetailCmdComponent } from '../../composants/detail-cmd/detail-cmd.component';

import { DetailCmdCltFrsComponent } from '../../composants/detail-cmd-clt-frs/detail-cmd-clt-frs.component';

import { PaginationComponent } from '../../composants/pagination/pagination.component';

/** Etats du workflow backend, dans l'ordre de progression */
type EtatCommande = 'EN_PREPARATION' | 'VALIDEE' | 'LIVREE';

@Component({
  imports: [NgIf, NgFor, BouttonActionComponent, DetailCmdComponent, DetailCmdCltFrsComponent, PaginationComponent, RechercheCmdComponent, DialogRemplacementComponent],
  selector: 'app-page-cmd-clt-frs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-cmd-clt-frs.component.html',
  styleUrls: ['./page-cmd-clt-frs.component.scss']
})
export class PageCmdCltFrsComponent implements OnInit, OnDestroy {

  /** Origine client/fournisseur : recue de la route via withComponentInputBinding */
  origin = input.required<'client' | 'fournisseur'>();
  /** Etat en signals : ecrits depuis les callbacks HTTP (zoneless-safe) */
  readonly listeCommandes = signal<Array<any>>([]);
  readonly errorMsg = signal('');
  readonly mapLignesCommande = signal(new Map<number, LigneCommandeClientDto[]>());
  readonly mapPrixTotalCommande = signal(new Map<number, number>());

  /** etat d'ouverture de l'accordeon par commande (reference recreee a chaque bascule) */
  readonly commandesOuvertes = signal(new Set<number>());
  /** commandes dont les lignes sont en cours de chargement (lazy a l'ouverture) */
  readonly chargementLignes = signal(new Set<number>());
  /** confirmation de suppression de commande (remplace la modale Bootstrap) */
  readonly commandeASupprimer = signal<CommandeClientDto | null>(null);
  /** commande dont le menu de changement d'etat est ouvert */
  readonly commandeEtatMenuOuvert = signal<number | null>(null);
  /** changement d'etat en cours (desactive les boutons) */
  readonly changementEtatEnCours = signal(false);
  /** PATCH/DELETE de ligne en cours : idLigne -> composant detail-cmd a debloquer */
  private lignesEnCours = new Map<number, DetailCmdComponent>();
  /** derniere commande dont on a ouvert une ligne (contexte des actions ligne) */
  private dernierIdCommandeOuvert: number | null = null;

  /* Recherche par code : resultat affiche seul, '' = retour a la liste complete */
  readonly cmdRecherchee = signal<CommandeClientDto | null>(null);
  readonly rechercheEnCours = signal(false);
  /** Liste affichee : le resultat de recherche seul, ou la liste complete.
   * Typage any : aligne sur listeCommandes (les DTO client/fournisseur different). */
  readonly commandesAffichees = computed<Array<any>>(() => {
    const resultat = this.cmdRecherchee();
    return resultat ? [resultat] : this.listeCommandes();
  });

  /* Dialog de remplacement (reaffectation client/fournisseur ou article de ligne) */
  readonly dialogOuvert = signal<'' | 'client' | 'fournisseur' | 'article'>('');
  readonly optionsDialog = signal<Array<OptionRemplacement>>([]);
  readonly chargementDialog = signal(false);
  readonly operationDialogEnCours = signal(false);
  /** Ligne cible quand dialogOuvert = 'article' */
  private ligneCibleRemplacement: LigneCommandeClientDto | null = null;
  /** Commande cible du dialog (pour connaitre son contexte) */
  private commandeCibleDialog: any = null;

  constructor(
    private router: Router,
    private cmdCltFrsService: CmdcltfrsService,
    private notificationService: NotificationService,
    private cltFrsService: CltfrsService,
    private articleService: ArticleService
  ) { }

  ngOnInit(): void {
    // L'origine est un input.required lie a la donnee de route via
    // withComponentInputBinding : disponible des la creation, sans souscription.
    this.findAllCommandes();
  }

  ngOnDestroy(): void {
  }

  findAllCommandes(): void {
    this.errorMsg.set('');
    if (this.origin() === 'client') {
      this.cmdCltFrsService.findAllCommandesClient()
      .subscribe(cmd => {
        this.listeCommandes.set(cmd || []);
        // Perf : les lignes sont chargees a l'ouverture de l'accordeon (lazy),
        // pas ici — sinon 1 requete par commande au chargement (N+1).
        this.rafraichirLignesDejaChargees();
      }, error => {
        this.errorMsg.set(CmdcltfrsService.errorMsg(error));
      });
    } else if (this.origin() === 'fournisseur') {
      this.cmdCltFrsService.findAllCommandesFournisseur()
      .subscribe(cmd => {
        this.listeCommandes.set(cmd || []);
        this.rafraichirLignesDejaChargees();
      }, error => {
        this.errorMsg.set(CmdcltfrsService.errorMsg(error));
      });
    }
  }

  supprimerLigneCommande(ligne: LigneCommandeClientDto): void {
    // Le backend ne renvoie pas la commande parente dans la ligne (fromEntity
    // ne la peuple pas) : on la deduit de la commande ouverte dans l'accordeon.
    const idCommande = [...this.commandesOuvertes()][0] ?? this.dernierIdCommandeOuvert;
    if (!ligne.id || !idCommande) {
      return;
    }
    if (this.origin() === 'client') {
      this.cmdCltFrsService.deleteLigneCommandeClient(idCommande, ligne.id)
      .subscribe(() => this.findLignesCommande(idCommande), error => {
        this.errorMsg.set(CmdcltfrsService.errorMsg(error));
      });
    } else if (this.origin() === 'fournisseur') {
      this.cmdCltFrsService.deleteLigneCommandeFournisseur(idCommande, ligne.id!)
      .subscribe(() => this.findLignesCommande(idCommande), error => {
        this.errorMsg.set(CmdcltfrsService.errorMsg(error));
      });
    }
  }

  /** Ouvre/ferme l'accordeon d'une commande (remplace data-toggle=collapse).
   * A l'ouverture : chargement paresseux des lignes, avec cache (1 seule requete
   * par commande tant qu'elle n'a pas ete modifiee). */
  basculerAccordeon(idCommande?: number): void {
    if (!idCommande) {
      return;
    }
    this.dernierIdCommandeOuvert = idCommande;
    const nouveau = new Set(this.commandesOuvertes());
    if (nouveau.has(idCommande)) {
      nouveau.delete(idCommande);
    } else {
      nouveau.add(idCommande);
      if (!this.mapLignesCommande().has(idCommande)) {
        this.findLignesCommande(idCommande);
      }
    }
    this.commandesOuvertes.set(nouveau);
  }

  /** La commande est-elle editable ? (regle backend : LIVREE = non modifiable) */
  estModifiable(cmd: any): boolean {
    return cmd?.etatCommande !== 'LIVREE';
  }

  /** Reference enregistree par la ligne pour la debloquer apres le PATCH */
  enregistrerRefLigne(ligneId: number | undefined, composant: DetailCmdComponent): void {
    if (ligneId) {
      this.lignesEnCours.set(ligneId, composant);
    }
  }

  /** PATCH quantite d'une ligne (clients OU fournisseurs) */
  modifierQuantiteLigne(event: { ligne: LigneCommandeClientDto; quantite: number }): void {
    const ligne = event.ligne;
    const idCommande = [...this.commandesOuvertes()][0] ?? this.dernierIdCommandeOuvert;
    if (!ligne.id || !idCommande) {
      return;
    }
    // Typage explicite : les Observable client/fournisseur ont des generiques
    // differents et leur union rend .subscribe() non appelable (TS2349)
    const requete: Observable<unknown> = this.origin() === 'client'
      ? this.cmdCltFrsService.updateQuantiteCommandeClient(idCommande, ligne.id, event.quantite)
      : this.cmdCltFrsService.updateQuantiteCommandeFournisseur(idCommande, ligne.id, event.quantite);
    requete.subscribe(() => {
      this.notificationService.success('Quantite modifiee');
      this.finOperationLigne(ligne.id);
      this.findLignesCommande(idCommande);
    }, (error: any) => {
      this.errorMsg.set(CmdcltfrsService.errorMsg(error));
      this.finOperationLigne(ligne.id);
    });
  }

  /** Debloque le composant ligne apres une operation (succes ou echec) */
  private finOperationLigne(ligneId?: number): void {
    const ref = ligneId ? this.lignesEnCours.get(ligneId) : undefined;
    ref?.finOperation();
    if (ligneId) {
      this.lignesEnCours.delete(ligneId);
    }
  }

  /** Affiche la confirmation de suppression (remplace la modale Bootstrap) */
  demanderSuppressionCommande(cmd: CommandeClientDto): void {
    this.commandeASupprimer.set(cmd);
  }

  annulerSuppressionCommande(): void {
    this.commandeASupprimer.set(null);
  }

  supprimerCommande(id?: number): void {
    if (!id) {
      return;
    }
    if (this.origin() === 'client') {
      this.cmdCltFrsService.deleteCommandeClient(id)
      .subscribe(() => this.findAllCommandes(), error => {
        this.errorMsg.set(CmdcltfrsService.errorMsg(error));
      });
    } else if (this.origin() === 'fournisseur') {
      this.cmdCltFrsService.deleteCommandeFournisseur(id)
      .subscribe(() => this.findAllCommandes(), error => {
        this.errorMsg.set(CmdcltfrsService.errorMsg(error));
      });
    }
  }

  /** Rafraichit uniquement les lignes DEJA chargees (apres une modification) ;
   * au premier chargement le cache est vide donc aucune requete supplementaire. */
  findAllLignesCommande(): void {
    this.mapLignesCommande().forEach((_lignes, idCommande) => {
      this.findLignesCommande(idCommande);
    });
  }

  private rafraichirLignesDejaChargees(): void {
    if (this.mapLignesCommande().size) {
      this.findAllLignesCommande();
    }
  }

  nouvelleCommande(): void {
    if (this.origin() === 'client') {
      this.router.navigate(['nouvellecommandeclt']);
    } else if (this.origin() === 'fournisseur') {
      this.router.navigate(['nouvellecommandefrs']);
    }
  }

  findLignesCommande(idCommande?: number): void {
    if (!idCommande) {
      return;
    }
    this.chargementLignes.update(s => new Set(s).add(idCommande));
    // Typage explicite : union d'Observables non appelable sinon (TS2349)
    const requete: Observable<Array<any>> = this.origin() === 'client'
      ? this.cmdCltFrsService.findAllLigneCommandesClient(idCommande)
      : this.cmdCltFrsService.findAllLigneCommandesFournisseur(idCommande);
    requete.subscribe(list => {
      const nouveau = new Map(this.mapLignesCommande());
      nouveau.set(idCommande, list || []);
      this.mapLignesCommande.set(nouveau);
      this.mapPrixTotalCommande.update(m => new Map(m).set(idCommande, this.calculerTatalCmd(list || [])));
      this.finChargementLignes(idCommande);
    }, () => this.finChargementLignes(idCommande));
  }

  private finChargementLignes(idCommande: number): void {
    this.chargementLignes.update(s => {
      const n = new Set(s);
      n.delete(idCommande);
      return n;
    });
  }

  calculerTatalCmd(list: Array<LigneCommandeClientDto>): number {
    let total = 0;
    list.forEach(ligne => {
      if (ligne.prixUnitaire && ligne.quantite) {
        total += +ligne.quantite * +ligne.prixUnitaire;
      }
    });
    return Math.floor(total);
  }

  calculerTotalCommande(id?: number): number {
    return this.mapPrixTotalCommande().get(id!) ?? 0;
  }

  /* ================================================================
   * Workflow d'etat : EN_PREPARATION -> VALIDEE -> LIVREE
   * PATCH /api/v1/commandes-clients|fournisseurs/{id}/etat/{etat}
   * ================================================================ */

  /** Etats autorises pour une commande selon son etat courant.
   * Regles backend : une commande LIVREE n'est plus modifiable. */
  etatsSuivants(etatCourant?: string): EtatCommande[] {
    switch (etatCourant) {
      case 'EN_PREPARATION': return ['VALIDEE'];
      case 'VALIDEE': return ['LIVREE'];
      default: return []; // LIVREE ou etat inconnu : plus de transition
    }
  }

  ouvrirMenuEtat(idCommande: number): void {
    this.commandeEtatMenuOuvert.update(cur => cur === idCommande ? null : idCommande);
  }

  changerEtat(cmd: any, nouvelEtat: EtatCommande): void {
    if (!cmd?.id || this.changementEtatEnCours()) {
      return;
    }
    this.changementEtatEnCours.set(true);
    this.commandeEtatMenuOuvert.set(null);
    if (this.origin() === 'client') {
      this.cmdCltFrsService.updateEtatCommandeClient(cmd.id, nouvelEtat)
      .subscribe(() => this.apresChangementEtat(nouvelEtat), error => {
        this.changementEtatEnCours.set(false);
        this.errorMsg.set(CmdcltfrsService.errorMsg(error));
      });
    } else {
      this.cmdCltFrsService.updateEtatCommandeFournisseur(cmd.id, nouvelEtat)
      .subscribe(() => this.apresChangementEtat(nouvelEtat), (error: any) => {
        this.changementEtatEnCours.set(false);
        this.errorMsg.set(CmdcltfrsService.errorMsg(error));
      });
    }
  }

  private apresChangementEtat(nouvelEtat: EtatCommande): void {
    this.changementEtatEnCours.set(false);
    this.notificationService.success(`Commande ${nouvelEtat.toLowerCase().replace('_', ' ')}`);
    // Note metier backend : la livraison d'une commande client genere la
    // sortie de stock ; on rafraichit la liste complete pour reprendre
    // les etats a jour.
    this.findAllCommandes();
  }

  /* ================================================================
   * Recherche par code : GET /commandes-clients|fournisseurs/code/{code}
   * ================================================================ */

  rechercherParCode(code: string): void {
    if (!code) {
      // Annulation : retour a la liste complete
      this.cmdRecherchee.set(null);
      this.errorMsg.set('');
      return;
    }
    this.rechercheEnCours.set(true);
    this.errorMsg.set('');
    const requete: Observable<any> = this.origin() === 'client'
      ? this.cmdCltFrsService.findCommandeClientByCode(code)
      : this.cmdCltFrsService.findCommandeFournisseurByCode(code);
    requete.subscribe(cmd => {
      this.cmdRecherchee.set(cmd?.id ? cmd : null);
      if (!cmd?.id) {
        this.errorMsg.set(`Aucune commande trouvee avec le code ${code}`);
      }
      this.rechercheEnCours.set(false);
    }, (error: any) => {
      this.cmdRecherchee.set(null);
      this.errorMsg.set(CmdcltfrsService.errorMsg(error));
      this.rechercheEnCours.set(false);
    });
  }

  /* ================================================================
   * Reaffectation client/fournisseur : PATCH .../{id}/client|fournisseur/{id}
   * ================================================================ */

  ouvrirDialogReaffectation(cmd: any): void {
    if (!cmd?.id || !this.estModifiable(cmd)) {
      return;
    }
    this.commandeCibleDialog = cmd;
    this.dialogOuvert.set(this.origin() === 'client' ? 'client' : 'fournisseur');
    this.chargementDialog.set(true);
    this.optionsDialog.set([]);
    const requete: Observable<Array<ClientDto | FournisseurDto>> = this.origin() === 'client'
      ? this.cltFrsService.findAllClients()
      : this.cltFrsService.findAllFournisseurs();
    requete.subscribe(list => {
      this.optionsDialog.set((list || []).map(c => ({
        id: c.id,
        label: `${c.nom || ''} ${c.prenom || ''}`.trim(),
        sousTitre: c.mail || c.numTel || ''
      })));
      this.chargementDialog.set(false);
    }, (error: any) => {
      this.chargementDialog.set(false);
      this.errorMsg.set(CmdcltfrsService.errorMsg(error));
    });
  }

  /* ================================================================
   * Remplacement d'article d'une ligne : PATCH .../{id}/lignes/{idLigne}/article/{idArticle}
   * ================================================================ */

  ouvrirDialogRemplacementArticle(cmd: any, ligne: LigneCommandeClientDto): void {
    if (!cmd?.id || !this.estModifiable(cmd)) {
      return;
    }
    this.commandeCibleDialog = cmd;
    this.ligneCibleRemplacement = ligne;
    this.dialogOuvert.set('article');
    this.chargementDialog.set(true);
    this.optionsDialog.set([]);
    this.articleService.findAllArticles()
      .subscribe(list => {
        this.optionsDialog.set((list || []).map(a => ({
          id: a.id,
          label: a.designation || '',
          sousTitre: a.codeArticle || ''
        })));
        this.chargementDialog.set(false);
      }, (error: any) => {
        this.chargementDialog.set(false);
        this.errorMsg.set(CmdcltfrsService.errorMsg(error));
      });
  }

  /** Confirme le remplacement en cours dans le dialog (client, fournisseur ou article) */
  confirmerRemplacement(opt: OptionRemplacement): void {
    if (!opt.id || !this.commandeCibleDialog?.id || this.operationDialogEnCours()) {
      return;
    }
    this.operationDialogEnCours.set(true);
    const idCommande = this.commandeCibleDialog.id;
    let requete: Observable<unknown>;

    if (this.dialogOuvert() === 'client') {
      requete = this.cmdCltFrsService.updateClient(idCommande, opt.id);
    } else if (this.dialogOuvert() === 'fournisseur') {
      requete = this.cmdCltFrsService.updateFournisseur(idCommande, opt.id);
    } else if (this.dialogOuvert() === 'article' && this.ligneCibleRemplacement?.id) {
      requete = this.origin() === 'client'
        ? this.cmdCltFrsService.updateArticleCommandeClient(idCommande, this.ligneCibleRemplacement.id, opt.id)
        : this.cmdCltFrsService.updateArticleCommandeFournisseur(idCommande, this.ligneCibleRemplacement!.id, opt.id);
    } else {
      this.operationDialogEnCours.set(false);
      return;
    }

    requete.subscribe(() => {
      this.operationDialogEnCours.set(false);
      this.fermerDialog();
      this.notificationService.success('Commande mise a jour');
      // Les lignes en cache ne sont plus a jour (article remplace) : rechargement
      this.mapLignesCommande.update(m => {
        const copie = new Map(m);
        copie.delete(idCommande);
        return copie;
      });
      this.findLignesCommande(idCommande);
    }, (error: any) => {
      this.operationDialogEnCours.set(false);
      this.errorMsg.set(CmdcltfrsService.errorMsg(error));
    });
  }

  fermerDialog(): void {
    this.dialogOuvert.set('');
    this.optionsDialog.set([]);
    this.ligneCibleRemplacement = null;
    this.commandeCibleDialog = null;
  }

  /** Titre du dialog selon le type de remplacement (apostrophe protegee) */
  titreDialog(): string {
    switch (this.dialogOuvert()) {
      case 'client': return 'Reaffecter le client';
      case 'fournisseur': return 'Reaffecter le fournisseur';
      default: return "Remplacer l'article de la ligne";
    }
  }

  /** Valeur actuellement en place, affichee en contexte dans le dialog */
  valeurActuelleDialog(): string {
    const cmd = this.commandeCibleDialog;
    if (!cmd) {
      return '';
    }
    if (this.dialogOuvert() === 'client') {
      return `${cmd.client?.nom || ''} ${cmd.client?.prenom || ''}`.trim();
    }
    if (this.dialogOuvert() === 'fournisseur') {
      return `${cmd.fournisseur?.nom || ''} ${cmd.fournisseur?.prenom || ''}`.trim();
    }
    return this.ligneCibleRemplacement?.article?.designation || '';
  }
}
