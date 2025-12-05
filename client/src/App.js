import React, { useState, useEffect } from 'react';
import { LoginForm } from './components/LoginForm';
import { BubbleBackground } from './components/BubbleBackground';
import Dashboard from './Dashboard';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for token in URL (from OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      // Store token in localStorage
      localStorage.setItem('userToken', token);
      // Remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsAuthenticated(true);
      setLoading(false);
    } else {
      // Check if token exists in localStorage
      const storedToken = localStorage.getItem('userToken');
      if (storedToken) {
        setIsAuthenticated(true);
      }
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black flex items-center justify-center">
        <BubbleBackground />
        <div className="relative z-10 text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Dashboard onLogout={handleLogout} />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <BubbleBackground />
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <LoginForm />
      </div>
    </div>
  );
}

export default App;
