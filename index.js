require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const querystring = require('querystring');
const jwt = require('jsonwebtoken'); 

// --- Dependencies ---
const User = require('./models/User'); 
const Chat = require('./models/Chat'); 
const authMiddleware = require('./middleware/auth'); 

const app = express();
app.use(express.json());

// Serve React build files (production)
// Try public first (for Vercel), then client/build (for local dev)
const publicPath = path.join(__dirname, 'public');
const reactBuildPath = path.join(__dirname, 'client', 'build');
const fs = require('fs');

if (fs.existsSync(publicPath) && fs.existsSync(path.join(publicPath, 'index.html'))) {
  // Serve from public directory (Vercel deployment)
  app.use(express.static(publicPath));
  console.log('✅ Serving React build from public');
} else if (fs.existsSync(reactBuildPath)) {
  // Serve from client/build (local development)
  app.use(express.static(reactBuildPath));
  console.log('✅ Serving React build from client/build');
} else {
  console.log('⚠️  React build not found');
}

// --- Server & Socket.io Setup ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://spotify-matcher.vercel.app", 
    methods: ["GET", "POST"]
  }
});

// --- Configuration ---
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// --- MongoDB Connection ---
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.use(cors());

const findBestMatch = (currentUserTopArtists, allOtherUsers) => {
  let bestMatch = null;
  let maxScore = -1;
  allOtherUsers.forEach(otherUser => {
    if (otherUser.topArtists && otherUser.topArtists.length > 0) {
      let score = 0;
      currentUserTopArtists.forEach(artist => {
        if (otherUser.topArtists.includes(artist)) { score++; }
      });
      if (score > maxScore) {
        maxScore = score;
        bestMatch = otherUser;
      }
    }
  });
  return bestMatch;
};

// --- ROUTES ---

// 1. Redirect to Spotify login
app.get('/login', (req, res) => {
  const scope = 'user-read-private user-top-read';
  // ✅ OFFICIAL SPOTIFY AUTH URL
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: SPOTIFY_CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI,
    }));
});

// 2. Spotify Callback
app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  
  try {
    const authString = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

    // ✅ OFFICIAL SPOTIFY TOKEN URL
    const tokenResponse = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      data: querystring.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authString}`,
      },
    });

    const { access_token, refresh_token } = tokenResponse.data;

    // ✅ OFFICIAL SPOTIFY PROFILE URL
    const profileResponse = await axios.get('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    // ✅ OFFICIAL SPOTIFY ARTISTS URL
    const artistsResponse = await axios.get('https://api.spotify.com/v1/me/top/artists', {
      headers: { 'Authorization': `Bearer ${access_token}` },
      params: { time_range: 'medium_term', limit: 20 }
    });

    const userProfile = profileResponse.data;
    const topArtists = artistsResponse.data.items.map(artist => artist.name);

    const user = await User.findOneAndUpdate(
      { spotifyId: userProfile.id },
      {
        displayName: userProfile.display_name,
        topArtists: topArtists,
        spotifyAccessToken: access_token,
        spotifyRefreshToken: refresh_token,
      },
      { new: true, upsert: true }
    );

    const appToken = jwt.sign(
      { userId: user._id.toString(), spotifyId: user.spotifyId },
      JWT_SECRET, 
      { expiresIn: '1h' }
    );

    res.redirect(`https://spotify-matcher.vercel.app?token=${appToken}`);

  } catch (error) {
    console.error('Error in /callback:', error.response ? error.response.data : error.message);
    res.status(500).send('Authentication failed. Check server logs.');
  }
});

// 3. Match Route
app.get('/api/match', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.userData.userId; 
    const allUsers = await User.find({ _id: { $ne: currentUserId } });
    const currentUser = await User.findById(currentUserId);

    if (!currentUser || !currentUser.topArtists) {
      return res.status(404).json({ error: 'Current user not found' });
    }

    const bestMatch = findBestMatch(currentUser.topArtists, allUsers);

    if (bestMatch) {
      res.json({
        match: bestMatch.displayName,
        matchId: bestMatch.spotifyId,
        matchTopArtists: bestMatch.topArtists
      });
    } else {
      res.json({ match: 'No match found. Invite your friends!' });
    }
  } catch (error) {
    console.error('Error in /match:', error.message);
    res.status(500).json({ error: 'Failed to find a match.' });
  }
});

app.get('/api/spotify/top-artists', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userData.userId); 
    if (!user || !user.spotifyAccessToken) {
      return res.status(401).json({ message: "User not authenticated." });
    }
    return res.status(200).json({ items: user.topArtists });
  } catch (error) {
    res.status(500).json({ message: "Could not retrieve artists." });
  }
});

// --- Socket.IO ---
io.on('connection', (socket) => {
  console.log('user connected', socket.id);
  socket.on('disconnect', () => console.log('user disconnected'));
  socket.on('join chat', (chatId) => socket.join(chatId));
  socket.on('chat message', async (msg) => {
    const { senderId, recipientId, message } = msg;
    try {
      let chat = await Chat.findOne({ participants: { $all: [senderId, recipientId] } });
      if (!chat) { chat = new Chat({ participants: [senderId, recipientId] }); }
      chat.messages.push({ sender: senderId, message });
      await chat.save();
      io.to(chat._id.toString()).emit('chat message', { senderId, message, chatId: chat._id.toString() });
    } catch (error) { console.error(error); }
  });
});

// Serve React app for all non-API routes (client-side routing)
// This must be last, after all API routes and Socket.IO setup
// Express static middleware handles static files before this route
app.get('*', (req, res) => {
  // Skip API routes, login, and callback - they should be handled above
  if (req.path.startsWith('/api') || req.path === '/login' || req.path === '/callback') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  // Serve React app's index.html for all other routes (client-side routing)
  // Try public first (Vercel), then client/build (local dev)
  const publicIndexPath = path.join(__dirname, 'public', 'index.html');
  const reactBuildPath = path.join(__dirname, 'client', 'build', 'index.html');
  
  if (fs.existsSync(publicIndexPath)) {
    res.sendFile(publicIndexPath);
  } else if (fs.existsSync(reactBuildPath)) {
    res.sendFile(reactBuildPath);
  } else {
    res.status(404).send('React build not found. Please build the client app.');
  }
});

// --- START SERVER ---
if (require.main === module) {
  const PORT = process.env.PORT || 8888;
  server.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
  });
}
module.exports = app;