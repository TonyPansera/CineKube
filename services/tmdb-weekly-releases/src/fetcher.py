import os
import json
import feedparser
from datetime import datetime

# Environment variables
SENSCRITIQUE_RSS_URL = os.environ.get("SENSCRITIQUE_RSS_URL", "https://www.senscritique.com/rss/films") # Fallback dummy or real RSS URL if known
DATA_DIR = os.environ.get("DATA_DIR", "/data")

def fetch_rss_feed(url):
    """Fetch and parse the RSS feed."""
    feed = feedparser.parse(url)
    if feed.bozo:
        print(f"Error parsing feed: {feed.bozo_exception}")
        return []
    return feed.entries

def main():
    print(f"Starting SensCritique Fetcher at {datetime.now().isoformat()}")
    
    # Ensure data directory exists (mounted PVC)
    os.makedirs(DATA_DIR, exist_ok=True)
    releases_file = os.path.join(DATA_DIR, "weekly_releases.json")
    
    # Load existing releases to avoid processing duplicates
    existing_releases = []
    if os.path.exists(releases_file):
        with open(releases_file, 'r', encoding='utf-8') as f:
            try:
                existing_releases = json.load(f)
            except json.JSONDecodeError:
                existing_releases = []

    existing_links = {release['link'] for release in existing_releases}
    
    entries = fetch_rss_feed(SENSCRITIQUE_RSS_URL)
    print(f"Found {len(entries)} entries in the RSS feed.")
    
    new_releases = []
    for entry in entries:
        title = entry.title if hasattr(entry, 'title') else "Unknown Title"
        link = entry.link if hasattr(entry, 'link') else ""
        published = entry.published if hasattr(entry, 'published') else datetime.now().isoformat()
        
        # In a real scenario, we might want to filter only "Sorties Cinéma" 
        # or parse the specific date of release based on the feed's structure.
        
        if link and link not in existing_links:
            release_info = {
                "title": title,
                "link": link,
                "published_at": published,
                "detected_at": datetime.now().isoformat()
            }
            new_releases.append(release_info)
            print(f"Detected new release: {title}")

    # Save updated data
    if new_releases:
        all_releases = existing_releases + new_releases
        with open(releases_file, 'w', encoding='utf-8') as f:
            json.dump(all_releases, f, ensure_ascii=False, indent=2)
        print(f"Saved {len(new_releases)} new records to {releases_file}.")
    else:
        print("No new releases detected.")

if __name__ == "__main__":
    main()
