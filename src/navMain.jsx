import { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';
import "./navMain.css";

export default function NavMain({ 
  onGoHome, 
  onGoMain, 
  onGoPlaymats, 
  onGoShirtCreator, 
  onGoContact, 
  onGoOrders 
}) {
  const navRef = useRef(null);

  useEffect(() => {
    // Animación de entrada escalonada para el contenedor y los botones
    if (navRef.current) {
      // 1. Animamos la barra completa para que baje suavemente
      animate(navRef.current, {
        translateY: [-30, 0],
        opacity: [0, 1],
        duration: 700,
        ease: 'outExpo'
      });

      // 2. Animamos los botones de manera escalonada (stagger) usando su clase
      const buttons = navRef.current.querySelectorAll('.nav-link');
      if (buttons.length > 0) {
        animate(buttons, {
          translateY: [-15, 0],
          opacity: [0, 1],
          delay: stagger(80, { start: 200 }), // Cada botón entra 80ms después del anterior
          duration: 600,
          ease: 'outQuad'
        });
      }
    }
  }, []);

  return (
    <header ref={navRef} className="navbar" style={{ opacity: 0 }}>
      <div className="navbar-brand" onClick={onGoMain} style={{ cursor: "pointer" }}>
        <h2>SAD KOALA STUDIO</h2>
      </div>
      
      <nav className="navbar-links">
        <button className="nav-link" onClick={onGoMain}>
          Main
        </button>
        <button className="nav-link" onClick={onGoHome}>
          Playeras
        </button>
        <button className="nav-link" onClick={onGoShirtCreator}>
          Crea tu Playera
        </button>
        <button className="nav-link" onClick={onGoPlaymats}>
          Playmats
        </button>
        {/* <button className="nav-link" onClick={onGoContact}>
          Contacto
        </button> */}
        <button className="nav-link nav-btn-order" onClick={onGoOrders}>
          Pedidos
        </button>
      </nav>
    </header>
  );
}