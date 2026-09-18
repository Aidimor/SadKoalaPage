import { useState, useRef } from "react";
import { toPng } from "html-to-image";
import playmat1 from "./assets/playmat1.webp";
import playmat2 from "./assets/playmat2.webp";
import playmat3 from "./assets/playmat3.webp";
import PlaymatCatalog from "./playmatCatalog";
import "./playmatsCustom.css";

export default function Playmat({ onAddToCart }) {
  const [currentBg, setCurrentBg] = useState(playmat1);
  const [customImage, setCustomImage] = useState(null);
  const [rawFile, setRawFile] = useState(null);
  const [fileName, setFileName] = useState("");

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const previewRef = useRef(null);

  const handleSelectFromCatalog = (item) => {
    const imageUrl = item.image || item.image_url;
    setCustomImage(imageUrl);
    setFileName(item.name || "Diseño Catálogo");
    setRawFile(null);
    setPosition({ x: 0, y: 0 });
    setScale(1);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRawFile(file);
      setFileName(file.name);

      const reader = new FileReader();
      reader.onloadend = () => setCustomImage(reader.result);
      reader.readAsDataURL(file);

      setPosition({ x: 0, y: 0 });
      setScale(1);
    }
  };

  const handleToggleRotate = () => {
    setRotation((prev) => (prev === 0 ? 90 : 0));
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  // MANEJADOR DE ZOOM AMPLIADO
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomSpeed = 0.05; // Sensibilidad de zoom más suave
    setScale((prev) => {
      const newScale = e.deltaY < 0 ? prev + zoomSpeed : prev - zoomSpeed;
      // Permite alejar hasta 0.1x y acercar hasta 8x
      return Math.min(Math.max(0.1, newScale), 8);
    });
  };

  const handleAddPlaymatToCart = async () => {
    if (!customImage) {
      alert("Por favor selecciona o sube una imagen para tu playmat.");
      return;
    }

    let screenshotDataUrl = null;
    if (previewRef.current) {
      try {
        screenshotDataUrl = await toPng(previewRef.current, { pixelRatio: 2 });
      } catch (error) {
        console.error("Error al capturar la vista del playmat:", error);
      }
    }

    if (onAddToCart) {
      const playmatProduct = {
        id: `playmat-${Date.now()}`,
        name: `Playmat Personalizado (${fileName || "Diseño TCG"})`,
        price: 450,
        image: customImage,
        rawFile: rawFile,
        screenshotDataUrl: screenshotDataUrl,
        isVertical: rotation === 90,
      };

      onAddToCart(playmatProduct, "Única");
    }
  };

  const isVertical = rotation === 90;

  return (
    <div style={playmatContainerGridStyle}>
      {/* COLUMNA IZQUIERDA: Catálogo */}
      <div style={catalogColumnStyle}>
        <PlaymatCatalog onSelectPlaymat={handleSelectFromCatalog} />
      </div>

      {/* COLUMNA DERECHA: Personalizador y vista previa */}
      <div className="playmat-main-layout" style={{ flex: 1, height: "100%" }}>
        <div className="playmat-preview-column">
          <div
            ref={previewRef}
            className={`playmat-preview-box ${isVertical ? "preview-vertical" : "preview-horizontal"}`}
          >
            {customImage && (
              <div
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                className={`playmat-drag-area ${isDragging ? "dragging" : ""}`}
              >
                <img
                  src={customImage}
                  alt="Diseño personalizado"
                  draggable={false}
                  className="playmat-custom-img"
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    minWidth: "100%",
                    minHeight: "100%",
                    width: "auto",
                    height: "auto",
                    objectFit: "cover",
                    transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: "center center",
                    transition: isDragging ? "none" : "transform 0.15s ease-out",
                  }}
                />
              </div>
            )}

            <img
              src={currentBg}
              alt="Playmat Base"
              className={`playmat-bg-img ${isVertical ? "bg-vertical" : "bg-horizontal"}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                mixBlendMode: customImage ? "multiply" : "normal",
                transform: isVertical
                  ? "translateY(-6px) translateX(1px) rotate(-90deg) scale(1.75, 0.6)"
                  : "translateY(1px) translateX(5px) rotate(0deg) scale(1.02, 1.03)",
                transformOrigin: "center center",
                transition: "transform 0.3s ease",
              }}
            />
          </div>
        </div>

        <div className="playmat-sidebar-column">
          <div className="playmat-controls-group">
            <label className="playmat-btn btn-active playmat-full-width playmat-upload-label">
              📁 Subir Imagen Propia ⚡
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="playmat-hidden-input"
              />
            </label>

            <button
              onClick={handleToggleRotate}
              className="playmat-btn btn-active playmat-full-width"
            >
              {rotation === 0 ? "Girar a Vertical 🔄" : "Girar a Horizontal 🔄"}
            </button>
          </div>

          <div className="playmat-selectors-group">
            <button
              onClick={() => setCurrentBg(playmat1)}
              className={`playmat-btn playmat-flex-1 ${currentBg === playmat1 ? "btn-selected" : "btn-dark"}`}
            >
              Playmat 1
            </button>
            <button
              onClick={() => setCurrentBg(playmat2)}
              className={`playmat-btn playmat-flex-1 ${currentBg === playmat2 ? "btn-selected" : "btn-dark"}`}
            >
              Playmat 2
            </button>
            <button
              onClick={() => setCurrentBg(playmat3)}
              className={`playmat-btn playmat-flex-1 ${currentBg === playmat3 ? "btn-selected" : "btn-dark"}`}
            >
              Playmat 3
            </button>
          </div>

          <div>
            <button
              onClick={handleAddPlaymatToCart}
              disabled={!customImage}
              className={`playmat-cart-btn ${customImage ? "cart-enabled" : "cart-disabled"}`}
            >
              Agregar Playmat al Carrito 🛒
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const playmatContainerGridStyle = {
  display: "flex",
  width: "100%",
  minHeight: "calc(100vh - 80px)",
  gap: "20px",
  padding: "20px",
  boxSizing: "border-box",
};

const catalogColumnStyle = {
  width: "420px",
  maxHeight: "85vh",
  overflowY: "auto",
  borderRadius: "12px",
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  padding: "15px",
  flexShrink: 0,
};