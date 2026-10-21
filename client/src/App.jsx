import React, { useState } from 'react';
import CallScreen from './components/CallScreen.jsx';
import HistoryScreen from './components/HistoryScreen.jsx';
import CallDetailModal from './components/CallDetailModal.jsx';

export default function App() {
  const [view, setView] = useState('call'); // 'call' | 'history'
  const [selectedCallId, setSelectedCallId] = useState(null);

  return (
    <div className="app-container">
      {view === 'call' && (
        <CallScreen
          onNavigateHistory={() => setView('history')}
        />
      )}

      {view === 'history' && (
        <HistoryScreen
          onNavigateCall={() => setView('call')}
          onBack={() => setView('call')}
          onViewDetail={(callId) => setSelectedCallId(callId)}
        />
      )}

      {selectedCallId && (
        <CallDetailModal
          callId={selectedCallId}
          onClose={() => setSelectedCallId(null)}
        />
      )}
    </div>
  );
}
