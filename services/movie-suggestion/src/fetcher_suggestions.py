import os
import json
import random
import requests
from datetime import datetime
from openai import OpenAI

# Environment variables
TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjMjk2NWYzMzlhMjhjODUwYzhjNGY4Zjc1NmIyYzY5MiIsIm5iZiI6MTc3ODMxODc1Mi41NTYsInN1YiI6IjY5ZmVmZGEwMGEwYzdjOTZlN2FlOGNjOSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.wp8Fks84UPXGOvVkQRsc1WyIUyvwsIe1827aK8EMdik")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
DATA_DIR = os.environ.get("DATA_DIR", "/data")

# OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)

ANALYSIS_SYSTEM_PROMPT = (
    "Tu es un critique de cinéma passionné. Rédige une courte analyse "
    "(maximum 60 mots) en français sur ce film, en expliquant pourquoi "
    "il mérite d'être vu aujourd'hui. Sois pertinent, accrocheur, et évite les clichés. "
    "Évite d'utiliser le verbe transcender."
)

def generate_analysis(title, director, overview):
    """Generate a short AI analysis for a movie using OpenAI."""
    if not OPENAI_API_KEY:
        print("Warning: OPENAI_API_KEY not set, skipping analysis generation.")
        return "Analyse indisponible."
    
    user_prompt = (
        f"Film : {title}\n"
        f"Réalisateur : {director}\n"
        f"Synopsis : {overview}"
    )
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=200,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating analysis for {title}: {e}")
        return "Analyse indisponible."

def shorten_overview(overview):
    """If the overview exceeds 100 words, use GPT to condense it."""
    if not overview or len(overview.split()) <= 100:
        return overview
    
    if not OPENAI_API_KEY:
        print("Warning: OPENAI_API_KEY not set, cannot shorten overview.")
        return overview
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Résume ce synopsis de film en gardant l'essence de l'intrigue, en français, en maximum 60 mots (espaces compris). Ne change pas le ton."},
                {"role": "user", "content": overview}
            ],
            max_tokens=150,
            temperature=0.5
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error shortening overview: {e}")
        return overview

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
        "reviews": formatted_reviews
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
    
    # 3. Enrich, Format & Analyse
    suggestions = []
    for movie in selected_pool:
        movie_id = movie.get("id")
        print(f"Fetching details for {movie.get('title')} ({movie_id})...")
        details = get_movie_details(movie_id)
        if details:
            formatted_data = extract_movie_data(details)
            
            # Shorten overview if it exceeds 100 words
            word_count = len(formatted_data["overview"].split())
            if word_count > 100:
                print(f"Overview too long ({word_count} words), shortening...")
                formatted_data["overview"] = shorten_overview(formatted_data["overview"])
            
            # Generate AI analysis
            print(f"Generating analysis for {formatted_data['title']}...")
            formatted_data["analysis"] = generate_analysis(
                formatted_data["title"],
                formatted_data["director"],
                formatted_data["overview"]
            )
            suggestions.append(formatted_data)
            
    # 4. Save
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(suggestions, f, ensure_ascii=False, indent=2)
        
    print(f"Saved {len(suggestions)} movie suggestions to {output_file}.")

if __name__ == "__main__":
    main()
