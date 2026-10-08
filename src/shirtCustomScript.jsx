import { useState, useEffect, useRef } from "react";
import shirtMockUp from "./assets/shirt.webp";
import shirtNoise from "./assets/noise.webp";
import "./shirtCustomScript.css";

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function ShirtCustom({ initialProduct, onBackToCatalog, onAddToCart }) {
  const [allShirts, setAllShirts] = useState(initialProduct ? [initialProduct] : []);
  const [selectedModel, setSelectedModel] = useState(initialProduct || null);
  const [shirtColor, setShirtColor] = useState("#3b82f6");
  const [selectedSize, setSelectedSize] = useState("G");
  const [recommendedModels, setRecommendedModels] = useState([]);

  const scrollContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const colors = [
    { name: "White", hex: "#ffffff" },
    { name: "Black", hex: "#18181b" },
    { name: "Blue", hex: "#3b82f6" },
    { name: "Red", hex: "#ef4444" },
    { name: "Green", hex: "#22c55e" },
    { name: "Yellow", hex: "#eab308" },
  ];

  const getImage = (item) => {
    if (!item) return "";
    return item.image || item.image_url || "";
  };

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

        if (error || !data || data.length === 0) {
          return;
        }

        setAllShirts(data);

        const activeTarget = initialProduct || data[0];
        setSelectedModel(activeTarget);

        const currentId = activeTarget.id ?? activeTarget.name;
        const others = data.filter((item) => (item.id ?? item.name) !== currentId);
        const shuffledOthers = [...others].sort(() => 0.5 - Math.random());
        const randomThree = shuffledOthers.slice(0, 3);

        let finalSelection = [activeTarget, ...randomThree];

        let index = 0;
        while (finalSelection.length < 4 && data.length > 0) {
          const candidate = data[index % data.length];
          if (!finalSelection.some(item => (item.id ?? item.name) === (candidate.id ?? candidate.name))) {
            finalSelection.push(candidate);
          }
          index++;
          if (index > 20) break;
        }

        setRecommendedModels(finalSelection.slice(0, 4));
      } catch (err) {
        console.error("Error al conectar:", err);
      }
    }

    fetchCatalog();
  }, [initialProduct]);

  useEffect(() => {
    if (selectedModel) {
      const currentAllowed = selectedModel.allowedColors || formatColors(selectedModel.colors);
      if (currentAllowed && currentAllowed.length > 0) {
        if (!currentAllowed.includes(shirtColor)) {
          setShirtColor(currentAllowed[0]);
        }
      }
    }
  }, [selectedModel]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleAddCurrentToCart = () => {
    if (onAddToCart && selectedModel) {
      const productPayload = {
        ...selectedModel,
        image: getImage(selectedModel),
        selectedColor: shirtColor
      };
      onAddToCart(productPayload, selectedSize);
    }
  };

  if (!selectedModel) {
    return (
      <div className="customizer-container customizer-loading">
        Cargando diseño...
      </div>
    );
  }

  const currentAllowedColors = selectedModel.allowedColors || formatColors(selectedModel.colors);
  const isBlackShirt = shirtColor === "#18181b" || shirtColor === "#000000";
  const activeModelImage = getImage(selectedModel);
  const designHeight = selectedModel.heightCataloge ?? selectedModel.height ?? 0;

  return (
    <div className="customizer-container">
      <div className="customizer-main-layout">
        <div className="shirt-stage">
          <div
            className="shirt-base-color"
            style={{
              backgroundColor: shirtColor,
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
            {activeModelImage && (
              <img
                src={activeModelImage}
                alt={selectedModel.name}
                className="shirt-design-img-3d"
                style={{
                  transform: `rotateY(-35deg) rotateX(0deg) scale(1) translateY(calc(${designHeight}% + 30%)) translateX(-12px)`
                }}
              />
            )}
          </div>

          <img src={shirtMockUp} alt="Playera Sombras" className="shirt-shadows" />
        </div>

        <div 
          className="models-scroll-menu"
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          {recommendedModels.map((model, index) => {
            const thumbImg = getImage(model);
            const isSelected = (selectedModel.id ?? selectedModel.name) === (model.id ?? model.name);
            return (
              <button
                key={`${model.id ?? model.name}-${index}`}
                onClick={() => setSelectedModel(model)}
                className={`model-card ${isSelected ? "active" : ""}`}
              >
                {thumbImg ? (
                  <img 
                    src={thumbImg} 
                    alt={model.name} 
                    className="model-thumb" 
                    draggable="false"
                  />
                ) : (
                  <div className="model-thumb-placeholder" style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', textAlign: 'center', color: '#888', background: '#222', borderRadius: '4px' }}>
                    {model.name}
                  </div>
                )}
                <span className="model-card-title">{model.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="color-selector">
        {colors
          .filter((c) => {
            return (
              !currentAllowedColors ||
              currentAllowedColors.length === 0 ||
              currentAllowedColors.includes(c.hex)
            );
          })
          .map((c) => (
            <button
              key={c.hex}
              onClick={() => setShirtColor(c.hex)}
              title={c.name}
              className={`color-btn ${shirtColor === c.hex ? "selected" : ""}`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
      </div>

      <div className="customizer-actions-wrapper">
        <p className="size-label">Selecciona tu Talla:</p>
        <div className="size-buttons-group">
          {["CH", "M", "G", "XG", "XXG"].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedSize(t)}
              className={`size-btn ${selectedSize === t ? "active" : ""}`}
            >
              {t}
            </button>
          ))}
        </div>

        <button 
          onClick={handleAddCurrentToCart}
          className="add-to-cart-btn"
        >
          Agregar al Carrito 🛒
        </button>
      </div>

      {onBackToCatalog && (
        <div className="catalog-back-wrapper">
          <button 
            onClick={onBackToCatalog}
            className="back-catalog-btn"
          >
            ← Regresar al Catálogo
          </button>
        </div>
      )}
    </div>
  );
}