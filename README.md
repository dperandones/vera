# Vera — Setup para la demo

## Estructura
```
vera/
├── scripts/generate_embeddings.py  ← correr una vez local
├── api/chat.js                      ← Vercel function
├── data/
│   ├── cards.json                   ← JSON del scraper
│   └── embeddings.json              ← generado por el script
└── widget/VeraWidget.jsx            ← para Lovable
```

## Paso 1 — Generar embeddings (local, una sola vez)

```bash
pip install sentence-transformers beautifulsoup4

# Copiar el JSON del scraper a data/cards.json
# Luego:
python scripts/generate_embeddings.py
```

Genera `data/embeddings.json` (~170KB para 114 tratamientos).

## Paso 2 — Deploy en Vercel

```bash
npm i -g vercel
vercel
```

Añadir variable de entorno en vercel.com → Settings → Environment Variables:
```
ANTHROPIC_API_KEY=sk-ant-...
```

Asegurarse de que `data/embeddings.json` está en el repo (no en .gitignore).

## Paso 3 — Integrar en Lovable

Copiar `widget/VeraWidget.jsx` al proyecto de Lovable y añadir:

```jsx
import VeraWidget from "./VeraWidget";

// En el componente raíz o en el layout:
<VeraWidget apiUrl="https://tu-proyecto.vercel.app/api/chat" />
```

## Notas importantes

- La API key NUNCA va en el frontend — solo en Vercel como variable de entorno.
- El widget usa carga diferida: no carga nada hasta que el usuario hace clic.
- El RAG usa búsqueda por keywords para la demo. En producción se reemplaza
  por embeddings vectoriales reales (Vertex AI o similar).
