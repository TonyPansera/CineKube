# CineKube Project Memory

## Project Overview
CineKube is an automated Instagram news channel about Cinema.
The infrastructure runs on a lightweight Kubernetes cluster (k3s) on a single node (2 vCPUs, 4GB RAM, 20GB Storage).

## Architecture
- **Infrastructure**: Kubernetes (k3s)
- **Microservices**: Monorepo approach.
- **Languages**: 
  - Python (Data Retrieval - API monitoring, RSS feed fetchers)
  - Node.js (Visual Generation - planned for later phases)
- **Storage**: JSON files persisted via Persistent Volume Claims (PVCs).

## Phases

### Phase 1: Data Retrieval (Current)
Goal: Automatically fetch and store data about recent cinema events.
- **Feature 1**: Detect celebrity deaths using the TMDB API (`/person/changes`). Implemented via a Python CronJob.
- **Feature 2**: Fetch weekly French cinema releases using the SensCritique RSS feed. Implemented via a Python CronJob.

### Phase 2: Visual Generation (Future)
Goal: Automatically create visual assets based on the retrieved data.
- **Tech**: Node.js to be used for visual rendering.
