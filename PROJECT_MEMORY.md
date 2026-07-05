# CineKube Project Memory

## Project Overview
CineKube is an automated Instagram news channel about Cinema.
The infrastructure runs on a Kubernetes cluster (k3s) on a single node (16GB RAM, 500GB Storage).

## Architecture
- **Infrastructure**: Kubernetes (k3s)
- **Microservices**: Monorepo approach managed with Git/GitHub.
- **Languages**: 
  - Python (Data Retrieval - API monitoring)
  - Node.js (Visual Generation)
- **Storage**: JSON files persisted via Persistent Volume Claims (PVCs).

## Phases

### Phase 1: Data Retrieval
Goal: Automatically fetch and store data about recent cinema events and movie suggestions.

- **Feature 1**: Fetch the 10 most popular movies released in France every week using the TMDB API (`/discover/movie`). Includes textless poster paths, director info, and primary genre (mapped from `genre_ids` via `/genre/movie/list?language=fr-FR`).
- **Feature 2**: Find 10 non-mainstream "Hidden Gem" classics monthly using the TMDB API (`/discover/movie`). Uses randomized pages, French localization (`language=fr-FR`), and enriches with credits, reviews, release dates, and textless posters. Outputs to `monthly_suggestions.json` with an empty `analyses` array ready for human curation.
- **Feature 3**: `manual-movie-ingester` — Interactive CLI tool to search for a movie by French title, display the top 10 results with directors, and append the selected movie's enriched data to `monthly_suggestions.json`. Includes duplicate detection.
- **Feature 4**: `movie-suggestion-custom-analysis` — Interactive CLI tool for human contributors to add editorial analyses to existing movies in `monthly_suggestions.json`. Supports multiple analyses per movie via an `analyses` array.

**Implementation Details:**
- Python scripts are separated into logical services under `src/data-retrival/`:
  - `tmdb-weekly-releases`
  - `movie-suggestion`
  - `manual-movie-ingester`
  - `movie-suggestion-custom-analysis`
- All fetchers are containerized with lightweight `Dockerfile`s and configured via `requirements.txt`.

### Phase 2: Visual Generation
Goal: Automatically create visual assets based on the retrieved data.
- **Tech**: Node.js, `satori`, and `@resvg/resvg-js`.

**Shared Design Language:**
- Configured Satori to convert HTML/CSS templates directly into SVG, leveraging flexbox layouts.
- Used `@resvg/resvg-js` to render the SVGs into final `1080x1350` PNG images.
- Images are designed with a global `#bf2728` background.
- Incorporated the "Montserrat" font family to match the visual identity.
- Logo is loaded from `assets/logo.png`.

**Service 1: `weekly-releases-visual-generator`**
- Located in `src/visual-generation/weekly-releases-visual-generator`.
- Processes `weekly_releases.json`.
- Output: `/data/visuals/weekly-releases/YYYY-MM-DD/`.

**Service 2: `movie-suggestion-visual-generator`**
- Located in `src/visual-generation/movie-suggestion-visual-generator`.
- Processes `monthly_suggestions.json`.
- Output: `/data/visuals/monthly-recommandations/YYYY-MM-DD/`.

**Service 3: `movie-suggestion-visual-generator-pride`**
- Located in `src/visual-generation/movie-suggestion-visual-generator-pride`.
- Processes `monthly_suggestions.json` generating Pride-themed visuals.

### Environment Secrets
- `TMDB_API_KEY`: Required by all TMDB-related services.
