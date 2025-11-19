// client/src/App.js

import React, { useEffect, useState } from 'react';
import './App.css';
import axios from 'axios';
import io from 'socket.io-client';
import Chat from './Chat';

const socket = io('http://127.0.0.1:8888');

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [match, setMatch] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [chatId, setChatId] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');

    if (accessToken) {
      setLoggedIn(true);

      // Get current user's profile to get their ID
      axios.get(`http://127.0.0.1:8888/api/profile?access_token=${accessToken}`)
        .then(profileResponse => {
          setCurrentUser(profileResponse.data);
          return axios.get(`http://127.0.0.1:8888/api/match?access_token=${accessToken}`);
        })
        .then(matchResponse => {
          if (matchResponse.data.matchId) {
            const matchedUser = {
              displayName: matchResponse.data.match,
              id: matchResponse.data.matchId
            };
            setMatch(matchedUser);

            // Request a chat with the matched user
            socket.emit('request chat', {
              senderId: currentUser.id,
              recipientId: matchedUser.id
            });
          } else {
            setMatch({ displayName: 'No match found. Invite your friends!' });
          }
        })
        .catch(error => {
          console.error('Error in authentication flow:', error);
          setMatch({ displayName: 'Failed to find a match.' });
        });

      socket.on('chat ready', (data) => {
        setChatId(data.chatId);
      });
    }
  }, [currentUser]);

  if (loggedIn) {
    if (match) {
      if (chatId) {
        return (
          <div className="App">
            <header className="App-header">
              <h1>Chat with {match.displayName}</h1>
              <Chat 
                currentUserId={currentUser.id}
                matchId={match.id} 
                displayName={match.displayName} 
                chatId={chatId} 
              />
            </header>
          </div>
        );
      } else {
        return (
          <div className="App">
            <header className="App-header">
              <h1>Your Music Match</h1>
              <p>You have been matched with:</p>
              <h2>{match.displayName}</h2>
              <p>Preparing chat...</p>
            </header>
          </div>
        );
      }
    } else {
      return (
        <div className="App">
          <header className="App-header">
            <h1>Finding your match...</h1>
          </header>
        </div>
      );
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Spotify Match Blend</h1>
        <p>Find people with similar music taste.</p>
        <a className="login-button" href="http://127.0.0.1:8888/login">
          Login with Spotify
        </a>
      </header>
    </div>
  );
}

export default App;