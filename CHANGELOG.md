# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Feature `Pela Hora` (Plano do Dia) com montagem manual e sugestao automatica de roteiro.
- Estrutura de publicidade com slots, placeholders e relatorios operacionais.
- Checklist de fechamento de release em `docs/LAUNCH_CHECKLIST_V1.md`.

### Changed
- Polimento visual mobile/desktop em cards, timeline e navegacao.
- Ajustes de documentacao para operacao e QA.

## [1.0.0] - 2026-05-14

### Added
- Base architecture for NaPalma (React + Node + Prisma).
- Auth with JWT + refresh token.
- RBAC and ownership rules.
- Management module for venues, artists, events, and venue managers.
- Public flows: explore, radar, history, achievements.
- Role dashboards: producer and venue.
- UI improvements: filters, search, pagination, sorting, section deep-links.
- CSV export for admin lists.
- Toast feedback with auto-dismiss and status colors.
- Operational docs (`docs/OPERACAO.md`, `docs/QA_CHECKLIST.md`, `docs/TROUBLESHOOTING.md`).

### Changed
- Navigation and default route behavior by user role.
- Visual polish for management surfaces and card styling.

### Fixed
- Frequent local setup friction points documented and normalized (`npm.cmd`, path issues, prisma init).
