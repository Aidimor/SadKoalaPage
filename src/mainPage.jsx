import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import "./mainPage.css";

// Imágenes de banner locales
import banner1 from "./assets/banner1.jpg";
import banner2 from "./assets/banner2.jpg";
import banner3 from "./assets/banner3.jpg";

// Carga de variables de entorno mediante Vite
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function MainView({ onGoHome, onGoMain, onGoPlaymats, onGoContact, onGoOrders, onGoCatalog, onSelectShirt }) {
  const slides = [
    {
      id: 1,
      title: "DESCUBRE LA COLECCIÓN",
      subtitle: "Diseños de impresión online de alta calidad.",
      image: banner1,
      cta: "Ir al Catálogo",
      action: onGoCatalog || onGoHome
    },
    {
      id: 2,
      title: "PLAYMATS PERSONALIZADOS",
      subtitle: "Dale estilo a tus juegos de cartas con la mejor textura.",
      image: banner2,
      cta: "Personalizar Playmat",
      action: onGoPlaymats || onGoHome
    },
    {
      id: 3,
      title: "ESTILO URBANO Y GAMER",
      subtitle: "Playeras y mercancía única hecha a tu medida.",
      image: banner3,
      cta: "Ver Diseños",
      action: onGoCatalog || onGoHome
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [bestSellers, setBestSellers] = useState([]);
  const [loadingShirts, setLoadingShirts] = useState(true);

  // Cambio automático del carrusel cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  // Cargar las playeras más vendidas desde Supabase
  useEffect(() => {
    async function fetchBestSellers() {
      try {
        const { data, error } = await supabase
          .from("Shirts")
          .select("*")
          .limit(4);

        if (!error && data) {
          setBestSellers(data);
        }
      } catch (err) {
        console.error("Error cargando más vendidas:", err);
      } finally {
        setLoadingShirts(false);
      }
    }
    fetchBestSellers();
  }, []);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      
      {/* 1. SECCIÓN DEL REEL / CARRUSEL */}
      <div className="main-reel-container">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`reel-slide ${index === currentIndex ? "active" : ""}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            <div className="reel-overlay">
              <div className="reel-content">
                <h1>{slide.title}</h1>
                <p>{slide.subtitle}</p>
                <button className="reel-btn" onClick={slide.action}>
                  {slide.cta} 🚀
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="reel-dots">
          {slides.map((_, index) => (
            <span
              key={index}
              className={`dot ${index === currentIndex ? "active-dot" : ""}`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      </div>

      {/* 2. SECCIÓN DE PLAYERAS MÁS VENDIDAS */}
      <div style={{ width: "100%", maxWidth: "1200px", padding: "50px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
          <div>
            <p style={{ color: "#a1a1aa", fontSize: "0.95rem", marginTop: "5px" }}>
              Los diseños favoritos de la comunidad listos para ti.
            </p>
          </div>
          <button 
            onClick={onGoCatalog || onGoHome}
            style={{
              backgroundColor: "transparent",
              color: "#3b82f6",
              border: "1px solid #3b82f6",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              transition: "all 0.2s"
            }}
          >
            Ver todo el catálogo →
          </button>
        </div>

        {loadingShirts ? (
          <p style={{ color: "#71717a", textAlign: "center", padding: "40px" }}>Cargando favoritos...</p>
        ) : (
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", 
            gap: "20px" 
          }}>
            {bestSellers.map((shirt) => (
              <div 
                key={shirt.id}
                onClick={() => onSelectShirt && onSelectShirt(shirt)}
                style={{
                  backgroundColor: "#18181b",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "1px solid #27272a",
                  cursor: "pointer",
                  transition: "transform 0.2s, border-color 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.borderColor = "#3f3f46";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "#27272a";
                }}
              >
                <div style={{ width: "100%", height: "280px", backgroundColor: "#09090b", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <img 
                    src={shirt.image_url || shirt.image || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80"} 
                    alt={shirt.name || "Playera"} 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <div style={{ padding: "16px" }}>
                  <h3 style={{ color: "#fff", fontSize: "1rem", fontWeight: "600", marginBottom: "6px" }}>
                    {shirt.name || "Playera Personalizada"}
                  </h3>
                  <p style={{ color: "#71717a", fontSize: "0.85rem", marginBottom: "12px" }}>
                    {shirt.category || "Edición Especial"}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#3b82f6", fontWeight: "bold", fontSize: "1.1rem" }}>
                      ${shirt.price || "350"} MXN
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "#a1a1aa", backgroundColor: "#27272a", padding: "4px 8px", borderRadius: "4px" }}>
                      Personalizar ⚡
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}