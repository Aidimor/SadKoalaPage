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

export default function MainView({ 
  onGoHome, 
  onGoMain, 
  onGoPlaymats, 
  onGoContact, 
  onGoOrders, 
  onGoCatalog, 
  onSelectShirt 
}) {
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
    <div className="main-page-container">
      
      {/* 1. SECCIÓN DEL REEL / CARRUSEL */}
      <section className="main-reel-container">
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
      </section>

      {/* 2. SECCIÓN DE PLAYERAS MÁS VENDIDAS */}
      <section className="bestsellers-section">
        <div className="bestsellers-header">
          <div className="bestsellers-title-wrapper">
            <h2 className="bestsellers-heading">Más Vendidas</h2>
            <p className="bestsellers-subtitle">
              Los diseños favoritos de la comunidad listos para ti.
            </p>
          </div>
          <button 
            className="bestsellers-see-all-btn"
            onClick={onGoCatalog || onGoHome}
          >
            Ver todo el catálogo →
          </button>
        </div>

        {loadingShirts ? (
          <p className="bestsellers-loading">Cargando favoritos...</p>
        ) : (
          <div className="bestsellers-grid">
            {bestSellers.map((shirt) => (
              <div 
                key={shirt.id}
                className="bestseller-card"
                onClick={() => onSelectShirt && onSelectShirt(shirt)}
              >
                <div className="bestseller-card-image-box">
                  <img 
                    src={shirt.image_url || shirt.image || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80"} 
                    alt={shirt.name || "Playera"} 
                    className="bestseller-card-img"
                  />
                </div>
                <div className="bestseller-card-info">
                  <h3 className="bestseller-card-title">
                    {shirt.name || "Playera Personalizada"}
                  </h3>
                  <p className="bestseller-card-category">
                    {shirt.category || "Edición Especial"}
                  </p>
                  <div className="bestseller-card-footer">
                    <span className="bestseller-card-price">
                      ${shirt.price || "350"} MXN
                    </span>
                    <span className="bestseller-card-badge">
                      Personalizar ⚡
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}