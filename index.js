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
const User = require('./models/User');
const Chat = require('./models/Chat');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
const PORT = 8888;

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.use(cors());

// --- Serve static files from the 'public' directory ---
app.use(express.static(path.join(__dirname, 'public')));

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

app.get('/login', (req, res) => {
  const scope = 'user-read-private user-top-read';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: SPOTIFY_CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI,
    }));
});

app.get('/callback', async (req, res) => {
  const code = req.query.code || null;

  try {
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
        'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
    });

    const accessToken = tokenResponse.data.access_token;

    const profileResponse = await axios.get('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const artistsResponse = await axios.get('https://api.spotify.com/v1/me/top/artists', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params: { time_range: 'medium_term', limit: 20 }
    });

    const userProfile = profileResponse.data;
    const topArtists = artistsResponse.data.items.map(artist => artist.name);

    const user = await User.findOneAndUpdate(
      { spotifyId: userProfile.id },
      {
        displayName: userProfile.display_name,
        topArtists: topArtists,
      },
      { new: true, upsert: true }
    );

    console.log('✅ User saved to DB:', user.displayName);

    // --- FIX: Redirect to the Vercel URL ---
    res.redirect(`${process.env.VERCEL_URL}/?access_token=${accessToken}`);

  } catch (error) {
    console.error('Error in /callback:', error.response ? error.response.data : error.message);
    res.status(500).send('Authentication failed.');
  }
});

app.get('/api/match', async (req, res) => {
      try {
    const accessToken = req.query.access_token;
    if (!accessToken) {
      return res.status(401).json({ error: 'Access token not provided' });
    }

    const profileResponse = await axios.get('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const currentUserProfile = profileResponse.data;
    const currentUserId = currentUserProfile.id;

    const allUsers = await User.find({ spotifyId: { $ne: currentUserId } });
    const currentUser = await User.findOne({ spotifyId: currentUserId });

    if (!currentUser || !currentUser.topArtists) {
      return res.status(404).json({ error: 'Current user not found or no top artists' });
    }

    const bestMatch = findBestMatch(currentUser.topArtists, allUsers);

    if (bestMatch) {
      res.json({ match: bestMatch.displayName, matchId: bestMatch.spotifyId });
    } else {
      res.json({ match: 'No match found. Invite your friends!' });
    }

  } catch (error) {
    console.error('Error in /match:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to find a match.' });
  }
});

// --- Socket.IO Connection ---
io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

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

server.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});