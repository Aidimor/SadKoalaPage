import { useState, useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import shirtMockUp from "./assets/shirt.webp";
import shirtNoise from "./assets/noise.webp";
import "./shirtCatalog.css";

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function ShirtCatalog({ onSelectShirt, onClose }) {
  const [shirtModels, setShirtModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const gridRef = useRef(null);
  const hasAnimatedInitial = useRef(false);

  const colors = [
    { name: "White", hex: "#ffffff" },
    { name: "Black", hex: "#18181b" },
    { name: "Blue", hex: "#3b82f6" },
    { name: "Red", hex: "#ef4444" },
    { name: "Green", hex: "#22c55e" },
    { name: "Yellow", hex: "#eab308" },
  ];

  const formatColors = (itemColors) => {
    return itemColors
      ? itemColors.map((colorName) => {
          const found = colors.find(
            (c) => c.name.toLowerCase() === String(colorName).trim().toLowerCase()
          );
          return found ? found.hex : null;
        }).filter(Boolean)
      : [];
  };

  useEffect(() => {
    async function fetchCatalog() {
      try {
        const { data, error } = await supabase
          .from("Shirts")
          .select("*");

        if (error) {
          setErrorMessage(`Error al cargar catálogo: ${error.message}`);
          setLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          setErrorMessage("No hay playeras disponibles en la base de datos.");
          setLoading(false);
          return;
        }

        setShirtModels(data);
        setLoading(false);
      } catch (err) {
        setErrorMessage(`Fallo de conexión: ${err.message}`);
        setLoading(false);
      }
    }

    fetchCatalog();
  }, []);

  useEffect(() => {
    if (!loading && gridRef.current && !hasAnimatedInitial.current) {
      const cards = gridRef.current.querySelectorAll(".catalog-card");
      if (cards.length > 0) {
        hasAnimatedInitial.current = true;
        animate(cards, {
          translateY: [20, 0],
          opacity: [0, 1],
          scale: [0.98, 1],
          duration: 400,
          ease: "outExpo"
        });
      }
    }
  }, [loading, shirtModels]);

  useEffect(() => {
    if (!loading && hasAnimatedInitial.current && searchTerm.trim() !== "") {
      const cards = gridRef.current?.querySelectorAll(".catalog-card");
      if (cards && cards.length > 0) {
        animate(cards, {
          translateY: [25, 0],
          opacity: [0, 1],
          scale: [0.95, 1],
          delay: stagger(60, { start: 30 }),
          duration: 500,
          ease: "outExpo"
        });
      }
    }
  }, [searchTerm, loading]);

  const filteredShirts = shirtModels.filter((item) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    const nameMatch = item.name && item.name.toLowerCase().includes(term);
    const keywordMatch = item.keys && Array.isArray(item.keys) && 
      item.keys.some((kw) => kw && kw.toLowerCase().includes(term));

    return nameMatch || keywordMatch;
  });

  if (errorMessage) {
    return (
      <div className="catalog-container">
        <div className="catalog-error">{errorMessage}</div>
      </div>
    );
  }

  return (
    <div className="catalog-container" onClick={onClose}>
      <div className="catalog-content-wrapper" onClick={(e) => e.stopPropagation()}>
        {onClose && (
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        )}

        <header className="catalog-header">      

          <div className="catalog-search-wrapper">
            <input
              type="text"
              placeholder="Buscar por nombre o etiquetas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="catalog-search-input"
            />
          </div>
        </header>

        <div ref={gridRef} className="catalog-grid">
          {filteredShirts.length > 0 ? (
            filteredShirts.map((item) => {
              const allowedColors = item.allowedColors || formatColors(item.colors);
              const defaultColor = (allowedColors && allowedColors.length > 0) ? allowedColors[0] : "#3b82f6";
              const isBlackShirt = defaultColor === "#18181b" || defaultColor === "#000000";
              const imageUrl = item.image || item.image_url;
              const designHeight = item.heightCataloge ?? item.height ?? 0;

              return (
                <div 
                  key={item.id} 
                  className="catalog-card" 
                  onClick={() => onSelectShirt(item)}
                  style={{ 
                    cursor: "pointer",
                    opacity: (searchTerm.trim() === "" && hasAnimatedInitial.current) ? 1 : 0 
                  }}
                >
                  <div className="catalog-image-wrapper">
                    <div
                      className="shirt-base-color"
                      style={{
                        backgroundColor: defaultColor,
                        WebkitMaskImage: `url(${shirtMockUp})`,
                        maskImage: `url(${shirtMockUp})`,
                      }}
                    />

                    <div
                      className="shirt-noise-layer"
                      style={{
                        backgroundImage: `url(${shirtNoise})`,
                        backgroundSize: isBlackShirt ? "300px 300px" : "150px 150px",
                        WebkitMaskImage: `url(${shirtMockUp})`,
                        maskImage: `url(${shirtMockUp})`,
                      }}
                    />

                    <div className="shirt-design-stage-3d">
                      <img
                        src={imageUrl}
                        alt={item.name}
                        className="shirt-design-img-3d"
                        style={{
                          transform: `rotateY(-35deg) rotateX(0deg) scale(1) translateY(calc(${designHeight}% + 30%)) translateX(-12px)`
                        }}
                      />
                    </div>

                    <img src={shirtMockUp} alt="Playera Sombras" className="shirt-shadows" />
                  </div>
                  
                  <div className="catalog-info">
                    <h3>{item.name}</h3>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#a1a1aa" }}>
              No se encontraron diseños que coincidan con "{searchTerm}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}