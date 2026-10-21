// components/ChatBubble.jsx
// A single message bubble in the chat transcript

import React from 'react';

export default function ChatBubble({ role, content, timestamp }) {
  const isBot = role === 'bot';
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div
      className={`chat-bubble ${isBot ? 'chat-bubble-bot' : 'chat-bubble-user'}`}
    >
      <div className="chat-bubble-label">
        {isBot ? '🤖 TaskFlow AI' : '👤 You'}
      </div>
      <div className="chat-bubble-content">{content}</div>
      {time && <div className="chat-bubble-time">{time}</div>}
    </div>
  );
}
