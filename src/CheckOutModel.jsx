import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { animate, stagger } from "animejs";
import playmat1 from "./assets/playmat1.webp";

const supabase = createClient(
  "https://wnezxpgkymojzotrzcmc.supabase.co",
  "sb_publishable_GWwMGvh0jiuJKxlV_EXnrA_q-yk3899"
);

export default function PlaymatCatalog({ onSelectPlaymat }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const gridRef = useRef(null);
  const hasAnimatedInitial = useRef(false);

  useEffect(() => {
    async function fetchCatalog() {
      try {
        const { data, error } = await supabase
          .from("Playmats")
          .select("*")
          .eq("active", true);

        if (error) {
          setErrorMessage(`Error: ${error.message}`);
          setLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          setErrorMessage("Sin diseños disponibles.");
          setLoading(false);
          return;
        }

        setItems(data);
        setLoading(false);
      } catch (err) {
        setErrorMessage(`Error de conexión: ${err.message}`);
        setLoading(false);
      }
    }

    fetchCatalog();
  }, []);

  useEffect(() => {
    if (!loading && gridRef.current && !hasAnimatedInitial.current) {
      const cards = gridRef.current.querySelectorAll(".catalog-card-btn");
      if (cards.length > 0) {
        hasAnimatedInitial.current = true;
        animate(cards, {
          translateY: [15, 0],
          opacity: [0, 1],
          duration: 350,
          ease: "outExpo",
        });
      }
    }
  }, [loading, items]);

  useEffect(() => {
    if (!loading && hasAnimatedInitial.current && searchTerm.trim() !== "") {
      const cards = gridRef.current?.querySelectorAll(".catalog-card-btn");
      if (cards && cards.length > 0) {
        animate(cards, {
          translateY: [15, 0],
          opacity: [0, 1],
          delay: stagger(40),
          duration: 300,
          ease: "outExpo",
        });
      }
    }
  }, [searchTerm, loading]);

  const filteredItems = items.filter((item) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return item.name && item.name.toLowerCase().includes(term);
  });

  if (errorMessage) {
    return <div style={{ color: "#ef4444", padding: "10px", fontSize: "0.85rem" }}>{errorMessage}</div>;
  }

  if (loading) {
    return <div style={{ color: "#a1a1aa", padding: "10px", fontSize: "0.85rem" }}>Cargando catálogo...</div>;
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
      <header style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <h3 style={{ color: "#fff", margin: 0, fontSize: "0.95rem", fontWeight: "600" }}>
          Catálogo de Playmats
        </h3>
        
        <input
          type="text"
          placeholder="🔍 Buscar arte..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "6px 10px",
            borderRadius: "4px",
            border: "1px solid #3f3f46",
            backgroundColor: "#18181b",
            color: "#fff",
            fontSize: "0.8rem",
            boxSizing: "border-box",
            outline: "none"
          }}
        />
      </header>

      {/* Lista de botones rectangulares compactos */}
      <div ref={gridRef} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const imageUrl = item.image_url || item.image;

            return (
              <button
                key={item.id}
                className="catalog-card-btn"
                onClick={() => onSelectPlaymat(item)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "6px 8px",
                  backgroundColor: "#09090b",
                  border: "1px solid #27272a",
                  borderRadius: "4px", // Esquinas rectangulares bien definidas
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                  width: "100%",
                  boxSizing: "border-box"
                }}
              >
                {/* Preview Miniatura Horizontal (16:9 compacto) */}
                <div
                  style={{
                    width: "60px",
                    height: "34px",
                    borderRadius: "2px",
                    position: "relative",
                    overflow: "hidden",
                    flexShrink: 0,
                    border: "1px solid #3f3f46"
                  }}
                >
                  <img
                    src={imageUrl}
                    alt={item.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <img
                    src={playmat1}
                    alt="Base"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      mixBlendMode: "multiply",
                      pointerEvents: "none"
                    }}
                  />
                </div>

                {/* Texto del Botón */}
                <span
                  style={{
                    color: "#f4f4f5",
                    fontSize: "0.82rem",
                    fontWeight: "500",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    flex: 1
                  }}
                >
                  {item.name}
                </span>

                <span style={{ color: "#3b82f6", fontSize: "0.75rem", fontWeight: "bold" }}>
                  Seleccionar
                </span>
              </button>
            );
          })
        ) : (
          <div style={{ textAlign: "center", padding: "15px", color: "#a1a1aa", fontSize: "0.8rem" }}>
            Sin resultados.
          </div>
        )}
      </div>
    </div>
  );
}