# Contributing à pi-render

Merci de votre intérêt pour contribuer à pi-render ! 🎨

## 📋 Prérequis

- Node.js >= 18
- npm ou yarn
- Git

## 🚀 Installation pour le développement

```bash
# Cloner le repository
git clone https://github.com/user/pi-render.git
cd pi-render

# Installer les dépendances
npm install

# Lancer le mode développement
npm run dev
```

## 🏗️ Architecture du code

```
src/
├── index.ts       # Point d'entrée, system prompt, enregistrement du tool
├── server.ts      # Serveur Express, routes API, SSE, interface HTML
├── browser.ts     # Ouverture cross-platform du navigateur
├── logger.ts      # Logger central avec broadcast SSE
├── debug-page.ts  # Page HTML pour le debug
└── types.ts       # Interfaces TypeScript partagées
```

## 📝 Convention de code

- **TypeScript strict** — pas de `any` sans justification
- **ES2020 target** — syntaxe moderne mais compatible Node 18+
- **2 espaces** pour l'indentation
- **PascalCase** pour les interfaces/types
- **camelCase** pour les variables et fonctions
- **UPPER_CASE** pour les constantes

## 🔄 Workflow de développement

1. **Fork** le repository
2. **Créer une branche** depuis `main` :
   ```bash
   git checkout -b feat/ma-fonctionnalite
   ```
3. **Effectuer vos modifications**
4. **Tester** :
   ```bash
   npm run build
   ```
5. **Commiter** avec un message conventionnel :
   ```bash
   git commit -m "feat: ajoute nouvelle option de rendu"
   ```
6. **Push** et créer une Pull Request

## 📌 Convention de commits

Nous utilisons [Conventional Commits](https://www.conventionalcommits.org/) :

| Type | Description |
|------|-------------|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation |
| `style` | Formatage, pas de changement de logique |
| `refactor` | Refactoring sans changement de fonctionnalité |
| `perf` | Amélioration de performance |
| `test` | Ajout/modification de tests |
| `chore` | Tâches de maintenance |

Exemples :
```
feat: ajout du support des graphiques en camembert
fix: correction du crash lors du redémarrage serveur
docs: mise à jour du README avec exemples
```

## 🐛 Signaler un bug

1. Vérifier que le bug n'est pas déjà signalé dans [Issues](https://github.com/user/pi-render/issues)
2. Créer une nouvelle Issue avec :
   - Titre descriptif
   - Étapes pour reproduire
   - Comportement attendu vs obtenu
   - Version de pi-render
   - Logs éventuels (page `/debug`)

## 💡 Proposer une fonctionnalité

1. Ouvrir une Issue avec le tag `[feature]`
2. Décrire le cas d'usage et la motivation
3. Proposer une implémentation si possible

## 📄 Licence

En contribuant, vous acceptez que vos contributions soient licenciées sous la licence MIT du projet.

---

Merci pour votre contribution ! 🙏
