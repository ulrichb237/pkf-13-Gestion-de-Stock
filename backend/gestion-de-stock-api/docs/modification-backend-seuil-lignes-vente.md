# Backend — Ajout du seuil d'alerte et des lignes de vente

> Branche : `feat/backend-seuil-alerte-lignes-vente`
> Base : `main` · Date : 22 septembre 2026
> Objectif : combler deux limitations du backend qui contraignaient le frontend
> StockFlow à des contournements locaux (seuils mémorisés par appareil, détail des
> ventes reconstitué via l'historique des articles).

---

## 1. Contexte

Deux informations métier essentielles n'étaient pas portées par le backend :

1. **Le seuil d'alerte de stock** d'un article (la quantité en dessous de laquelle
   l'article doit être réapprovisionné) n'existait nulle part : ni colonne en base,
   ni champ dans `ArticleDto`. Le frontend mémorisait donc les seuils dans le
   `localStorage` du navigateur : chaque appareil avait ses propres seuils, non
   partagés entre collègues et perdus si l'on change de poste.

2. **Les lignes d'une vente** (quels articles, en quelles quantités, à quel prix)
   n'étaient jamais renvoyées : `VentesDto.fromEntity()` ne mappe pas les lignes et
   aucun endpoint ne les expose, contrairement aux commandes clients/fournisseurs
   qui ont `GET /commandes-clients/{id}/lignes`. Le frontend devait appeler
   l'historique des ventes de **chaque article du catalogue** puis regrouper les
   lignes par vente — lourd et fragile (le détail disparaît si l'article est
   supprimé du catalogue).

## 2. Modification 1 — Champ `seuilAlerte` sur Article

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `model/Article.java` | Nouveau champ `Integer seuilAlerte` mappé sur la colonne `seuilalerte` |
| `dto/ArticleDto.java` | Champ exposé + mappé dans `fromEntity()` / `toEntity()` |
| `validator/ArticleValidator.java` | Validation : le seuil, s'il est renseigné, ne peut pas être négatif |
| `services/impl/ArticleServiceImpl.java` | Valeur par défaut **5** appliquée si le champ est absent à l'enregistrement |

### Base de données

Aucune migration manuelle n'est nécessaire : le projet utilise
`spring.jpa.hibernate.ddl-auto=update` (application.yml), Hibernate ajoute donc la
colonne `seuilalerte` (INT NULL) à la table `article` au démarrage. Les articles
existants ont un seuil à `NULL` et sont traités comme « défaut 5 » jusqu'à leur
prochaine modification. Pour les aligner explicitement :

```sql
UPDATE article SET seuilalerte = 5 WHERE seuilalerte IS NULL;
```

### API — contrat avant/après

`POST /api/v1/articles` (création et modification) accepte et renvoie désormais :

```json
{
  "codeArticle": "ART-2026-0001",
  "designation": "Clavier sans fil",
  "prixUnitaireHt": 10000,
  "tauxTva": 19.25,
  "prixUnitaireTtc": 11925,
  "category": { "id": 1 },
  "seuilAlerte": 10
}
```

- `seuilAlerte` est **facultatif** : absent ⇒ enregistré à 5.
- Renvoyé dans **toutes** les réponses articles (`GET /articles`,
  `GET /articles/{id}`, recherche par code, articles d'une catégorie…).
- Règle de lecture des alertes : `stock réel ≤ seuilAlerte` ⇒ article en alerte.

## 3. Modification 2 — Endpoint `GET /api/v1/ventes/{idVente}/lignes`

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `controller/api/VentesApi.java` | Déclaration du nouvel endpoint (OpenAPI documenté) |
| `services/VentesService.java` | Méthode `findLignesByVenteId(Integer id)` |
| `services/impl/VentesServiceImpl.java` | Implémentation : `ligneVenteRepository.findAllByVenteId(id)` → `LigneVenteDto` |
| `controller/VentesController.java` | Implémentation de la méthode d'interface |

### Contrat

```
GET /api/v1/ventes/{idVente}/lignes
Authorization: Bearer <jeton>
```

Réponse 200 :

```json
[
  {
    "id": 12,
    "article": { "id": 3, "codeArticle": "ART-2026-0003", "designation": "Souris", "...": "..." },
    "quantite": 2,
    "prixUnitaire": 8500,
    "idEntreprise": 1
  }
]
```

- Symétrique exact de `GET /commandes-clients/{id}/lignes`.
- Respecte le filtre multi-entreprise existant (`EntrepriseStatementInspector`).
- `idVente` inconnu ⇒ liste vide ; l'existence de la vente reste vérifiée par
  `GET /ventes/{id}` (aucune fuite d'information).

## 4. Impact frontend (fait dans la même branche)

| Élément | Avant | Après |
|---|---|---|
| Source du seuil | `localStorage` par appareil (`SeuilsStore` seul) | Champ `seuilAlerte` de la fiche article ; le stockage local ne sert plus que de repli pour les anciennes fiches sans valeur |
| Formulaire article | Le seuil était mémorisé localement après enregistrement | Le seuil est envoyé au serveur dans le payload (`seuilAlerte`) |
| Écran « Stock d'un article » | Modifier le seuil = écriture locale | Modifier le seuil = enregistrement de la fiche (persistant, partagé) |
| Écrans d'alertes (Alertes, Dashboard, Mouvements, Catalogue) | `seuils.seuil(id)` | `seuilDe(article)` : lit `article.seuilAlerte`, défaut 5 |
| Détail des ventes (liste + détail) | Reconstitution via l'historique des ventes de chaque article | Appel direct de `GET /ventes/{id}/lignes` (endpoint unique) |
| Modèles TS | `ArticleDto` sans seuil, service Ventes sans lignes | `ArticleDto.seuilAlerte?`, `VentesService.findLignes(id)` |

## 5. Tests à effectuer avant la fusion

1. `mvnw compile` : ✅ fait (aucune erreur).
2. Démarrer MySQL puis `mvnw spring-boot:run` : vérifier dans les logs Hibernate
   l'ajout de la colonne `seuilalerte`.
3. Swagger (`http://localhost:8081/swagger-ui.html`) :
   - créer un article **sans** `seuilAlerte` ⇒ réponse avec `"seuilAlerte": 5` ;
   - créer un article avec `"seuilAlerte": 10` ⇒ renvoyé tel quel ;
   - `GET /api/v1/ventes/{id}/lignes` sur une vente existante ⇒ lignes attendues.
4. Frontend (`ng serve`) :
   - modifier le seuil depuis « Stock d'un article », puis recharger la page depuis
     un **autre navigateur** : le seuil doit être identique (persistance serveur) ;
   - créer une vente puis ouvrir son détail : les lignes s'affichent immédiatement.

## 6. Points d'attention

- **Rétrocompatibilité** : les clients qui n'envoient pas `seuilAlerte` continuent de
  fonctionner (défaut 5). Aucun endpoint existant n'a changé de signature.
- **Le champ est désormais la source de vérité** : si une équipe utilisait des seuils
  locaux différents selon les postes, la valeur serveur prend le dessus à la
  prochaine modification de chaque fiche.
- L'endpoint lignes est en **lecture seule** : la modification des lignes d'une vente
  reste interdite (les sorties de stock sont déjà comptabilisées).
