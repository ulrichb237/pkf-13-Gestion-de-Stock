package com.k48.gestiondestock.controller;


import com.k48.gestiondestock.controller.api.VentesApi;
import com.k48.gestiondestock.dto.LigneVenteDto;
import com.k48.gestiondestock.dto.VentesDto;
import com.k48.gestiondestock.services.VentesService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class VentesController implements VentesApi {

  private VentesService ventesService;

  @Autowired
  public VentesController(VentesService ventesService) {
    this.ventesService = ventesService;
  }

  @Override
  public VentesDto save(VentesDto dto) {
    return ventesService.save(dto);
  }

  @Override
  public VentesDto findById(Integer id) {
    return ventesService.findById(id);
  }

  @Override
  public VentesDto findByCode(String code) {
    return ventesService.findByCode(code);
  }

  @Override
  public List<VentesDto> findAll() {
    return ventesService.findAll();
  }

  @Override
  public List<LigneVenteDto> findLignesByVenteId(Integer id) {
    return ventesService.findLignesByVenteId(id);
  }

  @Override
  public void delete(Integer id) {
    ventesService.delete(id);
  }
}
