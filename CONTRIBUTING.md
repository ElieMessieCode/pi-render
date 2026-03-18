# Contributing to pi-render

Thank you for your interest in contributing to pi-render! 🎨

## 📋 Prerequisites

- Node.js >= 18
- npm or yarn
- Git

## 🚀 Development Setup

```bash
# Clone the repository
git clone https://github.com/ElieMessieCode/pi-render.git
cd pi-render

# Install dependencies
npm install

# Run in development mode
npm run dev
```

## 🏗️ Code Architecture

```
src/
├── index.ts       # Entry point, system prompt, tool registration
├── server.ts      # Express server, API routes, SSE, HTML interface
├── browser.ts     # Cross-platform browser opener
├── logger.ts      # Central logger with SSE broadcast
├── debug-page.ts  # HTML debug page
└── types.ts       # Shared TypeScript interfaces
```

## 📝 Code Conventions

- **Strict TypeScript** — no `any` without justification
- **ES2020 target** — modern syntax, Node 18+ compatible
- **2 spaces** for indentation
- **PascalCase** for interfaces/types
- **camelCase** for variables and functions
- **UPPER_CASE** for constants

## 🔄 Development Workflow

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
3. **Make your changes**
4. **Test**:
   ```bash
   npm run build
   ```
5. **Commit** with a conventional message:
   ```bash
   git commit -m "feat: add new render option"
   ```
6. **Push** and create a Pull Request

## 📌 Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Formatting, no logic change |
| `refactor` | Code refactoring without feature change |
| `perf` | Performance improvement |
| `test` | Adding/updating tests |
| `chore` | Maintenance tasks |

Examples:
```
feat: add pie chart SVG support
fix: fix crash on server restart
docs: update README with examples
```

## 🐛 Reporting Bugs

1. Check if the bug is already reported in [Issues](https://github.com/ElieMessieCode/pi-render/issues)
2. Create a new Issue with:
   - Descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - pi-render version
   - Logs if available (from `/debug` page)

## 💡 Feature Requests

1. Open an Issue with the `[feature]` tag
2. Describe the use case and motivation
3. Propose an implementation if possible

## 📄 License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

---

Thank you for your contribution! 🙏
