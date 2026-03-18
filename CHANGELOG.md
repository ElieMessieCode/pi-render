# Changelog

Toutes les changements notables de pi-render seront documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhere à [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

### Added
- Documentation complète du projet
- Configuration CI/CD GitHub Actions
- Fichiers de configuration (.editorconfig, .gitignore, .npmignore)

## [1.0.0] - 2024-01-15

### Added
- Affichage de pages HTML interactives dans le navigateur
- Serveur Express avec SSE pour le live-reload
- Historique scrollable des visuels
- Sauvegarde automatique dans `~/.pi/agent/renders/`
- Page de debug avec logs temps réel
- System prompt injecté pour guider l'agent LLM
- Patterns SVG recommandés (barres, courbes, camemberts, flux)
- Composants CSS (tabs, accordéon, grid, cards)
- Download, copie HTML, ouverture nouvel onglet
- Logger central avec broadcast SSE
- Support cross-platform (Windows, macOS, Linux)
- Palette de couleurs dark prédéfinie
- Animations CSS recommandées

### Technical
- TypeScript avec ES2020 target
- Express pour le serveur HTTP
- Server-Sent Events pour la communication temps réel
- Gestion des erreurs et logs structurés
- Hooks d'extension pi-coding-agent (context, session_end, session_switch)

---

## Format des versions

- **MAJOR** (X.0.0) : Changements incompatibles avec les versions précédentes
- **MINOR** (0.X.0) : Ajout de fonctionnalités rétrocompatibles
- **PATCH** (0.0.X) : Corrections de bugs rétrocompatibles
