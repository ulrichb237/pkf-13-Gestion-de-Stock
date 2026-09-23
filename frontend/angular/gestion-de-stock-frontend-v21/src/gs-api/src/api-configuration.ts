/* tslint:disable */
import { Injectable, inject } from '@angular/core';
import { SessionService } from '../../app/services/session/session.service';

/**
 * Global configuration for Api services.
 * L'URL du backend ne vient plus d'une constante en dur mais de
 * SessionService (qui lit environments/environment.ts), donc elle change
 * sans retoucher ce fichier genere.
 */
@Injectable({
  providedIn: 'root',
})
export class ApiConfiguration {
  private readonly session = inject(SessionService);

  get rootUrl(): string {
    return this.session.apiUrl;
  }
}

export interface ApiConfigurationInterface {
  rootUrl?: string;
}
