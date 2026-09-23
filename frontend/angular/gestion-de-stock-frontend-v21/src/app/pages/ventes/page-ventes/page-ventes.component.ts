import { NgFor, NgIf, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import {Router} from '@angular/router';
import {VentesServiceApp} from '../../../services/ventes/ventes.service';
import {VentesDto} from '../../../../gs-api/src/models/ventes-dto';

import { BouttonActionComponent } from '../../../composants/boutton-action/boutton-action.component';

import { PaginationComponent } from '../../../composants/pagination/pagination.component';

@Component({
  imports: [NgIf, NgFor, DatePipe, BouttonActionComponent, PaginationComponent],
  selector: 'app-page-ventes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-ventes.component.html',
  styleUrls: ['./page-ventes.component.scss']
})
export class PageVentesComponent implements OnInit {

  /** Etat en signals : ecrits depuis les callbacks HTTP (zoneless-safe) */
  readonly listVentes = signal<Array<VentesDto>>([]);
  readonly errorMsg = signal('');
  /** id de la vente en attente de confirmation de suppression ; null = aucun dialog */
  readonly venteASupprimer = signal<VentesDto | null>(null);

  constructor(
    private router: Router,
    private ventesService: VentesServiceApp
  ) { }

  nouvelleVente(): void {
    this.router.navigate(['nouvelle-vente']);
  }

  ngOnInit(): void {
    this.findAllVentes();
  }

  findAllVentes(): void {
    this.ventesService.findAllVentes()
    .subscribe(ventes => {
      this.listVentes.set(ventes || []);
    }, error => {
      this.errorMsg.set(VentesServiceApp.errorMsg(error));
    });
  }

  selectVentePourSupprimer(vente: VentesDto): void {
    this.venteASupprimer.set(vente);
  }

  annulerSuppressionVente(): void {
    this.venteASupprimer.set(null);
  }

  confirmerEtSupprimerVente(): void {
    const vente = this.venteASupprimer();
    this.venteASupprimer.set(null);
    if (vente?.id) {
      this.ventesService.deleteVente(vente.id)
      .subscribe(() => {
        this.findAllVentes();
      }, error => {
        this.errorMsg.set(VentesServiceApp.errorMsg(error));
      });
    }
  }
}
