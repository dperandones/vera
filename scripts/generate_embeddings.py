"""
Genera embeddings para los 114 tratamientos y los guarda en data/embeddings.json
Uso: python scripts/generate_embeddings.py

Dependencias:
    pip install sentence-transformers beautifulsoup4
"""

import json
import re
from pathlib import Path
from bs4 import BeautifulSoup
from sentence_transformers import SentenceTransformer

DATA_DIR = Path(__file__).parent.parent / "data"
INPUT_FILE  = DATA_DIR / "cards.json"
OUTPUT_FILE = DATA_DIR / "embeddings.json"

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"


def clean_html(text: str) -> str:
    """Elimina entidades HTML y etiquetas del texto."""
    if not text:
        return ""
    soup = BeautifulSoup(text, "html.parser")
    clean = soup.get_text(separator=" ")
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


def build_document(card: dict) -> str:
    """Construye el texto a embedear para cada tratamiento."""
    name = card.get("name", "")
    description = clean_html(card.get("description", ""))
    price = card.get("averagePrice")
    worth_it = card.get("worthItPercentage", "")
    reviews = card.get("numberOfReviews", 0)

    parts = [f"Tratamiento: {name}.", description]

    if price:
        parts.append(f"Precio medio: {price} EUR.")
    if worth_it:
        parts.append(f"Valoración de pacientes: {worth_it} lo recomendaría.")
    if reviews:
        parts.append(f"Basado en {reviews} experiencias reales.")

    return " ".join(parts)


def main():
    print(f"Cargando tratamientos desde {INPUT_FILE}...")
    with open(INPUT_FILE, encoding="utf-8") as f:
        data = json.load(f)

    cards = data.get("cards", data) if isinstance(data, dict) else data
    print(f"  → {len(cards)} tratamientos encontrados")

    print(f"\nCargando modelo {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME)

    documents = []
    texts = []

    for card in cards:
        doc_text = build_document(card)
        texts.append(doc_text)
        documents.append({
            "id":               card.get("id"),
            "name":             card.get("name"),
            "description":      clean_html(card.get("description", "")),
            "averagePrice":     card.get("averagePrice"),
            "worthItPercentage":card.get("worthItPercentage"),
            "numberOfReviews":  card.get("numberOfReviews"),
            "url":              card.get("url", ""),
            "text":             doc_text,
        })

    print(f"\nGenerando embeddings para {len(texts)} documentos...")
    embeddings = model.encode(texts, show_progress_bar=True, normalize_embeddings=True)

    output = []
    for doc, emb in zip(documents, embeddings):
        output.append({
            "metadata": {k: v for k, v in doc.items() if k != "text"},
            "text":     doc["text"],
            "embedding": emb.tolist(),
        })

    print(f"\nGuardando en {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)

    size_kb = OUTPUT_FILE.stat().st_size / 1024
    print(f"  → Listo. {len(output)} tratamientos · {size_kb:.0f} KB")


if __name__ == "__main__":
    main()
