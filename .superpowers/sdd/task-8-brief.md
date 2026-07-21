### Task 8: Helm Chart

**Files:**
- Create: `charts/report-server/Chart.yaml`
- Create: `charts/report-server/values.yaml`
- Create: `charts/report-server/templates/_helpers.tpl`
- Create: `charts/report-server/templates/deployment.yaml`
- Create: `charts/report-server/templates/service.yaml`
- Create: `charts/report-server/templates/ingress.yaml`

**Notes:** Chart deploys two containers in one pod: the report-server app and a git-sync sidecar.

> **Private repo:** If repo is private, add `GIT_SYNC_USERNAME` and `GIT_SYNC_PASSWORD` env vars from a Kubernetes secret. The spec assumes public repo; auth setup is out of scope.

- [ ] **Step 1: Create _helpers.tpl**

Create `charts/report-server/templates/_helpers.tpl`:
```yaml
{{- define "report-server.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "report-server.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}
```

- [ ] **Step 2: Create Chart.yaml**

```yaml
apiVersion: v2
name: report-server
description: Browseable HTML report server with git-sync sidecar
version: 0.1.0
appVersion: 0.1.0
```

- [ ] **Step 3: Create values.yaml**

```yaml
replicaCount: 1

image:
  repository: docker.io/beingyash/report-server
  tag: latest
  pullPolicy: Always

service:
  port: 3000

ingress:
  host: reports.yash.abyssmallab.in
  className: traefik

gitSync:
  repository: https://github.com/beingyash/report-server.git
  ref: main
  interval: 60

resources:
  limits:
    cpu: 200m
    memory: 128Mi
  requests:
    cpu: 100m
    memory: 64Mi
```

- [ ] **Step 4: Create templates/deployment.yaml**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "report-server.fullname" . }}
  labels:
    app: {{ include "report-server.name" . }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ include "report-server.name" . }}
  template:
    metadata:
      labels:
        app: {{ include "report-server.name" . }}
    spec:
      volumes:
        - name: reports
          emptyDir: {}
      containers:
        - name: report-server
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.service.port }}
          env:
            - name: PORT
              value: "{{ .Values.service.port }}"
            - name: REPORTS_DIR
              value: /var/reports/source/reports
          volumeMounts:
            - name: reports
              mountPath: /var/reports
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
        - name: git-sync
          image: registry.k8s.io/git-sync/git-sync:v4.2.1
          env:
            - name: GIT_SYNC_REPO
              value: {{ .Values.gitSync.repository | quote }}
            - name: GIT_SYNC_BRANCH
              value: {{ .Values.gitSync.ref | quote }}
            - name: GIT_SYNC_ROOT
              value: /var/reports
            - name: GIT_SYNC_DEST
              value: source
            - name: GIT_SYNC_WAIT
              value: "{{ .Values.gitSync.interval }}"
            - name: GIT_SYNC_ONE_TIME
              value: "false"
          volumeMounts:
            - name: reports
              mountPath: /var/reports
          resources:
            limits:
              cpu: 100m
              memory: 64Mi
            requests:
              cpu: 50m
              memory: 32Mi
```

- [ ] **Step 5: Create templates/service.yaml**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ include "report-server.fullname" . }}
spec:
  selector:
    app: {{ include "report-server.name" . }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: {{ .Values.service.port }}
```

- [ ] **Step 6: Create templates/ingress.yaml**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "report-server.fullname" . }}
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: {{ .Values.ingress.className }}
  tls:
    - hosts:
        - {{ .Values.ingress.host }}
      secretName: report-server-tls
  rules:
    - host: {{ .Values.ingress.host }}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: {{ include "report-server.fullname" . }}
                port:
                  number: {{ .Values.service.port }}
```

- [ ] **Step 7: Commit**

```bash
git add charts/
git commit -m "feat: add Helm chart with git-sync sidecar"
```
