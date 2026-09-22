package com.k48.gestiondestock.services.impl;


import com.k48.gestiondestock.dto.ArticleDto;
import com.k48.gestiondestock.dto.LigneVenteDto;
import com.k48.gestiondestock.dto.MvtStkDto;
import com.k48.gestiondestock.dto.VentesDto;
import com.k48.gestiondestock.exception.EntityNotFoundException;
import com.k48.gestiondestock.exception.ErrorCodes;
import com.k48.gestiondestock.exception.InvalidEntityException;
import com.k48.gestiondestock.exception.InvalidOperationException;
import com.k48.gestiondestock.model.Article;
import com.k48.gestiondestock.model.LigneVente;
import com.k48.gestiondestock.model.SourceMvtStk;
import com.k48.gestiondestock.model.TypeMvtStk;
import com.k48.gestiondestock.model.Ventes;
import com.k48.gestiondestock.repository.ArticleRepository;
import com.k48.gestiondestock.repository.LigneVenteRepository;
import com.k48.gestiondestock.repository.VentesRepository;
import com.k48.gestiondestock.services.MvtStkService;
import com.k48.gestiondestock.services.VentesService;
import com.k48.gestiondestock.validator.VentesValidator;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import com.k48.gestiondestock.utils.CodeGenerator;

@Service
@Slf4j
public class VentesServiceImpl implements VentesService {

  private ArticleRepository articleRepository;
  private VentesRepository ventesRepository;
  private LigneVenteRepository ligneVenteRepository;
  private MvtStkService mvtStkService;

  @Autowired
  public VentesServiceImpl(ArticleRepository articleRepository, VentesRepository ventesRepository,
      LigneVenteRepository ligneVenteRepository, MvtStkService mvtStkService) {
    this.articleRepository = articleRepository;
    this.ventesRepository = ventesRepository;
    this.ligneVenteRepository = ligneVenteRepository;
    this.mvtStkService = mvtStkService;
  }

  @Override
  public VentesDto save(VentesDto dto) {
    // Code auto-genre si absent (VEN-2026-0001)
    if (!CodeGenerator.estFourni(dto.getCode())) {
      String dernier = ventesRepository.findTopByCodeStartingWithOrderByIdDesc("VEN-")
          .map(Ventes::getCode).orElse(null);
      dto.setCode(CodeGenerator.nextVenteCode(dernier));
    }

    List<String> errors = VentesValidator.validate(dto);
    if (!errors.isEmpty()) {
      log.error("Ventes n'est pas valide");
      throw new InvalidEntityException("L'objet vente n'est pas valide", ErrorCodes.VENTE_NOT_VALID, errors);
    }

    List<String> articleErrors = new ArrayList<>();

    dto.getLigneVentes().forEach(ligneVenteDto -> {
      Optional<Article> article = articleRepository.findById(ligneVenteDto.getArticle().getId());
      if (article.isEmpty()) {
        articleErrors.add("Aucun article avec l'ID " + ligneVenteDto.getArticle().getId() + " n'a ete trouve dans la BDD");
      }
    });

    if (!articleErrors.isEmpty()) {
      log.error("One or more articles were not found in the DB, {}", errors);
      throw new InvalidEntityException("Un ou plusieurs articles n'ont pas ete trouve dans la BDD", ErrorCodes.VENTE_NOT_VALID, errors);
    }

    Ventes savedVentes = ventesRepository.save(VentesDto.toEntity(dto));

    dto.getLigneVentes().forEach(ligneVenteDto -> {
      LigneVente ligneVente = LigneVenteDto.toEntity(ligneVenteDto);
      ligneVente.setVente(savedVentes);
      // Propagation de l'entreprise : sans elle, le filtre multi-entreprise
      // (EntrepriseStatementInspector) rend les lignes et leurs mouvements
      // invisibles a toutes les lectures (historique vide, stock faux).
      ligneVente.setIdEntreprise(dto.getIdEntreprise());
      ligneVenteRepository.save(ligneVente);
      updateMvtStk(ligneVente);
    });

    return VentesDto.fromEntity(savedVentes);
  }

  @Override
  public VentesDto findById(Integer id) {
    if (id == null) {
      log.error("Ventes ID is NULL");
      return null;
    }
    return ventesRepository.findById(id)
        .map(VentesDto::fromEntity)
        .orElseThrow(() -> new EntityNotFoundException("Aucun vente n'a ete trouve dans la BDD", ErrorCodes.VENTE_NOT_FOUND));
  }

  @Override
  public VentesDto findByCode(String code) {
    if (!StringUtils.hasLength(code)) {
      log.error("Vente CODE is NULL");
      return null;
    }
    return ventesRepository.findVentesByCode(code)
        .map(VentesDto::fromEntity)
        .orElseThrow(() -> new EntityNotFoundException(
            "Aucune vente client n'a ete trouve avec le CODE " + code, ErrorCodes.VENTE_NOT_VALID
        ));
  }

  @Override
  public List<VentesDto> findAll() {
    return ventesRepository.findAll().stream()
        .map(VentesDto::fromEntity)
        .collect(Collectors.toList());
  }

  @Override
  public List<LigneVenteDto> findLignesByVenteId(Integer id) {
    if (id == null) {
      log.error("Vente ID is NULL");
      return List.of();
    }
    return ligneVenteRepository.findAllByVenteId(id).stream()
        .map(LigneVenteDto::fromEntity)
        .collect(Collectors.toList());
  }

  @Override
  public void delete(Integer id) {
    if (id == null) {
      log.error("Vente ID is NULL");
      return;
    }
    List<LigneVente> ligneVentes = ligneVenteRepository.findAllByVenteId(id);
    if (!ligneVentes.isEmpty()) {
      throw new InvalidOperationException("Impossible de supprimer une vente ...",
          ErrorCodes.VENTE_ALREADY_IN_USE);
    }
    ventesRepository.deleteById(id);
  }

  private void updateMvtStk(LigneVente lig) {
    MvtStkDto mvtStkDto = MvtStkDto.builder()
        .article(ArticleDto.fromEntity(lig.getArticle()))
        .dateMvt(Instant.now())
        .typeMvt(TypeMvtStk.SORTIE)
        .sourceMvt(SourceMvtStk.VENTE)
        .quantite(lig.getQuantite())
        .idEntreprise(lig.getIdEntreprise())
        .build();
    mvtStkService.sortieStock(mvtStkDto);
  }
}
