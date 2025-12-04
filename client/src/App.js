import React from 'react';
import { LoginForm } from './components/LoginForm';
import { BubbleBackground } from './components/BubbleBackground';
import './App.css';

function App() {
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
