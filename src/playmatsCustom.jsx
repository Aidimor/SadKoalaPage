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
  const dragStart = useRef({ x: 0, y: 0 });

  const previewRef = useRef(null);
  const fileInputRef = useRef(null);

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

  const handleResetPlaymat = () => {
    setCustomImage(null);
    setRawFile(null);
    setFileName("");
    setPosition({ x: 0, y: 0 });
    setScale(1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleToggleRotate = () => {
    setRotation((prev) => (prev === 0 ? 90 : 0));
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomSpeed = 0.05;
    setScale((prev) => {
      const newScale = e.deltaY < 0 ? prev + zoomSpeed : prev - zoomSpeed;
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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="playmat-hidden-input"
      />

      {/* COLUMNA IZQUIERDA: Catálogo */}
      <div style={catalogColumnStyle}>
        <PlaymatCatalog onSelectPlaymat={handleSelectFromCatalog} />
      </div>

      {/* COLUMNA DERECHA: Personalizador y vista previa */}
      <div className="playmat-main-layout" style={{ flex: 1, height: "100%" }}>
        <div className="playmat-preview-column">
          <div
            ref={previewRef}
            onClick={() => {
              if (!customImage) fileInputRef.current?.click();
            }}
            className={`playmat-preview-box ${isVertical ? "preview-vertical" : "preview-horizontal"}`}
            style={{ cursor: !customImage ? "pointer" : "default" }}
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
            <button
              onClick={handleToggleRotate}
              className="playmat-btn btn-active playmat-full-width"
            >
              {rotation === 0 ? "Girar a Vertical 🔄" : "Girar a Horizontal 🔄"}
            </button>

            {/* Botones contextuales cuando ya hay un diseño cargado */}
            {customImage && (
              <div className="playmat-image-actions">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="playmat-btn playmat-change-btn playmat-flex-1"
                >
                  Cambiar Imagen 📁
                </button>
                <button
                  type="button"
                  onClick={handleResetPlaymat}
                  className="playmat-btn playmat-reset-btn playmat-flex-1"
                >
                  Limpiar Playmat 🔄
                </button>
              </div>
            )}
          </div>

          <div className="playmat-selectors-group">
            <button
              onClick={() => setCurrentBg(playmat1)}
              className={`playmat-btn playmat-flex-1 ${currentBg === playmat1 ? "btn-selected" : "btn-dark"}`}
            >
              Normal
            </button>
            <button
              onClick={() => setCurrentBg(playmat2)}
              className={`playmat-btn playmat-flex-1 ${currentBg === playmat2 ? "btn-selected" : "btn-dark"}`}
            >
              Borde
            </button>
            <button
              onClick={() => setCurrentBg(playmat3)}
              className={`playmat-btn playmat-flex-1 ${currentBg === playmat3 ? "btn-selected" : "btn-dark"}`}
            >
              Borde Negro
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