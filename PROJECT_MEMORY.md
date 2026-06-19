# CineKube Project Memory

## Project Overview
CineKube is an automated Instagram news channel about Cinema.
The infrastructure runs on a lightweight Kubernetes cluster (k3s) on a single node (2 vCPUs, 4GB RAM, 20GB Storage).

## Architecture
- **Infrastructure**: Kubernetes (k3s)
- **Microservices**: Monorepo approach managed with Git/GitHub.
- **Languages**: 
  - Python (Data Retrieval - API monitoring)
  - Node.js (Visual Generation)
- **Storage**: JSON files persisted via Persistent Volume Claims (PVCs).

## Phases

### Phase 1: Data Retrieval (Implemented)
Goal: Automatically fetch and store data about recent cinema events.
- **Feature 1**: Detect celebrity deaths using the TMDB API (`/person/changes`). Uses pagination to fetch all changed persons and a 6-hour sliding window (`start_date`/`end_date` params) to limit data volume.
- **Feature 2**: Fetch the 10 most popular movies released in France every week using the TMDB API (`/discover/movie`). Includes textless poster paths, director info, and primary genre (mapped from `genre_ids` via `/genre/movie/list?language=fr-FR`).
- **Feature 3**: Find 10 non-mainstream "Hidden Gem" classics monthly using the TMDB API (`/discover/movie`). Uses randomized pages, French localization (`language=fr-FR`), and enriches with credits, reviews, release dates, and textless posters. Outputs to `monthly_suggestions.json` with an empty `analyses` array ready for human curation.
- **Feature 4**: `manual-movie-ingester` — Interactive CLI tool to search for a movie by French title, display the top 10 results with directors, and append the selected movie's enriched data to `monthly_suggestions.json`. Includes duplicate detection.
- **Feature 5**: `movie-suggestion-custom-analysis` — Interactive CLI tool for human contributors to add editorial analyses to existing movies in `monthly_suggestions.json`. Supports multiple analyses per movie via an `analyses` array (replaces the former `analysis` string). Includes legacy field migration.

**Implementation Details:**
- Created base Python scripts (`fetcher.py`, `fetcher_suggestions.py`, `manual_ingester.py`, `manual_analysis_tool.py`) using the `requests` library.
- Containerized all fetchers with lightweight `python:3.11-slim` Dockerfiles.
- Defined Kubernetes manifests (`namespace.yaml`, `pvc.yaml`, `tmdb-secret.yaml` template).
- Configured K8s `CronJob`s:
  - `tmdb-deaths-monitor` runs every 6 hours (`0 */6 * * *`).
  - `tmdb-weekly-releases` runs every Monday at 12:00 PM (`0 12 * * 1`).
  - `movie-suggestion` runs on the 1st of every month at 08:00 AM (`0 8 1 * *`). Resource limits: 128Mi RAM, 200m CPU.
- `manual-movie-ingester` is run locally or as an interactive pod (`kubectl run ... -it --stdin`).
- `movie-suggestion-custom-analysis` is run locally for editorial input.
- GitHub repository initialized with an appropriate `.gitignore` to protect K8s secrets and local data.

### Phase 2: Visual Generation (Implemented)
Goal: Automatically create visual assets based on the retrieved data.
- **Tech**: Node.js, `satori`, and `@resvg/resvg-js`.

**Shared Design Language:**
- Headless browsers (Puppeteer/Playwright) were explicitly avoided to respect the 4GB cluster memory constraint.
- Configured Satori to convert HTML/CSS templates directly into SVG, leveraging flexbox layouts.
- Used `@resvg/resvg-js` to render the SVGs into final `1080x1350` PNG images.
- Images are designed with a global `#bf2728` background.
- Incorporated the "Glacial Indifference" font to match the visual identity.
- Logo is loaded from `assets/logo.png` using CSS display toggling (not template interpolation) to avoid satori-html serialization bugs.

**Service 1: `weekly-releases-visual-generator`**
- Processes `weekly_releases.json`.
- Header: "Les sorties de la semaine". Footer shows full French release date.
- Output: `/data/visuals/weekly-releases/YYYY-MM-DD/`.
- Two pages per poster:
  - **Page 1 (Cover)**: Title, Director, Release Date with black gradients, and a white pill-shaped genre badge (bottom-right).
  - **Page 2 (Synopsis)**: 75% black overlay with wrapped overview text.

**Service 2: `movie-suggestion-visual-generator`**
- Processes `monthly_suggestions.json`.
- Header: "Nos recommandations mensuelles". Footer shows only the release year.
- Output: `/data/visuals/monthly-recommandations/YYYY-MM-DD/`.
- Three pages per poster:
  - **Page 1 (Cover)**: Title, Director, and Year with black gradients.
  - **Page 2 (Synopsis)**: 75% black overlay with wrapped French overview text.
  - **Page 3 (Analysis)**: 30% black overlay with each contributor's text rendered inside separate rounded translucent cards, using direct VDOM node generation to avoid `satori-html` array serialization issues.

### Environment Secrets
- `TMDB_API_KEY`: Required by all TMDB-related services.
