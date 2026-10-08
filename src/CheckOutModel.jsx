import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { animate, stagger } from "animejs";
import html2canvas from "html2canvas";
import playmat1 from "./assets/playmat1.webp";

// Carga segura desde variables de entorno de Vite
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const MAKE_WEBHOOK_URL = import.meta.env.VITE_MAKE_WEBHOOK_URL;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Auxiliar para asegurar encuadre horizontal sin deformaciones
async function padImageHorizontal(blobOrUrl) {
  return new Promise((resolve) => {
    const url = typeof blobOrUrl === "string" ? blobOrUrl : URL.createObjectURL(blobOrUrl);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const targetWidth = Math.max(img.width, Math.round(img.height * 1.77)); // Ratio 16:9 aprox
      const targetHeight = img.height;
      
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const x = (canvas.width - img.width) / 2;
      const y = (canvas.height - img.height) / 2;
      ctx.drawImage(img, x, y);

      canvas.toBlob((blob) => resolve(blob), "image/png");
    };
    img.src = url;
  });
}

export default function PlaymatCatalog({ onSelectPlaymat, onAddToCart }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState(null);

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

  const uploadToSupabase = async (source, prefix = "img") => {
    if (!source) return "";

    if (typeof source === "string" && source.startsWith("http") && !source.includes("blob:")) {
      return source;
    }

    try {
      let fileBlob = source;

      if (typeof source === "string") {
        const res = await fetch(source);
        fileBlob = await res.blob();
      }

      const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${prefix}.png`;

      const { error: uploadError } = await supabase.storage
        .from("playmats")
        .upload(cleanFileName, fileBlob, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        console.error("Error subiendo imagen:", uploadError);
        return "";
      }

      const { data: publicUrlData } = supabase.storage
        .from("playmats")
        .getPublicUrl(cleanFileName);

      return publicUrlData?.publicUrl || "";
    } catch (err) {
      console.error("Error al procesar archivo para Supabase:", err);
      return "";
    }
  };

  const handleDirectCheckout = async (item, e) => {
    e.stopPropagation();
    setProcessingId(item.id);

    try {
      const hdSource = item.image_url || item.image;
      const finalHdUrl = await uploadToSupabase(hdSource, "playmat_hd");

      const paddedBlob = await padImageHorizontal(hdSource);
      const finalPreviewUrl = await uploadToSupabase(paddedBlob, "playmat_preview");

      const precioItem = Number(item.price) || 450;
      const nombreItem = item.name || "Playmat Personalizado";

      const itemPayload = {
        producto: nombreItem,
        tipo: "playmat",
        talla: "Estándar (60x35cm)",
        color: "Full Color",
        precio: precioItem,
        imagenUrl: finalHdUrl,
        imagenPreviewUrl: finalPreviewUrl || finalHdUrl
      };

      let captionHtml = `<b>📦 NUEVO PEDIDO DIRECTO (PLAYMAT)</b>\n`;
      captionHtml += `<b>Total a Pagar:</b> $${precioItem} MXN\n`;
      captionHtml += `\n<b>───────────────</b>\n`;
      captionHtml += `🎴 <b>[Playmat de Catálogo]</b>\n`;
      captionHtml += `📌 <b>Diseño:</b> ${nombreItem}\n`;
      captionHtml += `💰 <b>Precio:</b> $${precioItem} MXN\n`;
      captionHtml += `💾 <a href="${finalHdUrl}">Descargar Archivo HD</a>\n`;

      const orderPayload = {
        items: [itemPayload],
        totalPrecio: precioItem,
        captionHtml: captionHtml,
        imagenPreviewUrl: finalPreviewUrl || finalHdUrl,
        fecha: new Date().toLocaleString()
      };

      const response = await fetch(MAKE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload)
      });

      if (response.ok) {
        alert("¡Pedido enviado con éxito! 🚀 Nos pondremos en contacto contigo para finalizar la entrega.");
      } else {
        alert(`Error al procesar el pedido (${response.status}). Inténtalo nuevamente.`);
      }
    } catch (err) {
      console.error("Error enviando pedido:", err);
      alert("Ocurrió un error de conexión al enviar la orden.");
    } finally {
      setProcessingId(null);
    }
  };

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

      <div ref={gridRef} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const imageUrl = item.image_url || item.image;
            const isProcessing = processingId === item.id;

            return (
              <div
                key={item.id}
                className="catalog-card-btn"
                onClick={() => onSelectPlaymat && onSelectPlaymat(item)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "6px 8px",
                  backgroundColor: "#09090b",
                  border: "1px solid #27272a",
                  borderRadius: "4px",
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

                {/* Info del Producto */}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      color: "#f4f4f5",
                      fontSize: "0.82rem",
                      fontWeight: "500",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {item.name}
                  </span>
                  <span style={{ color: "#a1a1aa", fontSize: "0.72rem" }}>
                    ${item.price || 450} MXN
                  </span>
                </div>

                {/* Acciones de Compra / Carrito */}
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  {onAddToCart && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(item);
                      }}
                      style={{
                        backgroundColor: "#27272a",
                        color: "#fff",
                        border: "1px solid #3f3f46",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        fontSize: "0.75rem",
                        cursor: "pointer"
                      }}
                      title="Agregar al carrito"
                    >
                      🛒
                    </button>
                  )}

                  <button
                    disabled={isProcessing}
                    onClick={(e) => handleDirectCheckout(item, e)}
                    style={{
                      backgroundColor: isProcessing ? "#15803d" : "#16a34a",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      padding: "5px 10px",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      cursor: isProcessing ? "wait" : "pointer"
                    }}
                  >
                    {isProcessing ? "Enviando..." : "🚀 Comprar"}
                  </button>
                </div>
              </div>
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