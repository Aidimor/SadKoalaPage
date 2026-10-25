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

  // Zona activa actual ("chest" | "abdomen" | null)
  const [activeZoneTarget, setActiveZoneTarget] = useState("chest");

  // Estado del Estampado 1 (Pecho)
  const [image1, setImage1] = useState(null);
  const [pos1, setPos1] = useState({ x: 0, y: 0 });
  const [scale1, setScale1] = useState(1);
  const [tintColor1, setTintColor1] = useState("#ffffff");
  const [applyTint1, setApplyTint1] = useState(false);
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

  const tintPresets = ["#ffffff", "#000000", "#ef4444", "#3b82f6", "#22c55e", "#eab308", "#ec4899", "#8b5cf6"];

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

  // Bloqueo del scroll durante zoom con rueda de mouse
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

  // Listener global de soltado (mouse y touch)
  useEffect(() => {
    const handleGlobalRelease = () => {
      setIsDragging1(false);
      setIsDragging2(false);
    };

    window.addEventListener("mouseup", handleGlobalRelease);
    window.addEventListener("touchend", handleGlobalRelease);
    return () => {
      window.removeEventListener("mouseup", handleGlobalRelease);
      window.removeEventListener("touchend", handleGlobalRelease);
    };
  }, []);

  const handleSelectCatalogShirt = (item) => {
    const artUrl = item.image || item.image_url;
    if (!artUrl) return;

    // Si ninguna zona está activa, por defecto aplica al pecho
    const target = activeZoneTarget === "abdomen" ? "abdomen" : "chest";
    if (target === "chest") {
      setActiveZoneTarget("chest");
      setImage1(artUrl);
      setPos1({ x: 0, y: 0 });
      setScale1(1);
      setApplyTint1(false);
    } else {
      setActiveZoneTarget("abdomen");
      setImage2(artUrl);
      setPos2({ x: 0, y: 0 });
      setScale2(1);
      setApplyTint2(false);
    }
  };

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

  // Drag Pecho (Mouse + Touch)
  const handleStartDrag1 = (clientX, clientY) => {
    setActiveZoneTarget("chest");
    hasMoved1.current = false;
    if (image1) {
      setIsDragging1(true);
      dragStart1.current = {
        x: clientX - pos1.x,
        y: clientY - pos1.y,
      };
    }
  };

  const handleMoveDrag1 = (clientX, clientY) => {
    if (!isDragging1) return;
    hasMoved1.current = true;
    setPos1({
      x: clientX - dragStart1.current.x,
      y: clientY - dragStart1.current.y,
    });
  };

  // Drag Abdomen (Mouse + Touch)
  const handleStartDrag2 = (clientX, clientY) => {
    setActiveZoneTarget("abdomen");
    hasMoved2.current = false;
    if (image2) {
      setIsDragging2(true);
      dragStart2.current = {
        x: clientX - pos2.x,
        y: clientY - pos2.y,
      };
    }
  };

  const handleMoveDrag2 = (clientX, clientY) => {
    if (!isDragging2) return;
    hasMoved2.current = true;
    setPos2({
      x: clientX - dragStart2.current.x,
      y: clientY - dragStart2.current.y,
    });
  };

  const handleResetActiveDesign = () => {
    if (activeZoneTarget === "chest") {
      setImage1(null);
      setPos1({ x: 0, y: 0 });
      setScale1(1);
      setApplyTint1(false);
      setTintColor1("#ffffff");
      if (fileInputRef1.current) fileInputRef1.current.value = "";
    } else if (activeZoneTarget === "abdomen") {
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
  const hasActiveImage = activeZoneTarget === "chest" ? !!image1 : activeZoneTarget === "abdomen" ? !!image2 : false;
  const currentApplyTint = activeZoneTarget === "chest" ? applyTint1 : applyTint2;
  const currentTintColor = activeZoneTarget === "chest" ? tintColor1 : tintColor2;

  const handleToggleTint = (enabled) => {
    if (activeZoneTarget === "chest") setApplyTint1(enabled);
    else if (activeZoneTarget === "abdomen") setApplyTint2(enabled);
  };

  const handleUpdateTintColor = (newColor) => {
    if (activeZoneTarget === "chest") {
      setTintColor1(newColor);
      setApplyTint1(true);
    } else if (activeZoneTarget === "abdomen") {
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

      {/* ÁREA CENTRAL: PLAYERA */}
      <main className="customizer-center-content">
        <div 
          className="shirt-stage"
          onClick={() => setActiveZoneTarget(null)} /* Deselecciona ambas zonas al tocar fuera */
        >
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

          {/* ZONA 1: Pecho */}
          <div
            ref={zoneRef1}
            onClick={(e) => {
              e.stopPropagation();
              setActiveZoneTarget("chest");
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleStartDrag1(e.clientX, e.clientY);
            }}
            onMouseMove={(e) => {
              e.preventDefault();
              handleMoveDrag1(e.clientX, e.clientY);
            }}
            onMouseUp={() => setIsDragging1(false)}
            onTouchStart={(e) => {
              e.stopPropagation();
              const touch = e.touches[0];
              handleStartDrag1(touch.clientX, touch.clientY);
            }}
            onTouchMove={(e) => {
              const touch = e.touches[0];
              handleMoveDrag1(touch.clientX, touch.clientY);
            }}
            onTouchEnd={() => setIsDragging1(false)}
            className={`design-zone design-zone-chest ${image1 ? "zone-has-image" : "zone-empty"} ${
              activeZoneTarget === "chest" ? "zone-active-target" : ""
            }`}
            style={{
              cursor: isDragging1 ? "grabbing" : image1 ? "grab" : "default",
            }}
          >
            {image1 ? (
              applyTint1 ? (
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
              </div>
            )}
          </div>

          {/* ZONA 2: Abdomen */}
          <div
            ref={zoneRef2}
            onClick={(e) => {
              e.stopPropagation();
              setActiveZoneTarget("abdomen");
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleStartDrag2(e.clientX, e.clientY);
            }}
            onMouseMove={(e) => {
              e.preventDefault();
              handleMoveDrag2(e.clientX, e.clientY);
            }}
            onMouseUp={() => setIsDragging2(false)}
            onTouchStart={(e) => {
              e.stopPropagation();
              const touch = e.touches[0];
              handleStartDrag2(touch.clientX, touch.clientY);
            }}
            onTouchMove={(e) => {
              const touch = e.touches[0];
              handleMoveDrag2(touch.clientX, touch.clientY);
            }}
            onTouchEnd={() => setIsDragging2(false)}
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
              </div>
            )}
          </div>

          <img src={shirtMockUp} alt="Playera Sombras" className="shirt-shadows" />
        </div>
      </main>

      {/* COLUMNA DE BOTONES / CONTROLES */}
      <aside className="customizer-action-sidebar">
        {/* Solo las bolitas de color en fila limpia */}
        {hasActiveImage && (
          <div className="right-panel-box tint-layer-panel">
            <div className="tint-buttons-row">
              <button
                type="button"
                onClick={() => handleToggleTint(false)}
                className={`tint-original-btn ${!currentApplyTint ? "active" : ""}`}
                title="Diseño original"
              >
                Original
              </button>

              {tintPresets.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => handleUpdateTintColor(hex)}
                  className={`tint-preset-dot ${
                    currentApplyTint && currentTintColor.toLowerCase() === hex.toLowerCase()
                      ? "selected"
                      : ""
                  }`}
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
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

        {/* Reset */}
        {hasActiveImage && (
          <button onClick={handleResetActiveDesign} className="action-btn reset-designs-btn">
            Limpiar {activeZoneTarget === "chest" ? "Pecho" : "Abdomen"} 🔄
          </button>
        )}

        {/* Agregar al Carrito */}
        <button onClick={handleAddToCart} className="action-btn add-to-cart-btn">
          Agregar Playera al Carrito 🛒
        </button>
      </aside>

      {/* SIDEBAR: CATÁLOGO SUPABASE */}
      <aside className="customizer-sidebar">      

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
                </div>
              );
            })}
        </div>
      </aside>
    </div>
  );
}