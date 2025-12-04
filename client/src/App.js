import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // 1. State to store mouse position
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // 2. Update state whenever mouse moves
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
    // 3. Pass the coordinates to CSS using inline styles
    <div 
      className="App"
      style={{
        '--mouse-x': `${mousePosition.x}px`,
        '--mouse-y': `${mousePosition.y}px`
      }}
    >
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