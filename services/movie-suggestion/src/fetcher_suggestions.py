import os
import json
import random
import requests
from datetime import datetime

# Environment variables
TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "")
DATA_DIR = os.environ.get("DATA_DIR", "/data")

def discover_hidden_gems():
    """Fetch a randomized page of hidden gem movies from TMDB."""
    url = "https://api.themoviedb.org/3/discover/movie"
    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {TMDB_API_KEY}"
    }
    
    random_page = random.randint(1, 5)
    
    params = {
        "vote_average.gte": 7.5,
        "vote_count.gte": 500,
        "vote_count.lte": 4000,
        "primary_release_date.lte": "2014-12-31",
        "sort_by": "popularity.desc",
        "page": random_page,
        "include_adult": "false",
        "include_video": "false",
        "language": "fr-FR"
    }
    
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        return response.json().get("results", [])
    else:
        print(f"Error fetching hidden gems: {response.status_code} - {response.text}")
        return []

def get_movie_details(movie_id):
    """Fetch full details (credits, reviews, release_dates, images) for a specific movie."""
    url = f"https://api.themoviedb.org/3/movie/{movie_id}"
    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {TMDB_API_KEY}"
    }
    
    params = {
        "append_to_response": "credits,reviews,release_dates,images",
        "language": "fr-FR"
    }
    
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error fetching movie {movie_id} details: {response.status_code} - {response.text}")
        return None

def extract_movie_data(details):
    """Extract and format the required fields from the full movie details."""
    # Find Director
    director = "Unknown"
    crew = details.get("credits", {}).get("crew", [])
    for member in crew:
        if member.get("job") == "Director":
            director = member.get("name")
            break
            
    # Use the movie's original release date (top-level field from TMDB)
    theatrical_release_date = details.get("release_date", "")
                
    # Extract Textless Posters
    textless_posters = []
    posters = details.get("images", {}).get("posters", [])
    for p in posters:
        if p.get("iso_639_1") in (None, "xx"):
            textless_posters.append(p.get("file_path"))
            
    # Extract Reviews (Max 200 chars for excerpt)
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
        "reviews": formatted_reviews,
        "analyses": []
    }

def main():
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    
    print(f"Starting TMDB Monthly Suggestions Fetcher at {datetime.now().isoformat()}")
    
    os.makedirs(DATA_DIR, exist_ok=True)
    output_file = os.path.join(DATA_DIR, "monthly_suggestions.json")
    
    # 1. Discover
    pool = discover_hidden_gems()
    if not pool:
        print("No movies found in discover API. Exiting.")
        return
        
    print(f"Discovered {len(pool)} movies in the pool. Selecting up to 10.")
    
    # 2. Select randomly
    selected_pool = random.sample(pool, min(10, len(pool)))
    
    # 3. Enrich & Format
    suggestions = []
    for movie in selected_pool:
        movie_id = movie.get("id")
        print(f"Fetching details for {movie.get('title')} ({movie_id})...")
        details = get_movie_details(movie_id)
        if details:
            formatted_data = extract_movie_data(details)
            suggestions.append(formatted_data)
            
    # 4. Save
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(suggestions, f, ensure_ascii=False, indent=2)
        
    print(f"Saved {len(suggestions)} movie suggestions to {output_file}.")

if __name__ == "__main__":
    main()
