# Versionamento e Release

## Estrategia

Use SemVer:

- `MAJOR` (x.0.0): quebra compatibilidade.
- `MINOR` (0.x.0): nova feature sem quebrar.
- `PATCH` (0.0.x): correcoes e ajustes.

## Exemplo para este projeto

- `1.0.0`: base funcional com auth, RBAC, gestao e fluxos principais.
- `1.1.0`: novas features de produto.
- `1.1.1`: hotfixes.

## Fluxo de release simples

1. Atualize `CHANGELOG.md`.
2. Garanta build/tests:
```bash
cd frontend && npm.cmd run build
cd ../backend && npm.cmd run test
```
3. Commit de release:
```bash
git add .
git commit -m "chore: release vX.Y.Z"
```
4. Tag de release:
```bash
git tag vX.Y.Z
git push origin main --tags
```

## Checklist minimo antes de tag

- [ ] QA manual por perfil concluido.
- [ ] Troubleshooting atualizado se necessario.
- [ ] Nenhum erro critico conhecido aberto.
