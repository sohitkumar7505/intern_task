// components/PostCallSummary.jsx
// Displays the AI-generated summary, status, and recording after a call ends

import React from 'react';
import StatusBadge from './StatusBadge.jsx';

export default function PostCallSummary({ summary, recordingUrl, onNewCall, onViewHistory }) {
  if (!summary) {
    return (
      <div className="post-call loading">
        <div className="spinner" />
        <p>Generating AI summary...</p>
      </div>
    );
  }

  return (
    <div className="post-call">
      <h2>📊 Call Summary</h2>

      <div className="post-call-status">
        <StatusBadge status={summary.salesStatus} reason={summary.salesStatusReason} />
        {summary.salesStatusReason && (
          <p className="status-reason">{summary.salesStatusReason}</p>
        )}
      </div>

      <div className="post-call-section">
        <h3>Summary</h3>
        <p>{summary.summary}</p>
      </div>

      {summary.requirements?.length > 0 && (
        <div className="post-call-section">
          <h3>Customer Requirements</h3>
          <ul>
            {summary.requirements.map((req, i) => (
              <li key={i}>{req}</li>
            ))}
          </ul>
        </div>
      )}

      {summary.objections?.length > 0 && (
        <div className="post-call-section">
          <h3>Objections Raised</h3>
          <ul>
            {summary.objections.map((obj, i) => (
              <li key={i}>{obj}</li>
            ))}
          </ul>
        </div>
      )}

      {summary.nextSteps?.length > 0 && (
        <div className="post-call-section">
          <h3>Next Steps</h3>
          <ul>
            {summary.nextSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
        </div>
      )}

      {recordingUrl && (
        <div className="post-call-section">
          <h3>🎧 Call Recording</h3>
          <audio controls src={recordingUrl} style={{ width: '100%' }} />
        </div>
      )}

      <div className="post-call-actions">
        <button className="btn btn-primary" onClick={onNewCall}>
          Start New Call
        </button>
        <button className="btn btn-secondary" onClick={onViewHistory}>
          View History
        </button>
      </div>
    </div>
  );
}
