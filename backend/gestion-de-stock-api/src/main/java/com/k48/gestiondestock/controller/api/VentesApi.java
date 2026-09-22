package com.k48.gestiondestock.controller.api;

import static com.k48.gestiondestock.utils.Constants.VENTES_ENDPOINT;

import com.k48.gestiondestock.dto.LigneVenteDto;
import com.k48.gestiondestock.dto.VentesDto;
import com.k48.gestiondestock.handlers.ErrorDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@Tag(name = "Ventes", description = "Ventes directes (sans commande client) et leurs lignes")
public interface VentesApi {

  @PostMapping(VENTES_ENDPOINT)
  @Operation(summary = "Enregistrer une vente",
      description = "Enregistre la vente et ses lignes, et génère une sortie de stock pour chaque ligne.")
  @ApiResponse(responseCode = "200", description = "Vente enregistrée")
  @ApiResponse(responseCode = "400", description = "Vente invalide ou article introuvable",
      content = @Content(schema = @Schema(implementation = ErrorDto.class)))
  VentesDto save(@io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Vente à enregistrer avec ses lignes (sans champ `id`)",
      content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = VentesDto.class),
          examples = @ExampleObject(name = ExemplesOpenApi.CREATION, value = ExemplesOpenApi.VENTE)))
      @RequestBody VentesDto dto);

  @GetMapping(VENTES_ENDPOINT)
  @Operation(summary = "Lister les ventes")
  @ApiResponse(responseCode = "200", description = "Liste des ventes")
  List<VentesDto> findAll();

  @GetMapping(VENTES_ENDPOINT + "/{idVente}")
  @Operation(summary = "Rechercher une vente par identifiant")
  @ApiResponse(responseCode = "200", description = "Vente trouvée")
  @ApiResponse(responseCode = "404", description = "Aucune vente avec cet identifiant",
      content = @Content(schema = @Schema(implementation = ErrorDto.class)))
  VentesDto findById(@Parameter(description = "Identifiant de la vente", example = "1") @PathVariable("idVente") Integer id);

  @GetMapping(VENTES_ENDPOINT + "/{idVente}/lignes")
  @Operation(summary = "Lister les lignes d'une vente",
      description = "Renvoie les lignes (articles, quantités, prix) de la vente demandée.")
  @ApiResponse(responseCode = "200", description = "Lignes de la vente")
  List<LigneVenteDto> findLignesByVenteId(@Parameter(description = "Identifiant de la vente", example = "1") @PathVariable("idVente") Integer id);

  @GetMapping(VENTES_ENDPOINT + "/code/{codeVente}")
  @Operation(summary = "Rechercher une vente par code")
  @ApiResponse(responseCode = "200", description = "Vente trouvée")
  @ApiResponse(responseCode = "404", description = "Aucune vente avec ce code",
      content = @Content(schema = @Schema(implementation = ErrorDto.class)))
  VentesDto findByCode(@Parameter(description = "Code de la vente", example = "V-2026-001") @PathVariable("codeVente") String code);

  @DeleteMapping(VENTES_ENDPOINT + "/{idVente}")
  @Operation(summary = "Supprimer une vente", description = "Refusé si la vente contient des lignes.")
  @ApiResponse(responseCode = "200", description = "Vente supprimée")
  @ApiResponse(responseCode = "400", description = "Vente non vide, suppression impossible",
      content = @Content(schema = @Schema(implementation = ErrorDto.class)))
  void delete(@Parameter(description = "Identifiant de la vente", example = "1") @PathVariable("idVente") Integer id);

}
