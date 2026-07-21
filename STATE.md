# Report Server — Project State

Update at end of every session. Verified 2026-07-21.

## Deployed
- **Chart:** v0.1.3 deployed at `reports.yash.abysmallab.in`
- **App image:** `beingyash/report-server:v0.1.1`
- **Sidecar:** `git-sync:v4.2.1`
- **TLS:** Let's Encrypt cert issued (DNS-01 via Cloudflare), HTTPS 200 ✓
- **Helm status:** deployed, revision 4
- **Flux GitRepository:** Ready ✓
- **Flux HelmRelease:** Ready ✓

## New in v0.1.3
- Global status dashboard at root `/` replaces old reports listing
- Old reports listing moved to `/reports`
- Design tokens: dark theme, card grid, responsive layout

## Known Issues
- (none)

## Next
1. Verify overview dashboard renders correctly
