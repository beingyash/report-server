### Task 9: GitHub Actions CI/CD (FIX)

**Previous state:** Workflow pushed `docker.io/beingyash/report-server:latest` on push to main.

**Required fix:** Image tag must be based on the **git tag** (e.g. `v0.1.0`), not hardcoded `:latest`. Flux ImageUpdateAutomation watches the image repo and rolls out on new immutable tags.

**Files:**
- Modify: `.github/workflows/deploy.yml`

**New content for `.github/workflows/deploy.yml`:**

```yaml
name: Deploy

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: docker.io/beingyash/report-server:${{ github.ref_name }}
```

**Commit:** `git add .github/workflows/deploy.yml && git commit -m "fix: tag image with git tag for Flux ImageUpdateAutomation"`
