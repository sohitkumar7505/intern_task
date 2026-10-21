// components/HistoryScreen.jsx
// Lists all past calls with filtering and navigation to details

import React, { useState, useEffect, useCallback } from 'react';
import StatusBadge from './StatusBadge.jsx';
import { listCalls, deleteCall } from '../utils/api.js';

const STATUS_OPTIONS = [
  'All',
  'Converted',
  'Interested',
  'Follow-up Required',
  'Not Interested',
  'Demo Requested',
  'No Response',
];

export default function HistoryScreen({ onNavigateCall, onViewDetail, onBack }) {
  const [calls, setCalls] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listCalls(filter === 'All' ? '' : filter);
      setCalls(data.calls || []);
    } catch (err) {
      setError('Failed to load call history');
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchCalls(); }, [fetchCalls]);

  const handleDelete = async (callId, e) => {
    e.stopPropagation();
    if (!confirm('Delete this call? This cannot be undone.')) return;
    try {
      await deleteCall(callId);
      setCalls((prev) => prev.filter((c) => c.id !== callId));
    } catch (err) {
      alert('Failed to delete call');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const langLabels = { 'hi-en': 'Hinglish', en: 'English', te: 'Telugu' };

  return (
    <div className="history-screen">
      <div className="history-header">
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <h1>📋 Call History</h1>
        <button className="btn btn-primary" onClick={onNavigateCall}>
          📞 New Call
        </button>
      </div>

      {/* Status filter */}
      <div className="history-filter">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            className={`filter-chip ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && <div className="error-banner">{error}</div>}

      {/* Loading */}
      {loading && <div className="loading-center"><div className="spinner" /></div>}

      {/* Call list */}
      {!loading && calls.length === 0 && (
        <div className="empty-state">
          <p>No calls found{filter !== 'All' ? ` with status "${filter}"` : ''}.</p>
        </div>
      )}

      <div className="history-list">
        {calls.map((call) => (
          <div
            key={call.id}
            className="history-card"
            onClick={() => onViewDetail(call.id)}
          >
            <div className="history-card-top">
              <span className="history-date">{formatDate(call.start_time)}</span>
              <StatusBadge status={call.sales_status} size="small" />
            </div>
            <div className="history-card-body">
              <p className="history-summary">
                {call.summary ? call.summary.slice(0, 120) + (call.summary.length > 120 ? '...' : '') : 'No summary'}
              </p>
            </div>
            <div className="history-card-footer">
              <span>🕐 {formatDuration(call.duration)}</span>
              <span>🌐 {langLabels[call.language] || call.language}</span>
              <span>💬 {call.message_count || 0} messages</span>
              <button
                className="btn btn-danger-small"
                onClick={(e) => handleDelete(call.id, e)}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
