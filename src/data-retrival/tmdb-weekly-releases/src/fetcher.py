import os
import json
import requests
from datetime import datetime, timedelta

# Environment variables
TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "")
DATA_DIR = os.environ.get("DATA_DIR", "/data")

def fetch_genre_map():
    """Fetch the TMDB genre list in French and return a dict mapping ID -> name."""
    url = "https://api.themoviedb.org/3/genre/movie/list"
    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {TMDB_API_KEY}"
    }
    params = {"language": "fr-FR"}
    
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        genres = response.json().get("genres", [])
        return {g["id"]: g["name"] for g in genres}
    else:
        print(f"Error fetching genres: {response.status_code} - {response.text}")
        return {}

def get_upcoming_wednesday_to_tuesday():
    """Returns the dates for the upcoming Wednesday and the following Tuesday."""
    today = datetime.now()
    # weekday() returns 0 for Monday, 2 for Wednesday.
    days_until_wednesday = (2 - today.weekday()) % 7
    
    upcoming_wednesday = today + timedelta(days=days_until_wednesday)
    upcoming_tuesday = upcoming_wednesday + timedelta(days=6)
    
    return upcoming_wednesday.strftime("%Y-%m-%d"), upcoming_tuesday.strftime("%Y-%m-%d")

def get_weekly_french_releases(start_date, end_date):
    """Fetch the top 10 most popular movies released in France between the given dates."""
    url = "https://api.themoviedb.org/3/discover/movie"
    
    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {TMDB_API_KEY}"
    }
    
    # Filter out old movies getting re-released by ensuring the primary 
    # (world premiere) release date is within the last year.
    one_year_ago = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
    
    params = {
        "include_adult": "false",
        "include_video": "false",
        "language": "fr-FR",
        "page": 1,
        "region": "FR",
        "sort_by": "popularity.desc",
        "release_date.gte": start_date,
        "release_date.lte": end_date,
        "with_release_type": "3", # Theatrical (General public release)
        "primary_release_date.gte": one_year_ago
    }
    
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        results = response.json().get("results", [])
        return results[:]
    else:
        print(f"Error fetching movies: {response.status_code} - {response.text}")
        return []

def get_movie_extra_details(movie_id):
    """Fetch credits to extract the director's name, and images to get a textless poster."""
    url = f"https://api.themoviedb.org/3/movie/{movie_id}"
    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {TMDB_API_KEY}"
    }
    params = {
        "append_to_response": "credits,images",
        "include_image_language": "null,xx,fr,en"
    }
    
    director = "Unknown Director"
    textless_posters = []
    
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        data = response.json()
        
        # Extract Director
        crew = data.get("credits", {}).get("crew", [])
        for member in crew:
            if member.get("job") == "Director":
                director = member.get("name")
                break
                
        # Extract Textless Posters
        posters = data.get("images", {}).get("posters", [])
        for p in posters:
            # iso_639_1 being null or 'xx' usually indicates no text on the image
            if p.get("iso_639_1") in (None, "xx"):
                textless_posters.append(p.get("file_path"))

    return director, textless_posters

def main():
    print(f"Starting TMDB Weekly Releases Fetcher at {datetime.now().isoformat()}")
    
    # Ensure data directory exists
    os.makedirs(DATA_DIR, exist_ok=True)
    releases_file = os.path.join(DATA_DIR, "weekly_releases.json")
    
    # Calculate the date range (Wednesday to Tuesday)
    upcoming_wed, upcoming_tue = get_upcoming_wednesday_to_tuesday()
    print(f"Targeting French theatrical releases from {upcoming_wed} to {upcoming_tue}")
    
    movies = get_weekly_french_releases(upcoming_wed, upcoming_tue)
    print(f"Found {len(movies)} top movies.")
    
    new_releases = []
    
    # Fetch genre map for French genre names
    genre_map = fetch_genre_map()
    print(f"Loaded {len(genre_map)} genre mappings.")
    
    for movie in movies:
        movie_id = movie.get("id")
        if movie_id:
            director, textless_posters = get_movie_extra_details(movie_id)
            
            # title is localized to French because we passed language=fr-FR
            french_title = movie.get("title")
            
            release_info = {
                "id": movie_id,
                "title": french_title,
                "original_title": movie.get("original_title"),
                "director": director,
                "primary_genre": genre_map.get(movie.get("genre_ids", [None])[0], "Cinéma") if movie.get("genre_ids") else "Cinéma",
                "french_release_date": movie.get("release_date"),
                "popularity": movie.get("popularity"),
                "overview": movie.get("overview"),
                "poster_path": movie.get("poster_path"),
                "textless_poster_paths": textless_posters,
                "detected_at": datetime.now().isoformat()
            }
            new_releases.append(release_info)
            print(f"Detected upcoming release: '{release_info['title']}' by {director} (Pop: {release_info['popularity']})")

    # Override the file entirely
    with open(releases_file, 'w', encoding='utf-8') as f:
        json.dump(new_releases, f, ensure_ascii=False, indent=2)
    print(f"Overwrote {releases_file} with {len(new_releases)} new records.")

if __name__ == "__main__":
    main()
