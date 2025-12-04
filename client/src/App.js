import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const raf = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (raf.current) cancelAnimationFrame(raf.current);

      raf.current = requestAnimationFrame(() => {
        setMousePosition({ x: e.clientX, y: e.clientY });
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleLogin = () => {
    window.location.href = "http://127.0.0.1:8888/login";
  };

  return (
    <div
      className="App"
      style={{
        '--mouse-x': `${mousePosition.x}px`,
        '--mouse-y': `${mousePosition.y}px`,
        '--mx': `${mousePosition.x / window.innerWidth}`,
        '--my': `${mousePosition.y / window.innerHeight}`,
      }}
    >
      {/* extra fun layers */}
      <div className="bg-grid" />
      <div className="sparkles" />

      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      <div className="bg-shape shape-3"></div>
      <div className="bg-shape shape-4"></div>
      <div className="bg-shape shape-5"></div>

      <div className="content-container">
        <h1>Welcome to Spotify Match Blend</h1>
        <p>Find your music match and start chatting!</p>

        <button onClick={handleLogin} className="login-btn">
          Log in with Spotify
          <span className="btn-shine" />
        </button>

        <div className="mini-hints">
          <span className="pill">✨ Live glow</span>
          <span className="pill">🎧 Match vibes</span>
          <span className="pill">💬 Start chatting</span>
        </div>
      </div>
    </div>
  );
}

export default App;
