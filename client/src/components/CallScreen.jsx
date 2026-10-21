// components/CallScreen.jsx
// Main call interface: handles the full voice conversation lifecycle

import React, { useCallback, useRef, useEffect } from 'react';
import ChatBubble from './ChatBubble.jsx';
import AudioVisualizer from './AudioVisualizer.jsx';
import ConsentModal from './ConsentModal.jsx';
import PostCallSummary from './PostCallSummary.jsx';
import useAudioRecorder from '../hooks/useAudioRecorder.js';
import useCallRecording from '../hooks/useCallRecording.js';
import useCallState from '../hooks/useCallState.js';
import { createCall, sendTurn, endCall, uploadRecording } from '../utils/api.js';

const LANGUAGES = [
  { value: 'hi-en', label: 'हिंदी-English (Hinglish)' },
  { value: 'en', label: 'English' },
  { value: 'te', label: 'తెలుగు (Telugu)' },
];

export default function CallScreen({ onNavigateHistory }) {
  const state = useCallState();
  const callRecording = useCallRecording();
  const chatEndRef = useRef(null);
  const [showConsent, setShowConsent] = React.useState(false);
  const [recordingUrl, setRecordingUrl] = React.useState(null);
  const [inputText, setInputText] = React.useState('');
  const callIdRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Keep callId ref in sync
  useEffect(() => { callIdRef.current = state.callId; }, [state.callId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  /** Handle a completed user turn (from audio or text) */
  const handleTurnReady = useCallback(async (audioBlobOrText) => {
    if (!callIdRef.current || isProcessingRef.current) return;
    isProcessingRef.current = true;
    try { recorder.stopRecording(); } catch (e) { /* ignore */ }
    state.setStatus('thinking');

    try {
      const result = await sendTurn(callIdRef.current, audioBlobOrText);

      // Add messages to chat
      if (result.userText) {
        state.addMessage('user', result.userText);
      }
      if (result.botText) {
        state.addMessage('bot', result.botText);
      }

      // Play bot audio
      if (result.audioBase64) {
        state.setStatus('speaking');
        await callRecording.playBotAudio(result.audioBase64);
      }

      // Resume listening after bot finishes speaking
      if (state.status !== 'ended' && callIdRef.current) {
        state.setStatus('listening');
        isProcessingRef.current = false;
        try { recorder.startListening(); } catch (e) { /* ignore */ }
      }
    } catch (err) {
      console.error('Turn error:', err);
      state.setError('Something went wrong. Please try again.');
      state.setStatus('listening');
      isProcessingRef.current = false;
      // Try to resume listening
      try { recorder.startListening(); } catch (e) { /* ignore */ }
    }
  }, [state, callRecording]);

  const recorder = useAudioRecorder({
    onTurnReady: handleTurnReady,
    enabled: state.status === 'listening',
  });

  /** Start the call after consent */
  const handleStartCall = useCallback(async () => {
    setShowConsent(false);
    state.setStatus('connecting');
    state.setError(null);

    try {
      // Request mic permission first
      const micStream = await recorder.getMicStream();

      // Create call session on backend
      const { callId, greeting, greetingAudio } = await createCall(state.language);
      state.setCallId(callId);
      callIdRef.current = callId;

      // Start recording both sides
      callRecording.startRecording(micStream);

      // Start the call timer
      state.startTimer();

      // Show the greeting message
      if (greeting) {
        state.addMessage('bot', greeting);
      }

      // Play the greeting audio
      if (greetingAudio) {
        state.setStatus('speaking');
        await callRecording.playBotAudio(greetingAudio);
      }

      // Start listening for user input
      state.setStatus('listening');
      isProcessingRef.current = false;
      recorder.startListening();
    } catch (err) {
      console.error('Start call error:', err);
      if (err.name === 'NotAllowedError') {
        state.setError('Microphone permission denied. Please allow mic access and try again.');
      } else {
        state.setError(`Failed to start call: ${err.message}`);
      }
      state.setStatus('idle');
    }
  }, [state, recorder, callRecording]);

  /** End the call */
  const handleEndCall = useCallback(async () => {
    const currentCallId = callIdRef.current;
    if (!currentCallId) return;

    recorder.stopRecording();
    recorder.cleanup();
    state.setStatus('ended');
    state.stopTimer();
    isProcessingRef.current = false;

    try {
      // Upload the recording
      const recordingBlob = await callRecording.stopRecording();
      if (recordingBlob.size > 0) {
        const uploadResult = await uploadRecording(currentCallId, recordingBlob);
        if (uploadResult.recordingUrl) {
          setRecordingUrl(uploadResult.recordingUrl);
        }
      }
    } catch (err) {
      console.error('Recording upload error:', err);
      // Non-fatal — continue to get summary
    }

    try {
      // Get the AI summary
      const summaryResult = await endCall(currentCallId);
      state.setSummary(summaryResult);
    } catch (err) {
      console.error('Summary error:', err);
      state.setSummary({
        summary: 'Summary generation failed.',
        requirements: [],
        objections: [],
        nextSteps: [],
        salesStatus: 'No Response',
        salesStatusReason: 'Error generating summary',
      });
    }
  }, [state, recorder, callRecording]);

  /** Format call duration as mm:ss */
  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="call-screen">
      {/* Header */}
      <div className="call-header">
        <div className="call-header-left">
          <h1>TaskFlow AI Sales Assistant</h1>
          {state.status !== 'idle' && state.status !== 'ended' && (
            <span className="call-timer">{formatDuration(state.callDuration)}</span>
          )}
        </div>
        <div className="call-header-right">
          {state.status === 'idle' && (
            <select
              className="language-select"
              value={state.language}
              onChange={(e) => state.setLanguage(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          )}
          <button className="btn btn-ghost" onClick={onNavigateHistory}>
            📋 History
          </button>
        </div>
      </div>

      {/* Error banner */}
      {state.error && (
        <div className="error-banner">
          ⚠️ {state.error}
          <button onClick={() => state.setError(null)}>✕</button>
        </div>
      )}

      {/* Main content */}
      {state.status === 'ended' ? (
        <div className="call-content">
          {/* Show transcript + summary side by side on desktop */}
          <div className="post-call-layout">
            <div className="chat-container">
              <h3>📝 Transcript</h3>
              <div className="chat-messages">
                {state.messages.map((msg, i) => (
                  <ChatBubble key={i} role={msg.role} content={msg.content} timestamp={msg.timestamp} />
                ))}
              </div>
            </div>
            <PostCallSummary
              summary={state.summary}
              recordingUrl={recordingUrl}
              onNewCall={() => { state.resetCall(); setRecordingUrl(null); }}
              onViewHistory={onNavigateHistory}
            />
          </div>
        </div>
      ) : (
        <div className="call-content">
          {/* Chat messages */}
          <div className="chat-container">
            <div className="chat-messages">
              {state.messages.length === 0 && state.status === 'idle' && (
                <div className="chat-empty">
                  <p>👋 Click <strong>Start Call</strong> to begin a voice conversation with our AI sales assistant.</p>
                  <p>Select your preferred language and click start!</p>
                </div>
              )}
              {state.messages.map((msg, i) => (
                <ChatBubble key={i} role={msg.role} content={msg.content} timestamp={msg.timestamp} />
              ))}
              <div ref={chatEndRef} />
            </div>

            {state.status !== 'idle' && (
              <form
                className="chat-input-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!inputText.trim() || state.status === 'thinking' || state.status === 'speaking') return;
                  const text = inputText.trim();
                  setInputText('');
                  handleTurnReady(text);
                }}
              >
                <input
                  type="text"
                  className="chat-text-input"
                  placeholder="Type a response or speak (e.g. 'Tell me your pricing' or 'We use Jira')..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={state.status === 'thinking' || state.status === 'speaking'}
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-send"
                  disabled={!inputText.trim() || state.status === 'thinking' || state.status === 'speaking'}
                >
                  Send
                </button>
              </form>
            )}
          </div>

          {/* Audio visualizer */}
          <AudioVisualizer status={state.status} audioLevel={recorder.audioLevel} />

          {/* Call controls */}
          <div className="call-controls">
            {state.status === 'idle' ? (
              <button
                className="btn btn-call-start"
                onClick={() => setShowConsent(true)}
              >
                📞 Start Call
              </button>
            ) : (
              <button
                className="btn btn-call-end"
                onClick={handleEndCall}
                disabled={state.status === 'connecting'}
              >
                📵 End Call
              </button>
            )}
          </div>
        </div>
      )}

      {/* Consent Modal */}
      {showConsent && (
        <ConsentModal
          language={state.language}
          onAccept={handleStartCall}
          onDecline={() => setShowConsent(false)}
        />
      )}
    </div>
  );
}
