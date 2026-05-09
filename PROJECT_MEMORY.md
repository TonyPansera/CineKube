# CineKube Project Memory

## Project Overview
CineKube is an automated Instagram news channel about Cinema.
The infrastructure runs on a lightweight Kubernetes cluster (k3s) on a single node (2 vCPUs, 4GB RAM, 20GB Storage).

## Architecture
- **Infrastructure**: Kubernetes (k3s)
- **Microservices**: Monorepo approach managed with Git/GitHub.
- **Languages**: 
  - Python (Data Retrieval - API monitoring)
  - Node.js (Visual Generation - planned for later phases)
- **Storage**: JSON files persisted via Persistent Volume Claims (PVCs).

## Phases

### Phase 1: Data Retrieval (Current)
Goal: Automatically fetch and store data about recent cinema events.
- **Feature 1**: Detect celebrity deaths using the TMDB API (`/person/changes`). 
- **Feature 2**: Fetch the 10 most popular movies released in France every week using the TMDB API (`/discover/movie`). 

**Implementation Details:**
- Created base Python scripts (`fetcher.py`) for both features using the `requests` library.
- Containerized both fetchers with lightweight `python:3.11-slim` Dockerfiles.
- Defined Kubernetes manifests (`namespace.yaml`, `pvc.yaml`, `tmdb-secret.yaml` template).
- Configured K8s `CronJob`s:
  - `tmdb-deaths-monitor` runs every 6 hours (`0 */6 * * *`).
  - `tmdb-weekly-releases` runs every Monday at 12:00 PM (`0 12 * * 1`).
- GitHub repository initialized with an appropriate `.gitignore` to protect K8s secrets and local data.

### Phase 2: Visual Generation (Future)
Goal: Automatically create visual assets based on the retrieved data.
- **Tech**: Node.js to be used for visual rendering.
