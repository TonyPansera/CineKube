import os
import json
import requests
from datetime import datetime, timedelta

# Environment variables
TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "dummy_key")
DATA_DIR = os.environ.get("DATA_DIR", "/data")

def get_recent_person_changes():
    """Fetch person changes in the last 24 hours from TMDB."""
    url = "https://api.themoviedb.org/3/person/changes"
    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {TMDB_API_KEY}"
    }
    
    # We could restrict to the last 24 hours, but by default the /changes API 
    # without params returns recent changes (usually last 24h).
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json().get("results", [])
    else:
        print(f"Error fetching changes: {response.status_code} - {response.text}")
        return []

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
                # The person has a deathday recorded
                death_info = {
                    "id": details.get("id"),
                    "name": details.get("name"),
                    "deathday": details.get("deathday"),
                    "profile_path": details.get("profile_path"),
                    "detected_at": datetime.now().isoformat()
                }
                new_deaths.append(death_info)
                print(f"Detected celebrity death: {death_info['name']} ({death_info['deathday']})")

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
