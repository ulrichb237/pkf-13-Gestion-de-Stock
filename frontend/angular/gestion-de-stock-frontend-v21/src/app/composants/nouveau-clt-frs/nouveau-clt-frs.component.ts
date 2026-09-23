import { NgIf, NgFor, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {ChangeDetectionStrategy, Component, EventEmitter, inject, input, OnInit, Output} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ClientDto} from '../../../gs-api/src/models/client-dto';
import {AdresseDto} from '../../../gs-api/src/models/adresse-dto';
import {CltfrsService} from '../../services/cltfrs/cltfrs.service';
import {FournisseurDto} from '../../../gs-api/src/models/fournisseur-dto';
import {PhotosService} from '../../../gs-api/src/services/photos.service';
import SavePhotoParams = PhotosService.SavePhotoParams;

/** Clefs de champs du formulaire client / fournisseur (erreurs sous le champ) */
type ChampsCltFrs = 'nom' | 'prenom' | 'mail' | 'numTel' | 'adresse1' | 'adresse2' | 'ville' | 'codePostale' | 'pays';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, NgFor, NgClass, FormsModule],
  selector: 'app-nouveau-clt-frs',
  templateUrl: './nouveau-clt-frs.component.html',
  styleUrls: ['./nouveau-clt-frs.component.scss']
})
export class NouveauCltFrsComponent implements OnInit {

  /** Origine client/fournisseur : recue de la donnee de route via withComponentInputBinding */
  origin = input.required<'client' | 'fournisseur'>();

  clientFournisseur: any = {};
  adresseDto: AdresseDto = {};
  errorMsg: Array<string> = [];

  /** Erreurs rattachees a un champ (affichees sous le champ concerne) */
  erreursChamps: Partial<Record<ChampsCltFrs, string[]>> = {};
  /** Erreurs non rattachees a un champ precis (bandeau general) */
  erreursGenerales: Array<string> = [];
  file: File | null = null;
  imgUrl: string | ArrayBuffer = 'assets/product.png';

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private cltFrsService: CltfrsService,
    private photoService: PhotosService
  ) { }

  ngOnInit(): void {
    this.findObject();
  }

  findObject(): void {
    const id = this.activatedRoute.snapshot.params['id'];
    if (id) {
      if (this.origin() === 'client') {
        this.cltFrsService.findClientById(id)
        .subscribe(client => {
          this.clientFournisseur = client;
          this.adresseDto = this.clientFournisseur.adresse;
        });
      } else if (this.origin() === 'fournisseur') {
        this.cltFrsService.findFournisseurById(id)
        .subscribe(fournisseur => {
          this.clientFournisseur = fournisseur;
          this.adresseDto = this.clientFournisseur.adresse;
        });
      }
    }
  }

  /**
   * Associe un message du backend (ClientValidator / FournisseurValidator /
   * AdresseValidator) au champ concerne. Ordre important : les libelles les
   * plus specifiques d'abord (adresse 2 avant adresse 1, nom avant prenom).
   */
  private static readonly REGLES_CHAMP_CLT_FRS: Array<{ champ: ChampsCltFrs; motif: RegExp }> = [
    { champ: 'adresse2', motif: /adresse 2/i },
    { champ: 'adresse1', motif: /adresse 1/i },
    { champ: 'ville', motif: /ville/i },
    { champ: 'codePostale', motif: /code postal/i },
    { champ: 'pays', motif: /pays/i },
    { champ: 'mail', motif: /mail/i },
    { champ: 'numTel', motif: /telephone/i },
    { champ: 'prenom', motif: /prenom/i },
    { champ: 'nom', motif: /nom/i }
  ];

  /**
   * Repartit les messages du backend sous le champ concerne.
   * Un message non reconnu reste dans le bandeau general.
   */
  private repartirErreurs(messages: Array<string>): void {
    const parChamp: Partial<Record<ChampsCltFrs, string[]>> = {};
    const generales: Array<string> = [];

    for (const message of messages) {
      const regle = NouveauCltFrsComponent.REGLES_CHAMP_CLT_FRS.find(r => r.motif.test(message));
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
  erreurDe(champ: ChampsCltFrs): Array<string> {
    return this.erreursChamps[champ] ?? [];
  }

  /** Classe input-error a appliquer au champ tant que son erreur est affichee */
  classeErreur(champ: ChampsCltFrs): Record<string, boolean> {
    return { 'input-error': this.erreurDe(champ).length > 0 };
  }

  enregistrer(): void {
    this.erreursChamps = {};
    this.erreursGenerales = [];
    if (this.origin() === 'client') {
      this.cltFrsService.enregistrerClient(this.mapToClient())
      .subscribe(client => {
        this.savePhoto(client.id, client.nom);
      }, error => {
        this.repartirErreurs(error?.error?.errors ?? []);
      });
    } else if (this.origin() === 'fournisseur') {
      this.cltFrsService.enregistrerFournisseur(this.mapToFournisseur())
      .subscribe(fournisseur => {
        this.savePhoto(fournisseur.id, fournisseur.nom);
      }, error => {
        this.repartirErreurs(error?.error?.errors ?? []);
      });
    }
  }

  cancelClick(): void {
    if (this.origin() === 'client') {
      this.router.navigate(['clients']);
    } else if (this.origin() === 'fournisseur') {
      this.router.navigate(['fournisseurs']);
    }
  }

  mapToClient(): ClientDto {
    const clientDto: ClientDto = this.clientFournisseur;
    clientDto.adresse = this.adresseDto;
    return clientDto;
  }

  mapToFournisseur(): FournisseurDto {
    const fournisseurDto: FournisseurDto = this.clientFournisseur;
    fournisseurDto.adresse = this.adresseDto;
    return fournisseurDto;
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

  savePhoto(idObject?: number, titre?: string): void {
    if (idObject && titre && this.file) {
      const params: SavePhotoParams = {
        id: idObject,
        file: this.file,
        title: titre,
        context: this.origin()
      };
      this.photoService.savePhoto(params)
      .subscribe(res => {
        this.cancelClick();
      });
    } else {
      this.cancelClick();
    }
  }

}
