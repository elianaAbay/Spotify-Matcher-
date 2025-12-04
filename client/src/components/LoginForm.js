import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Music, Facebook, Apple } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isFocused, setIsFocused] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Redirect to Spotify OAuth login
    window.location.href = '/login';
  };

  const handleSpotifyLogin = () => {
    // Redirect to Spotify OAuth login
    window.location.href = '/login';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-md"
    >
      <div className="bg-gradient-to-br from-zinc-900 to-black p-8 rounded-3xl shadow-2xl border border-zinc-800 backdrop-blur-sm">
        {/* Logo */}
        <motion.div
          className="flex justify-center mb-8"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <div className="bg-gradient-to-br from-green-400 to-green-600 p-4 rounded-full shadow-lg shadow-green-500/50">
            <Music className="w-12 h-12 text-black" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center text-white mb-2"
        >
          Log in to Spotify
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-zinc-400 mb-8"
        >
          Continue your music journey
        </motion.p>

        {/* Spotify Login Button - Primary */}
        <motion.button
          type="button"
          onClick={handleSpotifyLogin}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 text-black py-3 rounded-full hover:from-green-400 hover:to-green-500 transition-all duration-300 shadow-lg shadow-green-500/50 hover:shadow-green-500/70 mb-6 font-medium"
        >
          Continue with Spotify
        </motion.button>

        {/* Social Login Buttons */}
        <div className="space-y-3 mb-6">
          <SocialButton icon={<Facebook className="w-5 h-5" />} text="Continue with Facebook" color="blue" />
          <SocialButton icon={<Apple className="w-5 h-5" />} text="Continue with Apple" color="white" />
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-700"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-4 bg-zinc-900 text-zinc-400">OR</span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <motion.div
              className={`relative transition-all duration-300 ${
                isFocused === 'email' ? 'scale-105' : ''
              }`}
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setIsFocused('email')}
                onBlur={() => setIsFocused(null)}
                placeholder="Email or username"
                className={`w-full pl-12 pr-4 py-3 bg-zinc-800 border-2 rounded-xl text-white placeholder-zinc-500 outline-none transition-all duration-300 ${
                  isFocused === 'email'
                    ? 'border-green-500 shadow-lg shadow-green-500/30'
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
                required
              />
            </motion.div>
          </div>

          <div>
            <motion.div
              className={`relative transition-all duration-300 ${
                isFocused === 'password' ? 'scale-105' : ''
              }`}
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setIsFocused('password')}
                onBlur={() => setIsFocused(null)}
                placeholder="Password"
                className={`w-full pl-12 pr-4 py-3 bg-zinc-800 border-2 rounded-xl text-white placeholder-zinc-500 outline-none transition-all duration-300 ${
                  isFocused === 'password'
                    ? 'border-green-500 shadow-lg shadow-green-500/30'
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
                required
              />
            </motion.div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-green-500 focus:ring-2 focus:ring-green-500 focus:ring-offset-0 cursor-pointer"
              />
              <span className="ml-2 text-zinc-300 group-hover:text-white transition-colors">
                Remember me
              </span>
            </label>
            <button type="button" className="text-zinc-300 hover:text-green-500 transition-colors bg-transparent border-0 p-0 cursor-pointer">
              Forgot password?
            </button>
          </div>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-black py-3 rounded-full hover:from-green-400 hover:to-green-500 transition-all duration-300 shadow-lg shadow-green-500/50 hover:shadow-green-500/70"
          >
            Log In
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-zinc-400">Don't have an account? </span>
          <button type="button" className="text-green-500 hover:text-green-400 transition-colors bg-transparent border-0 p-0 cursor-pointer">
            Sign up for Spotify
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SocialButton({ icon, text, color }) {
  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700 border-blue-500 text-white',
    white: 'bg-white hover:bg-zinc-100 text-black border-white',
  };

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full flex items-center justify-center gap-3 py-3 rounded-full border-2 transition-all duration-300 shadow-lg ${
        colorClasses[color] || colorClasses.blue
      }`}
    >
      {icon}
      <span>{text}</span>
    </motion.button>
  );
}

