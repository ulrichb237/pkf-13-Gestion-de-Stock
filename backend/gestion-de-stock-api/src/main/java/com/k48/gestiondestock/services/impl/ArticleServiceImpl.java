package com.k48.gestiondestock.services.impl;

import com.k48.gestiondestock.dto.ArticleDto;
import com.k48.gestiondestock.dto.LigneCommandeClientDto;
import com.k48.gestiondestock.dto.LigneCommandeFournisseurDto;
import com.k48.gestiondestock.dto.LigneVenteDto;
import com.k48.gestiondestock.exception.EntityNotFoundException;
import com.k48.gestiondestock.exception.ErrorCodes;
import com.k48.gestiondestock.exception.InvalidEntityException;
import com.k48.gestiondestock.exception.InvalidOperationException;
import com.k48.gestiondestock.model.LigneCommandeClient;
import com.k48.gestiondestock.model.LigneCommandeFournisseur;
import com.k48.gestiondestock.model.LigneVente;
import com.k48.gestiondestock.repository.ArticleRepository;
import com.k48.gestiondestock.repository.LigneCommandeClientRepository;
import com.k48.gestiondestock.repository.LigneCommandeFournisseurRepository;
import com.k48.gestiondestock.repository.LigneVenteRepository;
import com.k48.gestiondestock.services.ArticleService;
import com.k48.gestiondestock.validator.ArticleValidator;
import java.util.List;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import com.k48.gestiondestock.utils.CodeGenerator;
import com.k48.gestiondestock.model.Article;

@Service
@Slf4j
public class ArticleServiceImpl implements ArticleService {

  private ArticleRepository articleRepository;
  private LigneVenteRepository venteRepository;
  private LigneCommandeFournisseurRepository commandeFournisseurRepository;
  private LigneCommandeClientRepository commandeClientRepository;

  @Autowired
  public ArticleServiceImpl(
      ArticleRepository articleRepository,
      LigneVenteRepository venteRepository, LigneCommandeFournisseurRepository commandeFournisseurRepository,
      LigneCommandeClientRepository commandeClientRepository) {
    this.articleRepository = articleRepository;
    this.venteRepository = venteRepository;
    this.commandeFournisseurRepository = commandeFournisseurRepository;
    this.commandeClientRepository = commandeClientRepository;
  }

  @Override
  public ArticleDto save(ArticleDto dto) {
    List<String> errors = ArticleValidator.validate(dto);
    if (!errors.isEmpty()) {
      log.error("Article is not valid {}", dto);
      throw new InvalidEntityException("L'article n'est pas valide", ErrorCodes.ARTICLE_NOT_VALID, errors);
    }

    // Code auto-genre si absent (ART-2026-0001) : l'utilisateur n'a plus a le
    // saisir, ce qui evite les codes non uniformes ou en double.
    if (!CodeGenerator.estFourni(dto.getCodeArticle())) {
      String dernier = articleRepository.findTopByCodeArticleStartingWithOrderByIdDesc("ART-")
          .map(Article::getCodeArticle).orElse(null);
      dto.setCodeArticle(CodeGenerator.nextArticleCode(dernier));
    }

    // Seuil d'alerte : defaut 5 si non renseigne (coherence avec le frontend,
    // qui utilisait 5 comme seuil par defaut avant l'existence du champ).
    if (dto.getSeuilAlerte() == null) {
      dto.setSeuilAlerte(5);
    }

    return ArticleDto.fromEntity(
        articleRepository.save(
            ArticleDto.toEntity(dto)
        )
    );
  }

  @Override
  public ArticleDto findById(Integer id) {
    if (id == null) {
      log.error("Article ID is null");
      return null;
    }

    return articleRepository.findById(id).map(ArticleDto::fromEntity).orElseThrow(() ->
        new EntityNotFoundException(
            "Aucun article avec l'ID = " + id + " n' ete trouve dans la BDD",
            ErrorCodes.ARTICLE_NOT_FOUND)
    );
  }

  @Override
  public ArticleDto findByCodeArticle(String codeArticle) {
    if (!StringUtils.hasLength(codeArticle)) {
      log.error("Article CODE is null");
      return null;
    }

    return articleRepository.findArticleByCodeArticle(codeArticle)
        .map(ArticleDto::fromEntity)
        .orElseThrow(() ->
            new EntityNotFoundException(
                "Aucun article avec le CODE = " + codeArticle + " n' ete trouve dans la BDD",
                ErrorCodes.ARTICLE_NOT_FOUND)
        );
  }

  @Override
  public List<ArticleDto> findAll() {
    return articleRepository.findAll().stream()
        .map(ArticleDto::fromEntity)
        .collect(Collectors.toList());
  }

  @Override
  public List<LigneVenteDto> findHistoriqueVentes(Integer idArticle) {
    return venteRepository.findAllByArticleId(idArticle).stream()
        .map(LigneVenteDto::fromEntity)
        .collect(Collectors.toList());
  }

  @Override
  public List<LigneCommandeClientDto> findHistoriqueCommandeClient(Integer idArticle) {
    return commandeClientRepository.findAllByArticleId(idArticle).stream()
        .map(LigneCommandeClientDto::fromEntity)
        .collect(Collectors.toList());
  }

  @Override
  public List<LigneCommandeFournisseurDto> findHistoriqueCommandeFournisseur(Integer idArticle) {
    return commandeFournisseurRepository.findAllByArticleId(idArticle).stream()
        .map(LigneCommandeFournisseurDto::fromEntity)
        .collect(Collectors.toList());
  }

  @Override
  public List<ArticleDto> findAllArticleByIdCategory(Integer idCategory) {
    return articleRepository.findAllByCategoryId(idCategory).stream()
        .map(ArticleDto::fromEntity)
        .collect(Collectors.toList());
  }

  @Override
  public void delete(Integer id) {
    if (id == null) {
      log.error("Article ID is null");
      return;
    }
    List<LigneCommandeClient> ligneCommandeClients = commandeClientRepository.findAllByArticleId(id);
    if (!ligneCommandeClients.isEmpty()) {
      throw new InvalidOperationException("Impossible de supprimer un article deja utilise dans des commandes client", ErrorCodes.ARTICLE_ALREADY_IN_USE);
    }
    List<LigneCommandeFournisseur> ligneCommandeFournisseurs = commandeFournisseurRepository.findAllByArticleId(id);
    if (!ligneCommandeFournisseurs.isEmpty()) {
      throw new InvalidOperationException("Impossible de supprimer un article deja utilise dans des commandes fournisseur",
          ErrorCodes.ARTICLE_ALREADY_IN_USE);
    }
    List<LigneVente> ligneVentes = venteRepository.findAllByArticleId(id);
    if (!ligneVentes.isEmpty()) {
      throw new InvalidOperationException("Impossible de supprimer un article deja utilise dans des ventes",
          ErrorCodes.ARTICLE_ALREADY_IN_USE);
    }
    articleRepository.deleteById(id);
  }
}
