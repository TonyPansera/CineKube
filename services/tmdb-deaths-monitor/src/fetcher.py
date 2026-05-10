import os
import json
import requests
from datetime import datetime, timedelta

# Environment variables
TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjMjk2NWYzMzlhMjhjODUwYzhjNGY4Zjc1NmIyYzY5MiIsIm5iZiI6MTc3ODMxODc1Mi41NTYsInN1YiI6IjY5ZmVmZGEwMGEwYzdjOTZlN2FlOGNjOSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.wp8Fks84UPXGOvVkQRsc1WyIUyvwsIe1827aK8EMdik")
DATA_DIR = os.environ.get("DATA_DIR", "/data")

def get_recent_person_changes(hours=6):
    """Fetch person changes in the last `hours` hours from TMDB using pagination."""
    url = "https://api.themoviedb.org/3/person/changes"
    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {TMDB_API_KEY}"
    }
    
    end_time = datetime.now()
    start_time = end_time - timedelta(hours=hours)
    
    params = {
        "start_date": start_time.strftime("%Y-%m-%d %H:%M:%S"),
        "end_date": end_time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    all_changes = []
    page = 1
    total_pages = 1
    
    while page <= total_pages:
        params["page"] = page
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            data = response.json()
            all_changes.extend(data.get("results", []))
            
            # Update total_pages from the first request
            if page == 1:
                total_pages = data.get("total_pages", 1)
                
            page += 1
        else:
            print(f"Error fetching changes on page {page}: {response.status_code} - {response.text}")
            break
            
    return all_changes

def get_person_details(person_id):
    """Fetch details for a specific person to check their deathday."""
    url = f"https://api.themoviedb.org/3/person/{person_id}"
    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {TMDB_API_KEY}"
    }
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    return None

def main():
    print(f"Starting TMDB Monitor at {datetime.now().isoformat()}")
    
    # Ensure data directory exists (e.g., mounted PVC)
    os.makedirs(DATA_DIR, exist_ok=True)
    deaths_file = os.path.join(DATA_DIR, "recent_deaths.json")
    
    # Load existing deaths to avoid processing duplicates
    existing_deaths = []
    if os.path.exists(deaths_file):
        with open(deaths_file, 'r', encoding='utf-8') as f:
            try:
                existing_deaths = json.load(f)
            except json.JSONDecodeError:
                existing_deaths = []

    existing_ids = {person['id'] for person in existing_deaths}
    
    changes = get_recent_person_changes()
    print(f"Found {len(changes)} person changes.")
    
    new_deaths = []
    for change in changes:
        person_id = change.get("id")
        if person_id and person_id not in existing_ids:
            details = get_person_details(person_id)
            if details and details.get("deathday"):
                deathday_str = details.get("deathday")
                try:
                    death_date = datetime.strptime(deathday_str, "%Y-%m-%d")
                    # Check if the death occurred within the last 30 days
                    # This prevents old deaths (e.g., from 2013) from showing up
                    # just because their TMDB profile was recently edited.
                    if (datetime.now() - death_date).days <= 30:
                        death_info = {
                            "id": details.get("id"),
                            "name": details.get("name"),
                            "known_for_department": details.get("known_for_department", "Unknown"),
                            "deathday": deathday_str,
                            "profile_path": details.get("profile_path"),
                            "popularity": details.get("popularity", 0.0),
                            "detected_at": datetime.now().isoformat()
                        }
                        new_deaths.append(death_info)
                except ValueError:
                    pass # Ignore if the date format is invalid
    
    # Sort the newly detected deaths by popularity (highest first)
    new_deaths.sort(key=lambda x: x["popularity"], reverse=True)
    
    for death_info in new_deaths:
        print(f"Detected celebrity death: {death_info['name']} ({death_info['known_for_department']}, Pop: {death_info['popularity']}, Died: {death_info['deathday']})")

    # Save updated data
    if new_deaths:
        all_deaths = existing_deaths + new_deaths
        with open(deaths_file, 'w', encoding='utf-8') as f:
            json.dump(all_deaths, f, ensure_ascii=False, indent=2)
        print(f"Saved {len(new_deaths)} new records to {deaths_file}.")
    else:
        print("No new deaths detected.")

if __name__ == "__main__":
    main()
