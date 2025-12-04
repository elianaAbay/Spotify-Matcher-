import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Music, Facebook, Apple } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isFocused, setIsFocused] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt:', { email, password });
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
            <a href="#" className="text-zinc-300 hover:text-green-500 transition-colors">
              Forgot password?
            </a>
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
          <a href="#" className="text-green-500 hover:text-green-400 transition-colors">
            Sign up for Spotify
          </a>
        </div>
      </div>
    </motion.div>
  );
}

function SocialButton({ icon, text, color }: { icon: React.ReactNode; text: string; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700 border-blue-500',
    white: 'bg-white hover:bg-zinc-100 text-black border-white',
  };

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full flex items-center justify-center gap-3 py-3 rounded-full border-2 transition-all duration-300 shadow-lg ${
        colorClasses[color as keyof typeof colorClasses]
      }`}
    >
      {icon}
      <span>{text}</span>
    </motion.button>
  );
}
