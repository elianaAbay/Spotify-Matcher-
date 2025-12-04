import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // State to store mouse position
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Update state whenever mouse moves
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Cleanup listener when component unmounts
    return () => {
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
        '--mouse-y': `${mousePosition.y}px`
      }}
    >
      {/* --- NEW VIBRANT CIRCLES --- */}
      {/* These are placed BEFORE the content container so they sit behind it */}
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      <div className="bg-shape shape-3"></div>

      <div className="content-container">
        <h1>Welcome to Spotify Match Blend</h1>
        <p>Find your music match and start chatting!</p>
        
        <button onClick={handleLogin} className="login-btn">
          Log in with Spotify
        </button>
      </div>
    </div>
  );
}

export default App;