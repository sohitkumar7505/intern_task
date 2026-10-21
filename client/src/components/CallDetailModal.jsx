// client/src/components/CallDetailModal.jsx
// Detailed view for a past call with full transcript, recording playback, and AI insights

import React, { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge.jsx';
import ChatBubble from './ChatBubble.jsx';
import { getCall } from '../utils/api.js';

export default function CallDetailModal({ callId, onClose, onDelete }) {
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!callId) return;
    setLoading(true);
    getCall(callId)
      .then((data) => {
        setCall(data.call);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load call detail:', err);
        setError('Failed to load call details');
        setLoading(false);
      });
  }, [callId]);

  if (!callId) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const langLabels = { 'hi-en': 'Hindi-English (Hinglish)', en: 'English', te: 'Telugu' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Call Session Details</h2>
            <div className="detail-meta">
              <span>📅 {formatDate(call?.start_time)}</span>
              <span>⏱️ {formatDuration(call?.duration)}</span>
              <span>🌐 {langLabels[call?.language] || call?.language}</span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {loading && (
          <div className="loading-center">
            <div className="spinner" />
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        {!loading && call && (
          <div className="detail-content">
            {/* Sales Status Card */}
            <div className="detail-status-card">
              <div className="status-header">
                <h3>Sales Outcome</h3>
                <StatusBadge status={call.sales_status} reason={call.sales_status_reason} />
              </div>
              {call.sales_status_reason && (
                <p className="status-reason">{call.sales_status_reason}</p>
              )}
            </div>

            {/* AI Summary */}
            {call.summary && (
              <div className="detail-section">
                <h3>Executive Summary</h3>
                <p className="summary-text">{call.summary}</p>
              </div>
            )}

            {/* Grid of Key Takeaways */}
            <div className="detail-grid">
              {call.requirements?.length > 0 && (
                <div className="detail-card">
                  <h4>🎯 Requirements</h4>
                  <ul>
                    {call.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {call.objections?.length > 0 && (
                <div className="detail-card">
                  <h4>⚠️ Objections</h4>
                  <ul>
                    {call.objections.map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}

              {call.next_steps?.length > 0 && (
                <div className="detail-card">
                  <h4>🚀 Next Steps</h4>
                  <ul>
                    {call.next_steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Audio Recording */}
            {call.recordingUrl && (
              <div className="detail-section">
                <h3>🎧 Call Audio Recording</h3>
                <audio controls src={call.recordingUrl} style={{ width: '100%' }} />
              </div>
            )}

            {/* Conversation Transcript */}
            <div className="detail-section">
              <h3>💬 Full Transcript ({call.messages?.length || 0} messages)</h3>
              <div className="detail-transcript">
                {(!call.messages || call.messages.length === 0) ? (
                  <p className="empty-transcript">No messages recorded for this call.</p>
                ) : (
                  call.messages.map((msg, i) => (
                    <ChatBubble
                      key={msg.id || i}
                      role={msg.role}
                      content={msg.content}
                      timestamp={msg.timestamp}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
