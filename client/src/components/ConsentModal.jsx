// components/ConsentModal.jsx
// Recording consent modal shown before starting a call

import React from 'react';

export default function ConsentModal({ onAccept, onDecline, language }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-icon">🎙️</div>
        <h2>Call Recording Consent</h2>
        <p>
          This call will be recorded for quality and training purposes. You will
          be speaking with an AI sales assistant.
        </p>
        <ul className="consent-list">
          <li>🔴 The call will be recorded (both sides)</li>
          <li>🤖 You are speaking with an AI assistant, not a human</li>
          <li>📝 A transcript will be generated for your reference</li>
          <li>🔒 Your data will be handled securely</li>
        </ul>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onAccept}>
            I Agree — Start Call
          </button>
          <button className="btn btn-secondary" onClick={onDecline}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
