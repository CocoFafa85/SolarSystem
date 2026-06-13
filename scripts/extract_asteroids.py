import json
import subprocess
import os

def fetch_vizier_asteroids(limit=200):
    print(f"🛰️ Interrogation de VizieR (Catalogue B/astorb) pour les {limit} principaux astéroïdes...")
    
    # Chemin direct puisque tu lances le script depuis le dossier 'scripts'
    cmd = ["python", "cds.cdsclient-main/cdsclient/vizquery.py", "-source=B/astorb", f"-out.max={limit}", "-mime=tsv"]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"❌ Erreur lors de l'exécution de vizquery : {e.stderr}")
        return None

def parse_tsv_to_json(tsv_data):
    if not tsv_data:
        return
    
    lines = tsv_data.strip().split("\n")
    asteroids_dict = {}
    
    data_started = False
    headers = []
    
    for line in lines:
        if line.startswith("#") or not line.strip():
            continue
        
        if not data_started:
            headers = line.split("\t")
            data_started = True
            continue
        
        values = line.split("\t")
        if len(values) != len(headers):
            continue
            
        row = dict(zip(headers, values))
        
        # Le try/except attrape maintenant les ValueError pour ignorer la ligne des unités ('mag', 'AU')
        try:
            name = row.get("Name", row.get("Number", "Astéroïde Inconnu")).strip()
            asteroid_id = name.lower().replace(" ", "_")
            
            asteroids_dict[asteroid_id] = {
                "name": name,
                "type": "asteroid",
                "physical": {
                    "mass": None,
                    "radius_au": float(row.get("H", 15)) * 0.000000001,
                    "rotation_period_hours": None,
                    "obliquity_degrees": 0
                },
                "orbital": {
                    "semi_major_axis_au": float(row["a"]),
                    "eccentricity": float(row["e"]),
                    "inclination_degrees": float(row["i"]),
                    "longitude_ascending_node_degrees": float(row.get("node", row.get("Omega", 0))),
                    "argument_perihelion_degrees": float(row.get("peri", row.get("omega", 0))),
                    "mean_anomaly_epoch_degrees": float(row.get("M", 0))
                }
            }
        except (KeyError, ValueError):
            # Si c'est la ligne des unités ou s'il manque une donnée critique, on passe à la ligne suivante
            continue

    # Sauvegarde le fichier un dossier au-dessus (à la racine de SolarSystem)
    output_path = "../asteroids.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(asteroids_dict, f, indent=2, ensure_ascii=False)
    
    print(f"🟢 Extraction réussie ! Fichier généré avec succès : {output_path}")

if __name__ == "__main__":
    tsv_output = fetch_vizier_asteroids(limit=200)
    parse_tsv_to_json(tsv_output)