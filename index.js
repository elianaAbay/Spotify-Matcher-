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
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

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

// --- START SERVER ---
if (require.main === module) {
  const PORT = process.env.PORT || 8888;
  server.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
  });
}
module.exports = app;