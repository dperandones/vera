/**
 * api/chat.js — Vercel Serverless Function
 *
 * Variables de entorno requeridas en Vercel:
 *   ANTHROPIC_API_KEY=sk-ant-...
 *
 * POST /api/chat
 * Body: { messages: [{role, content}], conversationContext?: {} }
 */

import { readFileSync } from "fs";
import { join } from "path";

let embeddingsCache = null;

function loadEmbeddings() {
  if (embeddingsCache) return embeddingsCache;
  const filePath = join(process.cwd(), "data", "embeddings.json");
  embeddingsCache = JSON.parse(readFileSync(filePath, "utf-8"));
  return embeddingsCache;
}

function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // vectores ya normalizados en el script Python
}

async function getQueryEmbedding(text) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1,
      messages: [{ role: "user", content: "embed" }],
    }),
  });
  // Anthropic no tiene endpoint de embeddings propio todavía.
  // Usamos un modelo ligero de HuggingFace Inference API como fallback,
  // o en producción se reemplaza por Vertex AI Embeddings.
  // Para la demo: búsqueda por keywords como fallback simple.
  return null;
}

function keywordSearch(query, embeddings, topK = 3) {
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/).filter((w) => w.length > 3);

  const scored = embeddings.map((doc) => {
    const textLower = doc.text.toLowerCase();
    const nameMatch = doc.metadata.name?.toLowerCase().includes(queryLower) ? 3 : 0;
    const wordMatches = words.filter((w) => textLower.includes(w)).length;
    return { doc, score: nameMatch + wordMatches };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((x) => x.doc);
}

function formatContext(docs) {
  if (!docs.length) return "No se encontraron tratamientos específicos para esta consulta.";
  return docs
    .map((doc) => {
      const m = doc.metadata;
      return [
        `## ${m.name}`,
        doc.text,
        m.averagePrice ? `Precio medio: ${m.averagePrice} EUR` : "",
        m.worthItPercentage ? `Lo recomendaría: ${m.worthItPercentage}` : "",
        m.numberOfReviews ? `Experiencias reales: ${m.numberOfReviews}` : "",
        m.url ? `Más información: ${m.url}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");
}

const SYSTEM_PROMPT = `Eres Vera, la asistente de exploración estética de la plataforma. Tu misión es acompañar al usuario desde su duda inicial hasta encontrar el tratamiento y el especialista adecuados para su caso.

PERSONALIDAD:
- Cercana y cálida, como una amiga muy informada
- Tuteas siempre, lenguaje sencillo y accesible
- Genuinamente interesada en el bienestar del usuario
- No eres un bot de ventas ni usas lenguaje clínico en exceso
- Nunca dices "¡Genial elección!" ni "¡Perfecto!" como muletilla

LO QUE HACES:
- Ayudas a entender qué tratamientos pueden ser relevantes según la zona y objetivo del usuario
- Muestras información real de la plataforma: precios orientativos, valoraciones, experiencias de otros pacientes
- Cuando el usuario tiene suficiente información, le ofreces ver especialistas verificados en su zona
- Respondes en el idioma que use el usuario (ES, IT, FR, DE, EN)

LO QUE NUNCA HACES:
- Dar diagnósticos médicos o recomendaciones clínicas vinculantes
- Presionar al usuario para que contacte con una clínica
- Inventar información que no esté en el contexto de tratamientos disponible
- Sustituir la valoración de un médico especialista

FORMATO DE RESPUESTAS:
- Máximo 3-4 frases por mensaje, conversacional
- Cuando presentes tratamientos, usa una línea por cada uno con el precio y valoración
- Siempre termina con una pregunta o una opción clara para el siguiente paso

INFORMACIÓN DE TRATAMIENTOS DISPONIBLE:
{context}`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages } = req.body;

  if (!messages?.length) {
    return res.status(400).json({ error: "messages requerido" });
  }

  try {
    const embeddings = loadEmbeddings();

    // Extraer la última pregunta del usuario para buscar contexto
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user")?.content || "";

    const relevantDocs = keywordSearch(lastUserMessage, embeddings, 3);
    const context = formatContext(relevantDocs);

    const systemWithContext = SYSTEM_PROMPT.replace("{context}", context);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemWithContext,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Error llamando a Anthropic");
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || "";

    return res.status(200).json({
      reply,
      context: relevantDocs.map((d) => ({
        name: d.metadata.name,
        url: d.metadata.url,
        price: d.metadata.averagePrice,
        worthIt: d.metadata.worthItPercentage,
        reviews: d.metadata.numberOfReviews,
      })),
    });
  } catch (err) {
    console.error("Error en /api/chat:", err);
    return res.status(500).json({ error: err.message });
  }
}
