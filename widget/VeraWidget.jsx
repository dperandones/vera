/**
 * VeraWidget.jsx
 * 
 * Uso en Lovable:
 *   import VeraWidget from "./VeraWidget";
 *   <VeraWidget apiUrl="https://tu-proyecto.vercel.app/api/chat" />
 *
 * Carga diferida — no impacta el rendimiento de la página
 * hasta que el usuario hace clic en el botón de Vera.
 */

import { useState, useRef, useEffect } from "react";

const CHIPS_INICIO = [
  { id: 1, label: "Quiero mejorar algo pero no sé qué tratamiento" },
  { id: 2, label: "Tengo un tratamiento en mente y quiero saber más" },
  { id: 3, label: "Quiero ver opciones para una zona específica" },
  { id: 4, label: "Tengo dudas sobre algo que ya me hice" },
  { id: 5, label: "Vivo fuera y quiero hacerme un tratamiento en España" },
];

function Message({ msg }) {
  const isVera = msg.role === "assistant";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isVera ? "flex-start" : "flex-end",
        marginBottom: 12,
      }}
    >
      {isVera && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#1D9E75",
            color: "#fff",
            fontSize: 12,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 8,
            flexShrink: 0,
            alignSelf: "flex-end",
          }}
        >
          V
        </div>
      )}
      <div
        style={{
          maxWidth: "78%",
          padding: "10px 14px",
          borderRadius: isVera ? "18px 18px 18px 4px" : "18px 18px 4px 18px",
          background: isVera ? "#f5f5f3" : "#1D9E75",
          color: isVera ? "#1a1a1a" : "#fff",
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
        }}
      >
        {msg.content}
        {msg.cards?.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {msg.cards.map((card) => (
              <a
                key={card.name}
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  background: "#fff",
                  border: "0.5px solid #e0e0de",
                  borderRadius: 8,
                  padding: "8px 10px",
                  marginBottom: 6,
                  textDecoration: "none",
                  color: "#1a1a1a",
                }}
              >
                <div style={{ fontWeight: 500, fontSize: 13 }}>{card.name}</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                  {card.price && `Desde ${card.price.toLocaleString()} € · `}
                  {card.worthIt && `${card.worthIt} lo recomendaría · `}
                  {card.reviews && `${card.reviews} experiencias`}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <div
        style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "#1D9E75", color: "#fff",
          fontSize: 12, fontWeight: 500,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        V
      </div>
      <div style={{ display: "flex", gap: 4, padding: "10px 14px", background: "#f5f5f3", borderRadius: "18px 18px 18px 4px" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 7, height: 7, borderRadius: "50%", background: "#999",
              animation: "pulse 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function VeraWidget({ apiUrl = "/api/chat" }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Carga diferida — solo inicializa cuando el usuario abre el chat
  const handleOpen = () => {
    if (!loaded) {
      setMessages([
        {
          role: "assistant",
          content: "Hola, soy Vera 👋 ¿Qué te trae por aquí hoy? Puedes contármelo con tus palabras o empezar por una de estas opciones:",
          cards: [],
        },
      ]);
      setLoaded(true);
    }
    setOpen(true);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    const userMsg = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages
            .filter((m) => !m.cards)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, cards: data.context || [] },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Algo salió mal. ¿Puedes intentarlo de nuevo?", cards: [] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const showChips = messages.length === 1 && messages[0].role === "assistant";

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        .vera-input:focus { outline: none; border-color: #1D9E75 !important; }
        .vera-send:hover { background: #0F6E56 !important; }
        .vera-chip:hover { background: #E1F5EE !important; border-color: #1D9E75 !important; }
      `}</style>

      {/* Botón flotante */}
      {!open && (
        <button
          onClick={handleOpen}
          style={{
            position: "fixed", bottom: 24, right: 24,
            background: "#1D9E75", color: "#fff",
            border: "none", borderRadius: 50,
            padding: "12px 20px",
            fontSize: 14, fontWeight: 500,
            cursor: "pointer", zIndex: 1000,
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 4px 16px rgba(29,158,117,0.3)",
          }}
        >
          <span style={{ fontSize: 18 }}>✦</span> Habla con Vera
        </button>
      )}

      {/* Panel del chat */}
      {open && (
        <div
          style={{
            position: "fixed", bottom: 24, right: 24,
            width: 360, height: 540,
            background: "#fff",
            borderRadius: 20,
            display: "flex", flexDirection: "column",
            boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
            zIndex: 1000, overflow: "hidden",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {/* Header */}
          <div style={{ background: "#1D9E75", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 15 }}>V</div>
              <div>
                <div style={{ color: "#fff", fontWeight: 500, fontSize: 14 }}>Vera</div>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>Asistente de exploración estética</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", fontSize: 20, cursor: "pointer", padding: 4 }}>×</button>
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 8px" }}>
            {messages.map((msg, i) => (
              <Message key={i} msg={msg} />
            ))}

            {/* Chips iniciales */}
            {showChips && !loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }}>
                {CHIPS_INICIO.map((chip) => (
                  <button
                    key={chip.id}
                    className="vera-chip"
                    onClick={() => sendMessage(chip.label)}
                    style={{
                      background: "#fff", border: "0.5px solid #e0e0de",
                      borderRadius: 12, padding: "8px 12px",
                      fontSize: 13, cursor: "pointer", textAlign: "left",
                      color: "#1a1a1a", transition: "all 0.15s",
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 14px", borderTop: "0.5px solid #f0f0ee", display: "flex", gap: 8 }}>
            <input
              className="vera-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              placeholder="Escribe tu pregunta..."
              style={{
                flex: 1, border: "0.5px solid #e0e0de",
                borderRadius: 12, padding: "9px 14px",
                fontSize: 14, background: "#fafaf9",
              }}
            />
            <button
              className="vera-send"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              style={{
                background: "#1D9E75", border: "none",
                borderRadius: 12, width: 40,
                color: "#fff", fontSize: 18,
                cursor: input.trim() ? "pointer" : "not-allowed",
                opacity: input.trim() ? 1 : 0.5,
                transition: "background 0.15s",
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}
