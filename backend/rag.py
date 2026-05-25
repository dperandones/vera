import json
from pathlib import Path
from sentence_transformers import SentenceTransformer
import numpy as np

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
EMBEDDINGS_PATH = Path(__file__).parent.parent / "data" / "embeddings.json"

model = None
embeddings_data = None


def load():
    global model, embeddings_data
    if embeddings_data is not None:
        return
    print("Cargando modelo y embeddings...")
    model = SentenceTransformer(MODEL_NAME)
    with open(EMBEDDINGS_PATH, encoding="utf-8") as f:
        embeddings_data = json.load(f)
    print(f"  → {len(embeddings_data)} tratamientos cargados")


def search(query: str, top_k: int = 3) -> list:
    if not query or not query.strip():
        return []

    load()

    query_embedding = model.encode(query, normalize_embeddings=True)
    scores = []

    for doc in embeddings_data:
        emb = np.array(doc["embedding"])
        score = float(np.dot(query_embedding, emb))
        scores.append((score, doc))

    scores.sort(key=lambda x: x[0], reverse=True)
    
    best_score = scores[0][0] if scores else 0
    
    # Si el mejor resultado es muy bueno (>0.7), devolver solo ese
    if best_score > 0.7:
        top = [scores[0][1]]
    else:
        top = [doc for score, doc in scores[:top_k] if score > 0.45]

    return [
        {
            "name":        doc["metadata"]["name"],
            "url":         doc["metadata"].get("url", ""),
            "price":       doc["metadata"].get("averagePrice"),
            "worthIt":     doc["metadata"].get("worthItPercentage"),
            "reviews":     doc["metadata"].get("numberOfReviews"),
            "description": doc["metadata"].get("description", "")[:200],
        }
        for doc in top
    ]
