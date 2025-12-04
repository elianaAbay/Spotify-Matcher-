// client/src/App.js
import React from 'react';
import './App.css'; // This imports the CSS we just wrote

function App() {
  
  // This function redirects the user to your Backend to start the Spotify Login
  const handleLogin = () => {
    // This assumes your backend is running on port 5000 or similar
    window.location.href = "http://localhost:5000/login";
  };

  return (
    <div className="App">
      <h1>Welcome to Spotify Match Blend</h1>
      <p>Find your music match and start chatting!</p>
      
      <button onClick={handleLogin} className="login-btn">
        Log in with Spotify
      </button>
    </div>
  );
}

export default App;