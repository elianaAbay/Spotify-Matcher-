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

// --- Local Dependencies ---
// Ensure you have uploaded the 'models' and 'middleware' folders to Git!
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
// Make sure these are set in Vercel Settings > Environment Variables
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI; // Must match Spotify Dashboard & Vercel
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// --- MongoDB Connection ---
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

// 1. Redirect to Spotify login
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

// 2. Spotify Callback - Handles authentication and saves user data
app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  
  try {
    const authString = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

    // Exchange Authorization Code for Access Token
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

    // Fetch User Profile
    const profileResponse = await axios.get('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    // Fetch User's Top Artists
    const artistsResponse = await axios.get('https://api.spotify.com/v1/me/top/artists', {
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
      JWT_SECRET, 
      { expiresIn: '1h' }
    );

    // Redirect to the frontend with your custom JWT
    // Ensure this URL matches your frontend domain
    res.redirect(`https://spotify-matcher.vercel.app?token=${appToken}`);

  } catch (error) {
    console.error('Error in /callback:', error.response ? error.response.data : error.message);
    res.status(500).send('Authentication failed. Check server logs.');
  }
});

// 3. Protected Route to get the matched user
app.get('/api/match', authMiddleware, async (req, res) => {
  try {
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

// 4. Protected route to fetch a user's Spotify data
app.get('/api/spotify/top-artists', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userData.userId); 

    if (!user || !user.spotifyAccessToken) {
      return res.status(401).json({ message: "User not authenticated with Spotify." });
    }

    return res.status(200).json({ items: user.topArtists });

  } catch (error) {
    console.error("Error fetching Spotify data:", error.message);
    res.status(500).json({ message: "Could not retrieve top artists." });
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

// --- SERVER STARTUP ---

// 1. Only listen on port if running locally (Vercel handles this automatically in the cloud)
if (require.main === module) {
  const PORT = process.env.PORT || 8888;
  server.listen(PORT, () => {
      console.log(`🚀 Server is listening on port ${PORT}`);
  });
}

// 2. EXPORT THE APP (CRITICAL FOR VERCEL)
module.exports = app;