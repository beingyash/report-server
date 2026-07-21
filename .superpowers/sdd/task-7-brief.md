### Task 7: Dockerfile + .dockerignore

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ src/
COPY public/ public/

ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/index.js"]
```

- [ ] **Step 2: Create .dockerignore**

```
node_modules/
.git/
test/
docs/
*.md
.gitignore
```

- [ ] **Step 3: Build and verify**

```bash
docker build -t report-server:test .
docker run -d -p 3000:3000 -e REPORTS_DIR=/reports report-server:test
sleep 2
curl http://localhost:3000/health
# Expected: {"status":"ok","reportCount":0}
docker kill $(docker ps -q)
```

Note: If `docker` is not available in the environment, skip the build step and just create the files + commit. Report that build was skipped.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "feat: add Dockerfile for production image"
```
