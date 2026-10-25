import { useState, useRef, useEffect } from "react";
import shirtMockUp from "./assets/frontShirt.webp";
import shirtNoise from "./assets/noise.webp";
import "./shirtCreator.css";

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function ShirtCreator({ onBackToCatalog, onAddToCart }) {
  const [shirtColor, setShirtColor] = useState("#ffffff");
  const [selectedSize, setSelectedSize] = useState("G");

  // Estados del catálogo de Supabase
  const [shirtCatalog, setShirtCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Zona activa actual ("chest" | "abdomen")
  const [activeZoneTarget, setActiveZoneTarget] = useState("chest");

  // Estado del Estampado 1 (Pecho)
  const [image1, setImage1] = useState(null);
  const [pos1, setPos1] = useState({ x: 0, y: 0 });
  const [scale1, setScale1] = useState(1);
  const [tintColor1, setTintColor1] = useState("#ffffff");
  const [applyTint1, setApplyTint1] = useState(false); // Alterna entre color original y máscara de color
  const [isDragging1, setIsDragging1] = useState(false);
  const dragStart1 = useRef({ x: 0, y: 0 });
  const hasMoved1 = useRef(false);

  // Estado del Estampado 2 (Abdomen / Espalda)
  const [image2, setImage2] = useState(null);
  const [pos2, setPos2] = useState({ x: 0, y: 0 });
  const [scale2, setScale2] = useState(1);
  const [tintColor2, setTintColor2] = useState("#ffffff");
  const [applyTint2, setApplyTint2] = useState(false);
  const [isDragging2, setIsDragging2] = useState(false);
  const dragStart2 = useRef({ x: 0, y: 0 });
  const hasMoved2 = useRef(false);

  const fileInputRef1 = useRef(null);
  const fileInputRef2 = useRef(null);
  const zoneRef1 = useRef(null);
  const zoneRef2 = useRef(null);

  const colors = [
    { name: "White", hex: "#ffffff" },
    { name: "Black", hex: "#18181b" },
    { name: "Blue", hex: "#3b82f6" },
    { name: "Red", hex: "#ef4444" },
    { name: "Green", hex: "#22c55e" },
    { name: "Yellow", hex: "#eab308" },
  ];

  // Paleta rápida de colores para el estampado
  const tintPresets = ["#ffffff", "#000000", "#ef4444", "#3b82f6", "#22c55e", "#eab308", "#ec4899", "#8b5cf6"];

  // Carga inicial del catálogo desde Supabase
  useEffect(() => {
    async function loadShirts() {
      try {
        setLoadingCatalog(true);
        const { data, error } = await supabase.from("Shirts").select("*");

        if (error) {
          setCatalogError(error.message);
        } else if (data) {
          setShirtCatalog(data);
        }
      } catch (err) {
        setCatalogError(err.message);
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadShirts();
  }, []);

  // Bloqueo estricto del scroll de la página al usar la rueda del mouse para hacer zoom
  useEffect(() => {
    const el1 = zoneRef1.current;
    const el2 = zoneRef2.current;

    const handleNativeWheel1 = (e) => {
      e.preventDefault();
      const zoomSpeed = 0.08;
      setScale1((prev) => {
        const nextScale = e.deltaY < 0 ? prev + zoomSpeed : prev - zoomSpeed;
        return Math.min(Math.max(0.3, nextScale), 3.5);
      });
    };

    const handleNativeWheel2 = (e) => {
      e.preventDefault();
      const zoomSpeed = 0.08;
      setScale2((prev) => {
        const nextScale = e.deltaY < 0 ? prev + zoomSpeed : prev - zoomSpeed;
        return Math.min(Math.max(0.3, nextScale), 3.5);
      });
    };

    if (el1) el1.addEventListener("wheel", handleNativeWheel1, { passive: false });
    if (el2) el2.addEventListener("wheel", handleNativeWheel2, { passive: false });

    return () => {
      if (el1) el1.removeEventListener("wheel", handleNativeWheel1);
      if (el2) el2.removeEventListener("wheel", handleNativeWheel2);
    };
  }, []);

  // Listener global para soltar el mouse
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging1(false);
      setIsDragging2(false);
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  // Aplicar arte seleccionado del catálogo lateral
  const handleSelectCatalogShirt = (item) => {
    const artUrl = item.image || item.image_url;
    if (!artUrl) return;

    if (activeZoneTarget === "chest") {
      setImage1(artUrl);
      setPos1({ x: 0, y: 0 });
      setScale1(1);
      setApplyTint1(false);
    } else {
      setImage2(artUrl);
      setPos2({ x: 0, y: 0 });
      setScale2(1);
      setApplyTint2(false);
    }
  };

  // Carga de imágenes locales
  const handleUpload1 = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage1(URL.createObjectURL(file));
      setPos1({ x: 0, y: 0 });
      setScale1(1);
      setApplyTint1(false);
    }
  };

  const handleUpload2 = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage2(URL.createObjectURL(file));
      setPos2({ x: 0, y: 0 });
      setScale2(1);
      setApplyTint2(false);
    }
  };

  // Arrastre Pecho
  const handleMouseDown1 = (e) => {
    e.stopPropagation();
    setActiveZoneTarget("chest");
    hasMoved1.current = false;
    if (image1) {
      setIsDragging1(true);
      dragStart1.current = {
        x: e.clientX - pos1.x,
        y: e.clientY - pos1.y,
      };
    }
  };

  const handleMouseMove1 = (e) => {
    if (!isDragging1) return;
    e.preventDefault();
    hasMoved1.current = true;
    setPos1({
      x: e.clientX - dragStart1.current.x,
      y: e.clientY - dragStart1.current.y,
    });
  };

  const handleMouseUp1 = () => {
    setIsDragging1(false);
  };

  // Arrastre Abdomen
  const handleMouseDown2 = (e) => {
    e.stopPropagation();
    setActiveZoneTarget("abdomen");
    hasMoved2.current = false;
    if (image2) {
      setIsDragging2(true);
      dragStart2.current = {
        x: e.clientX - pos2.x,
        y: e.clientY - pos2.y,
      };
    }
  };

  const handleMouseMove2 = (e) => {
    if (!isDragging2) return;
    e.preventDefault();
    hasMoved2.current = true;
    setPos2({
      x: e.clientX - dragStart2.current.x,
      y: e.clientY - dragStart2.current.y,
    });
  };

  const handleMouseUp2 = () => {
    setIsDragging2(false);
  };

  // Reseteo de la zona activa
  const handleResetActiveDesign = () => {
    if (activeZoneTarget === "chest") {
      setImage1(null);
      setPos1({ x: 0, y: 0 });
      setScale1(1);
      setApplyTint1(false);
      setTintColor1("#ffffff");
      if (fileInputRef1.current) fileInputRef1.current.value = "";
    } else {
      setImage2(null);
      setPos2({ x: 0, y: 0 });
      setScale2(1);
      setApplyTint2(false);
      setTintColor2("#ffffff");
      if (fileInputRef2.current) fileInputRef2.current.value = "";
    }
  };

  const handleAddToCart = () => {
    if (!image1 && !image2) {
      alert("Por favor sube o selecciona al menos un diseño antes de agregar al carrito.");
      return;
    }

    if (onAddToCart) {
      const customProductPayload = {
        id: `custom-shirt-${Date.now()}`,
        name: "Playera Personalizada DTF",
        image: image1 || image2,
        secondaryImage: image2 || null,
        selectedColor: shirtColor,
        isCustomDesign: true,
        price: 350,
        designTransform1: image1
          ? { ...pos1, scale: scale1, tintColor: applyTint1 ? tintColor1 : null }
          : null,
        designTransform2: image2
          ? { ...pos2, scale: scale2, tintColor: applyTint2 ? tintColor2 : null }
          : null,
      };
      onAddToCart(customProductPayload, selectedSize);
    }
  };

  const filteredShirts = shirtCatalog.filter((item) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    const nameMatch = item.name && item.name.toLowerCase().includes(term);
    const keywordMatch =
      item.keys &&
      Array.isArray(item.keys) &&
      item.keys.some((kw) => kw && kw.toLowerCase().includes(term));
    return nameMatch || keywordMatch;
  });

  const isBlackShirt = shirtColor === "#18181b" || shirtColor === "#000000";
  const hasActiveImage = activeZoneTarget === "chest" ? !!image1 : !!image2;
  const currentApplyTint = activeZoneTarget === "chest" ? applyTint1 : applyTint2;
  const currentTintColor = activeZoneTarget === "chest" ? tintColor1 : tintColor2;

  const handleToggleTint = (enabled) => {
    if (activeZoneTarget === "chest") setApplyTint1(enabled);
    else setApplyTint2(enabled);
  };

  const handleUpdateTintColor = (newColor) => {
    if (activeZoneTarget === "chest") {
      setTintColor1(newColor);
      setApplyTint1(true);
    } else {
      setTintColor2(newColor);
      setApplyTint2(true);
    }
  };

  return (
    <div className="customizer-page-wrapper">
      <input
        ref={fileInputRef1}
        type="file"
        accept="image/*"
        onChange={handleUpload1}
        className="customizer-hidden-input"
      />
      <input
        ref={fileInputRef2}
        type="file"
        accept="image/*"
        onChange={handleUpload2}
        className="customizer-hidden-input"
      />

      {/* 1. SIDEBAR IZQUIERDO: CATÁLOGO SUPABASE */}
      <aside className="customizer-sidebar">
        <h3 className="sidebar-title">Catálogo de Playeras</h3>

        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar arte o etiqueta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="target-zone-selector">
          <span className="target-zone-label">Poner arte en:</span>
          <div className="target-btn-group">
            <button
              onClick={() => setActiveZoneTarget("chest")}
              className={`target-btn ${activeZoneTarget === "chest" ? "active" : ""}`}
            >
              Pecho
            </button>
            <button
              onClick={() => setActiveZoneTarget("abdomen")}
              className={`target-btn ${activeZoneTarget === "abdomen" ? "active" : ""}`}
            >
              Abdomen
            </button>
          </div>
        </div>

        <div className="catalog-items-list">
          {loadingCatalog && <div className="catalog-status">Cargando catálogo...</div>}
          {catalogError && <div className="catalog-status error">{catalogError}</div>}
          {!loadingCatalog && !catalogError && filteredShirts.length === 0 && (
            <div className="catalog-status">No se encontraron diseños.</div>
          )}

          {!loadingCatalog &&
            filteredShirts.map((item) => {
              const artUrl = item.image || item.image_url;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectCatalogShirt(item)}
                  className="catalog-item-card"
                >
                  <img src={artUrl} alt={item.name} className="catalog-thumb" />
                  <span className="catalog-item-name">{item.name}</span>
                </div>
              );
            })}
        </div>
      </aside>

      {/* 2. ÁREA CENTRAL: PLAYERA */}
      <main className="customizer-center-content">
        <div className="shirt-stage">
          {/* Capa Color Base */}
          <div
            className="shirt-base-color"
            style={{
              backgroundColor: shirtColor,
              WebkitMaskImage: `url(${shirtMockUp})`,
              maskImage: `url(${shirtMockUp})`,
            }}
          />

          {/* Capa Ruido Textil */}
          <div
            className="shirt-noise-layer"
            style={{
              backgroundImage: `url(${shirtNoise})`,
              backgroundSize: isBlackShirt ? "300px 300px" : "150px 150px",
              WebkitMaskImage: `url(${shirtMockUp})`,
              maskImage: `url(${shirtMockUp})`,
            }}
          />

          {/* CUADRO 1: Pecho */}
          <div
            ref={zoneRef1}
            onMouseDown={handleMouseDown1}
            onMouseMove={handleMouseMove1}
            onMouseUp={handleMouseUp1}
            className={`design-zone design-zone-chest ${image1 ? "zone-has-image" : "zone-empty"} ${
              activeZoneTarget === "chest" ? "zone-active-target" : ""
            }`}
            style={{
              cursor: isDragging1 ? "grabbing" : image1 ? "grab" : "default",
            }}
          >
            {image1 ? (
              applyTint1 ? (
                /* Capa sólida teñida recortada con la silueta del diseño (Mask) */
                <div
                  className="design-stamp-mask"
                  style={{
                    backgroundColor: tintColor1,
                    WebkitMaskImage: `url(${image1})`,
                    maskImage: `url(${image1})`,
                    transform: `translate(${pos1.x}px, ${pos1.y}px) scale(${scale1})`,
                  }}
                />
              ) : (
                /* Imagen original sin alterar */
                <img
                  src={image1}
                  alt="Diseño Pecho"
                  draggable={false}
                  className="design-stamp-image"
                  style={{
                    transform: `translate(${pos1.x}px, ${pos1.y}px) scale(${scale1})`,
                  }}
                />
              )
            ) : (
              <div className="zone-empty-content">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveZoneTarget("chest");
                    fileInputRef1.current?.click();
                  }}
                  className="zone-upload-btn"
                >
                  📁 Subir Imagen
                </button>
                <span className="zone-placeholder-text">Pecho</span>
              </div>
            )}
          </div>

          {/* CUADRO 2: Abdomen */}
          <div
            ref={zoneRef2}
            onMouseDown={handleMouseDown2}
            onMouseMove={handleMouseMove2}
            onMouseUp={handleMouseUp2}
            className={`design-zone design-zone-abdomen ${image2 ? "zone-has-image" : "zone-empty"} ${
              activeZoneTarget === "abdomen" ? "zone-active-target" : ""
            }`}
            style={{
              cursor: isDragging2 ? "grabbing" : image2 ? "grab" : "default",
            }}
          >
            {image2 ? (
              applyTint2 ? (
                <div
                  className="design-stamp-mask"
                  style={{
                    backgroundColor: tintColor2,
                    WebkitMaskImage: `url(${image2})`,
                    maskImage: `url(${image2})`,
                    transform: `translate(${pos2.x}px, ${pos2.y}px) scale(${scale2})`,
                  }}
                />
              ) : (
                <img
                  src={image2}
                  alt="Diseño Abdomen"
                  draggable={false}
                  className="design-stamp-image"
                  style={{
                    transform: `translate(${pos2.x}px, ${pos2.y}px) scale(${scale2})`,
                  }}
                />
              )
            ) : (
              <div className="zone-empty-content">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveZoneTarget("abdomen");
                    fileInputRef2.current?.click();
                  }}
                  className="zone-upload-btn"
                >
                  📁 Subir Imagen
                </button>
                <span className="zone-placeholder-text">Abdomen</span>
              </div>
            )}
          </div>

          {/* Capa de Sombras */}
          <img src={shirtMockUp} alt="Playera Sombras" className="shirt-shadows" />
        </div>
      </main>

      {/* 3. COLUMNA DERECHA: BOTONES Y CONFIGURACIÓN */}
      <aside className="customizer-action-sidebar">
        <button
          onClick={() =>
            activeZoneTarget === "chest"
              ? fileInputRef1.current?.click()
              : fileInputRef2.current?.click()
          }
          className="action-btn upload-custom-btn"
        >
          📁 Subir en {activeZoneTarget === "chest" ? "Pecho" : "Abdomen"} ⚡
        </button>

        {/* PANEL: CAPA DE COLOR DEL ESTAMPADO */}
        {hasActiveImage && (
          <div className="right-panel-box tint-layer-panel">
            <div className="tint-header">
              <span className="panel-box-label">
                Color de Diseño ({activeZoneTarget === "chest" ? "Pecho" : "Abdomen"}):
              </span>
              <button
                type="button"
                onClick={() => handleToggleTint(!currentApplyTint)}
                className={`tint-toggle-pill ${currentApplyTint ? "active" : ""}`}
              >
                {currentApplyTint ? "Color Activo" : "Original"}
              </button>
            </div>

            {currentApplyTint && (
              <div className="tint-controls-wrapper">
                <div className="tint-custom-row">
                  <input
                    type="color"
                    value={currentTintColor}
                    onChange={(e) => handleUpdateTintColor(e.target.value)}
                    className="tint-color-picker"
                    title="Elegir color libre"
                  />
                  <span className="tint-color-hex">{currentTintColor.toUpperCase()}</span>
                </div>

                <div className="tint-presets-group">
                  {tintPresets.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => handleUpdateTintColor(hex)}
                      className={`tint-preset-dot ${currentTintColor.toLowerCase() === hex ? "selected" : ""}`}
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selector de Color de Playera */}
        <div className="right-panel-box">
          <p className="panel-box-label">Color de Playera:</p>
          <div className="color-selector">
            {colors.map((c) => (
              <button
                key={c.hex}
                onClick={() => setShirtColor(c.hex)}
                title={c.name}
                className={`color-btn ${shirtColor === c.hex ? "selected" : ""}`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>

        {/* Selector de Talla */}
        <div className="right-panel-box">
          <p className="panel-box-label">Talla:</p>
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
        </div>

        {/* Botón de Reset para la zona activa */}
        {hasActiveImage && (
          <button onClick={handleResetActiveDesign} className="action-btn reset-designs-btn">
            Limpiar {activeZoneTarget === "chest" ? "Pecho" : "Abdomen"} 🔄
          </button>
        )}

        {/* Agregar al Carrito */}
        <button onClick={handleAddToCart} className="action-btn add-to-cart-btn">
          Agregar Playera al Carrito 🛒
        </button>

        {onBackToCatalog && (
          <button onClick={onBackToCatalog} className="back-catalog-btn">
            ← Regresar al Menú Principal
          </button>
        )}
      </aside>
    </div>
  );
}