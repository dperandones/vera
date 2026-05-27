import json
from pathlib import Path
import numpy as np

# Cambiar a True en producción para usar embeddings semánticos
USE_SEMANTIC = False

# from sentence_transformers import SentenceTransformer
# MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"

EMBEDDINGS_PATH = Path(__file__).parent.parent / "data" / "embeddings.json"
model = None
embeddings_data = None
CLINICAS_PATH = Path(__file__).parent.parent / "data" / "clinicas_rinoplastia.json"
clinicas_data = None

def load_clinicas():
    global clinicas_data
    if clinicas_data is not None:
        return
    with open(CLINICAS_PATH, encoding="utf-8") as f:
        clinicas_data = json.load(f)

def search_clinics(ciudad: str = "") -> list:
    load_clinicas()
    ciudad_lower = ciudad.lower().strip()
    if ciudad_lower and ciudad_lower != "toda españa":
        results = [c for c in clinicas_data if ciudad_lower in c.get("ciudad", "").lower()]
    else:
        results = clinicas_data
    return sorted(results, key=lambda x: x.get("rating") or 0, reverse=True)[:5]

EXP_PATH   = Path(__file__).parent.parent / "data" / "index_experiencias.json"
QUEST_PATH = Path(__file__).parent.parent / "data" / "index_preguntas.json"
exp_data   = None
quest_data = None

def load_content():
    global exp_data, quest_data
    if exp_data is not None:
        return
    with open(EXP_PATH, encoding="utf-8") as f:
        exp_data = json.load(f)
    with open(QUEST_PATH, encoding="utf-8") as f:
        quest_data = json.load(f)

def search_experiences(query: str, top_k: int = 3) -> list:
    load_content()
    words = [w for w in query.lower().split() if len(w) > 3]
    scored = []
    for item in exp_data:
        text = (item.get("title","") + " " + item.get("resume","")).lower()
        score = sum(1 for w in words if w in text)
        if score > 0:
            scored.append((score, item))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [i for _, i in scored[:top_k]]

def search_questions(query: str, top_k: int = 3) -> list:
    load_content()
    words = [w for w in query.lower().split() if len(w) > 3]
    scored = []
    for item in quest_data:
        text = (item.get("title","") + " " + item.get("resume","")).lower()
        score = sum(1 for w in words if w in text)
        if score > 0:
            scored.append((score, item))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [i for _, i in scored[:top_k]]

def load():
    global model, embeddings_data
    if embeddings_data is not None:
        return
    print("Cargando embeddings...")
    # if USE_SEMANTIC:
    #     model = SentenceTransformer(MODEL_NAME)
    with open(EMBEDDINGS_PATH, encoding="utf-8") as f:
        embeddings_data = json.load(f)
    print(f"  → {len(embeddings_data)} tratamientos cargados")

def search(query: str, top_k: int = 3) -> list:
    if not query or not query.strip():
        return []
    load()

    if USE_SEMANTIC:
        # query_embedding = model.encode(query, normalize_embeddings=True)
        # scores = [(float(np.dot(query_embedding, np.array(doc["embedding"]))), doc) for doc in embeddings_data]
        pass
    else:
        query_lower = query.lower()
        words = [w for w in query_lower.split() if len(w) > 3]
        scores = []
        for doc in embeddings_data:
            name = doc["metadata"].get("name", "").lower()
            text = doc["text"].lower()
            name_match = 3 if any(w in name for w in words) else 0
            word_matches = sum(1 for w in words if w in text)
            score = name_match + word_matches
            scores.append((score, doc))

    scores.sort(key=lambda x: x[0], reverse=True)
    best_score = scores[0][0] if scores else 0
    top = [scores[0][1]] if best_score >= 3 else [doc for score, doc in scores[:top_k] if score > 0]

    return [
        {
            "name":    doc["metadata"]["name"],
            "url":     doc["metadata"].get("url", ""),
            "price":   doc["metadata"].get("averagePrice"),
            "worthIt": doc["metadata"].get("worthItPercentage"),
            "reviews": doc["metadata"].get("numberOfReviews"),
        }
        for doc in top
    ]
