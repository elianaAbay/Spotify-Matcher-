// index.js

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

// --- Dependencies you need to define ---
const User = require('./models/User'); // Mongoose model
const Chat = require('./models/Chat'); // Mongoose model
const authMiddleware = require('./middleware/auth'); // Authentication middleware

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://spotify-matcher.vercel.app", 
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 8888; 

// --- Spotify & MongoDB Configuration ---
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.use(cors());

// --- Core Matching Function ---
const findBestMatch = (currentUserTopArtists, allOtherUsers) => {
  let bestMatch = null;
  let maxScore = -1;

  allOtherUsers.forEach(otherUser => {
    if (otherUser.topArtists && otherUser.topArtists.length > 0) {
      let score = 0;
      currentUserTopArtists.forEach(artist => {
        if (otherUser.topArtists.includes(artist)) {
          score++;
        }
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

// Redirect to Spotify login
app.get('/login', (req, res) => {
  const scope = 'user-read-private user-top-read';
  res.redirect('https://accounts.spotify.com/authorize?' + // CORRECT SPOTIFY URL
    querystring.stringify({
      response_type: 'code',
      client_id: SPOTIFY_CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI,
    }));
});

// Spotify Callback - Handles authentication and saves user data
app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  
  try {
    const authString = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

    const tokenResponse = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token', // CORRECT SPOTIFY URL
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

    const profileResponse = await axios.get('https://api.spotify.com/v1/me', { // CORRECT SPOTIFY URL
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    const artistsResponse = await axios.get('https://api.spotify.com/v1/me/top/artists', { // CORRECT SPOTIFY URL
      headers: { 'Authorization': `Bearer ${access_token}` },
      params: { time_range: 'medium_term', limit: 20 }
    });

    const userProfile = profileResponse.data;
    const topArtists = artistsResponse.data.items.map(artist => artist.name);

    // Save/Update user data in MongoDB
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

    console.log('✅ User saved to DB:', user.displayName);

    // Create a JWT for your application
    const appToken = jwt.sign(
      { userId: user._id.toString(), spotifyId: user.spotifyId },
      process.env.JWT_SECRET, // Requires JWT_SECRET to be set
      { expiresIn: '1h' }
    );

    // Redirect to the frontend with your custom JWT
    res.redirect(`https://spotify-matcher.vercel.app?token=${appToken}`);

  } catch (error) {
    console.error('Error in /callback:', error.response ? error.response.data : error.message);
    res.status(500).send('Authentication failed.');
  }
});

// Protected Route to get the matched user
app.get('/api/match', authMiddleware, async (req, res) => {
  try {
    // Use the MongoDB _id from the verified JWT for cleaner lookups
    const currentUserId = req.userData.userId; 

    const allUsers = await User.find({ _id: { $ne: currentUserId } });
    const currentUser = await User.findById(currentUserId);

    if (!currentUser || !currentUser.topArtists) {
      return res.status(404).json({ error: 'Current user not found or no top artists' });
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

// Protected route to fetch a user's Spotify data (fetches from DB first)
app.get('/api/spotify/top-artists', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userData.userId); 

    if (!user || !user.spotifyAccessToken) {
      return res.status(401).json({ message: "User not authenticated with Spotify." });
    }

    // Since you already fetched and saved topArtists in /callback,
    // you can return the stored data to reduce Spotify API calls.
    return res.status(200).json({ items: user.topArtists });

  } catch (error) {
    console.error("Error fetching Spotify data:", error.message);
    res.status(500).json({ message: "Could not retrieve top artists." });
  }
});

// --- Socket.IO Connection ---
io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  // NOTE: This should be secured with a JWT check on connection/join for production.

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('join chat', (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.id} joined chat room ${chatId}`);
  });

  socket.on('chat message', async (msg) => {
    const { senderId, recipientId, message } = msg;

    try {
      let chat = await Chat.findOne({
        participants: { $all: [senderId, recipientId] }
      });

      if (!chat) {
        chat = new Chat({ participants: [senderId, recipientId] });
      }

      chat.messages.push({ sender: senderId, message });
      await chat.save();
      
      const chatRoom = chat._id.toString();
      io.to(chatRoom).emit('chat message', { senderId, message, chatId: chatRoom });
      
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  });

  socket.on('request chat', async ({ senderId, recipientId }) => {
    try {
      let chat = await Chat.findOne({
        participants: { $all: [senderId, recipientId] }
      });
      if (!chat) {
        chat = new Chat({ participants: [senderId, recipientId] });
        await chat.save();
      }
      io.to(socket.id).emit('chat ready', { chatId: chat._id.toString() });
    } catch (error) {
      console.error('Error requesting chat:', error);
    }
  });
});

// ... socket code above ...

// ONLY listen if running locally (not on Vercel)
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🚀 Server is listening on port ${PORT}`);
  });
}

// Export the app for Vercel
module.exports = app;