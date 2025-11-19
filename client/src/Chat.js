// client/src/Chat.js

import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://127.0.0.1:8888');

function Chat({ currentUserId, matchId, displayName, chatId }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (chatId) {
      socket.emit('join chat', chatId);
    }
    
    socket.on('chat message', (msg) => {
      setMessages(prevMessages => [...prevMessages, msg]);
    });
    
    return () => {
      socket.off('chat message');
    };
  }, [chatId]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (message) {
      const msgData = {
        senderId: currentUserId,
        recipientId: matchId,
        message: message,
        chatId: chatId
      };
      socket.emit('chat message', msgData);
      setMessage('');
    }
  };

  return (
    <div>
      <h2>Chat with {displayName}</h2>
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} style={{ textAlign: msg.senderId === currentUserId ? 'right' : 'left' }}>
            <strong>{msg.senderId === currentUserId ? 'You' : displayName}:</strong> {msg.message}
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage}>
        <input 
          type="text" 
          value={message} 
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default Chat;