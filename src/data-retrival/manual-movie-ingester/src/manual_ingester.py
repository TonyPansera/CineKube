import os
import sys
import json
import requests
from datetime import datetime

# Environment variables
TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "")
DATA_DIR = os.environ.get("DATA_DIR", "/data")
OUTPUT_FILE = os.path.join(DATA_DIR, "monthly_suggestions.json")

HEADERS = {
    "accept": "application/json",
    "Authorization": f"Bearer {TMDB_API_KEY}"
}


def search_movies(query):
    """Search TMDB for movies matching the query in French."""
    url = "https://api.themoviedb.org/3/search/movie"
    params = {
        "query": query,
        "language": "fr-FR",
        "include_adult": "false",
        "page": 1
    }

    response = requests.get(url, headers=HEADERS, params=params)
    if response.status_code == 200:
        return response.json().get("results", [])[:10]
    else:
        print(f"Erreur de recherche: {response.status_code} - {response.text}")
        return []


def get_director(movie_id):
    """Fetch the director name for a movie."""
    url = f"https://api.themoviedb.org/3/movie/{movie_id}/credits"
    response = requests.get(url, headers=HEADERS)
    if response.status_code == 200:
        crew = response.json().get("crew", [])
        for member in crew:
            if member.get("job") == "Director":
                return member.get("name")
    return "Inconnu"


def get_movie_details(movie_id):
    """Fetch full details for a specific movie including credits, reviews, and images."""
    url = f"https://api.themoviedb.org/3/movie/{movie_id}"
    params = {
        "append_to_response": "credits,reviews,images",
        "language": "fr-FR"
    }

    response = requests.get(url, headers=HEADERS, params=params)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Erreur lors de la récupération des détails: {response.status_code}")
        return None


def extract_movie_data(details):
    """Extract and format movie data into the monthly_suggestions schema."""
    # Director
    director = "Inconnu"
    crew = details.get("credits", {}).get("crew", [])
    for member in crew:
        if member.get("job") == "Director":
            director = member.get("name")
            break

    # Release date
    theatrical_release_date = details.get("release_date", "")

    # Textless posters
    textless_posters = []
    posters = details.get("images", {}).get("posters", [])
    for p in posters:
        if p.get("iso_639_1") in (None, "xx"):
            textless_posters.append(p.get("file_path"))

    # Reviews (excerpt max 200 chars)
    formatted_reviews = []
    reviews_data = details.get("reviews", {}).get("results", [])
    for review in reviews_data:
        content = review.get("content", "")
        excerpt = content[:200] + "..." if len(content) > 200 else content
        formatted_reviews.append({
            "author": review.get("author", "Unknown"),
            "excerpt": excerpt.strip()
        })

    return {
        "id": details.get("id"),
        "title": details.get("title"),
        "director": director,
        "theatrical_release_date": theatrical_release_date,
        "popularity": details.get("popularity", 0.0),
        "vote_average": details.get("vote_average", 0.0),
        "overview": details.get("overview", ""),
        "poster_path": details.get("poster_path"),
        "textless_poster_paths": textless_posters,
        "reviews": formatted_reviews
    }


def load_existing_data():
    """Load the existing monthly_suggestions.json or return an empty list."""
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                print("Attention: fichier JSON corrompu, démarrage avec une liste vide.")
                return []
    return []


def save_data(data):
    """Save the data list back to monthly_suggestions.json."""
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main():
    sys.stdout.reconfigure(encoding='utf-8')

    print("=" * 60)
    print("  CineKube — Ingestion manuelle de film")
    print("=" * 60)
    print()

    # Step 1: Interactive Search
    query = input("🎬 Entrez le titre du film (en français) : ").strip()
    if not query:
        print("Aucun titre saisi. Fin du programme.")
        return

    print(f"\nRecherche de « {query} » sur TMDB...\n")
    results = search_movies(query)

    if not results:
        print("Aucun résultat trouvé. Essayez un autre titre.")
        return

    # Display results with director
    print(f"{'#':<4} {'Titre':<45} {'Année':<8} {'Réalisateur'}")
    print("-" * 90)

    directors_cache = {}
    for i, movie in enumerate(results):
        title = movie.get("title", "Sans titre")
        year = movie.get("release_date", "????")[:4] or "????"
        movie_id = movie.get("id")

        # Fetch director for each result
        director = get_director(movie_id)
        directors_cache[movie_id] = director

        print(f"{i:<4} {title:<45} {year:<8} {director}")

    print()

    # Step 2: User Selection
    while True:
        try:
            choice = input(f"Sélectionnez un film (0-{len(results)-1}) ou 'q' pour quitter : ").strip()
            if choice.lower() == 'q':
                print("Annulé.")
                return
            idx = int(choice)
            if 0 <= idx < len(results):
                break
            else:
                print(f"Veuillez entrer un nombre entre 0 et {len(results)-1}.")
        except ValueError:
            print("Entrée invalide. Veuillez entrer un nombre.")

    selected = results[idx]
    selected_id = selected.get("id")
    print(f"\n✅ Film sélectionné : {selected.get('title')}")
    print("Récupération des détails complets...\n")

    # Step 3: Enrichment
    details = get_movie_details(selected_id)
    if not details:
        print("Impossible de récupérer les détails du film.")
        return

    movie_data = extract_movie_data(details)

    # Step 4: Persistence — append to existing data
    existing_data = load_existing_data()

    # Check for duplicates
    existing_ids = {m.get("id") for m in existing_data}
    if movie_data["id"] in existing_ids:
        print(f"⚠️  Ce film (ID: {movie_data['id']}) est déjà dans la liste.")
        overwrite = input("Voulez-vous le remplacer ? (o/n) : ").strip().lower()
        if overwrite == 'o':
            existing_data = [m for m in existing_data if m.get("id") != movie_data["id"]]
        else:
            print("Ajout annulé.")
            return

    existing_data.append(movie_data)
    save_data(existing_data)

    print(f"\n🎉 « {movie_data['title']} » ajouté avec succès à {OUTPUT_FILE}")
    print(f"   Réalisateur : {movie_data['director']}")
    print(f"   Date de sortie : {movie_data['theatrical_release_date']}")
    print(f"   Note moyenne : {movie_data['vote_average']}")
    print(f"   Posters sans texte : {len(movie_data['textless_poster_paths'])}")
    print(f"   Avis extraits : {len(movie_data['reviews'])}")
    print(f"\n   Total de films dans la liste : {len(existing_data)}")


if __name__ == "__main__":
    main()
