# Report Server — Project State

Update at end of every session. Verified 2026-07-21.

## Deployed
- **Chart:** v0.1.3 deployed at `reports.yash.abysmallab.in`
- **App image:** `beingyash/report-server:v0.1.3`
- **Sidecar:** `git-sync:v4.2.1`
- **TLS:** Let's Encrypt cert issued (DNS-01 via Cloudflare), HTTPS 200 ✓
- **Helm status:** deployed, revision 7
- **Flux GitRepository:** Ready ✓
- **Flux HelmRelease:** Ready ✓
- **Node:** Both nodes arm64
- **Docker:** Image built and loaded into containerd on both nodes (not pushed to hub)

## Features (v0.1.3)
- `GET /` → 301 to `/status/`
- `GET /status/` → simplified dark theme card grid with per-project health badges
- `GET /reports` → old reports listing
- Generator produces `index.html` at repo root (backup, not served)
- Design tokens: dark theme (#0f1115 bg, #181b21 cards, #e6e8eb text)

## Known Issues
- Docker image not pushed to hub — Flux suspended to prevent revert. Need to `docker push` or set up CI.

## Next
1. Push v0.1.3 to Docker Hub and resume Flux
2. Clean up obsolete `generateRootIndex` (static file not served)
