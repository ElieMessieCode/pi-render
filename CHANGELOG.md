# Changelog

All notable changes to pi-render will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Complete project documentation
- GitHub Actions CI/CD configuration
- Configuration files (.editorconfig, .gitignore, .npmignore)

## [1.0.0] - 2024-01-15

### Added
- Interactive HTML page display in browser
- Express server with SSE for live-reload
- Scrollable visual history
- Auto-save to `~/.pi/agent/renders/`
- Debug page with real-time logs
- System prompt injection for LLM agent guidance
- Recommended SVG patterns (bars, curves, pie charts, flows)
- CSS components (tabs, accordion, grid, cards)
- Download, copy HTML, new tab features
- Central logger with SSE broadcast
- Cross-platform support (Windows, macOS, Linux)
- Predefined dark color palette
- Recommended CSS animations

### Technical
- TypeScript with ES2020 target
- Express for HTTP server
- Server-Sent Events for real-time communication
- Structured error handling and logging
- pi-coding-agent extension hooks (context, session_end, session_switch)

---

## Versioning

- **MAJOR** (X.0.0) — Incompatible API changes
- **MINOR** (0.X.0) — Backward-compatible functionality
- **PATCH** (0.0.X) — Backward-compatible bug fixes
