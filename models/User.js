// models/User.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  spotifyId: {
    type: String,
    required: true,
    unique: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  topArtists: {
    type: [String],
    default: [],
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
