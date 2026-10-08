# Throneward — Realms of Crown & Hearth

RTS de navegador com mecânicas fiéis a Age of Empires IV e arte/áudio/nomes 100% originais.
Nenhum asset, texto, logo ou som do original é copiado — apenas números e regras são espelhados.

## Dev
```bash
pnpm install
pnpm dev        # http://127.0.0.1:5173
pnpm typecheck  # tsc --noEmit
pnpm test       # vitest (sim determinística)
pnpm test:headless
pnpm e2e        # playwright (sobe o vite)
```

## Docs
- `docs/SPEC.md` — índice + decisões
- `docs/spec-units.md`, `spec-buildings.md`, `spec-economy.md`, `spec-hud.md` — pesquisa Fase 0
- `docs/PROGRESS.md` — fase atual, feito, pendente, bugs
