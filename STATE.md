# Report Server — Project State

Update at end of every session. Verified 2026-07-21.

## Deployed
- **Chart**: v0.1.2 deployed at `reports.yash.abysmallab.in`
- **App image**: `beingyash/report-server:v0.1.0` (chart appVersion, not same as chart version)
- **Sidecar**: `git-sync:v4.2.1`
- **TLS**: Let's Encrypt cert issued (DNS-01 via Cloudflare), HTTPS 200 ✓
- **Helm status**: deployed, revision 3

## DNS
- `reports.yash.abysmallab.in` A `155.248.254.40` ✓
- `yash.abysmallab.in` A `155.248.254.40`
- `*.yash.abysmallab.in` CNAME `yash.abysmallab.in`
- Domain `abysmallab.in` (single-s) properly delegated to Cloudflare

## Known Issues
- Flux GitRepository for `report-server-chart` fails with `tls: internal error` — chart can't be updated via Flux
- Image tag `v0.1.0` is last and only tag on Docker Hub; no newer images pushed
