// hooks/useCallState.js
// Manages overall call lifecycle state

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Call status values:
 * - idle: No call in progress
 * - connecting: Creating call session
 * - listening: Recording user audio
 * - thinking: Processing turn on backend
 * - speaking: Playing bot audio response
 * - ended: Call has ended, showing results
 */
export default function useCallState() {
  const [status, setStatus] = useState('idle');        // idle | connecting | listening | thinking | speaking | ended
  const [callId, setCallId] = useState(null);
  const [language, setLanguage] = useState('hi-en');
  const [messages, setMessages] = useState([]);        // { role: 'user'|'bot', content: string, timestamp: string }
  const [callDuration, setCallDuration] = useState(0); // seconds
  const [summary, setSummary] = useState(null);        // post-call summary object
  const [error, setError] = useState(null);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  /** Start the call duration timer */
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  /** Stop the call duration timer */
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Add a message to the chat */
  const addMessage = useCallback((role, content) => {
    setMessages((prev) => [
      ...prev,
      { role, content, timestamp: new Date().toISOString() },
    ]);
  }, []);

  /** Reset state for a new call */
  const resetCall = useCallback(() => {
    setStatus('idle');
    setCallId(null);
    setMessages([]);
    setCallDuration(0);
    setSummary(null);
    setError(null);
    stopTimer();
  }, [stopTimer]);

  // Cleanup timer on unmount
  useEffect(() => stopTimer, [stopTimer]);

  return {
    status,
    setStatus,
    callId,
    setCallId,
    language,
    setLanguage,
    messages,
    setMessages,
    addMessage,
    callDuration,
    setCallDuration,
    summary,
    setSummary,
    error,
    setError,
    startTimer,
    stopTimer,
    resetCall,
  };
}
