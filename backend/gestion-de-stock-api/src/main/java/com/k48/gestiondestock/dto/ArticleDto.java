package com.k48.gestiondestock.dto;

import com.k48.gestiondestock.model.Article;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Article du catalogue")
public class ArticleDto {

  @Schema(description = "Identifiant (laisser vide pour une création)", example = "1")
  private Integer id;

  @Schema(description = "Code unique de l'article", example = "ART-001", requiredMode = Schema.RequiredMode.REQUIRED)
  private String codeArticle;

  @Schema(description = "Libellé de l'article", example = "Clavier sans fil", requiredMode = Schema.RequiredMode.REQUIRED)
  private String designation;

  @Schema(description = "Prix unitaire hors taxes", example = "10000", requiredMode = Schema.RequiredMode.REQUIRED)
  private BigDecimal prixUnitaireHt;

  @Schema(description = "Taux de TVA en pourcentage", example = "19.25", requiredMode = Schema.RequiredMode.REQUIRED)
  private BigDecimal tauxTva;

  @Schema(description = "Prix unitaire toutes taxes comprises", example = "11925", requiredMode = Schema.RequiredMode.REQUIRED)
  private BigDecimal prixUnitaireTtc;

  @Schema(description = "Seuil d'alerte de stock : en dessous de cette quantité, l'article apparaît dans les alertes de réapprovisionnement (défaut 5 si non renseigné)", example = "10")
  private Integer seuilAlerte;

  @Schema(description = "URL de la photo, renseignée par l'endpoint Photos (à renvoyer telle quelle lors d'une modification)")
  private String photo;

  @Schema(description = "Catégorie de l'article (seul son identifiant est nécessaire)", requiredMode = Schema.RequiredMode.REQUIRED)
  private CategoryDto category;

  @Schema(description = "Identifiant de l'entreprise propriétaire", example = "1")
  private Integer idEntreprise;

  public static ArticleDto fromEntity(Article article) {
    if (article == null) {
      return null;
    }
    return ArticleDto.builder()
        .id(article.getId())
        .codeArticle(article.getCodeArticle())
        .designation(article.getDesignation())
        .photo(article.getPhoto())
        .prixUnitaireHt(article.getPrixUnitaireHt())
        .prixUnitaireTtc(article.getPrixUnitaireTtc())
        .tauxTva(article.getTauxTva())
        .seuilAlerte(article.getSeuilAlerte())
        .idEntreprise(article.getIdEntreprise())
        .category(CategoryDto.fromEntity(article.getCategory()))
        .build();
  }

  public static Article toEntity(ArticleDto articleDto) {
    if (articleDto == null) {
      return null;
    }
    Article article = new Article();
    article.setId(articleDto.getId());
    article.setCodeArticle(articleDto.getCodeArticle());
    article.setDesignation(articleDto.getDesignation());
    article.setPhoto(articleDto.getPhoto());
    article.setPrixUnitaireHt(articleDto.getPrixUnitaireHt());
    article.setPrixUnitaireTtc(articleDto.getPrixUnitaireTtc());
    article.setTauxTva(articleDto.getTauxTva());
    article.setSeuilAlerte(articleDto.getSeuilAlerte());
    article.setIdEntreprise(articleDto.getIdEntreprise());
    article.setCategory(CategoryDto.toEntity(articleDto.getCategory()));
    return article;
  }

}
