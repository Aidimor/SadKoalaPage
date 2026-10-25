import { useState, useEffect, useRef } from 'react';
import { createClient } from "@supabase/supabase-js";
import { animate } from 'animejs';
import html2canvas from 'html2canvas';
import './App.css';
import Nav from "./navMain.jsx";
import ShirtCatalog from "./shirtCatalog.jsx";
import ShirtCustom from "./shirtCustomScript.jsx";
import ShirtCreator from "./shirtCreator.jsx"; // Creador interactivo desde cero
import Playmat from "./playmatsCustom.jsx";
import MainView from "./mainPage.jsx"; 

// Carga desde el archivo .env.local
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const MAKE_WEBHOOK_URL = import.meta.env.VITE_MAKE_WEBHOOK_URL;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Función auxiliar para mantener el formato vertical completo sin recortes
async function padImageVertical(blobOrUrl) {
  return new Promise((resolve) => {
    const url = typeof blobOrUrl === "string" ? blobOrUrl : URL.createObjectURL(blobOrUrl);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const targetWidth = img.width;
      const targetHeight = Math.max(img.height, Math.round(img.width * 1.33));
      
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const x = (canvas.width - img.width) / 2;
      const y = (canvas.height - img.height) / 2;
      ctx.drawImage(img, x, y);

      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    };
    img.src = url;
  });
}

export default function App() {
  const [currentView, setCurrentView] = useState("main");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [shirtModels, setShirtModels] = useState([]);
  const [isCatalogLoaded, setIsCatalogLoaded] = useState(false);

  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const viewPanelRef = useRef(null);

  useEffect(() => {
    async function fetchInitialCatalog() {
      try {
        const { data, error } = await supabase.from("Shirts").select("*");
        if (!error && data) {
          setShirtModels(data);
          setIsCatalogLoaded(true);
        }
      } catch (err) {
        console.error("Error cargando catálogo global:", err);
      }
    }
    fetchInitialCatalog();
  }, []);

  useEffect(() => {
    if (viewPanelRef.current) {
      animate(viewPanelRef.current, {
        translateY: [-30, 0],
        opacity: [0, 1],
        duration: 500,
        easing: 'outExpo'
      });
    }
  }, [currentView]);

  const handleNavChange = (newView) => {
    if (currentView === newView) return;

    if (viewPanelRef.current) {
      animate(viewPanelRef.current, {
        opacity: [1, 0],
        translateY: [0, 20],
        duration: 200,
        easing: 'inQuad',
        onComplete: () => {
          setSelectedProduct(null);
          setCurrentView(newView);
        }
      });
    } else {
      setSelectedProduct(null);
      setCurrentView(newView);
    }
  };

  const handleAddToCart = (product, size = "G") => {
    const newItem = {
      cartId: Date.now() + Math.random(),
      product: product,
      size: size,
      quantity: 1
    };
    
    setCart((prevCart) => [...prevCart, newItem]);
    setIsCartOpen(true);
  };

  const handleRemoveFromCart = (cartId) => {
    setCart((prevCart) => prevCart.filter(item => item.cartId !== cartId));
  };

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
        console.error("Error subiendo a Supabase Storage:", uploadError);
        return "";
      }

      const { data: publicUrlData } = supabase.storage
        .from("playmats")
        .getPublicUrl(cleanFileName);

      return publicUrlData?.publicUrl || "";
    } catch (err) {
      console.error("Error procesando imagen para Supabase:", err);
      return "";
    }
  };

  const handleAutomaticCheckout = async (itemsToProcess) => {
    const itemsArray = Array.isArray(itemsToProcess) ? itemsToProcess : [itemsToProcess];
    if (itemsArray.length === 0) return;

    try {
      const processedItems = [];

      for (const item of itemsArray) {
        const prod = item.product || item;

        const hdSource = prod.rawFile || prod.file || prod.image || prod.imageUrl || prod.imagenUrl;
        const finalHdUrl = await uploadToSupabase(hdSource, "hd");

        let finalPreviewUrl = "";
        const previewElement = document.getElementById('tu-contenedor-preview');

        if (previewElement) {
          try {
            const canvas = await html2canvas(previewElement, { scale: 1, useCORS: true });
            const previewBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const verticalBlob = await padImageVertical(previewBlob);
            finalPreviewUrl = await uploadToSupabase(verticalBlob, "encuadre");
          } catch (canvasErr) {
            console.warn("No se pudo capturar el canvas DOM, usando respaldo:", canvasErr);
          }
        }

        if (!finalPreviewUrl) {
          const previewSource = prod.screenshotDataUrl || prod.previewUrl || hdSource;
          const verticalBlob = await padImageVertical(previewSource);
          finalPreviewUrl = await uploadToSupabase(verticalBlob, "encuadre");
        }

        const rawName = (prod.name || "Producto Personalizado").toString();
        const rawCat = (prod.category || "").toString().toLowerCase();
        const isPlaymat = rawCat.includes("playmat") || rawName.toLowerCase().includes("playmat");

        processedItems.push({
          producto: rawName,
          tipo: isPlaymat ? "playmat" : "playera",
          talla: item.size || prod.size || (isPlaymat ? "Estándar" : "G"),
          color: prod.selectedColor || prod.color || "Estándar",
          precio: Number(prod.price) || (isPlaymat ? 450 : 350),
          imagenUrl: finalHdUrl,
          imagenPreviewUrl: finalPreviewUrl || finalHdUrl
        });
      }

      const totalPrecio = processedItems.reduce((acc, curr) => acc + curr.precio, 0);

      let captionHtml = `<b>📦 NUEVO PEDIDO DE SAD KOALA (${processedItems.length} ${processedItems.length === 1 ? 'ítem' : 'ítems'})</b>\n`;
      captionHtml += `<b>Total a Pagar:</b> $${totalPrecio} MXN\n`;

      processedItems.forEach((item, index) => {
        const icon = item.tipo === "playmat" ? "🎴" : "👕";
        const labelTipo = item.tipo === "playmat" ? "Playmat Personalizado" : "Playera Personalizada";

        captionHtml += `\n<b>───────────────</b>\n`;
        captionHtml += `<b>${index + 1}. [${labelTipo}]</b>\n`;
        captionHtml += `📌 <b>Diseño:</b> ${item.producto}\n`;
        captionHtml += `${icon} <b>Detalles:</b> Talla: ${item.talla} | Color: ${item.color}\n`;
        captionHtml += `💰 <b>Precio:</b> $${item.precio} MXN\n`;
        captionHtml += `💾 <a href="${item.imagenUrl}">Descargar Archivo HD</a>\n`;
      });

      const orderPayload = {
        items: processedItems,
        totalPrecio: totalPrecio,
        captionHtml: captionHtml,
        imagenPreviewUrl: processedItems[0]?.imagenPreviewUrl || "",
        fecha: new Date().toLocaleString()
      };

      const response = await fetch(MAKE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload)
      });

      if (response.ok) {
        alert("¡Pedido enviado con éxito a Sad Koala Regalos! 🚀 Nos pondremos en contacto contigo.");
        setIsCartOpen(false);
        setCart([]);
      } else {
        alert(`Error al procesar pedido en el servidor. Código: ${response.status}`);
      }
    } catch (error) {
      console.error("Error enviando pedido:", error);
      alert("Error de red al conectar con Make.");
    }
  };

  const cartTotal = cart.reduce((total, item) => total + ((Number(item.product?.price) || 350) * item.quantity), 0);

  return (
    <div className="main-background" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", width: "100%", overflowX: "hidden" }}>
      <Nav 
        onGoHome={() => handleNavChange("catalog")}
        onGoMain={() => handleNavChange("main")}
        onGoPlaymats={() => handleNavChange("playmats")}
        onGoShirtCreator={() => handleNavChange("shirtCreator")}
        onGoContact={() => handleNavChange("contact")}
        onGoOrders={() => handleNavChange("orders")}
      />

      <button onClick={() => setIsCartOpen(true)} style={floatingCartButtonStyle}>
        🛒 Carrito ({cart.length})
      </button>

      <div ref={viewPanelRef} style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", opacity: 0, position: "relative", zIndex: 1 }}>
        {currentView === "catalog" && (
          <ShirtCatalog 
            shirts={shirtModels} 
            isLoaded={isCatalogLoaded}
            onSelectShirt={(product) => { setSelectedProduct(product); setCurrentView("customizer"); }} 
          />
        )}

        {currentView === "customizer" && (
          <ShirtCustom 
            initialProduct={selectedProduct} 
            onBackToCatalog={() => handleNavChange("catalog")}
            onAddToCart={handleAddToCart}
          />
        )}

        {/* Vista del Creador de Playeras */}
        {currentView === "shirtCreator" && (
          <ShirtCreator 
            onBackToCatalog={() => handleNavChange("catalog")}
            onAddToCart={handleAddToCart}
          />
        )}

        {currentView === "main" && (
          <MainView 
            onGoCatalog={() => handleNavChange("catalog")} 
            onGoPlaymats={() => handleNavChange("playmats")} 
            onGoShirtCreator={() => handleNavChange("shirtCreator")}
            onGoHome={() => handleNavChange("catalog")}
            onSelectShirt={(product) => {
              setSelectedProduct(product);
              setCurrentView("customizer");
            }}
          />
        )}

        {currentView === "playmats" && (
          <Playmat onAddToCart={handleAddToCart} />
        )}

        {currentView === "contact" && (
          <div style={{ padding: "3rem", textAlign: "center", color: "#fff" }}>
            <h2>Contacto</h2>
            <p>Comunícate con nosotros para cotizaciones de mayoreo y diseños personalizados.</p>
          </div>
        )}

        {currentView === "orders" && (
          <div style={{ padding: "3rem", textAlign: "center", color: "#fff" }}>
            <h2>Seguimiento de Pedidos</h2>
            <p>Ingresa tu número de folio para consultar el estatus de impresión.</p>
          </div>
        )}
      </div>

      {isCartOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ color: "#fff", margin: 0, fontSize: "1.25rem" }}>Tu Carrito 🛒</h2>
              <button onClick={() => setIsCartOpen(false)} style={closeButtonStyle}>✕</button>
            </div>

            {cart.length === 0 ? (
              <p style={{ color: "#a1a1aa", textAlign: "center", padding: "20px 0" }}>Tu carrito está vacío.</p>
            ) : (
              <>
                <div style={{ maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px", paddingRight: "4px" }}>
                  {cart.map((item) => (
                    <div key={item.cartId} style={cartItemStyle}>
                      <div style={{ width: "50px", height: "50px", borderRadius: "6px", overflow: "hidden", backgroundColor: item.product?.selectedColor || "#27272a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid #3f3f46" }}>
                        <img src={item.product?.image || item.product?.screenshotDataUrl} alt={item.product?.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "#fff", margin: 0, fontWeight: "600", fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.product?.name || "Producto"}
                        </p>
                        <p style={{ color: "#a1a1aa", margin: "3px 0 0 0", fontSize: "0.75rem" }}>
                          Talla: {item.size} {item.product?.selectedColor && `• Color`}
                        </p>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                        <span style={{ color: "#3b82f6", fontWeight: "bold", fontSize: "0.9rem" }}>${item.product?.price || 350}</span>
                        <button onClick={() => handleAutomaticCheckout(item)} style={whatsappItemButtonStyle} title="Enviar este pedido individual">🚀</button>
                        <button onClick={() => handleRemoveFromCart(item.cartId)} style={removeButtonStyle}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: "1px solid #27272a", paddingTop: "12px", display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                  <span style={{ color: "#d4d4d8", fontWeight: "600" }}>Total:</span>
                  <span style={{ color: "#fff", fontWeight: "bold", fontSize: "1.1rem" }}>${cartTotal} MXN</span>
                </div>

                <button onClick={() => { if (cart.length > 0) handleAutomaticCheckout(cart); }} style={checkoutButtonStyle}>
                  Enviar Pedido Completo 🚀 (${cartTotal} MXN)
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const floatingCartButtonStyle = { position: "fixed", bottom: "20px", right: "20px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "30px", padding: "12px 20px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", zIndex: 999 };
const modalOverlayStyle = { position: "fixed", top: "0", left: "0", width: "100%", height: "100%", backgroundColor: "rgba(0, 0, 0, 0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" };
const modalContentStyle = { backgroundColor: "#18181b", borderRadius: "16px", padding: "30px", width: "100%", maxWidth: "480px", border: "1px solid #27272a", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)" };
const cartItemStyle = { backgroundColor: "#09090b", padding: "10px", borderRadius: "8px", border: "1px solid #27272a", display: "flex", alignItems: "center", gap: "10px" };
const whatsappItemButtonStyle = { background: "#16a34a", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.9rem", padding: "6px 8px", color: "#fff" };
const removeButtonStyle = { background: "transparent", border: "none", cursor: "pointer", fontSize: "0.9rem", padding: "4px" };
const checkoutButtonStyle = { width: "100%", padding: "12px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "1rem", cursor: "pointer" };
const closeButtonStyle = { background: "transparent", border: "none", color: "#a1a1aa", fontSize: "1.2rem", cursor: "pointer" };