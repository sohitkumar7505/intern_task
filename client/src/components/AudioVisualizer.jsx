// components/AudioVisualizer.jsx
// Visual audio indicator — pulsing circle when listening/speaking

import React from 'react';

export default function AudioVisualizer({ status, audioLevel = 0 }) {
  const isActive = status === 'listening' || status === 'speaking';
  const scale = status === 'listening'
    ? 1 + Math.min(audioLevel * 8, 0.6)   // pulse with mic level
    : status === 'speaking'
      ? 1 + Math.sin(Date.now() / 200) * 0.15  // gentle pulse when speaking
      : 1;

  const color = status === 'listening'
    ? '#22c55e'     // green when listening
    : status === 'speaking'
      ? '#3b82f6'   // blue when speaking
      : status === 'thinking'
        ? '#f59e0b'  // amber when thinking
        : '#94a3b8'; // gray when idle

  return (
    <div className="audio-visualizer">
      <div
        className={`audio-visualizer-circle ${isActive ? 'active' : ''} ${status === 'thinking' ? 'thinking' : ''}`}
        style={{
          transform: `scale(${scale})`,
          backgroundColor: color,
          boxShadow: isActive ? `0 0 ${20 + audioLevel * 60}px ${color}40` : 'none',
        }}
      />
      <div className="audio-visualizer-label">
        {status === 'listening' && '🎙️ Listening...'}
        {status === 'speaking' && '🔊 Speaking...'}
        {status === 'thinking' && '🧠 Thinking...'}
        {status === 'connecting' && '📡 Connecting...'}
        {status === 'idle' && '⏸️ Idle'}
        {status === 'ended' && '✅ Call Ended'}
      </div>
    </div>
  );
}
