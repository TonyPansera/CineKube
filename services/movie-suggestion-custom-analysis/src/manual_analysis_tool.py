import os
import sys
import json

# Environment variables
DATA_DIR = os.environ.get("DATA_DIR", "/data")
SUGGESTIONS_FILE = os.path.join(DATA_DIR, "monthly_suggestions.json")


def load_suggestions():
    """Load the monthly_suggestions.json file."""
    if not os.path.exists(SUGGESTIONS_FILE):
        return None
    
    with open(SUGGESTIONS_FILE, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
            return data if data else None
        except json.JSONDecodeError:
            print("❌ Erreur : le fichier JSON est corrompu.")
            return None


def save_suggestions(data):
    """Save the updated data back to monthly_suggestions.json."""
    with open(SUGGESTIONS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def display_movies(movies):
    """Display the list of movies with index, title, year, and analysis count."""
    print(f"\n{'#':<5} {'Titre':<50} {'Année':<8} {'Analyses'}")
    print("-" * 80)
    for i, movie in enumerate(movies):
        title = movie.get("title", "Sans titre")
        year = movie.get("theatrical_release_date", "????")[:4] or "????"
        analyses = movie.get("analyses", [])
        # Support legacy "analysis" field (string) for backwards compatibility
        if not analyses and movie.get("analysis"):
            analyses = [movie["analysis"]]
        count = len(analyses)
        print(f"[{i}]  {title:<50} {year:<8} {count} analyse(s)")


def main():
    sys.stdout.reconfigure(encoding='utf-8')

    print("=" * 60)
    print("  CineKube — Ajout d'analyse personnalisée")
    print("=" * 60)

    # Step 1: Check file exists and is not empty
    movies = load_suggestions()
    if movies is None:
        print(f"\n❌ Aucune donnée trouvée dans {SUGGESTIONS_FILE}.")
        print("   Lancez d'abord le service movie-suggestion pour générer la liste.")
        return

    if len(movies) == 0:
        print(f"\n❌ Le fichier {SUGGESTIONS_FILE} est vide.")
        return

    # Step 2: Display movie list
    display_movies(movies)

    # Step 3: Select a movie
    print()
    while True:
        try:
            choice = input(f"Sélectionnez un film (0-{len(movies)-1}) ou 'q' pour quitter : ").strip()
            if choice.lower() == 'q':
                print("Annulé.")
                return
            idx = int(choice)
            if 0 <= idx < len(movies):
                break
            else:
                print(f"Veuillez entrer un nombre entre 0 et {len(movies)-1}.")
        except ValueError:
            print("Entrée invalide. Veuillez entrer un nombre.")

    selected = movies[idx]
    print(f"\n✅ Film sélectionné : {selected.get('title')}")
    print(f"   Réalisateur : {selected.get('director', 'Inconnu')}")
    print(f"   Synopsis : {selected.get('overview', 'N/A')[:120]}...")

    # Show existing analyses
    existing_analyses = selected.get("analyses", [])
    # Migrate legacy "analysis" string to "analyses" array
    if not existing_analyses and selected.get("analysis"):
        existing_analyses = [selected["analysis"]]

    if existing_analyses:
        print(f"\n   📝 Analyses existantes ({len(existing_analyses)}) :")
        for j, a in enumerate(existing_analyses):
            print(f"      [{j+1}] {a[:100]}{'...' if len(a) > 100 else ''}")

    # Step 4: Input the new analysis
    print(f"\n📝 Rédigez votre analyse pour « {selected.get('title')} ».")
    print("   (Tapez votre texte puis appuyez sur Entrée. Laissez vide pour annuler.)\n")

    analysis = input("Votre analyse : ").strip()
    if not analysis:
        print("Aucune analyse saisie. Annulé.")
        return

    # Step 5: Update and save
    # Ensure "analyses" array exists (migrate from legacy "analysis" if needed)
    if "analyses" not in selected:
        selected["analyses"] = []
    if selected.get("analysis") and selected["analysis"] not in selected["analyses"]:
        selected["analyses"].insert(0, selected["analysis"])
    
    # Remove legacy "analysis" field
    selected.pop("analysis", None)

    selected["analyses"].append(analysis)
    save_suggestions(movies)

    print(f"\n🎉 Analyse ajoutée avec succès pour « {selected.get('title')} » !")
    print(f"   Total d'analyses pour ce film : {len(selected['analyses'])}")
    print(f"   Fichier mis à jour : {SUGGESTIONS_FILE}")


if __name__ == "__main__":
    main()
